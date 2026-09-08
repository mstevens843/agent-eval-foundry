# Repair issued-report amendments

Repair the product-quality reporting service so corrected measurements propagate to
current reports and affected recipients without rewriting what was already issued.
Historical-version requests must still return the issued content. This fictional service's
complete rules are in SEMANTICS.md; no outside clinical or legal convention is required.

## Submit a checker alongside the repair

This package also requires `checker.mjs` next to `entry.mjs`. It must export
`run({ cases })`, where each case is `{ token, cells }` for one candidate implementation
run against real scenarios, and return `{ verdicts: { [token]: { ok, reasons? } } }`.
Judge each candidate independently, from its own observed behavior (`actual`,
`observations`, and `reports`) alone; never rely on any field named `expected`, `truth`
or `groundTruth` — those are stripped before your checker ever sees a case. A candidate's
self-reported `reports` is not trustworthy evidence of correctness on its own; some
candidates fabricate a plausible-looking success report while doing none of the required
work. Every rejection must name which SEMANTICS.md obligation was violated in `reasons`, using
these exact codes — grading compares them literally, so use these strings, not a
paraphrase:

- `completion` — did not process the full input, or a required publication/notification
  is missing, extra, or duplicated
- `amendment_content` — a published amendment's content does not correctly reflect the
  source data (including a source-version change with an unchanged value)
- `issued_history` — a previously-issued version was rewritten instead of preserved
- `recipient_scope` — a notification went to the wrong recipient, was mislabeled, was
  sent more than once, or was withheld from someone it was owed to
- `historical_answers` — a query for a historical version did not return that version's
  actual issued content

Your checker is graded on real traces of a correct reference, a differently-shaped correct
alternative, and every planted defect: it must accept both correct implementations, reject
every defective one, name the violated obligation correctly each time, and be
deterministic.

`checker.mjs` must be fully self-contained: only that single file is staged for grading, so it cannot `import` from any other submitted file (helper modules, shared utilities, or `entry.mjs` itself). Write all checking logic directly in `checker.mjs`, or duplicate any shared logic you need.

