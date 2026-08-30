# Challenge: live-DOM action replay

## The problem

You are given a recorded UI action trace and a live DOM-like application facade. The live tree may
change while the trace is being replayed: nodes can re-mount, disable and re-enable, move under a
different structural path, inherit a stale test id, or be replaced by a different entity with the
same visible label.

Build a deterministic replay subject. It must complete replay when the visible live state still
names the recorded object, halt when the page may become actionable later, and report unreplayable
when the trace can never refer to the recorded object again.

## What you are given

| file | what it is |
|---|---|
| `SPEC.md` | the normative fairness contract and facade semantics |
| `types.ts` | the domain model the grader uses |
| `starter/subject.mjs` | a stub with the required export shape |
| `examples/` | visible examples showing the trace and initial live tree shape |

## What you must produce

A single ES module at `submission/subject.mjs`:

```js
export const subject = {
  id: "my-implementation",
  label: "...",
  replay(trace, app) {
    return { traceId, outcome, steps, unreplayableReason, pendingEffects };
  },
};
```

The grader may call `replay` twice with the same trace. The tree is fresh on the second call, but
the side-effect ledger is not. Your subject must keep its own completion record for irreversible
steps.

## How you are graded

Hidden scenarios are sampled from the state space declared in `SPEC.md`; they add no hidden rules.
The verifier is not shipped. It checks the sealed effect ledger, the sealed facade-call ledger, and
your returned audit.

Refusing everything fails. Replaying by one globally preferred address type fails. Calling
`app.askModel` fails even if the flow completes.
