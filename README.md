# agent-eval-foundry

**A thousand benchmark tasks are only useful if they measure more than one thing.**

This is a system for discovering, screening, **building**, **running** and selecting agent-benchmark
task families by transferable failure mechanism — and for refusing the ones that cannot demonstrate
they measure anything. It decides what is worth building before you spend model budget on it,
produces the family, puts real models in front of it, measures what the family actually separates,
and grades its own graders.

The most useful thing in here is a negative result the system produced about its own work. The
second family was built end to end, its verifier catches all nine known-bad implementations, and its
axis count is measured rather than estimated. Three real Claude trials were then run through the
trial layer. All three produced genuine 231–318 line implementations. All three passed 128 of 128.

**So the family is `NOT-READY`, and the gate that blocks it fails *because* the evidence arrived.**

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
500 instances against **134 leaderboard submissions** made independently by different teams:

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

The meter is parameter-free by construction — catch sets collapsed under subset inclusion, maximum
antichain by Dilworth. There is no similarity threshold, because a threshold is a knob and a knob
gets tuned until the answer flatters.

---

## The corpora, and what each number is allowed to mean

| corpus | instances | subjects | axes | what the bank is | what the number means |
|---|---:|---:|---:|---|---|
| `durable-approval-outbox` | 24 | 10 | **3** | engines written by frontier models attempting the task | how real implementations fail |
| `prompt-injection-containment` | 128 | 9 | **4** | mutants written alongside the verifier | a lower bound on what the verifier detects |
| SWE-bench Verified | 500 | 134 | **215** | 134 independent leaderboard submissions | how real systems fail, at scale |

Three columns, three different kinds of claim, and the reports say which is which wherever they
appear. Rows one and three are statements about difficulty. Row two is a statement about detection —
and the trial layer exists precisely to stop those two being written in the same font.

---

## Trial orchestration

`reports/trial-orchestration-report.md` is generated from the trial directories on disk.

```bash
node dist/cli.js trials providers      # every adapter and what it needs
node dist/cli.js trials run --run-id pic-claude-4 --model anthropic/claude-opus-5 \
  --provider shell --inherit-env --command claude -p '{instruction}' --permission-mode bypassPermissions
```

That rebuilds the challenge package from the family, runs the provider in a sandbox outside the
repository, grades the artifact in a **subprocess**, applies the counting rules, and writes a durable
directory containing the transcript, the exact challenge the model saw, its submission, the verifier
output and the countability decision. `plans/run-real-agent-trials.md` is the full procedure.

### What can never count

| classification | may it count? |
|---|---|
| `refused`, `timeout`, `infrastructure_error` | **never.** The absence of an attempt is not a result. |
| `crashed` | not by default — a harness bug must not read as a capability finding. |
| `completed` with nothing graded | no. A pass nobody graded is not a pass. |

`TRIAL_REFUSAL_COUNTED` is a hard validation error rather than a convention. This is not
hypothetical: the historical import found **13 of 33 runs uncounted**, including three provider-level
safety refusals that arrive in the source data as reward `0.0`, sitting in the same field as genuine
failures. Read naively, each is a data point saying the task is hard. Each actually says nothing was
tried.

### What can never count, part two

A stub also satisfies every rule above: it is `completed`, it is graded, and it fails every
scenario — which reads to the ship gate as *an agent attempted this and could not do it*. A smoke
test drove the runner with a command that wrote a five-line do-nothing module, and the family
flipped from NOT-READY to **SHIP** on the strength of it.

Two vetoes close that, both derived from data already present rather than from a threshold:

- a submission that errors on **every** scenario never executed at all;
- a submission whose behaviour is **identical to a checked-in baseline** is a subject this repository
  wrote to do nothing.

A genuinely bad implementation still counts — it differs from a baseline in at least one cell, and
any real attempt does. The veto runs when the record is written, and an independent assertion
re-checks every counted agent record afterwards, so a hand-edited record does not get through either.

### Isolation

| level | what it guarantees | status |
|---|---|---|
| `in-process` | nothing against a hostile subject | used only for this repository's own subjects |
| `subprocess` | the artifact cannot reach the grader's memory | **real, and what the counted trials ran under** |
| `container` | filesystem and network confinement | **declared, not claimed** — no daemon here |

The subprocess boundary is tested against a subject that deliberately mutates globals: the parent's
are checked afterwards and the verifier catches the tampering. The container design is fixed and
validated by `dockerPlan()` — challenge mounted read-only, submission the only writable mount,
`--network=none`, no verifier or matrix path mounted at all — and the adapter refuses to run rather
than silently degrading to a subprocess.

---

## The ship gate

19 gates, 13 blocking. A family ships when every blocking gate passes: no score, no weighting, no
override. `reports/ship-gate-report.md` is generated from the gate definitions themselves, so a gate
that exists in code cannot be missing from the documentation — and it prints which gates have ever
actually rejected anything, because a gate that cannot fail is not evidence of discipline.

