# Implement workflow authority and completion

Build the service and its independent release validator in `/work/task`.
Read `SEMANTICS.md` for the domain contract and `api.d.ts` for the API types.

`entry.mjs` must export `subject.run(view, api)`. The supplied entry point is empty;
implement the required behavior using any correct design.

Also submit `checker.mjs`, exporting `run({cases})` as specified in
`CHECKER-INPUT.md`. It evaluates candidate execution traces against the same
contract. Both the service and validator must pass. Submitted helper modules are
allowed. Node built-ins are available.
