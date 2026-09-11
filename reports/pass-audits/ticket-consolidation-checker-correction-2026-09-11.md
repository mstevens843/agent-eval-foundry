# Ticket Consolidation checker-bank correction — 2026-09-11

**The reproduced checker-validation gap is fixed and validated in a new v2.0.2 package.** The exact saved Codex trial-4 checker now fails the normal grader, while the reference checker and all six valid service candidates pass. No model trials were run.

Trial 4 has a separate audited **null** disposition for the benchmark false pass. Its historical reward-1 record remains intact. The diagnostic regrade's reward 0 is not a newly counted clean model failure.

## Corrected package

- Foundry package digest: `f01f00452514cce2527710420055fd93994f115d7bae7b1008a8ca598d3fad33`.
- Package: `.local/ticket-checker-correction-2026-09-11-validated/build`.
- Readiness and evidence hashes: `.local/ticket-checker-correction-2026-09-11-validated/READY.json` (`verified:true`, `dispatched:false`, `providerCallsMade:0`).
- Frozen corrected source: `.local/ticket-checker-correction-2026-09-11-validated/source`.
- Native Harbor export: `.local/ticket-checker-correction-2026-09-11-validated/native/export`.
- Native export digest: `80f11b84c9c9663a530057580b58e41a39dd534699a4242c6aed7ea2203039b1`.
- Superseded package digest: `39f2a285b88072ca203ca0ad1998517269e0a376daa00b52cc252dffa79916cb`.
- Portable correction/disposition record: [ticket-consolidation-checker-correction-2026-09-11.json](ticket-consolidation-checker-correction-2026-09-11.json).

The maintained task directory matches the frozen corrected source, including all new untracked candidate files. Changes are in the main worktree; no commit or push was made.

## What changed

The old required-checker bank had 17 candidates. It now has **28: 22 faulty candidates and six valid candidates**. The eight additions below expose request obligations that the passing submission skipped whenever a write did not land.

| New faulty candidate | Obligation exercised | Clean witness |
| --- | --- | --- |
| `closed-conflict` | Conflicting attempted write to a closed snapshot ticket | `case-solo` |
| `outside-conflict` | Conflicting attempted write to an unrelated tenant | `case-solo` |
| `outside-missing` | Attempted write to a missing, unrelated identity | `case-tight-budget-crash` |
| `conflict-forbidden-note` | Forbidden note field in a conflicting patch | `case-tight-budget-crash` |
| `conflict-forbidden-status` | Forbidden status field in a conflicting patch | `case-tight-budget-crash` |
| `conflict-forbidden-revision` | Forbidden revision field in a conflicting patch | `case-tight-budget-crash` |
| `conflict-invalid-owner` | Non-string owner in a conflicting patch | `case-tight-budget-crash` |
| `conflict-invalid-labels` | Non-array labels in a conflicting patch | `case-tight-budget-crash` |

Each candidate first performs the correct migration, then exercises its specific request fault. It skips the extra probe when the public operation budget is below 100, and scope probes stay clean when their target is absent. Candidates use public API data, never scenario identifiers. This gives each fault a real clean witness without masking the omission behind an unrelated budget failure.

Three additional valid candidates guard the acceptance side: a well-formed selected-row conflict, a selected-row conflict containing stale labels, and temporary ownership followed by restoration of the correct final owner. The separately implemented alternative and existing redundant-write variant remain. These are six valid candidates, not six independently authored architectures.

`SEMANTICS.md` and `CHECKER-INPUT.md` now explicitly distinguish obligations for every attempted request from checks on landed effects. They also clarify the existing permissive interpretation of intermediate ownership. The authoritative service verifier, reference checker, redelivery implementation, and all 69 scenarios are byte-identical to the prior frozen source. No new hidden service requirement or harder scenario was introduced.

## Validation

