# agent-eval-foundry

**A thousand benchmark tasks are only useful if they measure more than one thing.**

This is a system for discovering, screening and selecting agent-benchmark task families by
transferable failure mechanism — and for refusing the ones that cannot demonstrate they measure
anything. It does not run evals. It decides what is worth building before you spend model budget on
it, and it grades its own graders.

---

## Why task count is the wrong number

Benchmarks are quoted in tasks, or in checks. Neither says how many *different things* a suite
measures. Two tasks failed by exactly the same set of implementations are, on the available evidence,
one measurement wearing two names.

Pointed at the Terminal-Bench 3 task this grew out of — 24 scenarios, 15 schedules, 267 checks, all
six frontier trials at reward 0 — against a bank of ten preserved engines:

```
graded instances                                24
checks in the suite                            267
instances that separate nothing in this bank     7  (29%)
distinct catch sets                              9
independent axes (antichain width)               3
```

**267 checks. Three independent measurements.** Seven scenarios fail nobody at all.

That could be a fact about one suite I built and marked my own homework on. So the same meter,
unchanged, is pointed at a public corpus nobody assembled for this purpose — **SWE-bench Verified**,
500 instances against **134 leaderboard submissions** made independently by different teams between
2023 and 2025:

```
graded instances                               500
subjects in the bank                           134
measured cells                              66,784   (216 recorded as not measured)
distinct catch sets                            474
independent axes                               215
null model, identical marginals, 3 trials 500 / 500 / 500
```

500 tasks, 215 independent axes. Randomised data preserving every system's resolve count scores the
maximum possible 500 on every trial, so the 2.3× compression is structural, not an artifact of a big
noisy bank.

---

## Architecture

```
                     ┌──────────────────────────────────────────────┐
  IDEAS              │  data/mechanisms.json    14 mechanisms       │
                     │  data/mutants.json       13 known-bad impls  │
                     │  data/candidates*.json   30 ledger rows      │
                     └───────────────┬──────────────────────────────┘
                                     │  validate.ts  ← 35 coded rules
                                     │  registry.ts  ← cross-refs + coverage
                                     ▼
                     ┌──────────────────────────────────────────────┐
  FAMILIES           │  examples/shapes/*.json   8 task families    │
                     │  docs/families/*.md       8 long sketches    │
                     └───────────────┬──────────────────────────────┘
                                     │  scaffold.ts  →  8 artifacts
                                     │  scaffold-check.ts  ← grades them,
                                     │                       imports nothing
                                     ▼                       from the generator
                     ┌──────────────────────────────────────────────┐
  EVIDENCE           │  sources/  manual · durable-outbox · swebench │
                     │            + 4 declared, unimplemented       │
                     └───────────────┬──────────────────────────────┘
                                     │  matrix.ts → normalized Matrix
                                     ▼
                     ┌──────────────────────────────────────────────┐
  MEASUREMENT        │  catch-sets → similarity → axis-meter        │
                     │  null-model.ts  ← is the number ≠ chance?    │
                     └───────────────┬──────────────────────────────┘
                                     ▼
                     ┌──────────────────────────────────────────────┐
  DECISION           │  ship-report.ts   10-gate ship/no-ship table │
                     │  budget.ts        what does $100k buy?       │
                     │  budget-check.ts  ← rejects fake plans       │
                     └──────────────────────────────────────────────┘
```

Every layer has the same shape: **a typed model, a validator that does not import the thing it
validates, known-bad examples, and a test proving the checker catches them.** That is not decoration.
It is the finding from the source project applied to this one — of six frontier engines asked to
solve that benchmark, the only one that avoided the central defect was the one that wrote an explicit
legality table and mutation-tested its own checker against planted bugs. Two others built checkers
too weak to express the rule, so their own fuzzers ran clean over it.

---

## Quickstart

```bash
pnpm install && pnpm build

node dist/cli.js check      # load + validate everything, assert coverage. The CI gate.
node dist/cli.js all        # regenerate every report under reports/
```

```
registry OK
  mechanisms  14 (6 measured)
  mutants     13
  families    8
  candidates  30
  coverage    every mechanism has a mutant; no mutant is orphaned
```

### Measure an existing suite

```bash
# internal worked example — a native matrix
node dist/cli.js report examples/durable-outbox/matrix.json

# external validation — a public corpus, with the significance test
node dist/cli.js report --import swebench --null-trials 3 \
  examples/public-swebench-verified/swebench-verified.raw.json
```

### Screen and select

```bash
node dist/cli.js mechanisms   # registry + coverage: what can we even detect?
node dist/cli.js mutants      # the known-bad bank that grades verifiers
node dist/cli.js ledger       # every candidate, led by the kills
node dist/cli.js families     # axes, not task count
node dist/cli.js ship         # the gate table, per family
node dist/cli.js sources      # every matrix source, implemented and planned
```

### Produce

```bash
node dist/cli.js scaffold --shape examples/shapes/prompt-injection-containment.json --out /tmp/pic
node dist/cli.js scaffold --mechanism uncertain-external-effects --domain payments \
  --name payment-outbox --out /tmp/po

node dist/cli.js budget --total 100000 --rate 120 --target 1000
```

The scaffold emits eight artifacts — instruction draft, hidden-test plan, reference checklist, mutant
plan, fairness checklist, cheat-resistance checklist, metadata and README — and then grades its own
output with a checker that declares the artifact list independently.

---

## What $100k buys

From `reports/budget-plan.md`, at $120/h:

| | families | shipped tasks | independent axes | $ / task |
|---|---:|---:|---:|---:|
| **parameterized families** | **10** | **240** | **30** | $382 |
| hand-authored tasks | 10 | 10 | 10 | $9,168 |

