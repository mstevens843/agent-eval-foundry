// Rejudge retained audit cases with only the public case file and submission mounted.
// No authority files, expected answers, previous outcomes, or provider credentials enter the container.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2]);
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const audit = read(join(out, 'summary.json'));
const record = join(root, audit.record), submission = join(record, 'submission');
const frozen = join(root, '.local/successor-adaptive-trials-2026-09-11/frozen-source');
const api = await import(pathToFileURL(join(frozen, 'dist/index.js')));
const slot = read(join(root, '.local/ticket-consolidation-continuation-v3-2026-09-11/slots/attempt-6/slot.json'));
const pkg = api.executionPackage(join(root, slot.packageDirectory));
assert.equal(pkg.snapshot.record.digest, audit.packageDigest);
const runtime = JSON.parse(Buffer.from(api.readSnapshotFile(pkg.snapshot, 'dependencies', 'runtime.json')).toString());
const manifestBefore = api.verifyEvidence(record);
const code = `import {readFileSync,existsSync} from 'node:fs';
function freeze(x){if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x)}return x;}
if(existsSync('/input/authority')||existsSync('/input/checker-truth.json'))throw Error('private audit files exposed');
const input=freeze(JSON.parse(readFileSync('/input/cases.json'))), before=JSON.stringify(input);
const {run}=await import('/submission/checker.mjs'); const first=await run(input), second=await run(input);
process.stdout.write(JSON.stringify({first,second,inputUnchanged:before===JSON.stringify(input)}));`;
const name = 'foundry-ticket-six-isolated-' + randomUUID();
let result;
try {
  result = JSON.parse(execFileSync('docker', ['run', '--name', name, '--pull=never', '--network=none',
    '--read-only', '--user=1000:1000', '--cpus=1', '--memory=1g', '--pids-limit=128',
    '--cap-drop=ALL', '--security-opt=no-new-privileges', '--tmpfs=/tmp:rw,size=32m',
    '--mount', `type=bind,src=${submission},dst=/submission,readonly`,
    '--mount', `type=bind,src=${join(out, 'checker-input.json')},dst=/input/cases.json,readonly`,
    runtime.image, 'node', '--input-type=module', '-e', code],
    { encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024 }));
} finally { try { execFileSync('docker', ['rm', '-f', name], { stdio: 'ignore' }); } catch {} }
assert(result.inputUnchanged); assert.deepEqual(result.first, result.second);
const truth = read(join(out, 'checker-truth.json'));
assert.equal(Object.keys(result.first.verdicts).length, truth.length);
const mismatches = truth.filter(row => result.first.verdicts[row.token]?.ok !== row.expected)
  .map(row => ({ label: row.label, expected: row.expected, actual: result.first.verdicts[row.token]?.ok }));
assert.deepEqual(mismatches, audit.submittedChecker.mismatches.map(({ label, expected, actual }) => ({ label, expected, actual })));
assert.deepEqual(api.verifyEvidence(record), manifestBefore);
const summary = { providerCallsMade: 0, total: truth.length, correct: truth.length - mismatches.length,
  falseAccepts: mismatches.filter(row => row.actual).length, falseRejects: mismatches.filter(row => !row.actual).length,
  mismatches, inputUnchanged: true, deterministic: true, privateAuditFilesNotMounted: true,
  inputSha256: hash(join(out, 'checker-input.json')), sourceSha256: hash(fileURLToPath(import.meta.url)),
  originalEvidenceFilesVerified: manifestBefore.files.length, record: relative(root, record) };
writeFileSync(join(out, 'isolated-checker-replay.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(summary));
