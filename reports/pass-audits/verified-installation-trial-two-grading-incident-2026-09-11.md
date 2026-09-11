# Verified Installation trial 2 grading incident — 2026-09-11

Recommendation: rerun grading once on the exact retained submission using the frozen package and runtime. Do not repeat the model invocation. This inspection did not dispatch a provider or execute the recovery command below.

Directly verified:

- Trial: `verified-installation-repair` v2.0.1, trial 2, Claude.
- Frozen package digest: `5796a522e5ca55610974eba98e43b43d3d47266e458274eb50d4e23aa264ef45`.
- All 950 original evidence files pass `verifyEvidence`.
- Provider capture: completed, exit code 0, not truncated, no capture error.
- Saved service grading: 55/55 cells `semantic-pass`.
- The later grading failure is `LOCAL_PROCESS docker: input: Error: write EPIPE`, followed by `Cannot connect to the Docker daemon at unix:///Users/devlegacy/.docker/run/docker.sock`.
- Original classification: `invalid-execution`, stage `grading`. No scored trial 2 reward is available.
- The controller correctly stopped this package with trial 1 counted as a failure and trial 2 unscored. A completed provider transcript or its self-reported tests do not establish that the submitted checker passes.

The existing frozen `regradeExecution` function creates a separate immutable linked record, verifies the original before and after, and uses the original submission with full service and checker grading. It sets `newAgentAttempts: 0` and `countsAsModelFailure: false`; it does not repair the campaign ledger or resume the controller.

Run from `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`:

```sh
node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { executionPackage, regradeExecution, verifyEvidence } from './.local/successor-adaptive-trials-2026-09-11/frozen-source/dist/index.js';

const campaign = '.local/successor-adaptive-trials-2026-09-11';
const slot = JSON.parse(readFileSync(campaign + '/slots/verified-installation-repair/trial-2/slot.json', 'utf8'));
const original = slot.runRoot + '/jobs/real-provider/records/verified-installation-repair-attempt-1';
assert.equal(executionPackage(slot.packageDirectory).snapshot.record.digest, slot.packageDigest);
verifyEvidence(original);
const result = await regradeExecution(
  original,
  slot.packageDirectory,
  '.local/verified-installation-t2-grading-recovery-2026-09-11',
  'grading-only'
);
console.log(result);
NODE
```

Use this fresh output location once. Preserve any new failure as an incident rather than repeatedly invoking the command. The Docker daemon must be reachable from the process running it; no provider token is needed for offline grading.

After completion, verify the linked record and inspect its `result.json` and `grading/checker-grade/grade-summary.json`. Report service completeness, checker classification details, combined reward, original/new evidence digests, and zero new agent attempts. Preserve the original unscored incident. Do not overwrite its `grade.json` or `completion.json`, delete launch receipts, or restart the campaign controller to force continuation. The controller has no supported incident-resume command; any continuation needs explicit reconciliation with the linked grading evidence while preserving slot/provider accounting.
