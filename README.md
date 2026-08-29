# agent-eval-foundry

**A benchmark suite's size is not what it measures. This counts what it measures.**

Given a matrix of which implementations failed which graded instances, it reports how many
*independent* measurements the suite contains — collapsing instances that separate the same
subjects, and collapsing chains of instances that differ only in sensitivity to one underlying
defect.

Pointed at my own Terminal-Bench 3 task — 24 scenarios, 15 schedules, 267 checks, six frontier
trials at reward 0 — measured against a bank of ten preserved engines:

```
graded instances                                24
checks in the suite                            267
instances that separate nothing in this bank     7  (29%)
distinct catch sets                              9
independent axes (antichain width)               3
```

Three — **against that bank.** The number is a property of the suite paired with the subjects it is
graded against, never of the suite alone, and this bank is ten engines all produced against this one
task. Read it as an upper bound. The write-up is in [`MEMO.md`](./MEMO.md); the generated report is
[`reports/durable-outbox-axis-report.md`](./reports/durable-outbox-axis-report.md).

## Why

This exists because of a question I was asked and could not answer with a number: *how would you
design a thousand diverse agent tasks?* Diversity is the load-bearing word, and nothing in my
benchmark work measured it. Task counts and check counts do not, and they are what everyone quotes.

## How it works

For each instance, its **catch set** is the set of subjects that fail it. Then:

- Instances with identical catch sets are **one** measurement. Counting them separately inflates
  the suite.
- Instances whose catch sets form a **chain** under subset inclusion (`{A} ⊂ {A,B} ⊂ {A,B,C}`) are
  consistent with one defect observed at rising sensitivity. The strictest catches everything the
  others do.
- So the headline is the **width of the subset-poset**: the largest set of catch sets no two of
  which are nested. Computed exactly, via Dilworth's theorem and a maximum bipartite matching — not
  a similarity threshold, because a threshold is a knob and a knob gets tuned until the answer
  flatters.
- The count is reported as a **curve** over bank strength, since apparent diversity decays as the
  weakest subjects are removed. This is a sensitivity analysis, not a forecast: a next-generation
  model is a new subject with different defects, not your bank minus its floor. What the curve shows
  is how much of a suite's apparent richness is carried by its weakest subjects.

Three rules are enforced in code rather than in review:

1. **An unmeasured cell is never read as a pass.** `null` is a first-class value; imputing passes
   makes instances look more alike and inflates every number.
2. **A matrix without a `provenance.caveat` is rejected.** If your instances were selected against
   the same bank you are now grading them with, the reader must be told in the same breath as the
   number. The reporter prints it above the headline.
3. **The reference implementation may not appear in the graded bank.** The oracle is not evidence
   about difficulty.

## Use

```bash
pnpm install
pnpm build

node dist/cli.js report examples/durable-outbox/matrix.json          # markdown
node dist/cli.js json   examples/durable-outbox/matrix.json          # raw AxisReport
```

Input is one JSON document of schema `agent-eval-foundry/matrix@1` — subjects, instances, and a
cell per pair carrying the named checks that failed. See
[`examples/durable-outbox/`](./examples/durable-outbox/) for a real one and
[`PROVENANCE.md`](./examples/durable-outbox/PROVENANCE.md) for how it was extracted.

`pnpm verify` regenerates the checked-in report and fails if it changed — output is deterministic,
with no timestamp, so runs are diffable rather than narrated.

## Status

**Pre-1.0. One suite measured, one domain, n=1.** What is true is stated with the command that
reproduces it; what is not done is listed here as not done.

Done: the meter, the loader, the report, 21 tests, and one real matrix extracted from a shipped
benchmark — a complete 24×10 sweep with no unmeasured cells.

Not done, deliberately — each was scoped out rather than left half-built:

- **No runner.** This reads matrices other systems produced. The boundary is the point: the
  measurement should be auditable by someone who does not trust what generated the data.
- **No adapters for public benchmark corpora.** The obvious next step, and the one that would turn
  an n=1 finding into a general one, is an importer for a public suite with per-instance,
  per-model results. Gated on data availability, not on effort.
- **No candidate generator, scaffold emitter, or trial orchestrator.** All ~44 candidates in the
  source project were hand-authored prose. Building a generator now would be speculation dressed as
  infrastructure.

## Limits

The tool measures co-failure structure and nothing else. It cannot tell a redundant scenario from a
correctness anchor doing its job; it says so in its own output. Its answer is only as good as the
bank, and a bank assembled from one task's own trials — as in the shipped example — is not
independent of the instances it grades. That is why the caveat field is mandatory.

It also measures the wrong thing for some suites, and that limit is worth stating plainly.
"Diversity" here means **defect-axis** diversity: orthogonal ways an implementation can be wrong
about one invariant model. A suite whose value comes from **surface** coverage instead — two hundred
tasks across two hundred APIs, each with its own auth model, pagination quirk and error taxonomy —
can collapse to very few axes under this meter and still be exactly the right eval, because what is
under test is whether the agent handles a surface it has not memorised. Do not use an axis count as a
ship gate for that kind of suite without a surface-coverage metric beside it.

## Licence

MIT.
