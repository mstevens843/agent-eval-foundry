# Challenge: deployment model-alias rollout drift

## The problem

You are building a deployment decision layer for model rollouts. A model alias can change underneath
a deployment or evaluation workflow. Cached alias maps, public eval summaries and provider status
strings can be stale or misleading.

Implement a deterministic subject that reconciles the current alias mapping, rollout ledger, eval
stream and baseline record before deciding whether to continue, rollback, quarantine or re-evaluate.
Record an audit trail explaining which current facts governed the decision.

## What you are given

| file | what it is |
|---|---|
| `SPEC.md` | the normative rules and interface contract |
| `types.ts` | the public domain model |
| `starter/subject.mjs` | a stub with the required export shape |
| `examples/` | visible scenarios showing the public input format |

## What you must produce

A single ES module at `submission/subject.mjs`:

```js
export const subject = {
  id: "my-implementation",
  label: "...",
  run(view, deployment) {
    return { decisions: [{ actionId, decision, reason, alias, concreteVersion, baselineVersion }], audit: [...] };
  },
};
```

The grader may call `run` twice for the same request. The rollout state is rebuilt for each
attempt, but the effect ledger is shared. Duplicate irreversible decisions fail.

## How you are graded

Hidden scenarios sample the state space declared in `SPEC.md`; they add no hidden rules. The hidden
verifier compares your decisions and audit to verifier-owned alias, rollout, eval, baseline, facade
call and decision-effect ledgers. Cached snapshots and subject-owned claims may be stale or false.

Allowed assumptions: all hidden cases stay inside the declared space in `SPEC.md`, the deployment
facade methods are the only current truth source, and examples illustrate format rather than
exhaustive coverage.

Trusting alias names, cached mappings, public summaries or subject-owned model-health claims fails.
Refusing every rollout fails. Reporting a decision without the verifier-owned effect fails.
