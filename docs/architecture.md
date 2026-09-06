# Architecture and engineering boundaries

The package record is the unit of identity. The policy decision is the unit of readiness. A trial result is immutable evidence, not permission to spend again.

| Boundary | Owner | Responsibility |
| --- | --- | --- |
| Package content and assembly | `src/packages/record.ts`, `assembly.ts`, `source.ts` | Component hashes, retained bytes, public/private graph and repeatable materialization |
| Local assurance | `assurance.ts`, `native-caa.ts`, `portfolio.ts` | Same-route correct, alternative, positive-work, narrow negative and integrity controls |
| Grading authority | `src/trials/secure-runner.ts`, `operation-authority.ts`, task-private collectors | Independent observations, exact populations, fresh protected subjects |
| Eligibility | `src/packages/policy.ts` | Local-valid, trial-eligible, trial-authorized, hardness-observed, release-eligible; unknown is not pass |
| Execution | `src/execution/` | Signed reservations, fenced durable jobs, bounded capture, immutable publication and inert simulations |
| Learning | `src/learning/` | Read-only timelines, qualified claims, corrections, exposure-aware transfer and package selection |
| Calibration | `src/families/`, matrix/axis modules | Domain semantics, reference/negative comparisons and exact descriptive statistics |
| Commands | `src/cli.ts`, `src/commands/`, `src/packages/local-cli.ts` | Parsing and output adapters over services; legacy commands remain compatible |

The old large CLI is split into construction, intake, assurance, trials, discovery, evidence and report composition modules. The large aggregate report compositor remains explicit: it joins many distinct historical outputs. It is not a second package policy. The modern package/execution/learning entry point uses those services directly.

## Side effects and caching

Inspection does not execute a grader, mutate source evidence, or launch a provider. Build/validate/export operations are named separately and reject occupied destinations. Validation creates new local evidence; it does not count as a model attempt. Regrading also creates separate evidence with zero authoring attempts.

Command-scoped contexts reuse trusted registry/evidence inputs only during one invocation. Nothing survives into a later invocation after an adjudication or package correction. Matrix memoization includes complete results, missing cells, provenance and settings/seed, with a bounded result budget; IDs alone are insufficient. These are optimizations of trusted analysis, never reuse of a mutable submitted process.

Promotion loading checks schema and referential integrity without running probes. The explicit registry check runs probes and checks claimed verdicts. This keeps read paths from unexpectedly performing expensive validation.

## Deliberate tradeoffs

- Local SQLite transactions and signed reservations are enough for the current single-host job system. They do not guarantee exactly-once external billing after a lost provider response.
- Fresh protected processes/containers cost startup time but prevent one submission from contaminating another. Faster analysis does not weaken that boundary.
- Content-addressed packages duplicate some storage; runtime archives use copy-on-write where available. Hashing and bounded capture use streaming where payload size matters.
- The exact subset-poset statistic retains its matching algorithm. Membership indexing removes redundant allocation; it does not turn a descriptive statistic into a hardness predictor.
- Candidate source reproduction rebuilds its own outputs and installs locked dependencies. It never links the author's `dist` or reads private planning documents.

Human-authored destination material must be supplied and reviewed by the human author. Local automation must not impersonate that review or change historical task instructions retroactively.
