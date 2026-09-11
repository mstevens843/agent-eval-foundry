// Trusted verifier entry. Submitted programs only execute in child processes under UID 1000.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmodSync, chownSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { executeAuthority } from "./authority-engine.mjs";
import { runScenario } from "./domain.mjs";
import { scenarios } from "./scenarios.mjs";

const startedAt = Date.now(), testResults = [];
let phase = "submission";
const root = `/tmp/verification-${randomUUID()}`;
mkdirSync(root, { mode: 0o755 });
process.chdir(root);
const privateRoot = join(root, "private");
mkdirSync(privateRoot, { mode: 0o700 });
mkdirSync("/logs/verifier", { recursive: true, mode: 0o700 });
chmodSync("/logs/verifier", 0o700);
writeFileSync(join(privateRoot, "reward.txt"), "0\n");
mkdirSync("/tmp/authority", { recursive: true, mode: 0o700 });
chmodSync("/tmp/authority", 0o700);
copyFileSync("/tests/domain.mjs", "/tmp/authority/domain.mjs");
copyFileSync("/tests/cell-entry.mjs", join(root, "client.mjs"));

// Copy regular files only; symlink/hardlink/device artifacts must not enter the trusted tree.
function copyTree(source, destination, state = { count: 0, bytes: 0 }, depth = 0) {
  if (depth > 16) throw Error("artifact depth limit");
  mkdirSync(destination, { recursive: true, mode: 0o755 });
  for (const name of readdirSync(source)) {
    const from = join(source, name), to = join(destination, name), stat = lstatSync(from);
    if (stat.isSymbolicLink()) throw Error("artifact symlink");
    if (stat.isDirectory()) copyTree(from, to, state, depth + 1);
    else {
      if (!stat.isFile() || stat.nlink !== 1 || ++state.count > 128 || (state.bytes += stat.size) > 8 * 1024 * 1024) throw Error("artifact file limit");
      copyFileSync(from, to); chmodSync(to, 0o644);
    }
  }
}
const scenarioBank = scenarios();
const controls = JSON.parse(readFileSync("/tests/control-manifest.json", "utf8"));
const checkerConfig = JSON.parse(readFileSync("/tests/checker-required.json", "utf8"));
async function execute(directory) {
  const cells = [];
  for (const scenario of scenarioBank) {
    const storage = join(root, `storage-${randomUUID()}`);
    mkdirSync(storage, { mode: 0o700 }); chownSync(storage, 1000, 1000);
    const executions = [];
    const result = await runScenario(scenario, async (adapter) => {
      const result = await executeAuthority(adapter, { cellPath: join(root, "client.mjs"), modulePath: join(directory, "entry.mjs"), uid: 1000 });
      executions.push(result);
      if (result.error) throw Error(`invalid execution: ${result.error}; ${result.diagnostics?.stderrTail ?? ""}`);
      return result;
    }, storage);
    // Candidate journals are private grading evidence, not checker inputs.
    // Revoke the subject UID's access after all redeliveries of this scenario.
    chownSync(storage, 0, 0); chmodSync(storage, 0o700);
    cells.push({ scenarioId: scenario.id, ...result, executions });
  }
  return cells;
}
function strip(cells) {
  return cells.map(({ checks, failures, expected, truth, groundTruth, status, ...raw }) => raw);
}
function candidate(name, control) {
  const destination = join(root, `candidate-${randomUUID()}`);
  copyTree(`/tests/${name}`, destination);
  for (const [target, source] of Object.entries(control?.overlay ?? {})) {
    const path = join(destination, target);
    mkdirSync(dirname(path), { recursive: true }); copyFileSync(`/tests/${source}`, path); chmodSync(path, 0o644);
  }
  return destination;
}
function validOutput(output, tokens) {
  const v = output?.verdicts;
  return v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === tokens.length
    && tokens.every((t) => Object.hasOwn(v, t) && v[t] && typeof v[t] === "object" && !Array.isArray(v[t]) && typeof v[t].ok === "boolean"
      && (v[t].reasons === undefined || Array.isArray(v[t].reasons) && v[t].reasons.every((s) => typeof s === "string")));
}
function reapSubmittedProcesses() {
  for (let pass=0; pass<3; pass++) {
  for (const pid of readdirSync("/proc").filter((p) => /^\d+$/.test(p))) {
    try {
      if (Number(/^Uid:\s+(\d+)/m.exec(readFileSync(`/proc/${pid}/status`, "utf8"))?.[1]) === 1000) process.kill(Number(pid), "SIGKILL");
    } catch { /* Process already exited. */ }
  }
  }
}
function checker(directory, cases) {
  const input = join(root, `cases-${randomUUID()}.json`);
  writeFileSync(input, JSON.stringify({ cases }), { mode: 0o644 });
  const worker = join(root, `checker-${randomUUID()}.mjs`);
  writeFileSync(worker, `import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const encode=JSON.stringify.bind(JSON),decode=JSON.parse.bind(JSON),freeze=Object.freeze,values=Object.values;
function immutable(x){if(x&&typeof x==='object'){for(const v of values(x))immutable(v);freeze(x)}return x}
const {cases}=decode(readFileSync(process.argv[2],'utf8'));immutable(cases);
const before=encode(cases);
const {run}=await import(pathToFileURL(process.argv[3]));
const first=encode(await run({cases}));
const second=await run({cases});
process.stdout.write(encode({first:decode(first),second,mutated:before!==encode(cases)}));
`, { mode: 0o644 });
  const result = spawnSync(process.execPath, [worker, input, join(directory, "checker.mjs")], {
    uid: 1000, gid: 1000, timeout: 60000, maxBuffer: 8 * 1024 * 1024,
    env: { PATH: "/usr/local/bin:/usr/bin:/bin", HOME: "/tmp" }, encoding: "utf8",
  });
  reapSubmittedProcesses();
  if (result.error || result.status !== 0) throw Error(`invalid checker execution: ${result.error ?? result.stderr.slice(-1000)}`);
  let value;
  try { value = JSON.parse(result.stdout); } catch { return { passed: false, reason: "malformed output" }; }
  const tokens = cases.map((c) => c.token);
  return {
    passed: value.mutated !== true && validOutput(value.first, tokens) && validOutput(value.second, tokens)
      && tokens.every((t) => value.first.verdicts[t].ok === value.second.verdicts[t].ok),
    verdicts: value.first?.verdicts,
  };
}

