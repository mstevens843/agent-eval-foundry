# Ticket Consolidation attempt 5: second false-pass audit

Physical attempt 5 (Codex, v2.0.2) is a reproduced **benchmark false pass**. Its required checker accepts a migration to another tenant's owner and rejects the corresponding correct migration. The missing coverage concerns exact directory keys. The submitted service passed the fresh replay tests; the defect is in the submitted checker and the bank that accepted it.

Original reward 1 and the original continuation's `solver-pass` record remain historical evidence. The separate disposition in the [accompanying JSON](ticket-consolidation-attempt-five-2026-09-11.json) is **null**, neither a clean pass nor a counted clean failure. Attempt 4's earlier null disposition also remains in force. No model calls were made by this audit or correction. The reproduced gap is fixed and validated in v2.0.3 below.

## Original evidence and minimal witness

- Original package: `f01f00452514cce2527710420055fd93994f115d7bae7b1008a8ca598d3fad33`, v2.0.2.
- Original record: `.local/ticket-consolidation-continuation-v2-2026-09-11/slots/attempt-5/real-campaign-frozen/jobs/real-provider/records/ticket-consolidation-repair-attempt-1`.
- Original grade: service 69/69, checker 28/28, reward 1.
- Saved checker hash: `e82bd55c2b369821cac0eb7df7c003c82f99a0fa6e5078f7e1715b3e259c3527`.
- Original issued `CHECKER-INPUT.md`, line 21, defines directory entries by allowed tenant for the requested team. `api.d.ts` defines tenant IDs as strings, and the migration contract requires each selected row's tenant-specific resolved owner.

The saved `checker.mjs`, lines 24–28, consults `directory[JSON.stringify([tenant, team])]` before `directory[tenant]`. This invents an alternate encoding for an object whose keys are the actual tenant IDs.

Two legitimate tenants are `A` and the literal string `["A","care"]`. Their directory is:

```json
{
  "A": "A:care",
  "[\"A\",\"care\"]": "[\"A\",\"care\"]:care"
}
```

Tenant A must finish with owner `A:care`. The saved checker instead expects `["A","care"]:care`. An executable candidate first migrates correctly and then changes selected A rows to that other tenant's resolved owner, preserving their labels, status, note, and conditional-write behavior. The authoritative verifier rejects it; the submitted checker accepts it. Conversely, the checker rejects the unchanged passing service on this population.

The witness is an actual protected execution, not a fabricated cell or a scenario-label trick. See `paired-directory-owner.json`, scenario `directory-collision-0`, in the audit output below. This one witness uses only three total tenants, including the unrelated row, and six rows.

## Independent audit

Definitive audit output: `.local/ticket-consolidation-attempt-five-audit-bounded-2026-09-11/summary.json`.

- **261/261** saved-service executions passed: the frozen 69 plus 192 fresh scenarios. The fresh scenarios exercise identity collisions, pagination, heterogeneous conflicts, status drift, interruption, already-correct rows, labels, and different batch populations within the public bounds.
- The 48 directory-collision scenarios all reproduce wrong-owner false acceptance and rejection of the correct service. All stay within four total distinct tenants, including unrelated rows.
- The wrong-owner candidate is correct on all 69 original scenarios and invalid on all 48 collision scenarios. The submitted checker accepts the entire 117-cell candidate.
- Across **638 checker judgments**, the saved checker gets 541 correct. Its 49 false-accept judgments are the 48 invalid cells plus their combined candidate; its 48 false-reject judgments are correct service cells. These are repeated witnesses to one lookup defect, not 97 independently discovered bugs.
- The original 28 candidate judgments remain correct, including the earlier request-membership and patch-schema correction. The old gap did not recur.
- The frozen reference checker agrees with the independent public-rule oracle on all 638 judgments. Repeated invocation, input immutability, changed diagnostic reports, and case/cell ordering were also checked.
- **582 protected service executions** produced the new audit evidence, including 22 alternative/fault strategies on three witness scenarios and three full-bank controls. These are offline executions, not model attempts or 582 independent faults.
- All 1,598 files in the original attempt-5 evidence record verify before and after; completion, grade, issued contracts, and submission hashes remain unchanged.

These are audit-authored tests, not an independently held-out author/model bank and not a proof that no other defect exists.

## Correction

The authoritative domain and reference checker already perform literal tenant lookup. Their implementation is unchanged. The correction expands their exercised inputs and the required-checker candidate bank, and makes the existing identity representation explicit in the public documentation.

New v2.0.3 package:

- Digest: `bde0e2b5f7329bf06bea37992b7348a16f3ecd9c9178be9efcbf0d9cdd3344ac`.
- Build: `.local/ticket-directory-correction-2026-09-11-validated/build`.
- Readiness: `.local/ticket-directory-correction-2026-09-11-validated/READY.json`.
- Native export: `.local/ticket-directory-correction-2026-09-11-validated/native/export`.
- Native digest: `7e2e7843963abe745268acd30852140546812e4a64076c2a306e57d5549b696c`.

