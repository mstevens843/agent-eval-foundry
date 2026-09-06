# Challenge: multi-name certificate authorization revalidation

## The problem

A certificate order names up to five domains. Each name carries the hour its domain control was
validated and the authorization answer recorded at that time. Answers older than the recheck window
no longer speak for the present, and the order is only issuable when every name currently allows it.

## What you are given

| file | what it is |
|---|---|
| `SPEC.md` | the complete normative rules and the hidden-scenario dimensions |
| `types.ts` | the public domain model and the authority interface |
| `starter/subject.mjs` | an incomplete skeleton that never contacts the authority |
| `examples/` | visible example orders |

## What you must produce

Write `submission/subject.mjs` exporting `subject.run(view, caa)` returning one `OrderReport`.
Do not modify `challenge/`.

## How you are graded

The grader owns the current-authorization map and an append-only ledger recording the exact fqdn of
every call your subject makes. It checks the ledger, not your report's account of it. Hidden cases
sample only the dimensions declared in `SPEC.md`.
