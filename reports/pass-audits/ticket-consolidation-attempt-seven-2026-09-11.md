# Ticket Consolidation attempt 7: false-pass audit and request-schema correction

Physical attempt 7 (Codex, v2.0.4) is another reproduced **benchmark false pass**. Its required checker rejects valid migrations carrying ignored metadata on an update request. The issued exact-field restriction applies to `patch`, not the outer request. The 34-candidate bank omitted this valid behavior.

The [machine-readable disposition](ticket-consolidation-attempt-seven-2026-09-11.json) records **null**, neither a clean pass nor a counted failure. Original reward 1 and all original trial evidence remain unchanged. The correction is implemented and validated in **v2.0.5**. This audit, correction, regrading and preparation made **zero model calls**.

## Reproduced required-checker defect

The issued `SEMANTICS.md` restricts every attempted patch to an owner string and labels array, with no other patch fields. `api.d.ts` defines `Update` structurally; an update can carry extra outer properties while supplying the required fields. The issued `CHECKER-INPUT.md` also says to ignore additional metadata not needed to establish an obligation. Only patch fields mutate ticket columns. The frozen API, verifier and reference checker all accept the two executable positive witnesses under the original contract.

The saved checker instead calls `ownKeysAre(update, ["tenant", "id", "revision", "patch"])` at line 61. A fifth outer property causes rejection before it judges the write. This is not a missing service implementation or an invalid execution accepted by the submitted checker; it is an overly strict required checker accepted by our incomplete bank.

In a minimal protected run, tenant `A`, ticket `one`, starts open at revision 1, owner `old`, labels `["keep"]`, note `original`. The candidate sends:

```json
{
  "auditTag": { "tenant": "A", "id": "one" },
  "tenant": "A",
  "id": "one",
  "revision": 1,
  "patch": { "owner": "A:care", "labels": ["keep", "migrated"] }
}
```

The write lands and the migration returns with the exact correct final row at revision 2. It uses four of 4,000 operations; every authoritative check passes. The saved checker rejects it as an invalid update shape. A second valid implementation carries outer `status`, `owner`, `labels` and `note` metadata, while keeping the actual patch correct. Those outer values never mutate ticket columns. It is rejected for the same reason.

Each positive implementation passes all **73 issued service scenarios**. The saved checker rejects 71 individual scenarios and the aggregate case for each: **144 incorrect judgments from one root cause**, not 144 separate defects. Already-complete/no-write cases do not trigger its strict update check.

## Additional authoritative verifier gap, also fixed

Independent rule checking found that both the frozen service verifier and reference checker accept conflicting patches containing `labels:[42]` or `labels:[{"label":"invalid"}]`. The public type is `string[]`, including for requests that do not land. The old code checked only `Array.isArray`.

Both faulty programs first migrate correctly, then submit a stale-revision patch with invalid label elements. Each produces 72 invalid executions accepted by the old authority and one clean tight-budget execution that skips the optional probe. There are **144 unique invalid service cells** and **146 incorrect reference-checker judgments** after including the two aggregate candidates. The audit discrepancy list has 288 entries because individual and aggregate comparisons revisit the same cells; these are two probes of one schema omission. Attempt 7's submitted checker already rejects these invalid requests.

The authoritative verifier and reference checker now require every label element to be a string for every attempted patch. All reference-based variant checkers carry the same correction. The public documentation explicitly distinguishes ignored outer metadata from restricted patch fields and repeats the existing `string[]` requirement. This enforces the issued type and preserves valid alternative implementations.

## Audit scope and evidence

Original v2.0.4 digest: `6d8179c6d01c8bbd4def8e1537292b34325691c8320f321faa07bb2e65191729`.

Original record: `.local/ticket-consolidation-continuation-v4-2026-09-11/slots/attempt-7/real-campaign-frozen/jobs/real-provider/records/ticket-consolidation-repair-attempt-1`.

Saved checker SHA-256: `91b7115cd049640ee91c5c9c0ac4a6a6332b6107e2e6b6bba378347d53710c53`.

Audit output: `.local/ticket-consolidation-attempt-seven-audit-protected-2026-09-11/`.

- **265/265 saved-service executions pass:** all 73 issued scenarios plus 192 fresh cases covering identities, directory collisions, conflicts, pages, labels, status drift, crash recovery and batch populations within the public bounds.
- **1,036 protected service executions** total, including 22 alternative/fault strategies and full-bank probes of membership, request schema, directory interpretation and metadata handling.
- **1,104 checker judgments:** saved checker 960 correct, **zero invalid accepted and 144 valid rejected**. Original reference checker 958 correct, with 146 invalid accepted and zero valid rejected.
- The submitted checker ran in Docker with only its submission and exact public case-input file mounted. Private authority files, expected answers and audit results were not mounted. Determinism, unchanged inputs, opaque tokens, ordering and diagnostic-field variations were checked.
- All **2,308 original attempt-7 files** verify before and after the audit. Correction validation verifies **9,976 original files across attempts 1–7**, preserving original completion, grade and submission hashes.

This is executable probing plus a separately coded rule predicate, not an independently held-out author/model bank. It establishes the reproduced defects and their repair; finite testing does not prove universal correctness.

## Corrected package and validation

Five candidates were added:

