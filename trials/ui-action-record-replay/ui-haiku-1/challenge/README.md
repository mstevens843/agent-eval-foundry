# Challenge: UI action record and replay

## The problem

A model can work out how to complete a flow in a web app. That is not the capability worth shipping.
The capability worth shipping is a **recording that replays deterministically, with no model in the
loop** — because a workflow that needs the model on every run is a demo with a subscription.

You are given a recorded action trace and a live application. The page has changed since the
recording. Replay the trace, and either complete it or stop with a named reason.

## What you are given

| file | what it is |
|---|---|
| `SPEC.md` | the normative rules, the mutation space, and the facade contract |
| `types.ts` | the domain model. Read-only. |
| `starter/subject.mjs` | the interface you must implement, with a stub |
| `examples/` | worked scenarios with the outcome each one should reach |

## What you must produce

```js
export const subject = {
  id: "my-implementation",
  label: "...",
  replay(trace, app) {
    // return { traceId, outcome, steps, unreplayableReason }
  },
};
```

`replay` may be called **twice with the same trace**. The second call must not repeat an
irreversible step.

## How you are graded

Hidden scenarios drawn from the same declared mutation space as the examples. Every mutation kind
they use is listed in `SPEC.md`.

Graded on: the flow completes when it can, no irreversible effect fires when it should not, a trace
that can no longer be replayed is *reported as such* rather than half-run, the replay is idempotent,
the audit records what was observed rather than that a step happened — and **you never call
`app.askModel`**. It is available, it works, and using it fails the run.

**Refusing everything fails.** Declaring every trace unreplayable is safe and completes no work.
