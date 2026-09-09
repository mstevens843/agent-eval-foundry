# Next five: selection and implementation, 2026-09-09

## Selection

Select the next five in the all-25 evidence ranking, excluding the five already
prepared for Trial 2. This is an exploratory priority, not evidence that these
versions will cause valid model failures. Every original service passed.

| Priority | Package | Original trial | Evidence and limitation |
|---|---|---|---|
| 1 | 14 — Route policy | 45m15s | Longest original trial; many checker errors corrected during the solve. Successor community cases need integration. |
| 2 | 03 — Browser replay | 25m35s | Real DOM, remounts, confirmation and replay identity; solver found its own defects. Saved winner still handled the local crash successor. |
| 3 | 18 — Recurring calendar | 27m16s | Civil-time and occurrence-identity interactions; extensive solver testing. Original zero concerned labels, not service correctness. |
| 4 | 20 — Workflow authority | 18m13s | Origin, changing authority and terminal history; real restart scenario. Corrected grading accepted the saved result. |
| 5 | 04 — Delegated budget | 11m59s | Cumulative budgets, authority versions and uncertain delivery. Crash ablation adds a distinct obligation, but the saved winner passed it. |

Sources: [all-25 ranking](second-trial-priority-2026-09-09.md),
[source audit](evidence/2026-09-09-second-trial-source-audit.json), and the five
individual trial-analysis documents. Capacity maintenance and partial release are
the nearest alternatives; their stronger timing alone does not outweigh the
selected packages' interacting state/history requirements.

## Implementation plan

1. Preserve the five packages' original sources and hash the first group's tasks,
   shared runtime, execution engine, source and built JavaScript. Keep historical
   successor directories and the first group's frozen exports intact.
2. Complete both private service implementation closures before removing public
   solution scaffolding. Replace service modules with an empty entry point; retain
   input, API, output and execution contracts. Remove worked repair instructions.
3. Integrate valid successor semantics: route community combinations, calendar
   cancelled-move behavior, and real process interruption for browser and budget.
   Use task-local adapters so the other agent's runtime does not change. Audit
   checker inputs for derived-answer leaks and missing raw facts.
4. Provide the independent release-validator deliverable for all five, including
   browser and budget. Make reasons diagnostic only; permit submitted helpers.
   Supply private checkers independent of the grading implementation. Validate
   correct alternative implementations as well as known negative controls.
5. Export native Harbor packages and reproducible Foundry snapshots. Browser replay
   needs a pinned Chromium verifier image; the solver image contains no private
   grading material. Preserve shared verifier isolation and reward protections.
6. Run affected-package service/control assurance, complete oracle/checker checks,
   untouched-starter rejection, native integrity checks, upstream static checks,
   reproducible release export and recipient validation. Investigate semantic or
   infrastructure discrepancies before declaring readiness. No model trials here.
7. Append versioned engineering evidence to each existing analysis document. Do not
   invent Trial 2 results or overwrite Trial 1 evidence. Publish exact trial-ready
   directories, digests and remaining final-submission requirements.

## Status

**All five Foundry and native Harbor exports are ready for second exploratory
trials.** The September 9 preflight completed the deferred browser integrity run
and all five Harbor oracle/nop pairs. Every oracle earned reward 1; every untouched
starter earned reward 0 for a missing required deliverable, with no infrastructure
errors. No model trials for this group were launched.

The completed first campaign's isolated `frozen-source/` runtime can load all ten
remaining successor exports. It is reused without modification, with separate
controllers, readiness records and job directories for each new group. Package
and native export digests are unchanged by this preflight.

## Implemented changes

All five public workspaces now contain an empty service entry point, domain and API
contracts, and the checker interface. The previously supplied solution modules are
removed. Private reference and alternative implementations contain their complete
module closures, so neither relies on solution code left in the starter. Obsolete
public tests that imported those removed modules were removed; original sources
and tests remain in the baseline copies and historical versions.

Each package requires the service and an independent release validator. The public
checker interface gives the raw facts, exact verdict shape and execution budget;
reasons are optional diagnostics. It does not give expected outputs or require
private reason labels. Browser and budget gain this second deliverable in this
version, so their Trial 2 duration/reward comparisons must identify that change.

| Package | Substantive engineering |
|---|---|
| 14 — Route policy | Integrated successor community-combination cases; preserved raw route inputs and valid alternative configuration shapes; removed cloning/inlining tutorials; corrected the grader's term-count boundary and documented actual action/match bounds. The independent checker uses an explicit execution stack rather than the grader's recursive interpreter. |
| 03 — Browser replay | Integrated real process interruption after a committed browser operation, retaining browser/storage state for redelivery. Added a whole-trace-only memoization control. Added raw replay inputs and an independent effect/precondition validator. Retained actual Playwright ZIP artifacts without including ZIP payloads in checker inputs. |
| 18 — Recurring calendar | Removed label-mapping tutorials and clarified the existing semantics of moves on cancelled occurrences. The independent checker derives civil-time occurrences by inverting offset intervals, separately from the grader's minute scan, and checks occurrence identity, history and bookings. |
| 20 — Workflow authority | Removed receipt-recovery and policy-refresh solution instructions while retaining their observable requirements. Preserved raw job and admission-policy facts. Restricted simulated restart handling to an interruption actually injected by the authority. Added an independent origin/authorization/history checker. |
| 04 — Delegated budget | Integrated real interruption after a debit and five combined interruption/uncertain-transport cases. Added a control that trusts only its local receipt journal. Removed derived expected decisions and wallet states from checker-visible traces. Corrected both private services to resolve pending historical receipts before reconsidering current eligibility. Added an independent cumulative-budget/history checker. |

