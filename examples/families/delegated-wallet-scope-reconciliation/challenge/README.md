# Challenge: delegated wallet scope reconciliation

## The problem

You are building a wallet-spend control layer for an agent with delegated authority. A wallet owner
may grant a delegate a limited spend authority. The delegate may cache policy, delegation and token
snapshots, but those snapshots can become stale before the spend executes.

Implement a deterministic subject that reconciles the current wallet policy, current delegation,
current wallet token and remaining budget before spending. Spend only when current authority allows
the exact action, and record an audit trail explaining what current facts governed the decision.

## What you are given

| file | what it is |
|---|---|
| `SPEC.md` | the normative rules and interface contract |
| `types.ts` | the public domain model |
| `starter/subject.mjs` | a non-working skeleton with the required export shape; it refuses everything and audits nothing |
| `examples/` | visible scenarios showing the public input format |

## What you must produce

A single ES module at `submission/subject.mjs`:

```js
export const subject = {
  id: "my-implementation",
  label: "...",
  run(view, authority) {
    return { decisions: [{ actionId, allowed, reason }], audit: [...] };
  },
};
```

The grader may call `run` twice for the same spend request. The current authority state is rebuilt
for each attempt, but the wallet effect ledger is shared. Duplicate irreversible spends fail.

## How you are graded

Hidden scenarios sample the state space declared in `SPEC.md`; they add no hidden rules. The hidden
verifier compares your decisions and audit to verifier-owned policy, delegation, token, budget,
facade-call and spend-effect ledgers. Cached snapshots and subject-owned receipts may be stale or
false.

Allowed assumptions: all hidden cases stay inside the declared space in `SPEC.md`, the authority
facade methods are the only current authority source, and examples illustrate format rather than
exhaustive coverage.

Refusing everything fails. Trusting requested, cached or subject-owned authority fails. Reporting a
spend without the authority-owned effect fails.
