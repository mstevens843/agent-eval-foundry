# Repair the queued workflow authority service
The workflow broker dispatches direct, scheduled, retry and fan-out work. Repair it so
each delivery completes using the correct originating authority, current policy and
durable decision history. Permitted work must execute and impermissible work must not.
SEMANTICS.md states the complete policy and retry contract. Keep subject.run(view, api),
use any correct architecture and run npm test.

## Also required: submit a checker

Submit two files: `entry.mjs` (the repaired broker) and `checker.mjs`. Grading rejects a
submission missing either one.

`checker.mjs` must export `run({ cases })`. `cases` is an array of `{ token, cells }`:
`token` is an opaque label, `cells` is that candidate's real observed execution trace against
this task's own scenarios — the job/parent catalog, the real recorded decisions/effects/finish
records, and the actual API call log (every `api.*` call the candidate's own code made,
including every real `policy()` snapshot it saw, with the request it sent and the value it got
back). You are not told which candidate is correct. Independently judge each one from its
observed behavior and return `{ verdicts: { [token]: { ok: boolean, reasons: string[] } } }`,
where a `reasons` entry names which obligation you believe is violated (use the section of
SEMANTICS.md it violates, e.g. a decision whose principal isn't the job's true root-ancestor
principal names the origin requirement, `origin_identity`; an executed decision whose path isn't
a real, non-repeating chain of active grants covering the job's exact resource and action under
the policy at that revision names the admission requirement, `policy_at_effect`; permitted work
that doesn't execute, or a denial that isn't genuinely empty-pathed, names the positive-work
requirement, `positive_work`; a job decided more than once — including a decision made again
after the process was killed and restarted instead of being recognized via `receipt()` on
redelivery, see SEMANTICS.md — or a finish that references the wrong decision, names the
terminal-history requirement, `terminal_history`; an executed decision or effect whose resource,
action or payload doesn't exactly match the job's own fields names the payload requirement,
`effect_payload`; work that never finishes, a finish with no real matching decision behind it, or
a claimed completion the real call log doesn't back up, names the completion requirement,
`completion`).

`checker.mjs` is run twice against the same cases and must return the same verdicts both times.
It is graded against this task's own held-out reference and mutant bank: it must accept every
genuinely correct candidate and reject every genuinely broken one, or the submission does not
pass — restating the spec, or a checker that accepts everything (or rejects everything), scores
no better than chance and will not pass.

`checker.mjs` must be fully self-contained: only that single file is staged for grading, so it cannot `import` from any other submitted file (helper modules, shared utilities, or `entry.mjs` itself). Write all checking logic directly in `checker.mjs`, or duplicate any shared logic you need.

## Exact checker schema and execution limits

Read CHECKER-INPUT.md for the normative raw input fields, independent-candidate
judging rule, reason format and checker runtime envelope. It supplements the domain
contract in SEMANTICS.md; no answer key or other candidate's output is needed.
