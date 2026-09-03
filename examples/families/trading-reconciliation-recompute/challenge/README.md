# Challenge: trading order reconciliation

## The problem

A venue may accept an order immediately before its response is lost. A later reconciler must retry
safely after authority changes. Implement reconciliation from the durable order intent and the
idempotent synthetic venue facade.

## What you are given

| file | what it is |
|---|---|
| `SPEC.md` | the complete normative rules and hidden-scenario dimensions |
| `types.ts` | the public subject and venue interfaces |
| `starter/subject.mjs` | a deliberately incorrect authority-epoch implementation |
| `examples/` | visible examples of the public recovery view |

## What you must produce

Write `submission/subject.mjs` exporting `subject.run(view, venue)`. Do not modify `challenge/`.

## How you are graded

The grader owns the venue call and execution ledgers. It checks that the committed client-order key
is recovered, retries collectively create one execution, valid work completes, and reports match
calls. No price, fill, exchange-priority, or private trading rule is graded.
