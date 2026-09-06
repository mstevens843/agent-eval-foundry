# Prompt 3 — Existing contracts and protected routes

Completed local engineering on 2026-09-06, from `3d4f3d0`. No provider calls, model trials,
official adversarial trials, commits or publication. Native CAA and historical evidence were preserved.

## Outcome

All twelve executable generic families now use the protected operation-authority route, including
the ten previously missing migrations. Checker generation constructs runnable cases and executes
the actual submission. Both replay verifiers inspect every attempt's ordered, value-bearing evidence.
Every family has an independently structured legitimate alternative and actual route-level controls.

The complete interface, rule/control traceability, alternative strategy and remaining construction
weakness for each family are in [the route guide](../docs/protected-family-routes.md).
Exact package/component hashes, selected scenario IDs and verification receipts are in
[the machine-readable report](verification/prompt-03.json).

## Implemented repairs

- Shared bounded asynchronous operation authority; root-only private bundle and independent
  unprivileged submission processes. Actual operations create observations; reports cannot create
  ledger entries. Fresh nested checker executions use distinct identities.
- Ten new adapters reuse the existing domain harnesses. Current default graders have no unprotected
  fallback. Invalid protocol, artifacts, output/resource limits and incomplete lifecycles remain
  invalid executions, with typed errors and attempt coverage—not model failures.
- A deterministic checker registry generates matching content and stable identities. Generated IDs
  cannot alias supplied diagnostic probes. Invalid parameters, unknown IDs and limits have published
  API errors. Correct generation-using and deliberately incorrect checkers run through the real route.
- Replay checks bind each claim to its own attempt and latest preceding observation, actual action
  order, confirmation and effect. Earlier-only lies, omitted steps, delayed reads and duplicate
  execution are rejected. Legitimate skip/re-resolution strategies and different halt wording pass.
- Recovery report matching no longer assumes one call per attempt: worker/controller identity and
  epoch permit correct idempotent retries while complete payload/key/effect checks remain enforced.
- Bounded regular-file artifact capture and an embedded source/build identity refuse unsafe artifacts
  and stale collector builds. Package assurance binds the exact compiled collector and components.
- Public execution limits and checker semantics are versioned. Migration records link retained
  challenge hashes without editing historical results. Old manual PIC intake cannot manufacture
  countability from legacy metadata.
- A small integration repair pins Phase 23's historical selector to its original no-dispute slice;
  duplicate sampler identities had prevented importing the public library. This does not endorse or
  authorize that old experiment.

## Final verification

| Family | Full local scenarios, per correct implementation | Protected sample, per correct implementation | Registered controls caught |
| --- | ---: | ---: | ---: |
| Containment | 128 | 12 | 9 |
| Memory poisoning | 864 | 14 | 14 |
| Parent UI replay | 324 | 15 | 10 |
| Live-DOM replay | 864 | 15 | 22 |
| Checker-required memory | 792 | 21 | 20 |
| Access token | 384 | 15 | 9 |
| Delegated wallet | 804 | 18 | 10 |
| CAA kernel | 24 | 9 | 9 |
| DAO descendant | 24 | 8 | 5 |
| Trading reconciliation | 24 | 8 | 6 |
| Deployment rollback | 24 | 8 | 6 |
| Model alias rollout | 339 | 13 | 17 |
| **Total** | **4,595** | **156** | **137** |

Both references and alternatives pass all 4,595 selected local scenarios. All 23 designated baselines
are blocked; the missing-checker artifact is invalid execution, not a semantic model-failure result.
The finite mutant bank is not a proof of exhaustive correctness.

The protected suite passes 96 real assurance operations across twelve packages and 467 top-level
family-control grading invocations. Eight additional replay controls and one generated-checker API
control bring this to 476 top-level container invocations. Nested generated-case child executions
are additional activity, not extra model trials. Each family is locally valid under the reviewed
contract; none is trial-eligible or release-qualified from this evidence alone.

- Semantic, contract, prerequisite and history tests: **126 passed, 0 failed, 0 skipped**, 28.65 s.
- Actual protected route suite: **15 passed, 0 failed, 0 skipped**, 255.09 s.
- Typecheck, repository lint (434 files), ESM/CJS/declaration build, both public-library imports and
  whitespace checks pass.
- The Docker image was already cached; no downloads were needed.
- Source inventory: 3,254 files, identical before/after final verification. Digest:
  `83a88fc376f190e8a5e3dcad0c3754efb0606989fee8c149c569b90b886af908`.
- 1,019 tracked files covering historical trials/campaigns/evidence and native CAA match HEAD bytes.
  The two Prompt 3 report outputs are excluded from the source inventory to avoid self-reference.

Intermediate failed runs are not the completion evidence: they exposed an optional facade-argument
schema mismatch, a positive-witness selection omission, an emitted build-marker parsing mismatch,
and a test that incorrectly expected the missing-checker artifact to be a semantic failure. Those
were corrected. The final unchanged-source run above has no skipped or failed tests.

## Remaining work and handoff

Prompt 3 closes G1's generic-route extension, the assigned per-package contract/alternative work,
and build-coherence repairs. The tracked implementation ledger retains each package's remaining
construction work and the evidence/history follow-up owner.

This is a dependable local substrate, not twelve maximally hard professional tasks. The protected
sample is representative knob coverage plus explicit controls, not exhaustive protected Cartesian
execution. Policy-family alternatives independently exercise control flow and state retention but
share some normative predicates/serializers. Human solve evidence, full professional construction,
target-model hardness and official qualification remain pending.

The full repository is **not** claimed green: `node dist/cli.js check` fails closed on
`ADV_COUNTED_HASH_STALE` for preserved checker adversarial evidence after the public contract change.
No historical audit hash/count was rewritten. Its history-aware reporting view is recorded as
`P3-HISTORICAL-AUDIT-VIEW`, owner 6, with integration under owner 7. Expensive historical whole-family
container sweeps and legacy campaign orchestration are not substituted for this bounded route matrix.

Next: **Prompt 4 — Strong coherent package portfolio**. Its required protected routes, reusable
assurance, generated-case API and alternative controls now exist. It should build substantive,
materially distinct professional packages—not infer difficulty from these validity results.
