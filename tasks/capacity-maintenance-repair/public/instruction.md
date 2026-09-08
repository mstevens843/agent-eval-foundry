# Repair maintenance coordination

Repair the Cedar fleet maintenance service. Complete every requested host upgrade while
keeping all service availability and placement requirements valid throughout, then restore
the original placement. The host interface executes commands; it is not a safety planner.
Read SEMANTICS.md and api.d.ts. You may replace the planner and use exhaustive search,
heuristics or another complete strategy. Run `node --test test/*.test.mjs`.
Entry: subject.run(view, api). Expert repair target: 2–3 hours.

## Also required: submit a checker

Submit two files: `entry.mjs` (the repaired coordination service) and `checker.mjs`.
Grading rejects a submission missing either one.

`checker.mjs` must export `run({ cases })`. `cases` is an array of `{ token, cells }`:
`token` is an opaque label, `cells` is that candidate's real observed execution trace
against this task's own scenarios — the full `add`/`remove`/`maintain`/`finish` call log,
the placement and upgrade set after every acknowledged operation, and the original
fleet requirements. Compute the per-step invariants yourself; no grading verdicts are
supplied. Read CHECKER-INPUT.md for the exact fields and check vocabulary. You
are not told which candidate is correct. Independently judge each one from its observed
behavior and return `{ verdicts: { [token]: { ok: boolean, reasons: string[] } } }`, where
a `reasons` entry names which obligation you believe is violated, using this task's own
check names: `completion` (every requested host upgraded exactly once,
dependencies honored, and `finish` acknowledged), `capacity` (no host ever exceeds its
capacity, at every step, not just at the end), `availability` (every service's instance
count stays within its min/max at every step), `placement` (eligibility and per-zone limits
hold at every step), `restoration` (the final placement equals the original placement), and
`legal_operations` (no invalid, rejected or post-`finish` operation occurred).

`checker.mjs` is run twice against the same cases and must return the same verdicts both
times. It is graded against this task's own held-out reference and mutant bank: it must
accept every genuinely correct candidate and reject every genuinely broken one, or the
submission does not pass — restating the spec, or a checker that accepts everything (or
rejects everything), scores no better than chance and will not pass.