**Labour is 99% of spend.** Model spend is a rounding error on an engineering budget. $100k does not
buy a thousand hand-designed hard tasks; it buys about ten well-instrumented families, the instances
they generate for free, and roughly thirty independent axes.

`budget-check.ts` refuses a plan that hides this. The fake it exists to catch is the one a reader
arrives with: price the frontier trials, omit the engineering, divide.

---

## Measured vs estimated

The distinction is enforced in the type system (`dataQuality: "measured" | "estimated"`), checked at
load (`LEDGER_MEASURED_WITHOUT_RESULTS`), and rendered inline next to every value rather than in a
footnote.

| | measured | estimated |
|---|---|---|
| axis counts | `durable-approval-outbox` (3), SWE-bench Verified (215) | 7 families |
| mechanisms | 6 of 14, each citing a path in the source repo | 8 |
| ledger rows | 17 of 30 | 13 |
| kill economics | 16 killed / 3 shipped; 8 kills demonstrably cost $0, **8 have no cost recorded at all** | — |
| labour rate | never — it is always your assumption, and it dominates | always |

That fourth row is the kind of thing this repo surfaces rather than rounds off: half the kills have
no recorded cost, so the screening-is-cheap claim rests on a floor rather than a total. The report
says so in the same sentence as the number.

---

## How this grew from a benchmark task

The source is a Terminal-Bench 3 task — a durable approval outbox where an agent must execute
approved tool actions exactly once under concurrent workers, crashes, lease expiry and withdrawal.
All six frontier trials failed; the reference passed 267/267.

The findings that became this repo's architecture:

- **Two failure modes across six trials, not six.** Five engines wrote an illegal `ACKED -> REVOKED`
  audit transition; the sixth avoided it and stranded an action in `IN_DOUBT` forever. Opposite sides
  of one requirement. → the axis meter.
- **A 5/6 result that was a false positive.** An engine scored a clean solve and a later source audit
  found it still carried the bug; hidden coverage had sampled the wrong parameter. → the hidden-test
  plan's "which parameter *controls* the mechanism" gate.
- **Nine candidate difficulty mechanisms gated, all killed** — four because models already handled
  them, two because the agent could cheaply self-verify. → the kill taxonomy and fairness checklist.
- **Three real bypasses in the verifier's own grader**, two found by writing the exploit. → the
  `whyEngineCannotForge` requirement on every authoritative source, enforced as a rule.
- **$252.51 of frontier spend across the whole project, against weeks of authoring.** → the budget
  model, and why labour is the binding term.

---

## Why this is not another eval runner

Braintrust, promptfoo and Inspect run evals: you have tasks, they execute and score them. This
operates one step earlier and answers a different question — *which tasks are worth building at all,
and does this suite measure more than one thing?*

It deliberately has **no runner**. It reads matrices other systems produced, and that boundary is the
point: the measurement should be auditable by someone who does not trust whatever generated the data.
Nothing here competes with an eval framework; it is what you would run before choosing what to put
into one.

---

## Verification

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm verify
```

**113 tests** across four files. The one worth describing is rule coverage: every one of the 35 rule
codes must have a known-bad example that is rejected *for that specific code*, and a rule with no
example fails the build. 29 fixtures live in `fixtures/invalid/` with a manifest declaring the code
each should trip; the remainder are exercised programmatically and registered explicitly, so nothing
is quietly excused.

`pnpm verify` regenerates every checked-in report and fails if any differs. Output is deterministic —
no timestamps, and the null model is seeded — so `reports/` is diffable rather than narrated.

---

## Status and roadmap

**Pre-1.0.** What is true is stated with the command that reproduces it; what is not done is listed
here as not done.

Built and working: the mechanism registry (14), mutant bank (13), candidate ledger (30 rows, 16
kills), 8 task-family shapes with long-form sketches, the scaffold generator and its independent
checker, three matrix sources, the axis meter with null-model calibration, the budget planner and its
sanity checker, six generated reports, and the known-bad fixture corpus.

Not done, deliberately:

- **No runner.** See above — the boundary is the design.
- **Four sources are declared and unimplemented** (`terminal-bench`, `inspect`, `agentdojo`,
  `trial-ledger`). Each throws with what it would need. They are not stubs returning empty matrices,
  because a report full of zeroes reads as a finding.
- **No task-code generation.** The scaffold emits the paperwork a family needs before it earns build
  time. It does not emit a runnable verifier, and it says so in its own README. Building the shipped
  family's three-process verifier took roughly 45 hours; no generator produces that from a mechanism
  id, and claiming otherwise would be the dishonest version of this module.
- **Seven of eight families are unbuilt.** Their axis counts are pre-registrations, not measurements.

Next, in order of leverage: measure a second family end-to-end so there are two measured axis counts
rather than one; a Terminal-Bench source so families produce their own matrices; and cross-family
axis measurement, since axes across families almost certainly do not simply add.

---

## Limitations

- **The axis meter measures co-failure structure and nothing else.** It cannot tell a redundant
  scenario from a correctness anchor doing its job, and it says so in its own output.
- **An axis count is a property of a suite paired with its bank**, never of the suite alone. The
  internal example's bank is ten engines from one task; read it as an upper bound.
- **Defect diversity is not surface diversity.** Two hundred tasks across two hundred APIs might
  collapse to a handful of axes under this meter and still be exactly the right eval, because what is
  under test is whether an agent handles a surface it has not memorised. Do not use an axis count as
  a ship gate for that kind of suite without a surface-coverage metric beside it.
- **The registry is mostly judgement.** Six of fourteen mechanisms are evidenced; the rest are
  arguments. A healthy registry looks like that, and every row is labelled.
- **The budget model prices one flat labour rate**, ignores maintenance as families decay against
  improving models, and treats family axis counts as additive when they are probably not.

## Licence

MIT.
