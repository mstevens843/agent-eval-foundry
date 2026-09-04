# Challenge: deployment rollback recovery

## The problem

A controller compensation may complete immediately before its response is lost. A later controller
must recover the already-authorized rollback safely after authority changes. Implement recovery from
the durable rollback intent and the idempotent deployment-controller facade.

## What you are given

| file | what it is |
|---|---|
| `SPEC.md` | the complete normative rules and hidden-scenario dimensions |
| `types.ts` | the public subject and controller interfaces |
| `starter/subject.mjs` | a deliberately incorrect authority-epoch implementation |
| `examples/` | visible examples of the public recovery view |

## What you must produce

Write `submission/subject.mjs` exporting `subject.run(view, controller)`. Do not modify
`challenge/`.

## How you are graded

The grader owns the controller call and effect ledgers. It checks that the committed rollback key is
recovered, retries collectively create one compensation, valid work completes, and reports match
calls. Every intent is already authorized; no private cloud or rollback-decision policy is graded.