function integrityChecks(submission, cases, labels, candidateDirectories) {
  const evaluate = (body) => {
    const directory = join(root, `checker-control-${randomUUID()}`);
    mkdirSync(directory, { mode: 0o755 });
    writeFileSync(join(directory, "checker.mjs"), body, { mode: 0o644 });
    try {
      const result = checker(directory, cases);
      return { accepted: Boolean(result.passed && cases.every(({ token }) => result.verdicts[token].ok === labels.get(token))), outputValid: Boolean(result.passed) };
    } catch (error) { return { accepted: false, error: String(error) }; }
  };
  const results = [];
  for (const [name, body] of [
    ["missing-verdicts", "export const run=()=>({verdicts:{}})"],
    ["always-accept", "export const run=({cases})=>({verdicts:Object.fromEntries(cases.map(c=>[c.token,{ok:true}]))})"],
    ["always-reject", "export const run=({cases})=>({verdicts:Object.fromEntries(cases.map(c=>[c.token,{ok:false}]))})"],
    ["mutated-input", `import {run as oracle} from ${JSON.stringify(join(submission, "checker.mjs"))};export async function run({cases}){const r=await oracle({cases});cases[0].token+='changed';return r}`],
    ["mutation-restored-before-return", `import {run as oracle} from ${JSON.stringify(join(submission,"checker.mjs"))};export async function run({cases}){const saved=cases[0].token;cases[0].token+='changed';cases[0].token=saved;return oracle({cases})}`],
    ["mutation-hidden-by-json-hook", `import {run as oracle} from ${JSON.stringify(join(submission,"checker.mjs"))};export async function run({cases}){const stringify=JSON.stringify;JSON.stringify=(v,...args)=>v===cases?'hidden':stringify(v,...args);cases[0].token+='changed';return oracle({cases})}`],
  ]) { const result = evaluate(body); results.push({ name, passed: !result.accepted, ...result }); }
  const protectedPaths = ["/tests/domain.mjs", "/tmp/authority/domain.mjs", join(privateRoot, "reward.txt"), ...candidateDirectories.map((d) => join(d, "entry.mjs")), ...readdirSync(root).filter(n => n.startsWith("storage-")).map(n => join(root,n,"probe"))];
  const isolation = evaluate(`
import {readFileSync,writeFileSync} from 'node:fs';
import {run as oracle} from ${JSON.stringify(join(submission, "checker.mjs"))};
export async function run(input) {
  for (const path of ${JSON.stringify(protectedPaths)}) {
    let denied=false;try{readFileSync(path)}catch(e){denied=e.code==='EACCES'}
    if(!denied)throw Error('private material accessible: '+path);
  }
  let denied=false;try{writeFileSync(${JSON.stringify(join(privateRoot, "reward.txt"))},'1')}catch(e){denied=e.code==='EACCES'}
  if(!denied)throw Error('reward writable');
  const result=await oracle(input);
  for(const verdict of Object.values(result.verdicts))verdict.reasons=['arbitrary diagnostic text'];
  return result;
}`);
  results.push({ name: "private-read-and-reward-write-denied", passed: isolation.accepted, ...isolation });
  const marker=`/tmp/descendant-${randomUUID()}`;
  // Spawn only after the second deterministic invocation. A descendant of the
  // first invocation is still within the live checker execution, not a leak.
  const descendant=evaluate(`import {spawn} from 'node:child_process';import {existsSync} from 'node:fs';import {run as oracle} from ${JSON.stringify(join(submission,"checker.mjs"))};let calls=0;
export async function run(input){const result=await oracle(input);if(++calls===2){const child=spawn(process.execPath,['-e',${JSON.stringify("require('node:fs').writeFileSync("+JSON.stringify(marker+".started")+",'ready');setTimeout(()=>require('node:fs').writeFileSync("+JSON.stringify(marker)+",'escaped'),500)")}],{detached:true,stdio:'ignore'});child.unref();const deadline=Date.now()+2000;while(!existsSync(${JSON.stringify(marker+".started")})){if(Date.now()>deadline)throw Error('probe child failed to start');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,5)}}return result}`);
  spawnSync("sleep",["0.7"]);
  results.push({name:"detached-descendant-reaped",passed:descendant.accepted&&existsSync(marker+".started")&&!existsSync(marker),...descendant});
  return results;
}

