# 04 — Delegated budget repair

Claude solved the frozen service: reward 1, **12/12 scenarios**, reported duration **11m 59s** for the completed retry. The retained earlier capture failure is infrastructure-invalid.

## The task and package

A dispatcher spends credits under versioned delegated grants. Eligibility includes wallet ownership, delegate identity, exact grant version and a cumulative grant lifetime budget across versions. Logical requests may be redelivered. An external debit can return UNKNOWN even when it took effect; the client must reconcile rather than invent success or abandon required work. Historical executed requests must still be reported correctly after a later revocation.

The package supplied six service modules, ordinary visible tests, explicit API/semantics and a protected debit authority. Independent checks covered aggregate budget, ownership, payload, completion, decisions, receipt history and unrelated-state preservation. Negative controls included stale versions, receipt claims, per-request-only budgeting, abandoned uncertainty and no work.

## What the repair did

The agent replaced job-qualified debit keys with stable request IDs and implemented a bounded lookup/retry path for UNKNOWN. It added exact grant-version checks and summed lifetime spending across grant-version rows.

It also corrected a less isolated interaction: cached wallet descriptions went stale as earlier requests in the same job spent credits. The repair invalidated that cache after success and reconciled the reported spending view with locally known committed spending. Finally, it checked external execution history before rejecting a request under a now-revoked grant, preserving truthful historical decisions.

The agent built a contract-oriented fake service, including a view whose reported spending updated between jobs rather than after every local request. The external grading suite accepted the repair on all scenarios.

## What to carry forward

The useful construction combines identity, cumulative allocation, uncertainty and historical reporting. However, this attempt solved the combination quickly. Unknown outcomes alone are not evidence that an outbox-like task will be hard.

An earlier suggestion to revoke grants mid-job exceeds this version's stable-within-job assumptions. Doing that fairly requires a new explicit contract and authority behavior, not a surprise hidden scenario. Separate post-screening interruption work also revised the contract; it is not silently merged into the measured baseline or credited as a new failure.

## Evidence boundary

[Sanitized record and exclusions](../evidence/2026-09-07-original-five.json) use actual retained run IDs; the earlier narrative's attempt numbering was inconsistent. [Maintained source](../../../tasks/delegated-budget-repair/) and [batch limitations](../README.md) distinguish the package from a captured solution. Costs are CLI estimates, not subscription billing.

## 2026-09-09 — Engineering successor prepared for Trial 2

**Ready for a second exploratory Foundry trial; no second model trial has run for this version.** This section is an engineering record, not a new reward result. Priority in the next group: 5/5. See the [selection and implementation report](../next-five-implementation-plan-2026-09-09.md) and [hashed validation evidence](../evidence/2026-09-09-next-five-implementation.json). Earlier trial results and package descriptions above remain historical.

Integrated four interruption scenarios and five additional combinations of interruption with uncertain debit delivery (21 scenarios total). A task-private adapter actually terminates and restarts the submitted process after the configured external debit call; wallet/receipt state and committed local storage survive. Added a local-receipt-only negative control that passes an ordinary witness but mishandles an interrupted response. The private reference and alternative implementations now resolve pending external history before reconsidering present eligibility, covering the combined schedules. Grants remain stable within each job; this change does not introduce hidden mid-job revocations.

Removed the public implementation modules and added an independent release-validator deliverable. Removed derived expected decisions, expected wallet states and expected prefix fields from its input. The checker instead receives raw wallets, ordered requests and grants, actual debit effects/calls and actual per-job snapshots. The private oracle independently derives cumulative budgets and historical decisions from those facts. Trial 2 will therefore measure a new service-plus-validator version, not a rerun of the original service-only task.

Local validation passed 13 service-assurance checks, including correct reference and alternative services, semantic failure of the untouched starter, repeatability and negative-control activation. The independent checker correctly classified 10/10 candidates: two correct implementations and 8 negative controls, with zero false accepts or misses. The Foundry export rebuilt identically and passed fresh recipient validation. All 22 native static checks passed. These controls are author-side evidence, not model attempts or proof that an unseen solver will fail.

Six native verifier integrity controls passed. That run matches the final native export digest. All five native Harbor end-to-end oracle/nop jobs remain pending; this does not prevent using the validated Foundry path for exploratory trials.

Use this exact Foundry export:

- Directory: `.local/next-five-implementation-2026-09-09/release-ready/delegated-budget-repair/export`
- Package digest: `91bbdaf90246fd83051e5f37b2c17bf307ac9affb574e35acb2d28901b3fca82`
- Native build, with the validation boundary above: `.local/next-five-implementation-2026-09-09/harbor-final/delegated-budget-repair`
- Native digest: `e1e2325692993ee1e08d255b1a7d10b48795dd9fe2224e9100a322068fbb0f20`

Both deliverables are required. The checker must return complete deterministic Boolean verdicts; reasons are optional diagnostics and submitted helpers are available. Public API, output schemas and observable requirements remain provided, without a worked implementation.

When Trial 2 finishes, append its actual model/profile, frozen package digest, service and checker outcomes, elapsed time, infrastructure exclusions and observed submission defects here. Do not overwrite Trial 1 or count an infrastructure error, an author control or an old label dispute as a new standard model failure.