- Provider-free author regression: **1,867** individual execution/checker comparisons, zero disagreements; all positive candidates pass and every negative candidate activates its declared check.
- Foundry protected assurance: **31/31** checks passed; assurance receipt verified. Package policy reports `local-valid` and `trial-eligible`.
- Foundry required checker: reference **28/28**, accepting all six valid candidates and rejecting all 22 faulty candidates across the complete 69-scenario bank.
- Native Docker Harbor export: oracle **1**, nop **0**, required checker **28/28**, all **8/8** integrity checks passed, including immutable inputs, denied private reads/reward writes, and descendant cleanup.
- Independent rule evaluation agrees with the reference checker on **1,932 protected execution traces** (28 candidates × 69 scenarios). Inputs remain unchanged; repeated invocation, opaque tokens, reordered cases/cells, and changed diagnostic reports preserve verdicts.
- **11/11** checker mutations caught: eight omissions of the newly covered request checks and three overly strict policies. Each weakened request checker falsely accepts exactly its corresponding new candidate, demonstrating that all eight additions contribute coverage. The strict variants reject valid conflicts, stale non-landed labels, or temporary ownership.
- Typecheck, lint, secret scan, JavaScript syntax checks, and `git diff --check` passed.

The initial sandboxed assurance invocation could not access the Docker socket. Its failed author-validation evidence is retained under `.local/ticket-checker-correction-2026-09-11`. The complete successful run is the separate `-validated` directory above. This was not a model trial or a scored failure.

## Saved submissions, consistently regraded

All four original submissions were regraded through the standard `regradeExecution` route against the same corrected digest, with separate immutable linked records:

| Original trial | Provider | Service | Required checker | Diagnostic reward |
| --- | --- | --- | --- | --- |
| 1 | Claude | 69/69 pass | Failed output validation | 0 |
| 2 | Claude | 69/69 pass | Failed output validation | 0 |
| 3 | Claude | 69/69 pass | Failed output validation | 0 |
| 4 | Codex | 69/69 pass | **19/28** | 0 |

Linked records are under `.local/ticket-checker-correction-2026-09-11-validated/regrades/trial-{1,2,3,4}`. Each has `kind:"linked-regrade"`, `newAgentAttempts:0`, and `countsAsModelFailure:false`.

The saved Codex checker accepts all eight new invalid candidates and rejects the valid temporary-owner candidate. These are eight false accepts plus one false reject, representing two primary omitted request-validation categories and one strictness issue. The grader's internal field naming uses `missed` for invalid candidates accepted and `false-positive` for valid candidates rejected; the counts here describe behavior directly.

The exact winning submission was not patched. All **3,737 original evidence files** across the four records verify before and after the work, with identical completion, grade, and submission hashes. Original campaign events, outcomes, slot claims, and controller files were not edited.

## Trial disposition and continuation

For audited accounting, trial 4 is **null: benchmark checker-validation false pass**, neither a clean pass nor a counted clean failure. The original model call still happened and remains in provider-attempt history. Its linked reward-0 diagnostic is not an additional model attempt. The earlier three original failures remain historical records of the old digest; the linked regrades establish their behavior on this correction without creating fresh model evidence.

The correction is ready for a separately prepared continuation using the new digest above. Do not resume Ticket Consolidation through the old frozen package or reuse its old prepared slots. Use a separate continuation namespace and preserve the original controller/ledger, including its unrelated orphan-slot incident. No continuation was dispatched by this work.

## Reproduce without model calls

Use a fresh output directory; the scripts refuse to overwrite completed evidence. The retained original campaign and its pinned runtime are required. Docker access is required for the protected phases.

```sh
node scripts/validate-ticket-checker-correction.mjs prepare .local/ticket-correction-FRESH
node scripts/validate-ticket-checker-correction.mjs foundry .local/ticket-correction-FRESH
node scripts/validate-ticket-checker-correction.mjs native .local/ticket-correction-FRESH
node scripts/regress-ticket-checker-correction.mjs .local/ticket-correction-FRESH
node scripts/validate-ticket-checker-correction.mjs regrade .local/ticket-correction-FRESH
node scripts/validate-ticket-checker-correction.mjs finish .local/ticket-correction-FRESH
```

These checks close the reproduced omissions and preserve the tested valid strategies. They are finite, audit-authored regressions, not proof of universal checker completeness or a blind held-out author/model set.
