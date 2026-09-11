// Rejudge the retained audit with the corrected checker and public inputs only.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
assert(process.argv[2] && process.argv[3], 'Usage: replay-ticket-seven-corrected-checker.mjs CORRECTION AUDIT');
const correction = resolve(process.argv[2]), audit = resolve(process.argv[3]);
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const summary = read(join(audit, 'summary.json')), prepared = read(join(correction, 'PREPARED.json'));
const api = await import(pathToFileURL(join(repo, '.local/successor-adaptive-trials-2026-09-11/frozen-source/dist/index.js')));
const original = join(repo, summary.record), before = api.verifyEvidence(original);
const pkg = api.executionPackage(join(correction, 'build'));
assert.equal(pkg.snapshot.record.digest, prepared.packageDigest);
const runtime = JSON.parse(Buffer.from(api.readSnapshotFile(pkg.snapshot, 'dependencies', 'runtime.json')).toString());
const submission = join(correction, 'source/tasks/ticket-consolidation-repair/private/reference');
const code = `import {readFileSync} from 'node:fs';
function freeze(x){if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x)}return x;}
const input=freeze(JSON.parse(readFileSync('/input/cases.json'))), before=JSON.stringify(input);
const {run}=await import('/submission/checker.mjs'); const first=await run(input), second=await run(input);
process.stdout.write(JSON.stringify({first,second,inputUnchanged:before===JSON.stringify(input)}));`;
const name = 'foundry-ticket-seven-corrected-' + randomUUID();
let result;
try {
  result = JSON.parse(execFileSync('docker', ['run', '--name', name, '--pull=never', '--network=none',
    '--read-only', '--user=1000:1000', '--cpus=1', '--memory=1g', '--pids-limit=128',
    '--cap-drop=ALL', '--security-opt=no-new-privileges', '--tmpfs=/tmp:rw,size=32m',
    '--mount', `type=bind,src=${submission},dst=/submission,readonly`,
    '--mount', `type=bind,src=${join(audit, 'checker-input.json')},dst=/input/cases.json,readonly`,
    runtime.image, 'node', '--input-type=module', '-e', code],
  { encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024 }));
} finally { try { execFileSync('docker', ['rm', '-f', name], { stdio: 'ignore' }); } catch {} }
assert(result.inputUnchanged); assert.deepEqual(result.first, result.second);
const truth = read(join(audit, 'checker-truth.json'));
assert.equal(Object.keys(result.first.verdicts).length, truth.length);
const mismatches = truth.filter(row => result.first.verdicts[row.token]?.ok !== row.expected);
assert.deepEqual(mismatches, []);
assert.deepEqual(api.verifyEvidence(original), before);
const report = { providerCallsMade: 0, passed: true, packageDigest: prepared.packageDigest,
  total: truth.length, correct: truth.length, falseAccepts: 0, falseRejects: 0,
  inputUnchanged: true, deterministic: true, privateAuditFilesNotMounted: true,
  originalEvidenceFilesVerified: before.files.length,
  evidence: ['summary.json', 'checker-input.json', 'checker-truth.json'].map(name => ({
    path: relative(repo, join(audit, name)), sha256: hash(join(audit, name)) })),
  correctedCheckerSha256: hash(join(submission, 'checker.mjs')),
  sourceSha256: hash(fileURLToPath(import.meta.url)) };
writeFileSync(join(correction, 'corrected-audit-replay.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: true, correct: truth.length, providerCallsMade: 0 }));