The three that currently reject something:

| gate | blocking | rejects | why it exists |
|---|---|---|---|
| `not-already-solved` | yes | `prompt-injection-containment` | added after three real Claude trials each passed 128/128. Without it the family ships on evidence that it is easy. |
| `difficulty-evidenced` | no | 7 unbuilt families | a measured axis count against hand-written mutants proves the *verifier* discriminates, not that the family is hard. |
| `shared-bank-ready` | no | `prompt-injection-containment` | axis counts across disjoint banks add by construction and mean nothing. |

A shape claiming agent trials must declare how many passed (`SHAPE_TRIAL_OUTCOME_MISSING`). A trial
count with no outcome is indistinguishable from no trials at all, and a blocking gate has to fail
closed on it. A measured trial record always overrides the declaration, and the verdict text says
which one it read.

---

## The lifecycle

Every command below is real; nothing in this list is aspirational.

| # | step | command | what it produces |
|---|---|---|---|
| 1 | define the mechanism | `foundry mechanisms` | 14 mechanisms, each with a mutant that can detect it |
| 2 | define the task shape | `foundry ship` | 19-gate readiness table per family |
| 3 | generate scenarios | `foundry family scenarios` | 432-point space → 128 measured |
| 4 | run reference + mutants | `foundry trials local` | normalized trial records |
| 5 | verify the hidden checks fire | `foundry family trials` | trial-readiness report |
| 6 | package the agent-facing challenge | `foundry challenge build --out d` | 8 visible files, hidden artifacts excluded and checked |
| 7 | **run real trials** | `foundry trials run --run-id … --model …` | durable trial directories, counted or refused |
| 8 | import trials run elsewhere | `foundry trials import <dir>` | the same records, same counting rules |
| 9 | measure axes | `foundry family axis` | antichain width + null-model calibration |
| 10 | check the shared bank | `foundry shared-bank` | refused / partial / measured, with the threshold stated |
| 11 | apply the ship gate | `foundry ship` | SHIP / HOLD / NOT-READY |
| 12 | budget the next work | `foundry budget --total N --rate R` | families, instances, axes, and what is not affordable |

Every step has run. Step 7 is the one that changed the answer.

---

## Architecture

```
                     ┌──────────────────────────────────────────────┐
  IDEAS              │  data/mechanisms.json    14 mechanisms       │
                     │  data/mutants.json       13 known-bad impls  │
                     │  data/candidates*.json   32 ledger rows      │
                     └───────────────┬──────────────────────────────┘
                                     │  validate.ts  ← 52 coded rules
                                     │  registry.ts  ← cross-refs + coverage
                                     ▼
                     ┌──────────────────────────────────────────────┐
  FAMILIES           │  examples/shapes/*.json   9 task families    │
                     │  docs/families/*.md       8 long sketches    │
                     └───────────────┬──────────────────────────────┘
                                     │  scaffold.ts  →  8 artifacts
                                     │  scaffold-check.ts  ← grades them,
                                     ▼                       imports nothing
                     ┌──────────────────────────────────────────────┐   from the generator
  BUILD              │  families/prompt-injection-containment/       │
                     │    policy.ts    8 rules, published order      │
                     │    scenarios.ts 432-point space → 128 measured│
                     │    reference.ts + mutants.ts (9 known-bad)    │
                     │    verify.ts    ← grades against the LEDGER,  │
                     │    runner.ts       never the subject's report │
                     └───────────────┬──────────────────────────────┘
                                     ▼
                     ┌──────────────────────────────────────────────┐
  TRIAL              │  challenge/   package + leak check by content │
                     │  trials/      providers · orchestrator ·      │
                     │               durable directories · history   │
                     │    in-process → subprocess → (container)      │
                     │    refusals, stubs and baselines never count  │
                     └───────────────┬──────────────────────────────┘
                                     ▼
                     ┌──────────────────────────────────────────────┐
  EVIDENCE           │  sources/  manual · durable-outbox · swebench │
                     │            + 4 declared, unimplemented       │
                     │  reports/evidence.ts ← one assembler, so the │
                     │            CLI and the tests cannot disagree │
                     └───────────────┬──────────────────────────────┘
                                     │  matrix.ts → normalized Matrix
                                     ▼
                     ┌──────────────────────────────────────────────┐
  MEASUREMENT        │  catch-sets → similarity → axis-meter        │
                     │  null-model.ts  ← is the number ≠ chance?    │
                     │  bank.ts        ← may these two be combined? │
                     └───────────────┬──────────────────────────────┘
                                     ▼
                     ┌──────────────────────────────────────────────┐
  DECISION           │  ship-report.ts   19-gate ship/no-ship table │
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

The project follows the thesis it teaches: **AI proposes structure, deterministic systems decide what
is valid.**

---

## Quickstart

```bash
pnpm install && pnpm build

