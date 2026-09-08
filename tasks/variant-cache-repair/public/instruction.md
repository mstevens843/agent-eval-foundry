# Repair the edge and shield cache service
The publication team needs correct response reuse across two edge caches and a shared
shield, including conditional validation and scoped purges. Repair this working
controller so it serves the requested representations and meets the stated origin
load limits without damaging unaffected cached content. SEMANTICS.md is normative.
Keep subject.run(view, api), use any correct implementation, and run npm test.

## You must also submit a checker
This package requires an independent checker alongside the repair. Submit both
entry.mjs (your repair) and checker.mjs at the top level. checker.mjs must export
`async function run({ cases })`, where each case is `{ token, cells }` — a real,
executed trace of one candidate implementation against a held-out set of scenarios,
identified only by an opaque token (you are not told which candidate is which, or
how many are correct). Each cell gives you `limits` (that scenario's
maxOriginRequests/maxOriginBytes, the same shape as view.limits), `actual` (the real
observed cache state, deliveries and origin call/byte counts), `observations` (the
real, host-recorded sequence of next/read/write/origin/deliver/acknowledge calls the
candidate actually made and what it actually got back), and `reports` (that
candidate's own self-reported completion — this is not verified by anything and must
not be trusted on its own). You are not given any precomputed answer key; judge
correctness the same way you would verify any other repair, from the raw trace
against SEMANTICS.md.
Return `{ verdicts: { [token]: { ok: boolean, reasons?: string[] } } }`. Accept every
genuinely correct candidate and reject every genuinely defective one; for each
rejection, name which obligation it violates using the check ids from
check-ids.json (completion, representation, cache_provenance, invalidation_scope,
origin_load, no_store).
Your checker is graded for zero false positives, zero missed defects, correctly
named rejections and determinism (it is run twice and must agree with itself). A
missing, stub, or always-accepting checker fails this requirement outright,
regardless of how good the repair itself is.

`checker.mjs` must be fully self-contained: only that single file is staged for grading, so it cannot `import` from any other submitted file (helper modules, shared utilities, or `entry.mjs` itself). Write all checking logic directly in `checker.mjs`, or duplicate any shared logic you need.
