# Partial Release generation contract correction — 2026-09-11

**Fixed and validated in a new v2.0.2 package. The original trial-2 pass remains valid.** Caller-supplied generation is now ignored consistently by create, stored-content handling, and the reference checker. The saved passing submission also passes the corrected package: service 65/65, checker 22/22, reward 1.

No model trials were run. Original campaign records and the earlier pass audit remain unchanged.

## Package identity

- Corrected digest: `1422a83d7860f81e2bf9bdb52ce634887f2e8da4edcccbe8870cdcfebaadf897`.
- Prior digest: `9bd1c3ae996492793bc3f01264c28a3ed327836f2ae16b7353f8f1571cc0a612`.
- Corrected package: `.local/partial-release-generation-correction-2026-09-11/build`.
- Frozen corrected source: `.local/partial-release-generation-correction-2026-09-11/source`.
- Readiness/evidence hashes: `.local/partial-release-generation-correction-2026-09-11/READY.json` (`verified:true`, `dispatched:false`, `providerCallsMade:0`).
- Native export: `.local/partial-release-generation-correction-2026-09-11/native/export`.
- Native digest: `60c0b7e7675b401730272ed39b17c4e525b94ea45d99181478191957081ee9f5`.
- Portable evidence summary: [partial-release-generation-correction-2026-09-11.json](partial-release-generation-correction-2026-09-11.json).

The maintained task matches the frozen corrected source. No commit or push was made.

## Problem and correction

The API declaration promised that generation supplied to create would be ignored, while the prose discouraged supplying it. The domain retained that field in both content comparison and stored resource objects. Recreating an inspected resource could therefore be rejected as an illegal content edit; creating an absent resource could retain caller bookkeeping in authoritative content. The old reference checker repeated the content-comparison mistake.

The corrected domain strips only `generation` from content before comparison and storage. The server continues to assign generation independently: an idempotent create leaves it unchanged, and a landed creation of an absent resource increments its retained counter. Removing a resource does not erase its counter. Receipts retain the generation associated with their original call.

The reference checker and the existing copied checker for the reordered-parents variant now exclude generation from content equality. Public semantics, API comments, and checker-input documentation explicitly permit passing through an inspected resource. Recorded request arguments still include the supplied field, so ignoring bookkeeping does not hide other request violations.

All 65 existing scenarios remain unchanged. Scope, dependency order, immutable payload/parents, and final-state obligations remain enforced.

## Coverage added

Two valid candidates exercise inspected-resource round trips, differing caller generation values, stale-generation recreation, and idempotent requests after recreation. Three faulty candidates attach generation to an illegal payload change, a missing-parent request, or an out-of-scope request. Each faulty candidate retains the empty scenario as a clean witness.

The required-checker bank grows from 17 to **22 candidates: five valid and 17 faulty**. The separately implemented alternative and existing reordered-parents candidate remain.

Focused regressions check fresh creation and existing resources under all three uncertainty modes. They cover differing numeric generation values, duplicate/reordered parent sets, repeated remove/recreate cycles, stable historical receipts, and absence of generation in authoritative stored content. The original inspect-to-create defect is reproduced on unchanged old domain bytes in all three modes, and all three reproductions pass with the corrected domain.

Seven deliberately broken variants are caught: comparing generation as content, storing caller generation, trusting the caller's counter, incrementing counters on no-ops, making old receipts follow the current incarnation, a checker that compares generation as content, and a checker that skips generation-bearing requests entirely. The last mutation falsely accepts nine illegal requests; the corrected checker rejects all nine.

## Validation results

| Validation | Result |
| --- | --- |
| Author execution/checker comparisons | 1,367; zero discrepancies |
| Foundry protected assurance | 25/25 passed; receipt verified |
| Reference required checker | 22/22 |
| Native Docker Harbor oracle / nop | 1 / 0 |
| Native integrity checks | 8/8 |
| Independent generation verification over protected traces | 1,430 cells; no discrepancies |
| Inspected resource generations checked | 10,176 |
| Receipt responses checked | 7,148 |
| Generation-bearing requests in protected corpus | 707 |
| Deliberately broken domain/checker variants caught | 7/7 |

The protected trace verification derives generation increments from before/after resource presence and checks inspect responses and call-bound receipts. It does not use the reference checker's answers to determine the expected counters. The focused API mutation regressions use an in-process adapter with copied RPC values; the complete candidate bank and integrity checks also run through the normal protected Docker routes.

Typecheck, lint, secret scan, JavaScript syntax checks, and `git diff --check` passed. These are finite regression checks, not proof of correctness over every possible program.

## Original submissions and accounting

Both original submissions were regraded against this same corrected digest using immutable linked records:

| Original trial | Provider | Service | Checker | Diagnostic reward |
| --- | --- | --- | --- | --- |
| 1 | Claude | 65/65 | Failed | 0 |
| 2 | Claude | 65/65 | 22/22 passed | 1 |

Records: `.local/partial-release-generation-correction-2026-09-11/regrades/trial-{1,2}`. Each records `newAgentAttempts:0` and `countsAsModelFailure:false`. All **1,793 original evidence files** verify unchanged, including original grade, completion, and submission hashes.

Partial Release T2 is retained as a valid historical pass. It is not null, and this fix creates no additional counted trials. The user's later request for fresh trials of the corrected version is a separate continuation: preserve both prior outcomes and their old digest, use fresh contexts and a new namespace, and stop on the first new combined pass or the requested total-trial limit. No such continuation was launched by this work.

## Reproduce without provider calls

Use a fresh output path and retain the original campaign/runtime. Protected phases require Docker access.

```sh
node scripts/validate-partial-release-generation-correction.mjs prepare .local/partial-generation-FRESH
node scripts/validate-partial-release-generation-correction.mjs foundry .local/partial-generation-FRESH
node scripts/validate-partial-release-generation-correction.mjs native .local/partial-generation-FRESH
node scripts/verify-partial-release-generation-traces.mjs .local/partial-generation-FRESH
node scripts/validate-partial-release-generation-correction.mjs regrade .local/partial-generation-FRESH
node scripts/validate-partial-release-generation-correction.mjs finish .local/partial-generation-FRESH
```

The prepare phase also runs `scripts/regress-partial-release-generation.mjs` against the new source and unchanged old source, retaining its exact reproductions and mutation evidence under `generation-regressions/`.