node dist/cli.js check      # load + validate everything, assert coverage. The CI gate.
node dist/cli.js all        # regenerate all 17 reports under reports/
```

```
registry OK
  mechanisms  14 (6 measured)
  mutants     13
  families    9
  candidates  32
  coverage    every mechanism has a mutant; no mutant is orphaned
```

### Measure an existing suite

```bash
node dist/cli.js report examples/durable-outbox/matrix.json

node dist/cli.js report --import swebench --null-trials 3 \
  examples/public-swebench-verified/swebench-verified.raw.json
```

### Screen and select

```bash
node dist/cli.js mechanisms   # registry + coverage: what can we even detect?
node dist/cli.js mutants      # the known-bad bank that grades verifiers
node dist/cli.js ledger       # every candidate, led by the kills
node dist/cli.js families     # axes, not task count
node dist/cli.js ship         # the gate table, per family, evidence-backed
node dist/cli.js sources      # every matrix source, implemented and planned
```

### Build, run and compare a family

```bash
node dist/cli.js family scenarios      # the 432-point space and the 128 measured selection
node dist/cli.js family run            # reference + 9 mutants -> a normalized matrix
node dist/cli.js family axis           # the axis report for that matrix
node dist/cli.js challenge build --out /tmp/pic
node dist/cli.js trials run --run-id demo --model <m> --provider shell --inherit-env --command <argv>
node dist/cli.js trials bank           # every trial on record, counted and uncounted
node dist/cli.js history import        # 33 historical Harbor runs, normalized
node dist/cli.js shared-bank           # can the two families' axes be combined?
node dist/cli.js cross-family
```

The family emits a standard `matrix@1` document, so the axis meter grades it with no special-casing
whatever: a family the foundry builds produces evidence the foundry already knows how to measure.

### Produce

```bash
node dist/cli.js scaffold --shape examples/shapes/ui-action-record-replay.json --out /tmp/ui
node dist/cli.js budget --total 100000 --rate 120 --target 1000
```

The scaffold emits eight artifacts — instruction draft, hidden-test plan, reference checklist, mutant
plan, fairness checklist, cheat-resistance checklist, metadata and README — then grades its own
output with a checker that declares the artifact list independently.

---

## The shared bank: **PARTIAL**

An axis count is a property of a suite **paired with the bank it is graded against**, so combining
two families requires the same subjects in both. The verdict was a permanent refusal; it is now
computed against a stated threshold, and importing the historical outbox trials moved it:

| | |
|---|---|
| subjects attempting both families | `claude-opus-5` |
| threshold for a combined claim | 3 |
| **verdict** | **PARTIAL** |

One shared subject bounds the combined width at 0 or 1, so no combined number is quoted. What the
overlap does support is a direct comparison, and it is stark: `claude-opus-5` fails the outbox family
and passes the containment family cleanly. That is a statement about the two families, not about the
model.

---

## What $100k buys

| | families | shipped tasks | independent axes | $ / task |
|---|---:|---:|---:|---:|
| **parameterized families** | **10** | **240** | **30** | $382 |
| hand-authored tasks | 10 | 10 | 10 | $9,168 |

**Labour is 99% of spend.** $100k does not buy a thousand hand-designed hard tasks; it buys about ten
well-instrumented families, the instances they generate for free, and roughly thirty independent
axes. `budget-check.ts` refuses a plan that hides this — the fake it exists to catch is the one a
reader arrives with: price the frontier trials, omit the engineering, divide.

The trial layer is now priced from records rather than estimates: 33 historical runs, 20 counted,
$252.51 total, an effective **$12.63 per counted run**, with **17%** of genuine attempts producing
nothing usable. That measured waste rate is above the model's 15% input, and the report says so
rather than quietly adopting it — at this scale it moves the plan by $0.10 per task, because labour
dominates.

---

## Measured vs estimated

Enforced in the type system (`dataQuality: "measured" | "estimated"`), checked at load
(`LEDGER_MEASURED_WITHOUT_RESULTS`), and rendered inline next to every value rather than in a
footnote.

| | measured | estimated |
|---|---|---|
| axis counts | outbox (3), containment (4), SWE-bench Verified (215) | 7 families |
| agent trials | 3 counted on containment, 20 imported on the outbox | none elsewhere |
| mechanisms | 6 of 14, each citing a path in the source repo | 8 |
| ledger rows | 19 of 32 | 13 |
| kill economics | 16 killed / 4 shipped; 8 kills demonstrably cost $0, **8 have no cost recorded at all** | — |
| labour rate | never — it is always your assumption, and it dominates | always |

That fifth row is the kind of thing this repo surfaces rather than rounds off: half the kills have no
recorded cost, so the screening-is-cheap claim rests on a floor rather than a total. The report says
so in the same sentence as the number.

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
  them. → the kill taxonomy, and the blocking `not-already-solved` gate that has now killed a family
  this repository built itself.
- **Three real bypasses in the verifier's own grader**, two found by writing the exploit. → the
  `whyEngineCannotForge` requirement on every authoritative source, enforced as a rule.
- **$252.51 of frontier spend against weeks of authoring.** → the budget model, and why labour is the
  binding term.

---

## Why this is not an eval runner

Braintrust, promptfoo and Inspect run evals: you have tasks, they execute and score them. This
operates one step earlier and answers a different question — *which tasks are worth building at all,
and does this suite measure more than one thing?*

It does have a runner now, and the boundary still holds: the runner exists to produce **difficulty
evidence for a family under construction**, not to score models against a fixed benchmark. It grades
one family, writes durable records, and refuses to count most of what it produces. The measurement
side reads matrices anything can generate, and that separation is the point — the analysis should be
auditable by someone who does not trust whatever produced the data.

---

## Verification

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm verify
```

