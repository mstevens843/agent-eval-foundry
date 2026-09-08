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
