// Publish a fixed historical checkpoint from retained evidence; never dispatch or regrade.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSuccessorResults } from './successor-screening-results.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
assert(['write', 'verify'].includes(mode), 'Use publish-successor-results.mjs write|verify');
const read = p => JSON.parse(readFileSync(join(root, p), 'utf8'));
const sha = p => createHash('sha256').update(readFileSync(join(root, p))).digest('hex');
const ref = p => ({ path: p, sha256: sha(p) });
const main = '.local/successor-adaptive-trials-2026-09-11';
const cont = '.local/verified-installation-continuation-2026-09-11';
const preparation = read('reports/screening/evidence/2026-09-11-successor-adaptive-trials-preparation.json');
const api = await import(pathToFileURL(join(root, main, 'frozen-source/dist/index.js')));
const events = p => readFileSync(join(root, p), 'utf8').trim().split('\n').filter(Boolean).map(s => JSON.parse(s));
const launches = [
  ...events(main + '/events.jsonl').filter(e => e.stage === 'launch').map(e => ({ ...e, owner: 'main' })),
  ...events(cont + '/events.jsonl').filter(e => e.stage === 'launch').map(e => ({ ...e, id: e.id ?? e.task, owner: 'continuation' })),
];
let originalDispatched = 0;
for (const slot of preparation.slots) {
  const claimed = existsSync(join(root, slot.runRoot, 'DISPATCH-CLAIM'));
  const matches = launches.filter(e => e.id === slot.id && e.trial === slot.trial);
  assert.equal(matches.length, claimed ? 1 : 0, 'unknown or duplicate original-pool launch');
  if (claimed) {
    assert(existsSync(join(root, slot.runRoot, 'jobs/real-provider/records', slot.id + '-attempt-1/dispatch.started')));
    originalDispatched++;
  }
}
assert.equal(originalDispatched, 24);
assert.equal(launches.length, 24);
const identities = new Set();
const verified = [];
function summarize(slotPath, trial) {
  const slot = read(slotPath);
  assert.equal(slot.trial, trial);
  const record = slot.runRoot + '/jobs/real-provider/records/' + slot.id + '-attempt-1';
  assert(!identities.has(record), 'duplicate physical record'); identities.add(record);
  assert(existsSync(join(root, record, 'dispatch.started')));
  const manifest = api.verifyEvidence(join(root, record));
  const completion = read(record + '/completion.json'), result = read(record + '/result.json');
  const grade = read(record + '/grade.json'), capture = read(record + '/capture.json');
  const profile = read(record + '/profile.json');
  assert(completion.complete);
  assert.equal(completion.identity.packageDigest, slot.packageDigest);
  assert.equal(result.packageDigest, slot.packageDigest);
  assert.equal(profile.target, slot.target);
  assert.equal(api.profileDigest(profile), result.profileDigest);
  assert.equal(result.profileDigest, completion.identity.profileDigest);
  assert.equal(result.accounting.billingMode, 'subscription-only');
  assert.equal(result.retryOf, null);
  assert.equal(capture.status, 'completed'); assert.equal(capture.exitCode, 0);
  assert.equal(capture.error, null); assert.equal(capture.truncated, false);
  const summaryPath = record + '/grading/checker-grade/grade-summary.json';
  const checker = existsSync(join(root, summaryPath)) ? read(summaryPath) : null;
  const invalid = grade.classification === 'invalid-execution';
  if (!invalid) {
    assert(grade.evaluation.complete);
    for (const k of ['missingIds', 'unexpectedIds', 'duplicateIds']) assert.deepEqual(grade.evaluation[k], []);
    assert.equal(grade.reward, grade.evaluation.status === 'semantic-pass' && grade.checkerPassed ? 1 : 0);
  }
  const row = {
    trial, provider: slot.target, version: slot.version, packageDigest: slot.packageDigest,
    profileDigest: result.profileDigest, executionSourceDigest: result.executionSourceDigest,
    completionSha256: sha(record + '/completion.json'), gradeSha256: sha(record + '/grade.json'),
    resultSha256: sha(record + '/result.json'), captureSha256: sha(record + '/capture.json'),
    submissionEntrySha256: sha(record + '/submission/entry.mjs'), submissionCheckerSha256: sha(record + '/submission/checker.mjs'),
    manifestFilesVerified: manifest.files.length, manifestBytesVerified: manifest.files.reduce((n, f) => n + f.size, 0),
    recordedReward: invalid ? null : grade.reward, countedReward: invalid ? null : grade.reward,
    disposition: 'retained', captureCompleted: true, checkerRequired: grade.checkerRequired ?? null,
    service: invalid ? { outcome: 'unavailable', complete: false, cases: 0 } : {
      outcome: grade.evaluation.status, complete: grade.evaluation.complete, cases: grade.evaluation.observedIds.length },
    checkerPassed: grade.checkerPassed ?? null,
    checker: checker ? { correct: checker.correct, total: checker.total,
      rejectedValid: checker.falsePositives, acceptedInvalid: checker.missed } : null,
    checkerFailureKind: invalid || grade.checkerPassed ? null : checker ? 'classification-error' : 'output-validation-failure',
    requested: profile.requested,
    observedModel: result.observation?.model ?? null,
    observedEffort: result.observation?.effort ?? null,
    runtimeModelEvidenceEligible: result.modelEvidenceEligible,
    runtimeCountsAsModelFailure: result.countsAsModelFailure,
    billingMode: result.accounting.billingMode, milliseconds: capture.milliseconds,
  };
  verified.push({ record, completion: row.completionSha256, grade: row.gradeSha256 });
  return row;
}
const meta = [
  ['compatible-rollout-repair', 5, 'Compatible rollout', 'original-five'],
  ['partial-release-repair', 8, 'Partial release', 'next-five'],
  ['ticket-consolidation-repair', 9, 'Ticket consolidation', 'next-five'],
  ['verified-installation-repair', 12, 'Verified installation', 'third-five'],
  ['capacity-maintenance-repair', 13, 'Capacity maintenance', 'third-five'],
];
const packages = meta.map(([id, number, name, group]) => ({ id, number, name,
  analysis: `reports/screening/${group}/${String(number).padStart(2, '0')}-${id}.md`,
  attempts: launches.filter(l => l.id === id).sort((a,b) => a.trial-b.trial)
    .map(l => summarize(`${main}/slots/${id}/trial-${l.trial}/slot.json`, l.trial)),
}));
const find = id => packages.find(p => p.id === id);
const supplemental = [
  ['partial-release-repair', 3, '.local/partial-release-generation-continuation-2026-09-11/slots/trial-3/slot.json'],
  ['partial-release-repair', 4, '.local/partial-release-confirmation-2026-09-11/slots/trial-4/slot.json'],
  ['ticket-consolidation-repair', 5, '.local/ticket-consolidation-continuation-v2-2026-09-11/slots/attempt-5/slot.json'],
  ['ticket-consolidation-repair', 6, '.local/ticket-consolidation-continuation-v3-2026-09-11/slots/attempt-6/slot.json'],
];
for (const [id, trial, path] of supplemental) {
  const row = summarize(path, trial);
  if (id === 'partial-release-repair') row.authorizedConfirmation = true;
  find(id).attempts.push(row);
}
const audit6Path = 'reports/pass-audits/ticket-consolidation-attempt-six-2026-09-11.json';
const audit6 = read(audit6Path);
assert.deepEqual(audit6.accounting.excludedNullPhysicalAttempts, [4,5,6]);
for (const row of find('ticket-consolidation-repair').attempts.filter(a => a.trial >= 4)) {
  assert.equal(row.recordedReward, 1); row.countedReward = null; row.disposition = 'false-pass';
  row.audit = { ...ref(audit6Path), auditedReward: null };
  row.falsePassCause = ({ 4: 'request-membership-and-patch-schema', 5: 'literal-directory-identity', 6: 'valid-deferred-marker-rejected' })[row.trial];
}
const partialAudit = 'reports/pass-audits/partial-release-trial-three-2026-09-11.json';
assert.equal(read(partialAudit).auditedReward, 1);
for (const row of find('partial-release-repair').attempts) {
  if (row.trial === 2 || row.trial === 3) {
    row.disposition = 'pass-audit-retained'; row.audit = { ...ref(partialAudit), auditedReward: 1 };
  }
  if (row.trial === 4) row.disposition = 'recorded-pass-awaiting-audit';
}
const recovery = '.local/verified-installation-t2-grading-recovery-2026-09-11/grading-only';
const recovered = read(recovery + '/result.json');
const recoveredManifest = api.verifyEvidence(join(root, recovery));
const recoveredRow = find('verified-installation-repair').attempts.find(a => a.trial === 2);
assert.equal(recoveredRow.recordedReward, null);
assert.deepEqual(recovered.originalIdentity, read(verified.find(v => v.record.includes('/verified-installation-repair/trial-2/')).record + '/completion.json').identity);
assert.equal(recovered.originalCompletionDigest, recoveredRow.completionSha256);
assert.equal(recovered.targetPackageDigest, recoveredRow.packageDigest);
assert.equal(recovered.reward, 0); assert.equal(recovered.newAgentAttempts, 0);
assert.equal(recovered.countsAsModelFailure, false);
const reconciliationPath = 'reports/pass-audits/verified-installation-trial-two-reconciliation-2026-09-11.json';
const reconciliation = read(reconciliationPath);
assert.equal(reconciliation.original.completionSha256, recoveredRow.completionSha256);
assert.equal(reconciliation.regrade.resultSha256, sha(recovery + '/result.json'));
assert.equal(reconciliation.recoveredReward, recovered.reward);
Object.assign(recoveredRow, {
  countedReward: recovered.reward, disposition: 'grading-recovered', checkerRequired: recovered.checkerRequired,
  checkerPassed: recovered.checkerPassed, checkerFailureKind: 'output-validation-failure',
  service: { outcome: recovered.evaluation.status, complete: recovered.evaluation.complete, cases: recovered.evaluation.observedIds.length },
  recovery: { originalCompletionDigest: recovered.originalCompletionDigest, packageDigest: recovered.targetPackageDigest,
    reward: recovered.reward, newAgentAttempts: 0, countsAsNewModelFailure: false,
    resultSha256: sha(recovery + '/result.json'), completionSha256: sha(recovery + '/completion.json'),
    manifestFilesVerified: recoveredManifest.files.length, reconciliation: ref(reconciliationPath) },
});
const sourcePaths = [
  'reports/screening/evidence/2026-09-11-successor-adaptive-trials-preparation.json',
  'reports/screening/evidence/2026-09-11-successor-adaptive-trials-review.json',
  reconciliationPath, partialAudit, audit6Path,
];
const campaign = {
  schemaVersion: 1, date: '2026-09-11', checkpoint: 'successor-three-qualifiers-before-ticket-attempt-7',
  physicalProviderAttempts: identities.size, providerCallsMadeByPublication: 0,
  originalCampaign: { preparedSlots: 30, physicalAttempts: 24,
    mainLedgerLaunches: launches.filter(l => l.owner === 'main').length,
    continuationLedgerLaunches: launches.filter(l => l.owner === 'continuation').length,
    everyDispatchedSlotHasExactlyOneLaunch: true, mainFinalPresent: existsSync(join(root, main, 'FINAL.json')),
    controllerErrorPreserved: existsSync(join(root, main, 'CONTROLLER-ERROR.json')),
    controllerErrorSha256: sha(main + '/CONTROLLER-ERROR.json'),
    reconciliationSha256: sha(main + '/RECONCILED-SUMMARY.json'),
    mainEventsSha256: sha(main + '/events.jsonl'), continuationEventsSha256: sha(cont + '/events.jsonl') },
  supplementaryAttempts: supplemental.length,
  verifiedManifestFiles: verified.reduce((n, v) => n + read(v.record + '/completion.json').files.length, 0),
  sources: sourcePaths.map(ref), packages,
  limitations: [
    'Sanitized checkpoint of retained records; subsequent Ticket attempts are outside this snapshot.',
    'Reward-zero screening counts include required-checker failures, not only service failures.',
    'Requested model settings do not attest actual model identity or effort; runtime eligibility flags are preserved.',
    'The same __proto__ output mistake may recur across tasks; task counts are not independent mechanism counts.',
    'This publication verifies evidence integrity and accounting, not an independent false-pass/failure audit of every submission.',
    'Raw captures and full execution artifacts remain local; this portable subset is not complete raw-trial reproduction.',
  ],
};
const previousPath = 'reports/screening/evidence/2026-09-11-final-results.json';
const campaignPath = 'reports/screening/evidence/2026-09-11-successor-results.json';
const finalPath = 'reports/screening/evidence/2026-09-11-twelve-finalists.json';
const output = { schemaVersion: 1, date: campaign.date, evidenceClass: 'standard-screening-accounting',
  target: read(previousPath).target, ...buildSuccessorResults(read(previousPath), campaign) };
for (const v of verified) {
  assert.equal(sha(v.record + '/completion.json'), v.completion);
  assert.equal(sha(v.record + '/grade.json'), v.grade);
}
assert.equal(output.summary.packages, 12); assert.equal(output.summary.sixOfSix, 10);
assert.equal(output.summary.zeroRewards, 70); assert.equal(output.summary.countedTrials, 72);
if (mode === 'write') writeFileSync(join(root, campaignPath), JSON.stringify(campaign, null, 2) + '\n', { flag: 'wx' });
else assert.deepEqual(read(campaignPath), campaign);
output.sources = [ref(previousPath), ref(campaignPath)];
if (mode === 'write') writeFileSync(join(root, finalPath), JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
else assert.deepEqual(read(finalPath), output);
console.log(JSON.stringify({ mode, ...output.summary, successorPhysicalAttempts: campaign.physicalProviderAttempts,
  originalManifestFilesVerified: campaign.verifiedManifestFiles, linkedRegradeFilesVerified: recoveredManifest.files.length,
  providerCallsMade: 0 }));
