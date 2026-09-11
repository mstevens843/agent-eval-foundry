# Ticket Consolidation attempt 6: false-pass audit and marker coverage correction

Physical attempt 6 (Codex, v2.0.3) is a reproduced **benchmark false pass**. Its required checker rejects a valid migration that settles ownership first and adds the marker later, before returning. The 32-candidate bank did not exercise that valid strategy. The submitted service passed all fresh executions; this audit found no accepted invalid execution in the submitted checker.

The separate [machine-readable disposition](ticket-consolidation-attempt-six-2026-09-11.json) records **null**, neither a clean pass nor a counted clean failure. Original reward 1, submission, completion, and continuation records remain unchanged. The gap is fixed and validated in **v2.0.4**. No model calls, commits, or pushes were made by this audit or correction.

## What the issued rules allow

The issued v2.0.3 `SEMANTICS.md` already says, “At completion the marker occurs once (labels are sets).” It requires preservation of current labels on landed writes and correct final ownership and labels; it does not require the marker in every intermediate write. It also permits repeated equivalent updates and temporary ownership before completion. This finding does not depend on a new obligation added after the trial: the frozen service verifier and frozen reference checker both accept the witness under the issued rules.

In the minimal protected execution, selected tenant `A`, ticket `selected`, starts open at revision 10, owner `old`, labels `["keep"]`. An external status flip closes it after snapshot selection. Membership remains frozen, so it must still be migrated.

1. A revision-10 write sets `{owner:"A:care", labels:["keep"]}` and lands.
2. A revision-11 write sets `{owner:"A:care", labels:["keep","migrated"]}` and lands.
3. The migration returns normally with the correct owner, exactly one marker, all existing labels and other fields preserved, and the external closed status intact. It uses 12 of 4,000 available operations.

All seven authoritative checks pass. The saved checker rejects it with **“an applied update did not add the marker exactly once”** because it imposes that condition on the first write. The same defect reproduces with zero, one, and two conflicts. These are three executable witnesses plus an aggregate candidate judgment, not four independent bugs.

## Audit scope and evidence

Original package digest: `bde0e2b5f7329bf06bea37992b7348a16f3ecd9c9178be9efcbf0d9cdd3344ac`.

Original record:
`.local/ticket-consolidation-continuation-v3-2026-09-11/slots/attempt-6/real-campaign-frozen/jobs/real-provider/records/ticket-consolidation-repair-attempt-1`.

Saved checker SHA-256: `244941f37849c958f11e9ed62bd4169966b70bbae9057de767b279cf32595f9a`.

Audit output: `.local/ticket-consolidation-attempt-six-audit-2026-09-11/`.

- **265/265 saved-service executions pass:** all 73 issued scenarios plus 192 fresh scenarios covering literal identity collisions, pagination, conflicts, status drift, crash recovery, already-correct rows, labels, and batch populations within the public bounds.
- **598 protected service executions** in total include the saved service, alternate valid strategies, and faulty candidates. The latter cover attempted writes outside snapshot membership, invalid patch fields and types, lost labels, wrong ownership, missing markers, live membership, execution errors, and budget overruns. Full-bank probes exercise the earlier request and directory corrections.
- **658 checker judgments:** the saved checker gets 654 correct, with **zero false accepts and four false-reject judgments** from the staged-marker defect. The frozen reference checker gets 658/658. The independently coded public-rule predicate agrees with the authority on all compared executions.
- Determinism, input immutability, opaque tokens, reordered cases/cells, and changed diagnostic reports were checked. A separate Docker replay mounts only the exact case-input file and saved submission, without private audit/authority files, and reproduces the same 654/658 result. See `isolated-checker-replay.json`.
- All **2,333 original attempt-6 evidence files** verify before and after the audit. The correction's broader historical replay verifies all **7,668 files** across physical attempts 1–6; original completion, grade, and submission hashes remain identical.

These are executable probes and a separate rule implementation, not an independently held-out author/model bank. Finite testing does not establish universal correctness. This audit identifies one reproduced omission and verifies its repair without claiming the absence of every possible remaining defect.

## Implemented correction

The bank now includes two complementary executable candidates:

- **Valid `variant-deferred-marker`:** preserve labels while settling ownership, then complete the marker phase. It passes all 73 scenarios, including conflicts, status drift, crash/redelivery, and tight budgets. It skips the optional extra phase when the public operation cap is small.
- **Faulty `owner-only-unfinished`:** settle ownership but omit the marker phase. It fails 70/73 scenarios and retains clean witnesses where no marker work remains or the small-budget path uses the correct implementation.

