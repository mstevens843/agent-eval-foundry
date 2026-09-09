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

**All five Foundry exports are ready for second exploratory trials.** No model
trials for this group were launched. Native Harbor exports are built and pass the
static checks, but native browser integrity and the five Harbor oracle/nop jobs
remain pending. These are separate execution paths: the browser Foundry export
already passed its full local validation and recipient reproduction.

The first group's five model trials now run from their controller's isolated
`frozen-source/` build. This implementation leaves that build, campaign, exported
packages and results alone. Heavy Docker validation is deferred while those trials
occupy the host; source review, packaging and host-only checks can continue.

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
| Native verifier integrity | 24 passed across route, calendar, workflow and budget. For route/workflow, final wording changed after those runs; verifier and oracle bytes were independently compared and are identical. Calendar/budget checks match their final export digests. |
| Native browser integrity | Pending rerun. The previous attempt timed out at 600 seconds and retained an infrastructure error during browser-context shutdown after reference, alternative and one negative control passed. This is not a model failure. |
| Native Harbor end-to-end oracle/nop | Not run for these five. Prepared as separate, provider-free jobs with concurrency one. |
| Regression checks | 25 tests passed across next-five export/restart, top-five export, third-portfolio and fourth-portfolio tests. Changed TypeScript tests pass formatting/lint checks. |
| Preservation | Protected task/runtime/source bytes unchanged. All first-group native exports reproduce exactly with the extended builder. Six main-tree `dist/` files changed during the other agent's rebuild; the earlier full-tree preservation failure is retained rather than relabeled as a pass. |

The native browser verifier now uses `init: true` in its task-local Compose
configuration; direct integrity runs use `docker run --init`. Harbor's installed
separate-verifier path loads the `tests/` build context and its Compose overrides.
An init process is recommended by [Playwright's Docker guidance](https://playwright.dev/docs/docker#recommended-docker-configuration)
to reap orphaned browser processes. Missing process reaping is a suspected cause
of the stall, not a confirmed diagnosis; the Docker rerun must establish whether
this fixes it. The change affects native packaging only, not the validated Foundry
browser export.

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

Freeze the next campaign's execution source independently, as the running campaign
now does. Do not reuse its job store, reservations, output directory or prepared
records. Browser replay must use the retained Chromium-capable runtime declared
by its export. No new model dispatch is part of this implementation task.

Append actual second-trial results to each existing analysis document, preserving
Trial 1 and this engineering record. Record actual model/profile, digest, service
and checker outcomes separately, duration, infrastructure errors and concrete
submission defects. Neither a local control nor an infrastructure failure counts
as a new standard model failure. Empty starters and broader controls create a
stronger experiment; they do not establish that a model will fail.

For provider-free native completion after Docker capacity is available, use the
commands in [the implementation guide](../../docs/next-five-implementation.md).
The final hiring submission still needs the required human-authored material,
rubric checks, six genuine standard failures and two zero-reward cheat trials on
the selected final version. No such qualification is claimed by this report.
