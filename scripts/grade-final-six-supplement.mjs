// Private checker coverage repair. Never mount this script or its fixtures in a solver.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const hash = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const save = (p, v) => { mkdirSync(dirname(p), {recursive:true}); writeFileSync(p, JSON.stringify(v, null, 2)+'\n', {flag:'wx'}); };
export function gradeSupplement({id, submission, output}) {
  const policyPath = join(root, 'data/final-six-grading-controls/policy.json');
  const policy = read(policyPath), control = policy.controls.find(c => c.id === id);
  assert(control, 'Task has no supplemental controls');
  const fixture = join(root, control.fixture);
  assert.equal(hash(fixture), control.sha256, 'Supplemental fixture changed');
  const stage = join(resolve(output), 'submission'), cases = join(resolve(output), 'cases');
  mkdirSync(stage, {recursive:true}); mkdirSync(cases, {recursive:true});
  cpSync(resolve(submission), stage, {recursive:true, dereference:false});
  save(join(cases,'input.json'), read(fixture));
  const bootstrap = `import{readFileSync}from'node:fs';const m=await import('/subject/checker.mjs');const i=JSON.parse(readFileSync('/cases/input.json'));const before=JSON.stringify(i);const a=JSON.stringify(await m.run(i));const b=JSON.stringify(await m.run(i));console.log(JSON.stringify({first:JSON.parse(a),second:JSON.parse(b),mutated:before!==JSON.stringify(i)}));`;
  // A Docker/timeout/parse error throws: infrastructure is not a scored failure.
  const raw = execFileSync('docker', ['run','--rm','--network','none','--read-only','--tmpfs','/tmp:rw,size=256m','--cpus','1','--memory','1g','--pids-limit','128','--cap-drop','ALL','--security-opt','no-new-privileges','--mount',`type=bind,src=${stage},dst=/subject,readonly`,'--mount',`type=bind,src=${cases},dst=/cases,readonly`,policy.image,'node','--input-type=module','-e',bootstrap], {encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
  const observed = JSON.parse(raw);
  const deterministic = !observed.mutated && JSON.stringify(observed.first) === JSON.stringify(observed.second);
  const details = control.expected.map(({token,ok}) => ({token, expectedOk:ok, actualOk:observed.first?.verdicts?.[token]?.ok ?? null, correct: observed.first?.verdicts?.[token]?.ok === ok}));
  const result = {schemaVersion:1, gradingRevision:policy.revision, policySha256:hash(policyPath), fixtureSha256:control.sha256, checkerSha256:hash(join(stage,'checker.mjs')), deterministic, reasonPolicy:'diagnostic-only', correct:details.filter(x=>x.correct).length, total:details.length, pass:deterministic && details.every(x=>x.correct), details, observed};
  save(join(output, 'grade.json'), result);
  return result;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [id,submission,output] = process.argv.slice(2);
  assert(id && submission && output, 'Usage: node scripts/grade-final-six-supplement.mjs TASK SUBMISSION NEW_OUTPUT');
  console.log(JSON.stringify(gradeSupplement({id,submission,output})));
}