The public documentation explicitly distinguishes completion from intermediate writes. The service verifier, reference checker, existing reference service, and all 73 scenario bytes are unchanged from v2.0.3. No implementation architecture is mandated. The bank grows from 32 to **34 candidates: seven valid and 27 faulty**.

Frozen corrected package:
`.local/ticket-marker-correction-2026-09-11/build`.

Foundry v2.0.4 digest: `6d8179c6d01c8bbd4def8e1537292b34325691c8320f321faa07bb2e65191729`.

Native export digest: `3e1de71b0703050959d996b544b8a375e97af0f1ae6edc880a8cfe637670125c`.

Readiness: `.local/ticket-marker-correction-2026-09-11/READY.json`.

Validation passed:

- **37/37 Foundry assurance checks**, reference checker **34/34**.
- Native Harbor grader in Docker: **oracle reward 1, nop reward 0, eight of eight integrity checks pass**.
- **2,482 protected candidate/scenario comparisons**, zero disagreements with the independent rule predicate; 2,413 local author-validation comparisons also agree.
- **17 checker mutations caught**, including the previous 15 regressions and both new directions. Requiring a marker on every landed write rejects the new valid candidate. Removing the reference checker's final-marker requirement accepts the unfinished candidate and no other candidate, showing that the new negative supplies distinct coverage.

All six saved submissions were regraded through the normal protected path on the correction:

| Physical attempt | Provider | Service | Required checker | Diagnostic reward |
| --- | --- | --- | --- | --- |
| 1 | Claude | 73/73 pass | Output validation failed | 0 |
| 2 | Claude | 73/73 pass | Output validation failed | 0 |
| 3 | Claude | 73/73 pass | Output validation failed | 0 |
| 4 | Codex | 73/73 pass | 25/34 | 0 |
| 5 | Codex | 73/73 pass | 26/34 | 0 |
| 6 | Codex | 73/73 pass | **33/34: rejects only the valid deferred-marker candidate** | **0** |

Each linked regrade contributes zero model attempts and zero newly counted model failures. The grader's `false-positive` counter means rejected valid candidates; its `missed` counter means accepted invalid candidates. Attempt 6 has one of the former and zero of the latter on the corrected bank. No original reward was overwritten.

## Accounting and next attempt

There have been **six real provider calls** for Ticket Consolidation: three Claude failures and three Codex benchmark false passes. Physical attempts **4, 5, and 6 are audited nulls**. There remain **three eligible counted outcomes**, all historical Claude failures. These are historical results on earlier package digests; the linked regrades do not create fresh model trials on v2.0.4.

The next physical attempt is **7**, Codex, and would be eligible counted trial **4** if scored. A fresh, exclusively owned slot is prepared and verified at `.local/ticket-consolidation-continuation-v4-2026-09-11/slots/attempt-7/slot.json`, with no dispatch. It reuses only the frozen runtime as a read-only dependency. No old controller or slot was reused.

The [copyable next-attempt prompt](ticket-consolidation-v4-next-attempt-prompt-2026-09-11.md) requests exactly one fresh attempt, followed by a report and stop. It preserves the six-counted-trial policy and excludes the three audited nulls. No other package's result or campaign was changed.

## Reproduce without model calls

Use fresh output directories; retained historical evidence and the pinned runtime are required. Correction preparation reads the current task source, so reproducing this exact digest also requires the frozen source recorded in `PREPARED.json`.

```sh
node scripts/audit-ticket-consolidation-attempt-six.mjs .local/ticket-attempt-six-audit-FRESH
node scripts/replay-ticket-six-checker-isolated.mjs .local/ticket-attempt-six-audit-FRESH
node scripts/validate-ticket-marker-correction.mjs prepare .local/ticket-marker-correction-FRESH
node scripts/validate-ticket-marker-correction.mjs foundry .local/ticket-marker-correction-FRESH
node scripts/validate-ticket-marker-correction.mjs native .local/ticket-marker-correction-FRESH
node scripts/regress-ticket-marker-correction.mjs .local/ticket-marker-correction-FRESH
node scripts/validate-ticket-marker-correction.mjs regrade .local/ticket-marker-correction-FRESH
node scripts/validate-ticket-marker-correction.mjs finish .local/ticket-marker-correction-FRESH
```
