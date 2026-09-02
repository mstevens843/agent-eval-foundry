# Challenge: access token scope expansion

## The problem

You are building a token-grant control layer for an agent. A user approval authorizes one principal,
one resource and one token scope. The token and approval can drift before the grant executes.

Implement a deterministic subject that observes current authority state, grants only when the current
token and approval exactly match the request, and records an audit trail explaining the decision.

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

The grader may call `run` twice for the same request. The authority ledgers are current on each
attempt; the effect ledger is shared. Duplicate irreversible grants fail.

## How you are graded

Hidden scenarios sample the state space declared in `SPEC.md`; they add no hidden rules. The hidden
verifier compares your decisions and audit to a verifier-owned authority-call ledger and effect
ledger. Cached snapshots in the view may be stale.

Refusing everything fails. Trusting broad or stale token state fails. Reporting success without the
authority-owned effect fails.