The bank now has **73 scenarios and 32 candidates: six valid, 26 faulty**. All earlier scenarios and candidates remain. Four new scenarios distinguish literal identity from encoded-pair lookup, case folding, whitespace trimming, and numeric normalization. Four corresponding wrong-owner controls activate on their respective population and retain a clean witness on ordinary IDs. Controls use public API data, not scenario names.

Each valid candidate also runs on the new scenarios, covering the acceptance side as well as wrong-owner rejection. The valid bank retains the independently implemented alternative, redundant writes, valid selected-row conflicts, stale labels on non-landed writes, and temporary ownership followed by restoration. These are six valid strategies, not six independently authored architectures.

## Validation

The final bounded build passed:

- Local author regression: **2,267** execution/checker comparisons, zero disagreements.
- Protected Foundry assurance: **35/35**; verified assurance receipt.
- Reference required checker: **32/32**.
- Native Docker Harbor: oracle **1**, nop **0**, checker **32/32**, integrity **8/8**.
- Independent rule comparison: **2,336 protected cells** (32 × 73), zero disagreements.
- **15/15** checker mutations caught: the previous eight request-check omissions and three overly strict policies, plus four wrong directory interpretations. Each directory mutation accepts its wrong-owner control and rejects a valid candidate.
- JavaScript syntax, typecheck, lint, secret scan, and `git diff --check` passed.

All five saved submissions were consistently regraded on the final corrected digest through the normal `regradeExecution` path:

| Physical attempt | Provider | Service | Required checker | Diagnostic reward |
| --- | --- | --- | --- | --- |
| 1 | Claude | 73/73 pass | Output validation failed | 0 |
| 2 | Claude | 73/73 pass | Output validation failed | 0 |
| 3 | Claude | 73/73 pass | Output validation failed | 0 |
| 4 | Codex | 73/73 pass | 23/32 | 0 |
| 5 | Codex | 73/73 pass | **25/32** | **0** |

Attempt 5's checker accepts `paired-directory-owner` and rejects all six valid candidates because of the same key interpretation. Attempt 4 retains its eight invalid-request omissions and rejection of the valid temporary-owner strategy. The grader's `missed` field denotes accepted invalid candidates, while `false-positive` denotes rejected valid candidates; these reports describe the behavior directly.

The linked records are under `.local/ticket-directory-correction-2026-09-11-validated/regrades/trial-{1,2,3,4,5}`; their `trial` directory suffix denotes the original physical attempt. Each contributes zero model attempts and zero newly counted model failures. All **5,335 original evidence files** verify before and after, and completion, grade, and submission hashes are unchanged. Final readiness is `verified:true`, `providerCallsMade:0`, `dispatched:false`.

An earlier author-validation draft had four selected tenants plus an unrelated tenant in one scenario. It is retained, explicitly superseded, and never used for a model trial. Only the `-validated` correction and `-bounded` audit paths above support this final report. The extra unrelated row was omitted when four selected tenants were already present, avoiding any ambiguity in the published total-tenant bound. The final audit reproduced the same 48 witnesses after this correction.

## Accounting and continuation

Before a new dispatch there have been five real provider calls: three Claude failures and two Codex benchmark false passes (physical attempts 4 and 5). The latter are audited nulls. There are **three eligible counted outcomes**, all historical Claude failures. The v2 continuation's displayed `counted trial: 5` was an off-by-one accounting error even before this audit; its original record is preserved rather than rewritten.

The next physical attempt is **6**, on Codex. If scored, it would be eligible counted trial **4**, not counted trial 6. Keep results separated by package digest; regrades establish saved-submission behavior on the correction but do not create fresh trials on v2.0.3.

Use a new exclusively owned slot and the corrected digest. Do not restart the old controllers or use the old v2 slots. A recorded pass must still be described as pending a separate false-pass audit. The handoff authorizes one fresh attempt and a report, with no automatic infrastructure retry or trial following a pass.

The new slot is already prepared and verified, with no dispatch: `.local/ticket-consolidation-continuation-v3-2026-09-11/slots/attempt-6/slot.json`. The [copyable handoff prompt](ticket-consolidation-v3-next-attempt-prompt-2026-09-11.md) contains the exact verify and run commands. No slot or controller from either prior campaign was reused.

## Reproduce without model calls

The retained historical records and pinned runtime are required. Use fresh output directories; scripts refuse to overwrite evidence.

```sh
node scripts/audit-ticket-consolidation-attempt-five.mjs .local/ticket-attempt-five-audit-FRESH
node scripts/validate-ticket-directory-correction.mjs prepare .local/ticket-directory-correction-FRESH
node scripts/validate-ticket-directory-correction.mjs foundry .local/ticket-directory-correction-FRESH
node scripts/validate-ticket-directory-correction.mjs native .local/ticket-directory-correction-FRESH
node scripts/regress-ticket-directory-correction.mjs .local/ticket-directory-correction-FRESH
node scripts/validate-ticket-directory-correction.mjs regrade .local/ticket-directory-correction-FRESH
node scripts/validate-ticket-directory-correction.mjs finish .local/ticket-directory-correction-FRESH
```
