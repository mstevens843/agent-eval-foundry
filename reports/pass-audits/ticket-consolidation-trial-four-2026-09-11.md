# Ticket Consolidation Codex trial 4 — pass audit, 2026-09-11

**Disposition: the overall reward-1 result is a reproduced false positive in required-checker validation. Do not certify it as a clean pass.** The submitted service passes the existing scenarios and the fresh service scenarios tested here. Its required checker accepts real executions that violate checks already enforced by this frozen task. The 17-candidate checker bank did not expose those omissions.

This finding does not indicate intentional cheating. It is a submitted-checker defect combined with incomplete benchmark validation coverage.

The original trial record and campaign stop state remain unchanged. This audit adds separate evidence only. No model calls, new trials, changes to package bytes, controller changes, commits, or pushes were made.

## Identity and reproduction

- Task: `ticket-consolidation-repair` v2.0.1; adaptive campaign trial 4; first Codex attempt after three Claude attempts.
- Frozen package digest: `39f2a285b88072ca203ca0ad1998517269e0a376daa00b52cc252dffa79916cb`.
- Record: `.local/successor-adaptive-trials-2026-09-11/slots/ticket-consolidation-repair/trial-4/real-campaign-frozen/jobs/real-provider/records/ticket-consolidation-repair-attempt-1`.
- Recorded grade: service 69/69, required checker 17/17, reward 1.
- All 924 evidence files verified before and after this audit. The issued instruction, semantics, API types, and checker interface matched the frozen snapshot hashes.
- Submitted entry SHA-256: `e4446cebaef971d7be38a8b4c18e9729437b528773f4f4186bbaca24632539c3`.
- Submitted checker SHA-256: `e3a013392b3759962099cf511a8101bd2104503eea8604274855a6afe3b99fa3`.
- Detailed audit output: `.local/ticket-consolidation-trial-four-pass-audit-2026-09-11-final`.
- Portable summary: `reports/pass-audits/ticket-consolidation-trial-four-2026-09-11.json`.
- Rerun: `node scripts/audit-ticket-consolidation-trial-four.mjs .local/ticket-t4-audit-FRESH-NAME`. The output directory must not exist. Requires the retained campaign and its pinned Docker runtime. Makes no provider calls.

## Primary finding: non-applied requests are skipped

At line 281 of the retained submitted `checker.mjs`:

```js
if (call.status !== "APPLIED") continue;
```

Both membership validation and patch-schema validation occur after this early exit. Consequently the checker never applies those requirements to a `CONFLICT` or `MISSING` call.

The frozen task's `domain.mjs` already requires **every** batch-row request to target the frozen selection and have a valid patch (`calls.every(c => c.selected && c.validPatch)`). Its membership clause independently rejects any touched identity outside the selection. The frozen reference checker also checks every attempted request before handling its status. These are pre-existing rules, not audit additions to the service or private verifier.

The public contract limits migration membership to allowed/open snapshot rows, says closed/unrelated tickets must never be written, and limits update patches to an owner string and labels array while forbidding writes to note, status, revision, and other columns. The checker contract requires a verdict on each independent execution and exposes all batch-row requests and their before-states.

For clarity, the scope prohibition is interpreted here as it was implemented before this trial: it covers submitted batch writes, including conflicting attempts. The public wording could explicitly say "attempted writes" to remove a possible landed-effects-only reading; an earlier analysis already noted that interpretive distinction. Malformed typed patches also provide independent witnesses. No new rule was silently installed to obtain these results.

## Minimal executed witness

Start with one selected open A ticket, one closed A ticket, and one unrelated X ticket. All start at revision 10. Complete the selected migration correctly. Then submit the closed A ticket with revision 9 and otherwise unchanged owner/labels.

The final call recorded by the real protected host is:

```json
{
  "request": {
    "tenant": "A",
    "id": "closed",
    "revision": 9,
    "patch": { "owner": "old", "labels": ["private"] }
  },
  "before": {
    "tenant": "A", "id": "closed", "status": "closed", "revision": 10,
    "owner": "old", "labels": ["private"], "note": "original"
  },
  "status": "CONFLICT"
}
```

The execution returns normally after 8 API calls. Completion, ownership, labels, conditional writes, and execution checks pass; **preservation and membership fail**. The frozen reference checker rejects. The saved Codex checker returns **`{ok:true}`**. No final-state corruption or fabricated trace is needed to expose the missing history check.

An independent second witness completes the migration, then submits a stale update to a selected ticket with an additional `patch.note` field. The real host records `CONFLICT` and rejects the run under preservation because the patch is forbidden. The saved checker again accepts. Replacing the owner with a number or labels with a string reproduces the same skipped-schema problem.

## Coverage demonstrated

| Executed fault | Existing task/reference | Submitted checker |
| --- | --- | --- |
| Closed snapshot ticket, stale-revision update | Reject | **Accept** |
| Unrelated tenant ticket, stale-revision update | Reject | **Accept** |
| Update to a missing identity in an unrelated tenant | Reject | **Accept** |
| Conflicting patch includes forbidden note | Reject | **Accept** |
| Conflicting patch includes forbidden status | Reject | **Accept** |
| Conflicting patch includes forbidden revision | Reject | **Accept** |
| Conflicting patch has a numeric owner | Reject | **Accept** |
| Conflicting patch has a non-array labels value | Reject | **Accept** |