const summary = { schemaVersion: 1, service: false, checker: false, reward: 0, controls: [], providerCallsMade: 0 };
try {
  const submission = join(root, "submission");
  copyTree("/app/submission", submission);
  if (!existsSync(join(submission, "entry.mjs")) || !existsSync(join(submission, "checker.mjs"))) throw Error("missing required deliverable");
  const service = await execute(submission);
  summary.service = service.every((c) => c.failures.length === 0);
  for (const cell of service) for (const [name, passed] of Object.entries(cell.checks)) {
    testResults.push({ name: `service/${cell.scenarioId}/${name}`, status: passed ? "passed" : "failed", duration: 0 });
  }
  writeFileSync(join(privateRoot, "service.json"), JSON.stringify(service));
  if (summary.service || process.argv.includes("--validate")) {
    phase = "calibration";
    const cases = [], labels = new Map(), candidateDirectories = [];
    const variants = existsSync("/tests/variants") ? readdirSync("/tests/variants").sort().map(n => ({name:"variants/"+n,expected:true})) : [];
    const candidates = [{ name: "reference", expected: true }, { name: "alternative", expected: true }, ...variants, ...controls.map((control) => ({ name: "reference", expected: false, control }))];
    for (const row of candidates) {
      const candidateDirectory = candidate(row.name, row.control);
      const cells = await execute(candidateDirectory);
      // Candidate source is private author material; the submitted checker sees traces only.
      chmodSync(candidateDirectory, 0o700);
      candidateDirectories.push(candidateDirectory);
      const failures = cells.flatMap((c) => c.failures);
      if (row.expected ? failures.length > 0 : !failures.includes(row.control.check)) throw Error(`invalid author control: ${row.control?.id ?? row.name}`);
      if (row.control?.clean && cells.find((c) => c.scenarioId === row.control.clean)?.failures.length !== 0) throw Error(`non-activation failed: ${row.control.id}`);
      if (row.control?.isolation && !cells.every((c) => c.executions.every((e) => e.diagnostics.stdoutTail.includes('"isolation":["denied","denied","denied"]')))) throw Error("isolation control failed");
      const token = randomUUID();
      cases.push({ token, cells: strip(cells) }); labels.set(token, row.expected);
      summary.controls.push({ name: row.control?.id ?? row.name, passed: true, scenarios: cells.length });
    }
    // Opaque identifiers and shuffled order prevent an authoring-order label shortcut.
    cases.sort((a, b) => a.token.localeCompare(b.token));
    if (checkerConfig.tokenCoverage === "opaque-v1") {
      const opaque = ["__proto__", "constructor", "toString", "", "0", "01", "token/λ"];
      const expected = cases.map(c => labels.get(c.token));
      labels.clear();
      cases.forEach((c, i) => {
        c.token = opaque[i] ?? c.token;
        labels.set(c.token, expected[i]);
      });
    }
    phase = "checker";
    const result = checker(submission, cases);
    summary.checker = result.passed && cases.every(({ token }) => result.verdicts[token].ok === labels.get(token));
    summary.checkerCorrect = result.passed ? cases.filter(({ token }) => result.verdicts[token].ok === labels.get(token)).length : 0;
    summary.checkerTotal = cases.length;
    for (const { token } of cases) testResults.push({ name: `checker/${token}`, status: result.passed && result.verdicts[token].ok === labels.get(token) ? "passed" : "failed", duration: 0 });
    writeFileSync(join(privateRoot, "checker-result.json"), JSON.stringify(result));
    writeFileSync(join(privateRoot, "checker-cases.json"), JSON.stringify({ cases, labels: Object.fromEntries(labels) }));
    if (process.argv.includes("--validate")) {
      phase = "integrity";
      summary.integrity = integrityChecks(submission, cases, labels, candidateDirectories);
      if (summary.integrity.some((r) => !r.passed)) throw Error("Native integrity validation failed");
    }
  }
  summary.reward = Number(summary.service && summary.checker);
} catch (error) {
  summary.error = String(error.stack ?? error); summary.reward = 0;
  summary.infrastructureError = phase === "calibration" || phase === "integrity";
  testResults.push({ name: `${phase}/execution`, status: "failed", duration: 0, message: summary.error });
}
// Host-mounted output permissions can differ from container permissions. Keep all
// private labels internal until no submitted processes remain, then atomically replace
// output files. Never follow a submission-created output symlink.
reapSubmittedProcesses();
function publish(name, bytes) {
  const temporary = `/logs/verifier/.trusted-${randomUUID()}`;
  writeFileSync(temporary, bytes, { flag: "wx", mode: 0o600 });
  renameSync(temporary, `/logs/verifier/${name}`);
}
if (existsSync(join(privateRoot, "checker-cases.json"))) publish("checker-cases.json", readFileSync(join(privateRoot, "checker-cases.json")));
publish("summary.json", JSON.stringify(summary, null, 2) + "\n");
publish("ctrf.json", JSON.stringify({ results: { tool: { name: "foundry-native-harbor" }, summary: {
  tests: testResults.length, passed: testResults.filter((t) => t.status === "passed").length,
  failed: testResults.filter((t) => t.status === "failed").length, pending: 0, skipped: 0, other: 0,
  start: startedAt, stop: Date.now(),
}, tests: testResults } }, null, 2) + "\n");
if (summary.infrastructureError) {
  try { unlinkSync("/logs/verifier/reward.txt"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  process.exitCode = 1;
} else publish("reward.txt", `${summary.reward}\n`);
console.log(JSON.stringify(summary));
