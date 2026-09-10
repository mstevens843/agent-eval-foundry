// Cumulative private checker coverage. Never provide these fixtures to a solver.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
};

export function gradePostFinalSupplement({ id, submission, output }) {
  const policyPath = join(root, 'data/post-final-grading-controls/policy.json');
  const policy = read(policyPath);
  const previousPath = join(root, policy.extends.path);
  assert.equal(hash(previousPath), policy.extends.sha256, 'Prior grading revision drifted');
  const controls = [...read(previousPath).controls, ...policy.controls].filter(c => c.id === id);
  assert(policy.controls.some(c => c.id === id), 'Task has no post-final control');
  const input = { cases: [] }, expected = [];
  for (const control of controls) {
    const fixture = join(root, control.fixture);
    assert.equal(hash(fixture), control.sha256, 'Supplemental fixture drifted');
    input.cases.push(...read(fixture).cases);
    expected.push(...control.expected);
  }
  assert.equal(new Set(expected.map(c => c.token)).size, expected.length, 'Duplicate control token');
  const stage = join(resolve(output), 'submission'), cases = join(resolve(output), 'cases');
  mkdirSync(stage, { recursive: true });
  cpSync(resolve(submission), stage, { recursive: true, dereference: false });
  save(join(cases, 'input.json'), input);
  const bootstrap = `
    import {readFileSync} from 'node:fs';
    import {isDeepStrictEqual} from 'node:util';
    const checker = await import('/subject/checker.mjs');
    const input = JSON.parse(readFileSync('/cases/input.json'));
    const before = structuredClone(input);
    const first = JSON.parse(JSON.stringify(await checker.run(input)));
    const second = JSON.parse(JSON.stringify(await checker.run(input)));
    console.log(JSON.stringify({first,second,mutated:!isDeepStrictEqual(input,before)}));
  `;
  // Docker/timeout/parse errors throw and require diagnosis, never an invented zero.
  const raw = execFileSync('docker', [
    'run', '--rm', '--network', 'none', '--read-only', '--tmpfs', '/tmp:rw,size=256m',
    '--cpus', '1', '--memory', '1g', '--pids-limit', '128', '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges',
    '--mount', `type=bind,src=${stage},dst=/subject,readonly`,
    '--mount', `type=bind,src=${cases},dst=/cases,readonly`,
    policy.image, 'node', '--input-type=module', '-e', bootstrap,
  ], { encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
  const observed = JSON.parse(raw);
  const deterministic = !observed.mutated && isDeepStrictEqual(observed.first, observed.second);
  const actual = observed.first?.verdicts;
  const exactTokens = actual !== null && typeof actual === 'object' && !Array.isArray(actual)
    && isDeepStrictEqual(Object.keys(actual).sort(), expected.map(c => c.token).sort());
  const details = expected.map(({ token, ok }) => ({
    token, expectedOk: ok, actualOk: actual?.[token]?.ok ?? null,
    correct: actual?.[token]?.ok === ok,
  }));
  const result = {
    schemaVersion: 1, gradingRevision: policy.revision, policySha256: hash(policyPath),
    fixtureSha256s: controls.map(c => c.sha256), checkerSha256: hash(join(stage, 'checker.mjs')),
    deterministic, exactTokens, reasonPolicy: 'diagnostic-only',
    correct: details.filter(c => c.correct).length, total: details.length,
    pass: deterministic && exactTokens && details.every(c => c.correct), details, observed,
  };
  save(join(output, 'grade.json'), result);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [id, submission, output] = process.argv.slice(2);
  assert(id && submission && output, 'Usage: node scripts/grade-post-final-supplement.mjs TASK SUBMISSION NEW_OUTPUT');
  console.log(JSON.stringify(gradePostFinalSupplement({ id, submission, output })));
}
