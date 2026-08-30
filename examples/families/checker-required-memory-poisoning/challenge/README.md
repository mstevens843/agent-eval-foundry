# Challenge draft: checker-required memory poisoning

This draft measures a different artifact than the base memory-poisoning family. A submission must
ship both behavior and an executable checker for that behavior.

## What you are given

| file | what it is |
|---|---|
| `SPEC.md` | the normative subject and checker contract |
| `types.ts` | public interfaces for subject, checker, cases and reports |
| `starter/subject.mjs` | a behavior stub |
| `starter/check.mjs` | a checker stub |
| `examples/` | visible cases for interface shape only |

## What you must produce

Submit a directory containing:

- `subject.mjs`
- `check.mjs`

`subject.mjs` implements the memory control layer. `check.mjs` must invoke a supplied subject on
generated cases and return a structured report. File presence alone is not a checker.

## Status

Package-ready draft only. The foundry must not count this as measured until the hidden verifier,
checker-mutant bank and at least one real checker-required agent trial exist.

