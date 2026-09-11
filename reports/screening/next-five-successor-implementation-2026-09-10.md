# Five task successors — implementation and validation, September 10, 2026

All five **3.0.0 successors are implemented, locally validated and packaged for
independent review**. No model/provider trials, external messages, commits or pushes
were made. This is not a hardness claim or final Terminal-Bench submission qualification.

| Task | New abstraction | Reference / alternative | Checker | Native oracle / nop |
| --- | --- | --- | --- | --- |
| 14 — route-policy-repair | Source calls/returns → flat deployment policy | 33/33 each | 8/8 | 1 / 0 |
| 03 — browser-replay-repair | Accessible application, operation identity and delayed receipts | 18/18 each | 8/8 | 1 / 0 |
| 18 — recurring-calendar-repair | Versioned incremental input, persistent atomic generations | 35/35 each | 11/11 | 1 / 0 |
| 20 — workflow-authority-repair | Admission, external commitment and delivery completion | 36/36 each | 10/10 | 1 / 0 |
| 04 — delegated-budget-repair | Cross-version reservations, captures and releases | 19/19 each | 10/10 | 1 / 0 |

The checker counts are candidate execution traces, not service scenarios. Alternative
services are positive controls; they need not use the reference's recovery sequence.
All five public `entry.mjs` files remain empty, and no public completed checker was
introduced. Complete private references implement both required deliverables.

## Scope and preservation

The initial worktree contained only the user's untracked
`docs/next-five-task-design-review-2026-09-10.md`; it was preserved. All **171**
maintained starting task files matched the frozen Trial 2 packages byte-for-byte.
The final preservation check passed for **14,002 protected files** and verified the
original byte prefix of all five analysis documents. The new sections were appended,
not used to rewrite historical results. Frozen campaign runtimes and prior exports
were read-only inputs. The runtime dependency archive was cloned into fresh staging;
its executable contents were not changed.

The separate successful finalists remain **five**: incremental-build-repair,
issued-report-repair, variant-cache-repair, snapshot-recovery-repair and
temporal-capacity-repair. Their task files, evidence and standings were preserved.
These untried successors contribute **zero** additional successful finalists.

Plan and contract decisions were recorded before editing in
[the contract plan](../../docs/next-five-successor-contracts-2026-09-10.md).
The requested design review, implementation plan, current packages and actual saved
successful Trial 2 submissions were inspected. In particular, the short workflow
receipt-loop and budget dispatcher, route graph-cloning approach, calendar snapshot
recomputation and browser's simulator-oriented reconciliation informed the changes.

### Rule interpretation