**231 tests** across seven files. The one worth describing is rule coverage: every one of the 52 rule
codes must have a known-bad example rejected *for that specific code*, and a rule with no example
fails the build. 30 fixtures live in `fixtures/invalid/` with a manifest naming the code each should
trip; the rest are exercised programmatically and registered explicitly — and a second test asserts
that every rule claimed as "covered in another file" actually appears in that file, so the exemption
is a pointer rather than a hole.

`pnpm verify` regenerates every checked-in report and the challenge package and fails if anything
differs. Output is deterministic — no timestamps, seeded null model — so `reports/` is diffable
rather than narrated. The historical run summaries are vendored under `examples/durable-outbox/runs/`
so a fresh clone reproduces the reports; they used to be read from a sibling repository by relative
path, which made every checked-in report unverifiable for anyone but me.

---

## Status and roadmap

**Pre-1.0.** What is true is stated with the command that reproduces it; what is not done is listed
here as not done.

Built and working: the mechanism registry (14), mutant bank (13), candidate ledger (32 rows, 16
kills), 9 task-family shapes, **one fully runnable family**, the challenge packager and its leak
checker, the trial orchestrator with two implemented providers and three declared ones, durable trial
directories, the historical importer, the shared-bank rule, three matrix sources, the axis meter with
null-model calibration, the budget planner and its sanity checker, 17 generated reports, and the
known-bad fixture corpus.

Not done, deliberately:

- **Container isolation is declared, not implemented.** The plan is fixed and validated; no daemon is
  available here, and the adapter refuses rather than degrading.
- **Three providers are declared** (`codex-cli`, `gemini-cli`, `docker`). Each throws
  `provider not configured` with what it would need. Any CLI is still reachable today through
  `--provider shell --command`.
- **Four sources are declared and unimplemented** (`terminal-bench`, `inspect`, `agentdojo`,
  `trial-ledger`). They throw rather than return empty matrices, because a report full of zeroes
  reads as a finding.
- **No task-code generation.** The scaffold emits the paperwork a family needs before it earns build
  time. Building the shipped family's three-process verifier took roughly 45 hours; no generator
  produces that from a mechanism id.
- **Seven of nine families are unbuilt.** Their axis counts are pre-registrations, not measurements.
- **The containment family is already-solved and stays NOT-READY** until it is hardened. More trials
  on the same family will not change that; `reports/ship-gate-report.md` says why.
- **The shared bank is PARTIAL, not measured.** One shared subject. The cheapest path is running the
  containment challenge against models already in the outbox bank — but hardening comes first, since
  an already-solved family contributes no axes to a combined count however good the overlap.

---

## Limitations

- **The axis meter measures co-failure structure and nothing else.** It cannot tell a redundant
  scenario from a correctness anchor doing its job, and it says so in its own output.
- **An axis count is a property of a suite paired with its bank**, never of the suite alone.
- **Defect diversity is not surface diversity.** Two hundred tasks across two hundred APIs might
  collapse to a handful of axes and still be exactly the right eval, because what is under test is
  whether an agent handles a surface it has not memorised. Do not use an axis count as a ship gate
  for that kind of suite without a surface-coverage metric beside it.
- **Three trials is a small bank.** "Already-solved" on three counted attempts by one model family is
  a strong signal, not a proof. The correct response is to harden the family, not to average it away.
- **The registry is mostly judgement.** Six of fourteen mechanisms are evidenced; the rest are
  arguments. A healthy registry looks like that, and every row is labelled.
- **The budget model prices one flat labour rate**, ignores maintenance as families decay against
  improving models, and treats family axis counts as additive when they are probably not.

## Licence

MIT.