Each of these eight fault variants was executed under three conflict schedules: **24 newly executed false-accept cells**, all through the unchanged protected host. They are variations of two missing obligations—request membership and request schema—not eight unrelated root causes.

Two additional reference-backed faulty candidates were run across **all 69 unchanged original scenarios**:

| New candidate on original scenario bank | Service semantic-fail cells | Service semantic-pass cells | Submitted candidate verdict |
| --- | --- | --- | --- |
| Correct migration, then a conflicting write to a closed ticket | 65 | 4 | **Accept** |
| Correct migration, then a conflicting patch with forbidden note | 68 | 1 | **Accept** |

The controls skip the extra request when the public operation budget is below 100; the closed-row control also stays clean if there is no closed row. This deliberately avoids an unrelated budget/error failure masking the missing obligation. They do not use scenario IDs. Every failing cell is also judged individually. Both reference-backed candidates should be rejected as a whole, and the frozen reference checker does reject them.

The saved checker still classifies all 17 original candidates correctly. Thus the missing negative candidates are sufficient to explain how it received reward 1. No harder scenario, new semantic rule, weaker alternative, or modified submitted checker is required to demonstrate the gap.

## Service and valid-alternative checks

The exact submitted service passed **213/213 protected executions**: all 69 original scenarios plus 144 new ones. Fresh scenarios vary selected population sizes across the 16-row batch boundary, up to 28 total rows and 30 pages; 0–2 injected conflicts; later batch crash boundaries; status drift; overlapping/empty/expired pages; initially complete rows; and opaque tenant/team/marker strings including `__proto__`, empty strings, and markers matching concurrent-edit labels. These tests remain within the published bounds. The 100-row maximum with grouped pages was not separately exercised; no claim of universal service correctness is made.

The service uses a durable journal, qualifies identity by tenant and ticket ID, batches at most 16 rows, matches returned statuses by identity, and reconciles in-flight rows after lost responses. This is a permitted approach. The tested service results provide no reason to attribute its pass to leaked grader data or to disregard its correct repair behavior.

Fresh positive strategies include sequential read/conditional settlement, setting owner before adding the marker, redundant equivalent updates, and correctly formed selected-row requests that conflict. All were accepted. A stale but correctly shaped selected-row patch that would drop labels **if it landed** is also correctly accepted when it conflicts without effect: history validation must check request membership/schema for all calls and apply label-preservation checks when effects actually land. Simply rejecting every CONFLICT is not a valid repair to the checker bank.

Existing negative obligations also remain effective: applied forbidden patches, transient applied label loss followed by restoration, applied writes to closed tickets, wrong final owner, missing marker, live-status membership filtering, completed-then-thrown errors, and operation-budget exhaustion were rejected by the submitted checker in the fresh executions.

## Supplementary disagreement: temporary owner

Three executions temporarily set a selected ticket's owner to a third string, then restore the correct target owner without changing labels or collateral fields. The existing task grader and reference checker accept; the submitted checker rejects because it only permits a write to the previous owner or final target owner.

This is a separate strictness disagreement. The public text could be read as requiring target-directed owner writes throughout, although the current grader enforces ownership at completion and permits the intermediate owner. Record it for contract review; it is **not needed for the primary false-positive disposition**. Do not quietly change that interpretation after seeing this submission.

## Verification counts and limits

- 417 new protected service executions in the final audit run: 213 submitted-service replays, 66 fresh strategy executions, and 138 full-bank control executions.
- 461 checker cases, containing original candidate groups plus grouped/individual fresh executions and opaque-token checks. These are not 461 new model trials or independent service executions.
- Frozen reference checker matched the independently derived outcomes on 461/461 cases.
- Submitted checker matched 289/461. Its 168 false-accept case judgments include aggregate/individual judgments over the same 157 invalid execution cells and one repeated opaque-token presentation; do not present these as 168 separate bugs. Four rejection disagreements represent the three temporary-owner executions plus their group verdict.
- Checker verdicts were deterministic, inputs remained unchanged, and reversed candidate/cell order plus changed diagnostic reports did not alter results. The two submitted-checker invocations took about 50 ms combined.
- Independent oracle and authoritative grader had zero discrepancies on the executed cells compared. The oracle reads public problem inputs, operation pre-states, external edit facts, and final state; it does not use candidate reports, host semantic verdicts, or the reference checker to determine expected results.
- All submitted/variant service code ran through the unchanged protected RPC host in network-disabled Docker. Checkers ran separately with read-only inputs and no authority mount. Tests were authored during this review; this is not a blind held-out author/model set.

## Recommended next action

Keep this package paused while the checker-bank gap is corrected and validated. Preserve the original reward-1 record as historical evidence, with an appended audit disposition identifying the checker-validation false positive. Do not silently convert it into a counted clean model failure, edit its submission, or launch trial 5 under the same incomplete checker bank.

For a new audited package build, add executed negative controls covering non-applied forbidden membership and malformed patches, including a clean witness for each. Retain positive conflicting requests and different valid migration strategies. Add a checker-weakening regression that removes membership/schema validation from non-APPLIED requests and must fail the validation bank. The authoritative task grader already detects the reproduced defects; strengthening the candidate bank is the primary missing work. Clarify the two wording questions above without introducing hidden requirements.

Revalidate the new package through the normal protected oracle/control, checker, integrity and export checks. Regrade preserved submissions consistently against that new digest as linked diagnostic evidence. Any future provider trials must be attributed to that newly validated package identity; earlier records stay attributable to their original digest. Other running packages need no interruption because of this task-local finding.
