# Next five task designs: review before further trials

September 10, 2026. **There is a substantial design opportunity across these five tasks, but removing starter code and repeating the existing task is unlikely to supply it.** The best next experiment combines broader, meaningful workloads inside the current contracts with a specific proposed extension for each domain. The extensions below are design hypotheses, not measured failure improvements or claims of optimality.

This is the requested design review. No task, public contract, grader, oracle, export, trial result or counting disposition was changed. No model calls or diagnostic regrades were made. Comprehensive grading and anti-cheat hardening remains a subsequent phase.

The review inspected the original trial analyses, subsequent engineering records, completed Trial 2 submissions, current public interfaces, private authorities and scenario generators, native authoring Dockerfiles, and the successful finalists' later analyses. All **171 maintained files** across the five task directories byte-match their corresponding frozen Trial 2 `export/package` copies; all five public surfaces also match `export/visible/public`. Repository HEAD at inspection: `4d4f02a5b977fbc9f296f6139af0a97b8d68f2a5`.

## Applicable rules and useful latitude

The current [implementation rubric](https://github.com/harbor-framework/terminal-bench/blob/main/docs/prompts/task-implementation.toml) permits concise objectives without solution steps or explanations of expert prerequisites. Each tested behavior must follow an available requirement; individual tests need not be listed. Custom schemas remain documented. Verification should judge outcomes, and an expert solution must be feasible within the resources and a few hours of implementation.

The [proposal rubric](https://github.com/harbor-framework/terminal-bench/blob/main/docs/prompts/task-proposal.md) permits environment exploration and discourages repetitive guidance, contrived corner-case collections and misleading questions. The [contribution guide](https://github.com/harbor-framework/terminal-bench/blob/main/CONTRIBUTING.md) recommends richer environments, dynamic systems and cross-domain expertise. Solver internet access should remain available.

These support leaving consequences for the solver to derive. They do not require an always-green public test suite, forbid shared service/checker helpers, or prescribe an implementation algorithm. This review adds no such requirements. In particular, the calendar's custom weekly anchoring and the budget's exact error/recovery semantics are domain inputs; deleting them is not the same as omitting an expert tutorial.

The [Klavis assignment](https://docs.google.com/document/d/1DAAGNM4BZnSLX-FuGmsB4qarO__nm1i4FcKwu9dsKrM/edit) was also retrieved. It permits extensive coding-agent use and does not require a Terminal-Bench PR. This design review retains the user's reported five-of-six screening objective and does not change previous qualification accounting. Source downloads are retained locally under `.local/next-five-design-review-2026-09-10/`.

## What the successful five actually teach

The completed finalist record is **three tasks at 6/6 reward zero and two at 5/6**, each with three counted trials per provider. See the [final campaign](../reports/screening/three-replacements-2026-09-09.md) and its linked audits.

The recurring mechanisms were temporal correctness, persistent identity, and the distinction between an invalid execution and a legitimate alternative execution. Incremental build's checker accepted publication before the compiler issued the required handle. Issued report checkers rejected permitted error recovery. Cache checkers restricted legal copies and missed retained stale metadata. Snapshot checkers confused string identity or imposed requirements on staging that applied only to publication. Temporal-capacity checkers mishandled empty sources or valid restarted traversals.

Those are lessons for the required validator as well as the service. In the latest three replacement attempts, all three services and original checker banks passed; the added controls exposed required-checker defects. Consequently, the evidence supports building tasks with meaningful distinctions between final state, intermediate effects, authoritative history and legal alternatives. It does not establish that longer instructions, more source files or more simulated crashes inherently produce failures.

Here, **submitted checker** means the agent's required release validator. **Private grader/verifier** means our evaluation code. **`/cheat`** is the adversarial evaluation mode used to attack the latter; it is not an additional business-rule component of the task.

## Current evidence

All five completed successor attempts received reward 1. Route policy's interrupted attempt remains unscored; its completed retry is used below. These are passes on the retained banks, not a new assertion of complete coverage of every possible legal input.

| Task | Completed Trial 2 | What made the service tractable |
|---|---|---|
| [14 — Route policy](../reports/screening/third-five/14-route-policy-repair.md) | Claude; 42m19s; service 27/27, checker 12/12 | Dispatch on original input scope, clone reachable policy graphs and change terminal accepts. Both completed trials found this construction. |
| [03 — Browser replay](../reports/screening/original-five/03-browser-replay-repair.md) | Claude; 26m05s; service 20/20, checker 10/10 | A purpose-built API supplies candidate identities, observations, bounded settling and durable per-trace receipts. The solver constructed its own driver simulator. |
| [18 — Recurring calendar](../reports/screening/fourth-five/18-recurring-calendar-repair.md) | Codex; 12m27s; service 31/31, checker 13/13 | The complete input supports one deterministic reconciliation function, shared with the checker, followed by one commit. |
| [20 — Workflow authority](../reports/screening/fourth-five/20-workflow-authority-repair.md) | Codex; 12m36s; service 30/30, checker 14/14 | Complete catalogs, graph reachability and an atomic decision/effect operation reduce the service to a short recovery loop. |
| [04 — Delegated budget](../reports/screening/original-five/04-delegated-budget-repair.md) | Codex; 18m46s; service 21/21, checker 10/10 | Stable grants during each job, authoritative cumulative spending, idempotent keys and bounded lookup support sequential processing. |

The current public workspaces have only five or six files each and no implemented service modules. Instructions are twelve lines. The saved workflow service is 126 lines; budget is 78 lines. Calendar uses an eight-line service adapter and a 297-line shared reconciliation module. These counts identify the abstractions the solvers found; they are not a target to inflate or a rule about acceptable difficulty.

Direct inspection of the maintained scenario generators found:

| Task | Observed workload | Larger domain already permitted |
|---|---|---|
| Route | At most 3 original policies, 2 egresses; policy-term matches contain at most 1 community, request matches at most 3 | 8 original policies, 6 egresses, conjunctions of up to 12 communities |
| Browser | At most 3 events; initial delay values 0 or 1; 4 interruption scenarios | 4 events and more of the documented render/stability schedule |
| Calendar | At most 2 series, 4 changes, 1 transition per zone; recurrence intervals 1–3 | 6 series, 12 changes, 4 transitions per zone, interval 4 |
| Workflow | At most 7 jobs, 9 deliveries, 6 grants; 2 interruption scenarios | 12 jobs, 24 deliveries, 24 grants and deeper provenance |
| Budget | At most 2 jobs, 4 requests/job, 2 wallets and 1 grant/wallet | 4 jobs, 8 requests/job, 4 wallets and 4 grants/wallet |

These measurements are workload-construction evidence, not new solver outcomes. Exercising an unused maximum is not automatically valuable. The useful cases combine obligations so that a plausible incorrect abstraction becomes observable at ordinary execution cost. The joint transport-size guarantees still apply.

## 14 — Route policy

**Confirmed design limitation.** The [public language](../tasks/route-policy-repair/public/SEMANTICS.md) permits retaining original policies and adding scoped copies. The private [reference planner](../tasks/route-policy-repair/private/reference/src/plan.mjs) performs the central construction in 33 lines. The saved Trial 2 service independently implements it. Additional random examples cannot defeat a correct construction merely by being more numerous.

**Improve within the current domain.** Build genuinely different policy graphs: multiple shared subgraphs, nested returns, overlapping prefix regions, multi-community term matches, and community additions/removals that influence later calls. Preserve nonrequested egress behavior. These inputs exercise more of the declared language than the current small graph template.

**Proposed extension.** Make the professional objective a migration to a different, explicitly specified deployment policy format while applying the scoped change. For example, the target evaluator could support bounded flat decision rules rather than source-language calls. The solver then has to preserve path-dependent behavior across the two semantics. Target-format capacity must come from the modeled deployment capability, with task instances demonstrably representable inside it. Cloning remains allowed internally; submitting the unchanged source graph would simply not be a target-format artifact.

**Why this could help.** It removes the current equivalence between the source and destination execution languages, forcing semantic compilation rather than a graph copy plus terminal-value substitution. This is a larger extension requiring a working compiler oracle before adoption. Merely adding preference matches, larger graphs or a ban on cloning does not establish that the old construction is defeated.

**Reserve for the grading phase.** The saved checker stops symbolic exploration at deterministic budgets and can return no violation after truncation. The code and trial report confirm that path, but this review did not produce a valid counterexample it accepts. That is a concrete audit target, not a newly established false pass.

## 03 — Browser replay

**Confirmed design limitation.** The [contract](../tasks/browser-replay-repair/public/SEMANTICS.md) supplies `query({step})`, explicit entity/field observations, `settle({})` and durable receipts. It also spells out an observe-after-fill/remount sequence. The native authoring image contains Node and the submission scaffold; the real app and Chromium replay authority are private verification assets. The agent solved the API contract using its own simulator rather than diagnosing an accessible application.

**Improve within the current domain.** Exercise stale and competing dialogs, repeated entity/field/value tuples at distinct steps, remounts combined with lost responses, and interruption at different documented operation boundaries. Confirm that every scenario remains completable. Larger numeric settling delays alone add little reasoning.

**Proposed extension.** Turn this into repair of a replay integration against an accessible local application. Put a representative app, DOM, client integration and legitimate debugging surface in the authoring environment, while keeping private expected outcomes separate. Add navigation or session renewal between steps and asynchronous commitment whose receipt can lag a UI transition. Preserve an observable business-operation identity and a documented deduplication/reconciliation mechanism, so recovery is possible without guessing whether a click committed.

**Why this could help.** The current simulator abstraction no longer completes the entire task: the agent must investigate how identity, navigation, dialogs and server commitment interact in an actual application. It can use any correct implementation strategy. This has the largest environment/packaging cost of the five proposals.

**Disclosure cleanup.** In a revised contract, express the required correct action and current state, or make any version/precondition token a real API requirement. The existing observe-before-submit prescription is both a repair recipe and a process constraint worth reviewing. Do not simply delete the sentence while continuing to grade the old prescribed call sequence.

## 18 — Recurring calendar

**Confirmed design limitation.** The [complete input and single-commit contract](../tasks/recurring-calendar-repair/public/SEMANTICS.md) supports full recomputation in memory. Sharing the resulting domain model between service and checker is a valid solution and must remain allowed.

**Improve within the current domain.** Combine several series, several zone transitions, interval-four recurrences, exceptions and ordered future changes. Include occurrences that cross or share display times while preserving distinct original recurrence identities, attendees and external bookings. Current cancellation and gap semantics remain unchanged for these cases.

**Proposed extension.** Make the product an incremental calendar synchronizer. It receives versioned series changes and exceptions across deliveries, maintains a materialized event/booking store, and publishes consistent generations. Retroactive amendments can affect an already materialized range. Duplicate or older deliveries must not roll it back; occurrence identity and external bookings must survive movement across publication windows.

**Why this could help.** The task now couples recurrence calculation to version ordering, persistence and publication consistency. A correct latest-looking calendar can still embody the wrong source history or leave stale bookings behind. Give the solver discoverable source records, revision rules and storage APIs; recomputation remains allowed when it achieves the required result. Avoid expanding into an entire calendar standard or making the exercise primarily format parsing.

## 20 — Workflow authority

**Confirmed design limitation.** Under the [current contract](../tasks/workflow-authority-repair/public/SEMANTICS.md), `decide()` durably records the decision and performs the effect together. The [authority implementation](../tasks/workflow-authority-repair/private/domain.mjs) confirms this. `receipt()` recovers that complete result; admission stabilizes after its documented revision race. The saved service consequently needs parent-chain resolution, filtered graph reachability, a receipt lookup and a retry loop, without a local journal.

**Improve within the current domain.** Combine deeper job provenance, several independently valid grant paths, revocation of only one path, different resources/actions, denied and executed duplicate deliveries, and interruptions among unrelated jobs. All of this already fits the declared authority model.

**Proposed extension.** Separate authorization admission from externally committed work and delivery completion. A pending authorization can become stale before dispatch; external commitment can occur before its receipt becomes visible; acknowledged history remains terminal. Preserve a clear point at which authority is evaluated, with a conditional dispatch/fencing operation and bounded eventual observations so no check-then-act race is impossible to solve. The service must reconcile pending work and current authorization across those boundaries.

**Why this could help.** The host no longer performs the entire critical transition atomically on the service's behalf. The central challenge becomes maintaining authorization provenance across real state transitions. This proposal is about delegated authority and its execution boundary, not adding an arbitrary mandatory journal format. It requires a new public protocol and authority implementation.

## 04 — Delegated budget

**Confirmed design limitation.** The [current contract](../tasks/delegated-budget-repair/public/SEMANTICS.md) supplies current cumulative `spent`, freezes grant terms during a job, specifies the request ID as the debit key, and resolves an attempted key within three lookups. The saved 78-line service legitimately looks up history, checks eligibility, debits and reconciles. Removing its comments or requiring parallel execution would not improve the problem.

**Improve within the current domain.** Exercise several grants per wallet, repeated grant IDs across different wallets, multi-job version changes and reduced limits, duplicate requests, and interruption/UNKNOWN outcomes near shared-budget boundaries. The current generator has only one grant per wallet, despite explicitly modeling per-wallet/per-grant isolation.

**Proposed extension.** Add a reservation lifecycle to delegated spending: outstanding holds, captures and releases consume or restore precisely defined portions of a grant's lifetime allowance. They can span grant versions and delivery attempts. An unknown capture cannot make its reservation available for a second spend, and a delayed release cannot undo a later, different reservation. Expose the raw reservation/settlement records needed to derive availability rather than handing the worker one already-resolved aggregate for every decision. Use revision-aware mutations where concurrent authority updates would otherwise make correctness unachievable.

**Why this could help.** It creates an accounting and identity problem across outstanding operations, rather than another check of `spent + credits <= limit`. Specify release, revocation and settlement precedence once, and let the solver derive the recovery strategy. This is a new contract; mid-job grant changes must not be introduced secretly into the current stable-within-job version.

## Recommended scope and sequencing

1. **Design and workload work first.** Keep the empty core starters, reduce the remaining implementation directions where doing so preserves an available contract, and expand meaningful interactions inside the existing domains. Choose and specify the proposed core extension per task before changing its implementation. Workflow and budget offer the clearest bounded transition from their current simple services; calendar adds a distinct persistent-publication problem; route and browser need larger compiler/environment work.
2. **Establish the new task is implementable.** Build the reference behavior and a small distinguishing example for each new mechanism as part of implementation. A new workload should expose a meaningful mistaken strategy, not merely add files or runtime. This is implementation validation, not the full subsequent grading audit.
3. **Then audit the graders and required-checker banks comprehensively.** Map each obligation to evidence, exercise valid alternative strategies as well as invalid ones, and investigate the saved passing submissions. Include legal failed-operation recovery, intermediate versus published state, exact identity, alternative valid authority paths, and bounded-work completeness. Preserve any pass until a reproduced contract-grounded defect establishes otherwise.
4. **Freeze and run new model trials after that phase.** Keep the five completed finalists intact. New business rules produce successor task versions; additional coverage of an unchanged rule is recorded as coverage work. Historical trials and any later regrades remain separately identifiable.

There is no established numerical failure probability for these proposals, and no evidence that these five are globally optimal among the remaining twenty. The concrete conclusion is narrower and useful: **all five have identifiable design gaps, the current solutions show exactly which simplifying abstractions worked, and each has a plausible professional extension that changes that abstraction.** This gives an implementation discussion grounded in the actual packages rather than another speculative five-way trial launch.