| Candidate | Obligation exercised | Expected |
| --- | --- | --- |
| `variant-annotated-updates` | Ignore outer request annotations | Accept |
| `variant-spread-row-updates` | Ignore outer row metadata; judge actual patch effects | Accept |
| `conflict-nonstring-labels` | String label elements even on conflicting requests | Reject |
| `conflict-object-labels` | Object label elements violate the same type | Reject |
| `annotated-forbidden-note` | Ignored outer metadata does not permit forbidden patch fields | Reject |

The bank has **39 candidates: nine valid and 30 faulty**. The two new positive implementations pass all 73 scenarios; each new negative fails 72 and retains the tight-budget clean witness. Scenario bytes are unchanged from v2.0.4. No particular journal, batching or recovery architecture is required.

Frozen correction: `.local/ticket-request-schema-correction-protected-2026-09-11/`.

Foundry v2.0.5 digest: `186b34f818022cc0274c0fb684a665d5d86ffde2b146a1d0fb7076b6a712a3ed`.

Native digest: `f9c6471e3ccf99c4dc9b8a999037a6c77369ce54da289a0d5ccfb0f40d825ee3`.

Readiness: `.local/ticket-request-schema-correction-protected-2026-09-11/READY.json`.

Completed validation:

- **42/42 Foundry assurance checks**, reference checker **39/39**.
- Native Harbor grader in Docker: **oracle 1, nop 0, 8/8 integrity checks**.
- **2,847 protected candidate/scenario comparisons**, zero disagreements with the independent rule predicate. Local author validation also passes **2,778 comparisons**, including four focused probes.
- **20 weakened or overly strict checker variants caught**, preserving the previous 17 regressions and adding three for these corrections. Removing only the new string-element check accepts exactly the two new faulty label candidates, establishing distinct coverage.
- The corrected reference checker classifies **all 1,104 retained audit judgments correctly** in a separate isolated replay, including both newly valid metadata strategies and both invalid label types.

One sandbox Docker-socket denial and one later Docker bind-mount failure interrupted validation. Failed outputs were retained. Completed validation used a fresh correction directory and an explicit reference-checker-only recovery directory; the successful 42-check assurance receipt was reused. These were provider-free validation incidents, not model attempts. The initial validation-script version is archived with its matching preparation hash.

All seven saved submissions were regraded through the normal protected path:

| Physical attempt | Provider | Service | Required checker | Diagnostic reward |
| --- | --- | --- | --- | --- |
| 1–3 | Claude | Each 73/73 pass | Output validation failed | Each 0 |
| 4 | Codex | 73/73 pass | 27/39; 11 invalid accepted, one valid rejected | 0 |
| 5 | Codex | 73/73 pass | 29/39; one invalid accepted, nine valid rejected | 0 |
| 6 | Codex | 73/73 pass | 38/39; valid deferred-marker strategy rejected | 0 |
| 7 | Codex | 73/73 pass | **37/39; exactly the two valid metadata strategies rejected** | **0** |

Every linked regrade contributes zero new model attempts and zero newly counted failures. Grader `false-positive` means a rejected valid candidate; `missed` means an accepted invalid candidate. Original rewards remain unchanged.

## Accounting and continuation

Ticket Consolidation has **seven physical provider calls: three Claude and four Codex**. Attempts **4–7 are audited nulls**. There remain **three counted historical Claude failures, zero counted Codex outcomes and three counted trials available**. Historical results retain their earlier package digests; regrades do not create fresh trials on v2.0.5.

New, exclusively owned slots for physical attempts **8, 9 and 10** are prepared and verified under `.local/ticket-consolidation-continuation-v5-2026-09-11/`. All are Codex, undispatched, with zero provider calls. They correspond to counted trials 4, 5 and 6 only if predecessors cleanly fail. Stop immediately on a recorded pass or an unscored incident. No old controller, slot, ledger or package was reused for writing; only the frozen runtime is shared read-only.

Use the [continuation prompt](ticket-consolidation-v5-next-attempt-prompt-2026-09-11.md). No model trial, commit or push was performed by this audit/correction. The ten 6/6 and two 5/6 qualifying task sets remain unchanged; Ticket Consolidation remains outside that total. The earlier published 28-attempt checkpoint retains its original scope through physical attempt 6.

## Reproduce without model calls

Use fresh destinations and retain the pinned runtime and original evidence. Rebuilding this exact digest requires the source recorded in the correction's `PREPARED.json`.

```sh
node scripts/audit-ticket-consolidation-attempt-seven.mjs .local/ticket-seven-audit-FRESH
node scripts/validate-ticket-request-schema-correction.mjs prepare .local/ticket-request-schema-FRESH
node scripts/validate-ticket-request-schema-correction.mjs foundry .local/ticket-request-schema-FRESH
node scripts/validate-ticket-request-schema-correction.mjs native .local/ticket-request-schema-FRESH
node scripts/regress-ticket-request-schema-correction.mjs .local/ticket-request-schema-FRESH
node scripts/replay-ticket-seven-corrected-checker.mjs .local/ticket-request-schema-FRESH .local/ticket-seven-audit-FRESH
node scripts/validate-ticket-request-schema-correction.mjs regrade .local/ticket-request-schema-FRESH
node scripts/validate-ticket-request-schema-correction.mjs finish .local/ticket-request-schema-FRESH
```