Browser and budget interruption adapters are task-private. No shared execution
engine change was needed. A submission throwing the interruption sentinel cannot
manufacture a restart; the authority must actually have injected the lost response.

The existing first-group authoring-policy changes apply here: no mandatory green
starter test suite, separately timed human solve before exploratory trials,
self-verifiability disqualification, or unrelated whole-cohort revalidation. Public
requirements and custom schemas remain available. Removing implementation hints
does not make an undisclosed requirement legitimate.

## Validation evidence

[Consolidated evidence](evidence/2026-09-09-next-five-implementation.json) records
exact export digests, evidence-file hashes, source-byte checks and remaining work.
Artifacts are under `.local/next-five-implementation-2026-09-09/`.

| Check | Result |
|---|---|
| Full Foundry assurance | 74 checks passed across five packages; complete reference and alternative services; all five untouched starters fail semantically. |
| Private independent checker oracles | 59/59 candidate verdicts correct, comprising 10 correct implementations and 49 negative controls; zero false accepts or misses. |
| Foundry export reproduction | All five rebuilt identically and passed fresh recipient validation, including evidence/artifact drift rejection. |
| Native static checks | 110/110 passed on `harbor-final/` (22 checks per task). |
| Native verifier integrity | 30 controls passed: 24 retained across route, calendar, workflow and budget, plus six fresh browser controls. For route/workflow, final wording changed after those runs; verifier and oracle bytes were independently compared and are identical. Calendar/budget/browser checks match their final export digests. |
| Native browser integrity | All six controls passed on the final export, including forged reward/output rejection; private checker oracle 10/10. The earlier 600-second infrastructure timeout remains retained development evidence. |
| Native Harbor end-to-end oracle/nop | Five oracle reward-one results and five expected nop zeroes on the exact final exports, with zero infrastructure exceptions. Nop rejects the missing required checker; Foundry assurance separately verifies semantic failure of each empty service starter. |
| Regression checks | 25 tests passed across next-five export/restart, top-five export, third-portfolio and fourth-portfolio tests. Changed TypeScript tests pass formatting/lint checks. |
| Preservation | Protected task/runtime/source bytes unchanged. All first-group native exports reproduce exactly with the extended builder. Six main-tree `dist/` files changed during the other agent's rebuild; the earlier full-tree preservation failure is retained rather than relabeled as a pass. |

The native browser verifier now uses `init: true` in its task-local Compose
configuration; direct integrity runs use `docker run --init`. Harbor's installed
separate-verifier path loads the `tests/` build context and its Compose overrides.
An init process is recommended by [Playwright's Docker guidance](https://playwright.dev/docs/docker#recommended-docker-configuration)
to reap orphaned browser processes. The rerun passed with this configuration,
including native Harbor execution. This confirms the final package works without
establishing process reaping as the sole cause of the earlier stall. The change
affects native packaging only, not the validated Foundry browser export.

## Retrial handoff

Use these **Foundry** directories for the next exploratory campaign. Pin each
full digest from the evidence JSON rather than rebuilding from the live checkout.

| Priority | ID | Export (under `.local/next-five-implementation-2026-09-09/`) |
|---|---|---|
| 1 | route-policy-repair | `release-ready/route-policy-repair/export` |
| 2 | browser-replay-repair | `release-ready/browser-replay-repair/export` |
| 3 | recurring-calendar-repair | `release-ready/recurring-calendar-repair/export` |
| 4 | workflow-authority-repair | `release-ready/workflow-authority-repair/export` |
| 5 | delegated-budget-repair | `release-ready/delegated-budget-repair/export` |

The [prepared Trial 2 handoff](../../docs/next-five-trial-2-handoff.md) gives the
exact launch command and assignments: route/browser to Claude, calendar/workflow/
budget to Codex. A prepared controller under
`.local/round-two-next-five-2026-09-09/` reuses the completed first campaign's
frozen runtime with a fresh job store and output directory. Browser replay retains
the Chromium-capable verifier runtime declared by its export. No model dispatch
is part of this preflight.

Append actual second-trial results to each existing analysis document, preserving
Trial 1 and this engineering record. Record actual model/profile, digest, service
and checker outcomes separately, duration, infrastructure errors and concrete
submission defects. Neither a local control nor an infrastructure failure counts
as a new standard model failure. Empty starters and broader controls create a
stronger experiment; they do not establish that a model will fail.

Completed native commands and result locations are retained in
[the implementation guide](../../docs/next-five-implementation.md).
The final hiring submission still needs the required human-authored material,
rubric checks, six genuine standard failures and two zero-reward cheat trials on
the selected final version. No such qualification is claimed by this report.
