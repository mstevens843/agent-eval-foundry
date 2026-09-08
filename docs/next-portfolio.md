# Five additional professional candidates

These packages extend the original five without replacing them. They use the same
immutable package record, protected execution, assurance and recipient export path.
No additional family runner, readiness policy or provider executor is introduced.

| Package | Work to repair | Important interaction | Valid alternative |
| --- | --- | --- | --- |
| partition-index-repair | Partitioned search-index consumer | Ownership, version ordering and contiguous completed checkpoints | End-of-input prefix commit instead of incremental progress |
| causal-replica-repair | Offline document reconciliation | Concurrent edit identities and observed removals | Pairwise state join instead of global survivor filtering |
| partial-release-repair | Partially applied resource release | Dependent removal, restoration and shared-resource preservation | Recompute authoritative state after each operation |
| ticket-consolidation-repair | Cross-tenant support migration | Snapshot population, partial batches and concurrent field preservation | Sequential row retries instead of outstanding-set batches |
| temporal-capacity-repair | Historical capacity reporting | Knowledge-time revision choice, effective-time intervals and exact totals | Discrete bounded integration instead of interval intersections |

See [construction rationale](next-portfolio-construction.md) for source corrections,
pairwise diversity, simplest legal solutions and reasons each might still be easy.
The capacity and replica packages have compact legitimate solutions: neither their
novel names nor added scenarios prove difficulty. Independent expert review and real
authorized trials remain necessary.

## Package layout

Each tasks/PACKAGE directory contains:

- public/instruction.md, SEMANTICS.md and api.d.ts: the full visible contract.
- public/entry.mjs and src/: editable functioning service modules.
- public/test/: ordinary tests that pass on starter, reference and alternative.
- private/domain.mjs: separate trusted observations and outcome checks.
- private/scenarios.mjs: deterministic scenario generation, selection hash recorded.
- private/reference/ and alternative/: independent valid implementation strategies.
- private/controls/ and control-manifest.json: actual wrong implementations and
  intended-check/non-activation attribution, including private-boundary controls.

The public workspace never includes private files, findings, control IDs or scenario
selection labels. Public domain IDs and semantics are intentionally understandable.

## Local production

Build the project and capture/load the existing pinned runtime as described in
[testing](testing.md). For an individual package:

```sh
pnpm package:local portfolio build partition-index-repair .local/index-build .local/runtime
pnpm package:local portfolio validate .local/index-build .local/index-assurance
pnpm package:local portfolio export .local/index-build .local/index-export .local/index-assurance/assurance.json
pnpm package:local portfolio inspect .local/index-export
```

Use new output paths. Arbitrary submitted files are graded with
`portfolio grade EXPORT SUBMISSION NEW_OUTPUT`. Use only exported visible/ as the
solver workspace. Recipient tooling lives at package/tooling/local-cli.mjs, runs from
an unrelated working directory, and does not require a source checkout.

scripts/verify-next-portfolio.mjs is the bounded author-construction batch convenience:
it accepts either this Git checkout or a source snapshot with candidate-source.json,
validates sequentially, and yields if another Docker container is active. It does not
launch models, enroll providers, grant spending authority or certify human solvability.

## Interpreting evidence

A passing local assurance receipt means the reference and alternative passed, registered
wrong implementations were rejected, the public tests ran, and protected-state controls
behaved as declared. A starter-control pass means the unchanged starter was correctly
rejected—not that the starter solved the task.

Read validation/runs/CONTROL/result.json for independently retained observations.
Each cell has exact check outcomes, operations/current state and the submitted source.
Prompt 9's first indexing control exposed a vacuous verifier; required work is now
computed from the full input before the subject runs, and a dedicated regression tests it.
Old failed validation is retained rather than overwritten.

The exposure ledger distinguishes development from controls written after generator
freeze. After their first inspected result, those controls are regression evidence,
not fresh holdouts. They are author-written local tests, not independent human reviews
or official adversarial qualification.

## Review and later screening

First review indexing and ticket consolidation: both combine different identity,
ordering/population and preservation obligations. Then graph recovery, causal replica
join and numerical reporting provide different professional and algorithmic coverage.
This is construction judgment, not a measured difficulty ranking.

Allow a proposed two-to-three-hour repair budget, subject to independent review.
Submitted execution is separately bounded at 45 seconds/4000 operations per invocation.
Do not count missing runtime, process crashes, malformed artifacts or timeouts as model
failures. The stage policy still requires expert-time evidence and separate authorization.
No package in this extension is currently claimed to achieve five or six target failures.
