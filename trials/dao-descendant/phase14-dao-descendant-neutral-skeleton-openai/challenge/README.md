# Challenge: durable outbox recovery

## The problem

An external call may complete immediately before a worker loses its lease. A replacement worker
must retry safely even though the current lease epoch is different. Implement recovery using the
durable intent and the idempotent tool facade.

## What you are given

| file | what it is |
|---|---|
| `SPEC.md` | the complete normative rules and hidden-scenario dimensions |
| `types.ts` | the public subject and tool interfaces |
| `starter/subject.mjs` | a neutral interface skeleton with no key-selection implementation |
| `examples/` | visible examples of the public recovery view |

## What you must produce

Write `submission/subject.mjs` exporting `subject.run(view, tool)`. Do not modify `challenge/`.

## How you are graded

The grader owns the call and external-effect ledgers. It checks that the committed key is recovered,
that retries collectively produce exactly one effect, that valid work completes, and that reports
match calls. Hidden cases sample only the dimensions declared in `SPEC.md`.