The implementation follows the requested
[task implementation prompt](https://github.com/harbor-framework/terminal-bench/blob/main/docs/prompts/task-implementation.toml),
[proposal instructions](https://github.com/harbor-framework/terminal-bench/blob/main/docs/prompts/task-proposal.md),
[contribution guide](https://github.com/harbor-framework/terminal-bench/blob/main/CONTRIBUTING.md)
and [TB3 call](https://www.tbench.ai/news/tb3-contribution-call), with the design
review's locally retrieved copies retained under
`.local/next-five-design-review-2026-09-10/`.

Custom semantics and APIs are public. Necessary definitions remain; hidden scenario
enumerations and solver walkthroughs do not. Helpers shared by submitted service and
checker, recomputation, self-testing, graph cloning and alternative recovery are
allowed. Reasons remain diagnostic-only. Normal author internet access remains
enabled; private authority inputs, reference solvers and expected results stay in
separate verifier material. Human-only contribution fields were not fabricated.
No automated paid rubric or model-based qualification was run.

## Implemented contracts, workloads and alternatives

### Route policy — 3.0.0

**New business requirement:** The new destination is flat-v1: first-match rules over original-input predicates plus one accumulated terminal attribute transform. It has no calls, returns or intermediate mutations. Scope remains the original input and only originally accepted routes receive the requested preference. Deployment limits are 512 total rules, 4,096 predicate atoms, six egresses and 48 KiB per compact publication.

**Previous simplifying strategy:** The saved successful submissions cloned shared source graphs and changed terminal accepts. Cloning remains permitted internally, but output must now translate nested return flow and mutation-dependent tests into a different deployment language.

**Additional coverage:** Shared nested subgraphs, overlapping prefixes, multi-community conjunctions, mutation-dependent branches, six egresses and a twelve-community case. These extend existing preservation/scope coverage as well as introducing the new format.

**Validation and alternatives:** Reversed disjoint terminal rules and a failed-publication recovery both pass. Negative controls lose returns, forget mutations, apply scope to mutated communities or retain the old preference. All 33 generated instances compile within capacity (maximum 108 rules, 744 atoms and 36,296 payload bytes).

Public contract: [SEMANTICS.md](../../tasks/route-policy-repair/public/SEMANTICS.md).
Historical analysis plus append-only update: [14-route-policy-repair](third-five/14-route-policy-repair.md).

### Browser replay — 3.0.0

**New business requirement:** The author receives the same functioning Meridian Records application, DOM/Chromium bridge and server protocol used by evaluation, plus a public demo and replay command. Navigation, session renewal, remounts, competing dialogs, operation IDs and deterministic background commitment are observable. Identity is JSON.stringify([traceId, step]); receipts can lag both commitment and UI updates.

**Previous simplifying strategy:** The saved Claude submission reasoned against a purpose-built simulator with step-filtered candidates and durable receipts. The successor queries all current-page forms and operates against the accessible application. The old observe-after-fill prescription is replaced with an atomic current-form precondition.

**Additional coverage:** Repeated entity/field/value at different steps; navigation/session expiry; query/fill remounts; stale same-tuple dialogs; commitment before visible receipt; interrupted execution and independent redelivery. Public application facts contain no hidden expected results.

**Validation and alternatives:** An alternative submits using the returned fill state without another observe call, recovering on stale responses, and passes. Negative controls conflate tuples, trust pending UI, confirm the competing dialog or stop after early steps. Playwright UI inspection confirmed the author-visible app; protected execution uses pinned Chromium.

Public contract: [SEMANTICS.md](../../tasks/browser-replay-repair/public/SEMANTICS.md).
Historical analysis plus append-only update: [03-browser-replay-repair](original-five/03-browser-replay-repair.md).

### Recurring calendar — 3.0.0

**New business requirement:** Versioned series/zone/changes/window records merge by greatest per-record revision, including tombstones. Each delivery must leave persistent source, materialized events and bookings in an atomic generation before acknowledgement. Windows select original recurrence coordinates; moves retain identity; unrelated bookings survive.

**Previous simplifying strategy:** The saved Codex solution could materialize one complete snapshot and commit once. Full recomputation is still valid, but it must now reconcile retained state across retroactive, duplicate and out-of-order changes, stale generation fences and response-loss recovery.

**Additional coverage:** Original weekly anchoring, exception/future-change precedence, cancellation, elapsed duration and explicit gap/fold rules remain. Added multi-delivery amendments, publication-window changes, source deletion, concurrent unrelated bookings and six-series/multiple-transition combinations.

**Validation and alternatives:** The independent interval-inversion alternative publishes rows in a different order and recovers from an invalid request. Arrival-order merge, append-only owned bookings, dropped foreign bookings and displayed-time window filtering are rejected. An implementation-stage collector duplication exceeded 16 MiB; removing redundant per-process history fixed it without raising limits.

Public contract: [SEMANTICS.md](../../tasks/recurring-calendar-repair/public/SEMANTICS.md).
Historical analysis plus append-only update: [18-recurring-calendar-repair](fourth-five/18-recurring-calendar-repair.md).

### Workflow authority — 3.0.0

**New business requirement:** Authorization admission, external dispatch commitment and delivery completion are separate. Authority must hold at every accepted authorized admission and at dispatch. Conditional dispatch fences both admitted and current revisions; durable terminal outcomes survive later revocation and duplicate delivery. Committed receipts may be temporarily pending.

**Previous simplifying strategy:** The saved Codex service could use one atomic decision/effect call and receipt lookup. It must now reconcile stale pending authorizations, externally committed but temporarily unobservable receipts and independently completed deliveries without a prescribed local journal.

**Additional coverage:** Root provenance through depth-six ancestry, varied resources/actions, multiple independent grant paths, revocation of only one path, staleness after inspection and admission, and interruption after admission/dispatch/outcome/finish.

**Validation and alternatives:** A reverse-order valid-path search with harmless invalid-dispatch recovery passes. Admission-only completion, pending-as-complete, intermediate-principal origin, wrong payload, empty path and deny-all controls fail semantically.

Public contract: [SEMANTICS.md](../../tasks/workflow-authority-repair/public/SEMANTICS.md).
Historical analysis plus append-only update: [20-workflow-authority-repair](fourth-five/20-workflow-authority-repair.md).

### Delegated budget — 3.0.0

**New business requirement:** Immutable reserve/capture/release commands operate on permanently bound wallet/reservation identities and raw authoritative ledgers. Used allowance is lifetime captured credits plus outstanding holds across versions. Capture never frees allowance; release consumes only the named hold's remainder. New holds use current terms; settlement of existing holds survives revocation/version changes. Decisions are revision-fenced and terminal.

**Previous simplifying strategy:** The saved Codex dispatcher consumed cumulative spend and stable per-job grant terms. The successor must reconstruct availability from reservations/settlements and reconcile uncertain mutations across term changes without treating pending work as available funds.

**Additional coverage:** Multiple grants and up to four wallets, within-job term changes, lower limits, revoked/replaced delegates, cross-version settlements, repeated commands, closed reservation identities and delayed old releases near allowance boundaries.

**Validation and alternatives:** An alternative retries an idempotent resolve while the receipt is pending and recovers from malformed input. Ignored holds, capture-releasing-funds, current-version settlement checks, cross-wallet aggregation, stale reserve versions and abandoned uncertainty are rejected.

Public contract: [SEMANTICS.md](../../tasks/delegated-budget-repair/public/SEMANTICS.md).
Historical analysis plus append-only update: [04-delegated-budget-repair](original-five/04-delegated-budget-repair.md).

### Authority, reference and checker changes

Each package updates its authority, scenario generator, checker-input contract,
reference service, private checker and control manifest. Workflow and calendar add
authority-side restart wrappers; budget/browser revise their wrappers. Interruptions
are injected after an operation commits and before its response reaches a fresh
subject process, not merely simulated by a final-state fixture.

Workflow's checker reconstructs root provenance and grant reachability at admission
and dispatch and compares terminal history and delivery associations. Budget checks
raw ledger mutations, reservation bindings, decision order and report reconciliation;
sharing its eligibility helper is intentionally permitted. Calendar keeps a
minute-search authority and an independently structured interval-inversion checker.
Route uses a recursive authority interpreter and explicit-stack checker interpretation
with complete finite equivalence-region enumeration. Browser grades actual server
effects, submitted identities, dialog bindings and attempt-boundary reports. None
grade a prescribed post-fill observation sequence.

Control suites contain package-specific semantic mistakes and a private-isolation
probe. The initial integrity suite additionally tests missing verdicts, always-accept,
always-reject, mutated checker input, private-read/reward-write access, and a forged
reward/output symlink. Passing these six controls per task is not an exhaustive
anti-cheat audit.

### Small coherent implementation choices

- Calendar is a synchronizer over authoritative retained source/materialization;
  solvers may recompute completely. No required journal, cache shape or incremental
  algorithm was imposed.
- Workflow dispatch is fenced by the same revision that admitted authority, and
  a terminal decision is immutable. This removes an unavoidable check-then-act race
  without making the host compute correct authorization for the solver.
- Budget reserve/capture/release commands share a conditional decision interface;
  raw ledger records, not a precomputed balance, determine eligibility. Settlement
  permission follows the reservation's original binding rather than current terms.
- Browser asynchronous progress uses documented deterministic background ticks,
  not larger arbitrary timeouts. The author-visible server and bridge are the same
  application code as evaluation, not a separate simplified mock.
- Route capacity is a deployment property. Algorithms are unrestricted; only the
  published representation differs from the source language.

## Validation actually executed

All runs below are provider-free. Exact argv, working directory, timestamps, exit
codes and log hashes are in the [machine-readable evidence](evidence/2026-09-10-next-five-successors.json)
and `.local/next-five-successors-2026-09-10/commands/`.

1. Package-local reference, legal alternative, starter and semantic-control runs:
   `scripts/verify-next-five-author.mjs`, outputs `author-four/` and
   `browser-iteration-3/`. All expected outcomes matched.
2. Protected Foundry assurance, repeated reference, checker grading, same-source
   rebuild and export: `scripts/verify-selected-portfolio.mjs ... --release`.
   All final assurance operations passed; all reference services and alternatives
   passed **141/141** scenarios each, and reference checkers **47/47** candidates.
3. Fresh-recipient export reproduction, including source-independent execution,
   invalid-execution exclusion, artifact-drift rejection and evidence-drift rejection:
   all five passed. Route's recipient check ran separately after the first grouped
   command stopped on calendar's subsequently fixed collector issue.
4. Native build and independent rebuild: all five manifest digests matched.
   **110/110** pinned upstream static checks passed (22 per task).
5. Actual Harbor jobs: **5/5 oracle reward 1**, **5/5 nop reward 0**, zero exceptions.
   Every nop has `infrastructureError:false` and “missing required deliverable”
   because the checker is absent. Foundry separately executed the empty services:
   route 33, browser 18, calendar 35, workflow 35 and budget 19 semantic failures;
   workflow's one empty-work scenario legitimately passes.
6. Native integrity: **30/30 controls** passed, including clean forged-checker
   rejection. Correct alternative executions were accepted.
7. **180** package JavaScript modules passed syntax checks; **four** public TypeScript
   declaration files passed compilation; public/private browser application hashes
   matched; maintained sources matched final native source manifests.
8. Affected regression suite: **24/24 tests** across
   `test/next-five-implementation.test.ts`, `test/third-portfolio.test.ts` and
   `test/fourth-portfolio.test.ts`. This includes the generated property and
   independent-alternative checks. Repository `pnpm typecheck` passed.
   `pnpm lint` checked **501 files** with no fixes or failures. `git diff --check`
   passed.
9. Playwright CLI opened the public Meridian Records app, renewed an expired
   session and exposed both repeated-step forms, decoys and the competing dialog.
   [Screenshot](../../docs/assets/browser-successor-public-app.png).
   The Playwright skill guided this UI inspection; the complete protected service
   replay separately exercised the app's state changes.

Representative exact commands (use **new output directories** when repeating):

```sh
node scripts/verify-next-five-author.mjs .local/next-five-successors-2026-09-10/author-four route-policy-repair recurring-calendar-repair workflow-authority-repair delegated-budget-repair
node scripts/verify-next-five-author.mjs .local/next-five-successors-2026-09-10/browser-iteration-3 browser-replay-repair

node scripts/verify-selected-portfolio.mjs .local/next-five-successors-2026-09-10/release-rest .local/next-five-successors-2026-09-10/runtime recurring-calendar-repair workflow-authority-repair delegated-budget-repair --release
node scripts/verify-selected-portfolio.mjs .local/next-five-successors-2026-09-10/release-browser .local/next-five-successors-2026-09-10/runtime browser-replay-repair --release
node scripts/verify-portfolio-exports.mjs .local/next-five-successors-2026-09-10/route-recipient .local/next-five-successors-2026-09-10/release-four/route-policy-repair/export

node scripts/build-harbor-portfolio.mjs .local/next-five-successors-2026-09-10/harbor-final route-policy-repair browser-replay-repair recurring-calendar-repair workflow-authority-repair delegated-budget-repair
harbor run --config .local/next-five-successors-2026-09-10/harbor-oracle.json
harbor run --config .local/next-five-successors-2026-09-10/harbor-nop.json

node scripts/verify-next-five-interfaces.mjs
pnpm exec vitest run test/next-five-implementation.test.ts test/third-portfolio.test.ts test/fourth-portfolio.test.ts
pnpm typecheck
pnpm lint
node scripts/next-five-preservation.mjs --verify
node scripts/record-next-five-evidence.mjs
```

The recorded commands include the `record-next-five-command.mjs` wrapper where
used, and the full static/integrity command argument lists. No unrelated task
cohort was rebuilt. Shared modifications are confined to browser-native packaging
and affected regression helpers/tests; the broader finalist tasks are unchanged.

### Bounds and representability

All packages retain the 45-second subject-process limit, 4,000 protocol-frame
limit, 64 KiB frame limit and 16 MiB channel limit. These were not increased.
Measured values below are compact API JSON payloads and whole-scenario call
tallies from the correct reference/alternative author harness (not claimed to be
exact wire-envelope sizes). Protected runs separately validate actual transport.

| Task | Largest correct API payload | Most calls across a scenario |
| --- | ---: | ---: |
| Route | 36,296 bytes | 2 |
| Browser | 926 bytes | 114 |
| Calendar | 11,385 bytes | 24 |
| Workflow | 1,925 bytes | 117 |
| Budget | 3,225 bytes | 117 |

All 33 generated route instances have constructive reference compilations and
complete source/target equivalence checks. Maximum usage is **108/512 rules**,
**744/4,096 atoms**, **36,296/49,152 payload bytes**, six egresses and twelve
registered communities. Proof records for every instance are in
`interface-capacity.json`.

The equivalence check partitions all canonical IPv4 prefixes by source, request
and target predicate signatures, enumerates every subset of the declared community
registry, and tests both endpoints of the only preference forms (original input or
constant). Unknown communities cannot be tested or modified by the registered
target, so they pass through unchanged. The compiler preserves them. This proves
the generated population fits the declared target capacity; it does not claim that
every arbitrary source graph is representable. The public source-instance contract
promises representability, and each generated instance witnesses that promise.

### Retained development failures and recovery

The first grouped Foundry command completed route and then failed on calendar:
cumulative observations were repeated in every process result, taking collector
output past 16 MiB. Calendar now returns that authority history once; subsequent
protected Foundry, recipient and native runs passed with unchanged limits. Failed
artifacts remain at `release-four/recurring-calendar-repair/`.

Early local browser startup hit the host sandbox's Chromium restriction; the
approved run succeeded. A competing-dialog negative control originally repeated
a stale dialog until exhausting frames; it was made to terminate with its actual
wrong-dialog result, so rejection now demonstrates the semantic defect. Local
iterations remain as development evidence. The additional capacity-evidence script
initially used an incorrect scenario wrapper; the fixed script passed and both
command records remain. These were implementation-stage issues, not failures in
historical model submissions.

Moving the newly generated `.playwright-cli/` logs into staging was denied by the
filesystem policy even through the approval mechanism; they remain at that original
location. The browser and demo-server sessions created for inspection were closed.
This ancillary archival restriction does not block package validation.

## Exports and full digests

Every path below is relative to
`/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`.
**Do not substitute the frozen September 9 exports.**

### route-policy-repair

Foundry: `.local/next-five-successors-2026-09-10/release-four/route-policy-repair/export`

SHA-256 package identity: `52fa87b20db4cbd8169f50ccba8cd29a3efd81e11e611e7718049c3ff6cde496`

Native Harbor: `.local/next-five-successors-2026-09-10/harbor-final/route-policy-repair`

SHA-256 native file-manifest identity: `d21ab13ce42a296f6786cc38760522d633f45bec706617999ecfcad42f4b1ca2`

### browser-replay-repair

Foundry: `.local/next-five-successors-2026-09-10/release-browser/browser-replay-repair/export`

SHA-256 package identity: `db0f4449af8ea94e00339a4957925ef563dd6735b887a5931dd7cb9cca977ac6`

Native Harbor: `.local/next-five-successors-2026-09-10/harbor-final/browser-replay-repair`

SHA-256 native file-manifest identity: `22c19f0403a1aa2b53bd6b92e3489b910887e3d85da1f5f5db8d4fc5215874c1`

### recurring-calendar-repair

Foundry: `.local/next-five-successors-2026-09-10/release-rest/recurring-calendar-repair/export`

SHA-256 package identity: `d3260d6bd73005542e01cd33f61cef690750590112f1441f792ab9d6e1c8bb6c`

Native Harbor: `.local/next-five-successors-2026-09-10/harbor-final/recurring-calendar-repair`

SHA-256 native file-manifest identity: `4c486ab9a2b4aca505066ebfe77d85b767c5a9e4f9f8ec4867cf0f9ada676023`

### workflow-authority-repair

Foundry: `.local/next-five-successors-2026-09-10/release-rest/workflow-authority-repair/export`

SHA-256 package identity: `86769759d271d5ded598029d5e7e1d7e8ee12e37cbe22563a6853e5bcf86f08e`

Native Harbor: `.local/next-five-successors-2026-09-10/harbor-final/workflow-authority-repair`

SHA-256 native file-manifest identity: `35a7555b10fd558c8c2a3b1915eadcf2a8c59133461efa6aa8a1c9cd5a3e48ec`

### delegated-budget-repair

Foundry: `.local/next-five-successors-2026-09-10/release-rest/delegated-budget-repair/export`

SHA-256 package identity: `413b7bb5d01028898e44e2d88b1b75cabf5b21729f47475864d0ea2c123ecf5f`

Native Harbor: `.local/next-five-successors-2026-09-10/harbor-final/delegated-budget-repair`

SHA-256 native file-manifest identity: `feddb03d1e5717b1a713807f3ed8dd22d6087b64efd0012317f08686c859551a`

Runtime: Node **24.18.1**, Playwright **1.62.1**, **linux/arm64**.
Pinned image identity:
`sha256:0d111d755a70b9f8a3e8fec4f7bc641b3211bcf6ebb03bfd6fbded7c776176ab`.
Dependency archive SHA-256:
`f09648e16d4c765abb50f2063302a943fe18469fa28b55c0f8b960668716ea68`
(974,875,136 bytes). Native Docker recipes remain pinned to these dependency versions.

Evidence root: `.local/next-five-successors-2026-09-10/`.

- `baseline.json`, `preservation-result.json`: starting identity and historical preservation.
- `author-four/`, `browser-iteration-3/`: local cell traces, controls and bounds.
- `release-four/route-policy-repair/`, `release-browser/browser-replay-repair/`,
  `release-rest/<id>/`: protected assurance, checker evidence, builds and exports.
- `route-recipient/`, `release-browser/recipient/`, `release-rest/recipient/`:
  fresh-recipient reproduction.
- `harbor-final/`, `harbor-rebuild/`: reproducible native exports.
- `static/`, `native-integrity/`, `interface-capacity.json`: initial qualification.
- `jobs/five-successors-oracle/`, `jobs/five-successors-nop/`: actual Harbor
  trial/verifier results and private browser trace ZIPs.
- `commands/`: exact validation commands and full logs.
- [Consolidated manifest](evidence/2026-09-10-next-five-successors.json):
  full package/native identities, source-file hashes, artifact/log hashes,
  per-task results and protected-file preservation.
- [Generator lineage](evidence/2026-09-10-next-five-generators.json):
  new generator hashes with historical hashes retained.

## Independent review and subsequent hardening handoff

There are **no unresolved implementation or validation blockers** for this handoff.
These are runnable local-review packages, not approved final submissions.
The separate exhaustive grading phase remains necessary.

1. **Cross-package trust boundaries:** audit checker-input provenance, terminal
   report verification, private asset visibility, output/reward paths, exception
   classification and genuine-process interruption. Expand malformed trace,
   malicious checker and isolation controls without imposing a solver style.
2. **Workflow:** independently audit every admission/dispatch fence and duplicate
   terminal-delivery transition; test changing owners, multiple surviving paths,
   deeper root ancestry and response loss at each boundary. Check no valid path
   ordering or lawful recovery is excluded.
3. **Budget:** reconstruct grant-update/revision order independently from raw trace
   snapshots, then challenge reservation collisions, cross-wallet names, delayed
   release identity, reduced limits and uncertain capture at allowance boundaries.
   The present helper-sharing is allowed, but does not itself establish independent
   evaluator correctness.
4. **Calendar:** audit every intermediate publication/acknowledgement, tombstones,
   equal-revision duplicates, CAS conflicts and stale owned-booking removal.
   Expand recurrence/exception/future-change combinations across window movement,
   multiple transitions, gaps and folds. Accept full recomputation and redundant
   correct generations.
5. **Route:** review the finite-prefix partition proof and symbolic transformations;
   add independently constructed translations and malformed/edge-name policies.
   Audit exact target capacity enforcement and all unrequested attribute/egress
   preservation. Never restore an arbitrary ban on graph cloning.
6. **Browser:** audit direct HTTP/DOM/bridge access and state visibility, conditional
   form preconditions, dialog operation binding, queued versus committed-but-hidden
   outcomes and independent redelivery. Ensure public debug facts do not expose
   private expected results, and preserve legal fill-response-only submission.
7. Re-run static, oracle/nop, integrity and affected regressions on any changed
   digest; extend coverage/cheat qualification in fresh paths. Obtain human-authored
   final contribution material and required final rubric/standard/cheat runs before
   submission. **Model trials come afterward under separate authorization.**

No new defect in a previously successful Trial 2 submission is claimed here.
New business requirements, added coverage of old requirements and historical
reproduced defects must stay separately labeled in the review.
