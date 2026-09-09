# Implement analytical reconciliation

Build the service and its independent release validator in `/work/task`.
Read `SEMANTICS.md` for the domain contract and `api.d.ts` for the service interface.

`entry.mjs` must export `subject.run(view, api)`. Implement the required behavior
using any correct design.

Also submit `checker.mjs`, exporting `run({cases})` as specified in
`CHECKER-INPUT.md`. Both the service and validator must pass. Submitted helper
modules and Node built-ins are available.
