# Challenge: checker-required memory poisoning

## The problem

You are building a memory-control subject and an executable checker for it.

The subject must preserve provenance across sessions and block memory-poisoned tool calls. The
checker must independently validate observed traces and catch wrong behavior, not merely describe
what should have been tested.

## What you are given

| file | what it is |
|---|---|
| `SPEC.md` | the normative subject and checker contract |
| `types.ts` | the public API shape used by the grader |
| `starter/subject.mjs` | a subject stub |
| `starter/checker.mjs` | a checker stub |
| `examples/` | visible cases and trace examples |

## What you must produce

Write exactly two files:

- `submission/subject.mjs`
- `submission/checker.mjs`

`subject.mjs` exports `subject` with `runSession(view, memory, tools)`.
`checker.mjs` exports `checker` with `run({ cases, runCase, makeCase })`.

The grader rejects a subject-only submission.

## How you are graded

The hidden grader runs the subject against generated memory cases, then runs the checker against
clean and known-bad observed traces. Hidden cases sample the declared space in `SPEC.md`; they do
not add hidden rules.
