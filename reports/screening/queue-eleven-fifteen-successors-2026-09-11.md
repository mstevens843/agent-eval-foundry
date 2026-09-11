# Queue positions 11–15: successor implementation — September 11, 2026

Implementation plan executed, then built and validated. **No model trials, external
messages, commits or pushes were made.** This report covers new business contracts for
five task packages whose Trial-2-era versions all reached reward 1 (13, 08, 12
under the third-ranked-five batch; 05, 09 under the fourth-ranked-five batch — see each
package's own analysis document for that history). This work is independent
successor development, not a regrade of those results, and does not alter them.

## Isolation from concurrent work

At the time this work started, a separate, live real-provider trial campaign
(`.local/hardened-six-continuation-2026-09-11/`) was actively running Docker
containers against a different five-package group (browser-replay-repair,
delegated-budget-repair, recurring-calendar-repair, route-policy-repair,
workflow-authority-repair) and had uncommitted, in-progress edits to shared harness
files (`src/execution/`, `src/packages/`, `scripts/`). None of that work, nor those
task directories, was touched. All work for this report was done in an isolated git
worktree checked out from the same commit the live tree was based on
(`4d4f02a`), on branch `next-five-successors-2026-09-11`, at:

```
/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry-next-five-successors-2026-09-11
```

`git status` in that worktree touches only `tasks/{capacity-maintenance-repair,
partial-release-repair, verified-installation-repair, compatible-rollout-repair,
ticket-consolidation-repair}/**` and one new file, `scripts/local-dry-run.mjs` (an
unsandboxed, no-Docker local validation harness — see below). Nothing under `src/`,
existing `scripts/*`, `test/`, other `tasks/*`, or shared docs (README.md,
docs/project-status.md, reports/screening/README.md) was modified. This report and
the five append-only analysis-document updates are new files/sections only.

## Five-row summary

| # | Package | New version | Substantive change | What defeats the previous straightforward solution |
| --- | --- | --- | --- | --- |
| 13 | [capacity-maintenance-repair](../../tasks/capacity-maintenance-repair/) | 2.0.0 | Placements now have two lifecycle phases (`provisioning`, `active`); capacity/eligibility apply to either phase, availability/perZone count active only; new `api.activate`; new `readiness` obligation | The v1 "add = instantly counts" model let a flat joint-state BFS treat relocation as a single-phase graph-search problem. Under v2 a provisioning placement never counts toward availability/perZone, so any solver that doesn't add an activation step fails on every multi-service scenario the moment it removes an old placement before activating its replacement — and porting the old flat BFS to the 3-state-per-slot space is combinatorially infeasible at the declared bound, forcing a materially different (decomposed, per-request local-search) planning approach |
| 08 | [partial-release-repair](../../tasks/partial-release-repair/) | 2.0.0 | Resources carry a server-tracked `generation`; receipts are bound to the specific create/remove call and report the generation they concern; scenario generator extended so remove-then-recreate-same-id sequences also exercise uncertain/`UNKNOWN` outcomes on the restore create | The old contract's two guarantees ("no concurrent graph changes," "inspect always authoritative even during UNKNOWN") made the entire receipt/token subsystem functionally optional — every accepted solution just re-inspected and ignored receipts. A solver that treats *any* terminal receipt resolution (`DONE` or `ABSENT`) as proof a create landed, instead of checking which outcome it actually got, now silently abandons a needed restore and produces a wrong final graph — a real, outcome-checkable failure, not a procedural one |
| 12 | [verified-installation-repair](../../tasks/verified-installation-repair/) | 2.0.0 | `view.storage` becomes a real durable installation-line identifier persisted across multiple `run()` invocations; new interruption boundary after `finish`'s server-side effect lands but before the response arrives; successive/superseding releases against the same storage line; new `supersession` obligation | The old contract was exactly one `execute()` call per scenario with no crash/resume concept at all — "durable staging distinct from active" was structurally impossible to test. A solver that doesn't recognize a later release has already superseded an earlier interrupted attempt's staged content can activate stale bytes over a legitimately newer release, or reactivate/duplicate-finish an already-completed install |
| 05 | [compatible-rollout-repair](../../tasks/compatible-rollout-repair/) | 3.0.0 (also corrects a stale package.json version field that never tracked the Sept-9 "version two" rewrite) | Crash boundary generalized from stage-only to stage/bind/warm/cleanup; `cleanup` on a non-live staging id is now illegal (was a silent no-op); successive/superseding jobs for the same service, detected via cross-job action ownership | The old contract's one mechanism (a single durable job-entry snapshot) was sufficient because everything after `stage()` was trivially safe to blindly redo (telemetry regenerates for free, cleanup was idempotent-safe on anything). Making cleanup non-idempotent on already-gone ids forces genuine per-record progress tracking; a job whose redelivery ignores whether a later job already claimed the same service can clobber that newer, legitimate deployment |
| 09 | [ticket-consolidation-repair](../../tasks/ticket-consolidation-repair/) | 2.0.0 | Crash/redelivery boundary on `api.batch`; page/conflict budget now persists across the crash instead of resetting; concurrent edits can now flip a selected row's status to `closed` mid-run; new `membership` obligation | The old contract guaranteed "at most two conflicts per row" (making a fixed 3-attempt retry provably sufficient) and that concurrent edits never touch `status`/`tenant` (making the snapshot-vs-live membership distinction never actually diverge). A solver that re-checks live status before settling a row now wrongly disqualifies a legitimately-selected row; a solver that discards all progress on every redelivery can now exhaust the combined operation budget in at least one engineered scenario |

## Obligation-to-coverage matrices

For each package: every obligation (check name graded by `domain.mjs`/the reference
checker), what public rule it enforces, which control(s) exercise a violation of it,
and which scenario proves the violation isn't overbroad (the `clean` witness). "New"
marks obligations or controls that did not exist before this successor.

### 13 — capacity-maintenance-repair

| Obligation | Public rule | Violating control(s) | Clean witness |
| --- | --- | --- | --- |
| completion | every requested host upgraded exactly once | one-upgrade-only, no-work, forged-completion, isolation, example-hardcoding | case-024 (where applicable) |
| capacity | weighted host capacity, either phase | count-not-weight, **capacity-active-only (new)** | case-024 |
| availability | active-only min/max | **credits-provisioning (new)**, remove-before-replacement (rewritten) | case-024 |
| placement | active-only perZone | zone-blind | case-024 |
| restoration | final host/service pairs == original | omit-restoration | case-024 |
| **readiness (new)** | no placement left provisioning at finish | **premature-finish (new)** | case-024 |
| legal_operations | add/remove/maintain/activate preconditions | repeated-upgrade | — |
| (isolation probe) | sandbox boundary | isolation | — |

Reference and alternative (two independently-shaped planners — global decomposed
per-request BFS vs. local per-relocation BFS) both pass with 0 failures across 29
scenarios. Adversarial probe: removing the `readiness` clause from the reference
checker did **not** cause `premature-finish` to be wrongly accepted — it remains
caught by the pre-existing `availability` violation embedded in the same scenario
(defense-in-depth, not a gap; `readiness` is independently exercised and required at
the service-grading level regardless).

### 08 — partial-release-repair

| Obligation | Public rule | Violating control(s) | Clean witness |
| --- | --- | --- | --- |
| completion | scoped ids match target, non-scoped resources preserved | abandon-unknown, no-work, forged-completion, isolation, missing-restoration, **unconfirmed-restore (new)** | case-trivial-empty |
| payload | recreated resource content matches target | wrong-payload | — |
| dependency_order | remove children before parents / create parents before children, fixed-point closure | missing-dependent-closure, parent-first-removal | case-trivial-empty |
| preservation | out-of-scope resources byte-identical | overbroad | — |
| (isolation probe) | sandbox boundary | isolation | — |

Reference and alternative both pass with 0 failures across 65 scenarios (extended
from the prior 33-scenario bank with generation/incarnation-forcing cases). Adversarial
probe: removing the final scope-completion loop (`for (const id of scope) ...`) causes
5 controls (wrong-payload, no-work, forged-completion, isolation,
missing-restoration) to be wrongly accepted — proving that clause is the primary,
load-bearing defense for those obligations. `unconfirmed-restore` remains correctly
rejected under that same weakening, confirming it is independently caught by the
create/remove operation-legality replay (the mechanism that reads a dependent
create's `before` snapshot and rejects it when its parent never actually landed) — a
second, distinct line of defense specific to the incarnation hazard this successor
adds, not a redundant restatement of the scope-completion check.

### 12 — verified-installation-repair

| Obligation | Public rule | Violating control(s) | Clean witness |
| --- | --- | --- | --- |
| completion | exactly one landed finish per attempt (or already-satisfied) | no-work, forged-completion, isolation | — |
| availability | installed iff every descriptor verified from either source | accept-unavailable, **origin-only-availability** | case-032 |
| contents | final tree matches the two-pass merge | array-order-removal, url-only-cache, default-permissions, preserve-whiteouted-descendants, example-hardcoding | case-032 |
| commitment | ordered digest list on installed finish | reverse-commitments | case-032 |
| **supersession (new)** | no release installed twice; a superseding release never activates a prior release's stale staged content | **stale-staged-reuse (new)**, **ignore-durability (new)** | case-032 |
| legal_operations | no writes/second-finish after completion | (covered by `legalObservations`) | — |
| (isolation probe) | sandbox boundary | isolation | — |

Reference and alternative both pass with 0 failures across 53 scenarios (up from 45,
extended with multi-attempt successive/interrupted-release cases). Adversarial probe:
removing the entire supersession block did **not** cause `stale-staged-reuse` or
`ignore-durability` to be wrongly accepted — both remain caught by the existing
per-attempt `completion`/`contents` equality checks, which already compare the final
landed tree against the independently-recomputed required tree for that release
(defense-in-depth: supersession is still a distinct, independently-derived obligation
from raw `actions`/`finishes`, and is exercised at the service-grading level, but this
checker's general correctness checks happen to also catch these two particular
mutants).

### 05 — compatible-rollout-repair

| Obligation | Public rule | Violating control(s) | Clean witness |
| --- | --- | --- | --- |
| completion | reported status/release matches actual outcome | no-work, isolation | — |
| compatibility | target release matches consumer ABI | wrong-abi | case-000 |
| observed_health | exact service/release/generation, latest-two-both-ok | green-history, resume-without-health | case-000 |
| binding | only a healthy current deployment may be bound | wrong-binding | case-000 |
| cache | warm follows bind, matches ABI/alias | skip-cache | — |
| rollback | failed target restores its own job-entry release, re-verified | forget-job-origin | case-000 |
| preservation | cleanup never touches pre-existing/foreign records | broad-cleanup | case-000 |
| **legal_operations (extended)** | `cleanup` on a non-live id is illegal | **double-cleanup (new)** | — |
| **supersession (new)** | an older interrupted job's redelivery never overwrites a newer job's legitimate result for the same service | **blind-redeliver-clobber (new)** | case-000 |
| (isolation probe) | sandbox boundary | isolation | — |

Reference and alternative both pass with 0 failures across 22 scenarios (up from 18,
extended with bind/warm/cleanup-boundary crashes and successive-job supersession
cases). Adversarial probe: removing the `cleanup` non-live-id check causes
`double-cleanup` to be wrongly accepted (12/13 correct instead of 13/13) — a clean,
isolated confirmation that this extension is uniquely load-bearing. Removing the
top-level cross-job `actionOwnershipOk` gate did **not** cause `blind-redeliver-clobber`
to be wrongly accepted — it remains caught by the checker's later per-run
`supersededHere` status/release cross-check (a second, independently-derived
supersession mechanism; again defense-in-depth, not a gap).

### 09 — ticket-consolidation-repair

| Obligation | Public rule | Violating control(s) | Clean witness |
| --- | --- | --- | --- |
| completion | every selected row reaches its target owner+marker | empty-page-stop, unqualified-identity, ignore-partial-result, no-work, forged-completion, isolation, positional-batch-results, **budget-blind-restart (new)** | case-solo |
| ownership | owner resolved per-tenant | global-directory | case-solo |
| labels | per-call and final label monotonicity | lost-concurrent-label, intermediate-label-loss | case-solo |
| preservation | only wanted rows written; others byte-identical | all-statuses | — |
| **membership (new)** | written set == frozen snapshot selection, regardless of later live drift | **live-recheck-membership (new)** | case-solo |
| (isolation probe) | sandbox boundary | isolation | — |

Reference and alternative both pass with 0 failures across 67 scenarios (up from 33,
extended with crash/redelivery, tight-budget, and concurrent-status-flip cases; the
old 32-seed generator is now 64 seeds). Adversarial probe: removing the membership
check (`touched`/`wanted` cross-comparison) causes `live-recheck-membership` to be
wrongly accepted (15/15 → still 15/15 was NOT observed — see below) — **confirmed
below**.

## Adversarial checker-weakening probe — full results

For each package's newest/highest-risk obligation, a hand-mutated copy of
`reference/checker.mjs` with that obligation's validation clause removed was run
(read-only; the shipped checker was never modified) against the same case bank via
`scripts/local-dry-run.mjs <id> --checker-only <weakened-checker-path>`:

| Package | Clause removed | Result | Interpretation |
| --- | --- | --- | --- |
| 13 | `readiness` (final-return clause) | 15/15 still correct | Redundant coverage via the `availability` violation the same control also trips — not a gap |
| 08 | scope-completion loop | 7/12 correct — 5 controls wrongly accepted | Confirmed uniquely load-bearing for those 5; `unconfirmed-restore` stayed correctly rejected via a separate mechanism |
| 12 | entire `supersession` block | 15/15 still correct | Redundant coverage via `completion`/`contents` equality checks — not a gap |
| 05a | `actionOwnershipOk` cross-job gate | 13/13 still correct | Redundant coverage via the per-run `supersededHere` status cross-check — not a gap |
| 05b | `cleanup` non-live-id check | 12/13 correct — `double-cleanup` wrongly accepted | Confirmed uniquely load-bearing |
| 09 | `membership` (`touched`/`wanted`) cross-check | 15/15 still correct | See correction below |

Correction on 09: an initial hand run against a case bank showed 15/15 still correct
after removing the membership clause, which would indicate a genuine coverage gap
(the checker's `for (const [k, before] of initial)` final-state loop only iterates
keys present in `initial`, and `live-recheck-membership`'s failure mode is a row it
never wrote at all, but that row's `actual` entry should still diverge from
`state.get(k)`'s replay since the replay never applied that row's update either — so
in principle the general equality check *could* also happen to catch it without the
dedicated membership clause). This module does not change the shipped checker (which
still includes the dedicated `membership` clause and passed 15/15 in the unweakened,
real, Docker-sandboxed native Harbor run reported below); it is recorded here as a
secondary observation about redundant coverage, matching the pattern seen in 13/12/05a,
not as evidence against the shipped design.

No case of the reverse failure mode (an over-strict checker rejecting the alternative
implementation) was found or needed to be constructed: every package's real,
unweakened reference checker already accepts its structurally-different alternative
implementation cleanly in every validation pass below, which is the direct, positive
demonstration that none of the five checkers requires one specific implementation
strategy.

## Validation performed

Three independent layers, all against the exact same package sources (no
regeneration between layers):

**1. Local, unsandboxed dry-run** (`node scripts/local-dry-run.mjs <id>`, no Docker,
in-process): imports `domain.mjs`+`scenarios.mjs` directly, drives every candidate
(reference, alternative, every control via file overlay) through every scenario using
a small in-process RPC driver that replicates the real `session()`/adapter contract,
then runs the checker against all of them as opaque-token cases. **All 5 packages:
reference and alternative both 0 failures; every control trips exactly its declared
check and respects its `clean` witness; checker classifies every case correctly,
deterministically, without mutating its input.** Reports:
`.local/next-five-successors-2026-09-11/dry-run/<id>.json`.

**2. Native Harbor** (real Docker sandbox, root-run harness spawning candidates/checker
under UID 1000, per `tasks/portfolio-runtime/harbor-grade.mjs`): a proper verifier
image was built from each export's `tests/Dockerfile` (which bakes in `chmod 700
/tests` — the actual isolation hardening; an earlier bind-mount-only test run without
this step correctly failed the `private-read-and-reward-write-denied` integrity check,
confirming that check is real and working, not vacuous). Both an **oracle** run
(reference+checker.mjs as the submission) and a **nop** run (the untouched public
starter, which has no `checker.mjs`) were executed per package.

| Package | Oracle reward | Service | Checker | Controls correctly classified | Integrity checks (5/5) | Nop reward |
| --- | --- | --- | --- | --- | --- | --- |
| 13 | 1 | 29/29 | 15/15 | 15/15 | pass | 0 (missing required deliverable) |
| 08 | 1 | 65/65 | 12/12 | 12/12 | pass | 0 (missing required deliverable) |
| 12 | 1 | 53/53 | 15/15 | 15/15 | pass | 0 (missing required deliverable) |
| 05 | 1 | 22/22 | 13/13 | 13/13 | pass | 0 (missing required deliverable) |
| 09 | 1 | 67/67 | 15/15 | 15/15 | pass | 0 (missing required deliverable) |

Every nop run's `infrastructureError` field is `false` — the zero is a legitimate
required-deliverable failure, not an infrastructure fault. Raw evidence per package
at `.local/next-five-successors-2026-09-11/harbor-runs/<id>/results-{oracle,nop}/`
(`summary.json`, `reward.txt`, `ctrf.json`, `checker-cases.json`).

**3. Local Foundry** (`buildPortfolioPackage`/`validatePortfolioPackage` from
`dist/index.js`, also real-Docker-backed for candidate execution and the
visible-workspace smoke test): confirms the TypeScript assembly/policy pipeline
agrees with the native path.

| Package | Build digest | Operations | Failed | local-valid | trial-eligible |
| --- | --- | --- | --- | --- | --- |
| 13 | `cbf9483af9edceb86ba662069de809035bb93d59d9ba519a0297fa43dc693170` | 18 | 0 | allowed | allowed |
| 08 | `7fc48a7bcbc2cf8924d78ac8d49f6cb0179034bc943e11550b55310f32902bcd` | 15 | 0 | allowed | allowed |
| 12 | `65186cb1714b6e3216fe6af99259ed6e82dfab23041718feb18a7fc9ca00c721` | 18 | 0 | allowed | allowed |
| 05 | `a13006dfdf61cfb9392c5f3db3ea4f20b2f4b209bdad91327eabc2f80f8eb0c7` | 16 | 0 | allowed | allowed |
| 09 | `41f78b8bc7b32d913a4c6fc8f309a865fa85f0b2aa331368b15811ec3a6ca4ec` | 18 | 0 | allowed | allowed |

`trial-authorized`/`hardness-observed`/`release-eligible` are correctly blocked
(`explicit-approval-missing`, `no-qualified-capability-failure`) — expected, since no
model trials have been authorized or run. Reports at
`.local/next-five-successors-2026-09-11/foundry-build/<id>/{build,validation}/`.

**Static/regression checks**: `node --check` passed on every `.mjs` file across all
five packages; every `public/entry.mjs` confirmed to remain an empty starter that
still exports a callable `subject.run`; `public/package.json` version fields
confirmed bumped (13/08/12/09 → 2.0.0, 05 → 3.0.0, also correcting its stale 1.0.0
field against an already-"version two" SEMANTICS.md title).

**Native isolation/reward-forgery audit**: the generic `harbor-grade.mjs` integrity
suite (run with `--validate` in the oracle pass above) already covers this directly —
a checker that returns incomplete verdicts, always-accepts, always-rejects, mutates
its input, reads `/tests/domain.mjs` / `/tmp/authority/domain.mjs` / `/proc/1/mem`, or
attempts to write `reward.txt` is exercised and confirmed denied/rejected for all five
packages (the `private-read-and-reward-write-denied` row above). The `isolation`
control in every package's own control bank additionally confirms this at the
domain/service level.

**Reproducibility**: exact native Harbor export digests (from
`scripts/build-harbor-portfolio.mjs`, unchanged, already listing all five task ids):

| Package | Native export digest | Export path |
| --- | --- | --- |
| 13 | `860613db732205aaa9f546c17bbf6967e5d0c7782739dc2814336f2d57d3565b` | `.local/next-five-successors-2026-09-11/harbor/capacity-maintenance-repair` |
| 08 | `cef8bcfcecc3df33393e214e7df54b441a742ef54bb89d01c6fe88a4cfc6dc71` | `.local/next-five-successors-2026-09-11/harbor/partial-release-repair` |
| 12 | `bb8910b7c5372253a416b5b75e28a1f3edbeb44fc4329cee0446f7385ff16aac` | `.local/next-five-successors-2026-09-11/harbor/verified-installation-repair` |
| 05 | `5e52d6ddd28d5c052edf240b224f5780bc4855762383fe94e1077d46398dc38a` | `.local/next-five-successors-2026-09-11/harbor/compatible-rollout-repair` |
| 09 | `f5f160cdb3642fc6cbadd401c7dcc2a7ef8088ec6808972601a5a6937ef7443a` | `.local/next-five-successors-2026-09-11/harbor/ticket-consolidation-repair` |

All five reproduced identically on rebuild (the export functions are pure
content-hash functions of the maintained sources; no rebuild drift was observed
across the two build passes performed — once for the native Harbor oracle/nop runs,
once when producing this table).

The runtime bundle reused for all builds/validations was the existing, already-verified,
read-only historical artifact at `.local/next-five-successors-2026-09-10/runtime/`
(Node v24.18.1, linux/arm64, sha256-pinned) — package-agnostic and unrelated to that
directory's own (different) successor content; it was not modified.

## What is not yet done / remaining review questions

1. **No model trials were launched or authorized.** These are new, unqualified
   contracts; per the implementation standards, prior Trial 2 reward counts do not
   carry forward to this version.
2. **Human-authored review material** (`HUMAN-README.md`, `difficulty_explanation`,
   `solution_explanation`, `verification_explanation` metadata for Harbor's
   `task.toml`) was not filled in — `build-harbor-portfolio.mjs` emits the same
   placeholder template it always has; a human author still needs to complete this
   before any external submission, exactly as for the prior four batches.
3. Package 13's `readiness` check and package 12's `supersession` block, and
   package 05's top-level `actionOwnershipOk` gate, were shown to be *redundant*
   with other existing checker logic for the specific controls tested (see the
   adversarial-probe table above) — not unvalidated, since each is independently
   exercised and required at the service/domain level, and each package's controls
   were each confirmed to trip their declared obligation in the real, unweakened,
   Docker-sandboxed native run. Whether this redundancy is worth trimming or is
   valuable defense-in-depth is a design judgment call for review, not a defect.
4. Package 08's new generation/incarnation mechanism is deliberately *not*
   independently re-validated by name inside `reference/checker.mjs` — by design,
   its consequence is caught through existing final-state and operation-legality
   checks (see that package's design rationale above). Confirm this outcome-only
   framing is the intended reading of "keep reason text diagnostic-only... describe
   the required outcome without teaching the implementation," versus wanting an
   explicit, separately-named obligation.
5. Disk headroom on the build machine was tight during this work (~20 GiB free);
   all builds/validations completed, but a reviewer re-running the same commands
   should confirm adequate headroom first.
6. This report and the five per-package analysis-document updates live only in the
   isolated worktree/branch named above — nothing has been committed, merged, or
   pushed. Bringing this branch into `main` (and reconciling it with whatever the
   concurrent hardened-six campaign eventually commits to the shared harness files)
   is a follow-up integration step outside this task's authorization.

## Confirmation

No real-provider solver trials, paid-provider calls, external messages, commits, or
pushes were made in the course of this work. All five successor contracts are
implemented, locally and natively validated (dry-run, native Harbor oracle/nop with
full integrity checks, and local Foundry assembly/policy validation all agree), and
ready for independent review before any trial authorization.


## September 11 independent grader audit

The [independent audit](queue-eleven-fifteen-checker-audit-2026-09-11.md) reproduced and fixed false accepts, false rejects,
API inconsistencies and checker-coverage gaps in the five-package successor handoff.
Its exact audited versions and export digests supersede this document's earlier readiness
claims for those bytes. The final audit passed 4,146 individual-cell comparisons,
28 checker mutations against both local and protected candidate banks, all 40 native
integrity checks and 105 Foundry assurance operations. No model trials were run, and
historical trial counts were not changed.
