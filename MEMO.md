# Coverage is not diversity

**What the durable-outbox task actually measured, and what the second one costs.**

Mathew Stevens · follow-up to the Klavis conversation of 2026-08-28

---

You asked how I would spend $100k designing a thousand diverse agent tasks — "the durable outbox
but 999 more." I gave a process answer in the room: gather task shapes, kill the ones agents solve,
find the failure variables that transfer, stamp those across domains. I still think that is the
right shape. But I went back and measured my own suite before writing it up, and the measurement
changed the answer.

**The binding constraint is not model spend, it is authoring labour.** The whole durable-outbox
project — ten design cycles, two built task families, three trial rounds on the one that shipped —
cost **$252.51** in recorded frontier spend. It cost weeks of my time. The money is not what runs
out.

**And my 24-scenario, 267-check suite contains three independent measurements.** Not 24, not 267. I
built the tool in this repository to find that out, and the number is worse than I expected. Pointed
at a public corpus afterwards — SWE-bench Verified, 500 instances against 134 independently submitted
systems — it reports **215 axes**, against a chance baseline of 500.

This memo is that measurement, what it implies for the thousand-task question, and what I would
actually do with the budget.

---

## 1. The caveats on my own headline, before anything else

The submitted result is that all six frontier trials scored reward 0 while the reference passed
267/267. That is true and reproducible. Three things a reader should have up front:

**The discriminating half of the matrix is 3/3, not 6/6.** All three Codex trials failed
identically at 256/11 and built no verification tooling at all. No Codex run in the project ever
solved the task — six counted trials, all reward 0 — but a family with no measured variance is weak
evidence about difficulty. The three Codex `/cheat` trials returned reward 0 by refusing at the
provider level (`AgentSafetyRefusalError`); no attack was attempted, and I do not present that as
verifier resistance.

**The six failures were not six independent failure modes.** Five wrote the illegal
`ACKED -> REVOKED` audit transition. The sixth avoided it — it independently derived that `ACKED` is
terminal and encoded a `LEGAL` table excluding that edge — and failed liveness instead, stranding an
action in `IN_DOUBT` forever. Two failure modes across six trials, on opposite sides of one
requirement.

**The strongest engine finished close to the wall.** `cc267-claude-1`'s agent phase ran 1:56:21
against the 7200-second cap in `task.toml` — 3m39s of headroom (1:57:32 end to end, which is the
whole trial including verifier, not the capped phase; the two are different clocks and I have seen
them conflated, including in my own results doc). Its last `/app/engine/worker.py` edit landed 6m35s
before the agent stopped, and it was a comment-only cleanup deleting a dead helper; the last edit
that changed behaviour was 35 minutes earlier. So it was not still building at the buzzer — but the
margin belongs in the open.

None of that retracts the result. It does mean the honest description is "one model family failed
this three times in two distinct ways," and the gap between *six failures* and *two failure modes*
is what this memo is about.

---

## 2. The measurement

A suite's size is usually reported in tasks or checks. Neither says how many *different things* it
measures. Two instances failed by exactly the same set of implementations are, on the available
evidence, one measurement wearing two names.

So: for each graded instance take its **catch set** — the subjects it separates from correct. Count
the distinct catch sets, then collapse the ones that are merely nested inside one another.

Run against my shipped suite (`axis report examples/durable-outbox/matrix.json`), on a complete
10-engine sweep of the real 267-check verifier — 240 of 240 cells measured, nothing imputed:

| | |
|---|---|
| graded instances | **24** |
| checks in the suite | **267** |
| subjects in the bank | 10 |
| instances that separate nothing in this bank | **7** (29%) |
| distinct catch sets | **9** |
| **independent axes** (antichain width) | **3** |
| redundancy | 1.89× |

Seven of twenty-four scenarios are failed by none of the ten engines. Of the seventeen that
discriminate, the nine distinct catch sets collapse under subset inclusion into **three chains**:

```
1. {e1} ⊂ {codex2b,e1} ⊂ {codex1,codex2b,codex3b,e1,fhc1,opus2}
2. {codex1,codex2b,codex3b} ⊂ {…,fhc2} ⊂ {…,fhc2,fhc3,opus3b} ⊂ {…,fhc2,fhc3,opus2,opus3b}
3. {codex3b,e1,fhc1,opus1,opus2} ⊂ {codex1,codex3b,e1,fhc1,opus1,opus2}
```

A chain is consistent with **one** underlying defect observed at increasing sensitivity: the
strictest instance catches everything the weaker ones do. Nothing in the data forces a richer
reading, so the honest count is three.

Two honest qualifications on that decomposition. **The width of three is canonical; this particular
partition into three chains is not** — a minimum chain cover is not unique, and which instance lands
in which chain depends on scan order. And the *labels* I would attach (chain 2 is the
`ACKED -> REVOKED` rule, the others are exactly-once-under-crash and liveness) are an interpretation
the tool cannot support. The independent corroboration is the failing check names, which do cluster
that way: chain 2's instances fail on `audit_explains` alone, while the others fail on
`exactly_once` / `executed_iff_called` and on `completion`.

### It decays against a stronger bank

Apparent diversity is not a property of a suite. It is a property of the suite *paired with the bank
it is graded against*. Dropping the most-caught subject repeatedly:

| weakest dropped | subjects left | distinct catch sets | **independent axes** | separating nothing |
|---:|---:|---:|---:|---:|
| 0 | 10 | 9 | **3** | 7 / 24 |
| 1 | 9 | 9 | **3** | 7 / 24 |
| 2 | 8 | 8 | **3** | 7 / 24 |
| 3 | 7 | 6 | **2** | 9 / 24 |
| 4 | 6 | 5 | **2** | 11 / 24 |
| 5 | 5 | 4 | **2** | 11 / 24 |
| 6 | 4 | 3 | **2** | 15 / 24 |
| 7 | 3 | 3 | **2** | 15 / 24 |
| 8 | 2 | 2 | **1** | 21 / 24 |
| 9 | 1 | 1 | **1** | 22 / 24 |

Remove the three weakest engines and the suite measures **two** things, with 9 of 24 scenarios
separating nothing.

I want to be careful about what this is *not*. Removing my weakest subject is not what the next
model generation does — a next-generation model is a new subject with different defects, not my bank
minus its floor. This is a sensitivity analysis, not a forecast. What it does show is how much of the
suite's apparent richness is carried by its weakest subjects, and here the answer is: most of it.

### The circularity, stated plainly

The six `revoke-after-ack` instances were **selected against seven of these same ten engines**.
`prototype/screenM/diversify.py:11` fixes `SUBJ` to exactly the engines then known to carry the bug
and gates at `len(catch) >= 6` (line 46), so a candidate could only survive by making that one bug
fire. Five of the six then land on nearly identical catch sets — which is what the selection rule
guarantees, not what it discovered.

That is the error I documented in `results/33`: *validating that a trap is robust is not the same as
identifying which parameter controls it.* I made it again, one layer up, in the tool that picked the
traps. The meter prints this caveat above its own headline for that reason, and the loader rejects
any matrix that does not carry a provenance statement.

### Does this transfer, or is it a fact about my own suite?

The obvious objection to everything above is that I built the suite, I built the bank, and I selected
six of the twenty-four instances against seven of the ten subjects. So the same meter, unchanged, is
pointed at a corpus nobody assembled for this purpose: **SWE-bench Verified**, 500 instances graded
against **134 leaderboard submissions** made independently by different teams between October 2023
and December 2025, spanning 2/500 to 396/500 resolved.

| | |
|---|---|
| graded instances | **500** |
| subjects in the bank | 134 |
| measured cells | 66,784 (216 recorded as not measured) |
| distinct catch sets | **474** |
| **independent axes** | **215** |
| instances separating nothing | 0 |

At this scale the width needs a significance test, and this is the honest reason why: exact subset
nesting is unforgiving, so on a large bank of single-run results one stray disagreement splits one
axis into two, and a big noisy corpus could report a high axis count for no reason but its size.

So destroy the structure and keep the noise. Give every system its exact resolve count and its exact
unmeasured cells, but redraw *which* instances it passes at random. **Randomised data scores 500 —
the maximum possible, one axis per instance — on every trial. The real corpus scores 215.**

That is the external validation. 500 tasks compress to 215 independent axes, a 2.3× reduction that
chance does not produce. Tasks in this corpus genuinely fail together, and the method detects it on
data I had no hand in generating.

Two things it does not show. It does not show 215 is the "right" number of capabilities in SWE-bench
Verified: one-bit grading coarsens the signal, run noise inflates the count by an unknown amount, and
231 of the 500 instances come from a single repository, so instances may fail together because they
share a codebase rather than a capability. And a benchmark being compressible is not the same as it
being *bad* — it is a fact to price, not a verdict. Full limitations in
`examples/public-swebench-verified/PROVENANCE.md`.

---

## 3. What this implies for a thousand tasks

If a hand-built, twice-hardened, fuzzer-corrected 24-scenario suite yields three independent axes,
and a 500-task public benchmark with a 134-system bank yields 215, the naive plan — author a thousand
tasks, ship a thousand measurements — is off by a large factor in both regimes. The SWE-bench ratio
is the more useful of the two for planning, because its bank is independent: **roughly 2.3 tasks per
independent axis, at 500 tasks and a very wide bank.**

The reason is structural, and my own kill log says so. `results/29` carries a nine-row gate table
(its prose says "seven" — the table is right and the prose is stale, which I should fix at the
source). Eight of the nine were gated against preserved engines; the ninth was killed on paper.
Causes of death:

| category | count | meaning |
|---|---:|---|
| already-solved | 4 | one preserved engine already handled it correctly |
| self-verifiable | 2 | the agent can cheaply brute-force a check and confirm itself |
| unfair | 2 | the constraint breaks the reference, or the hatch that makes it solvable defuses it |
| no-window | 1 | the race it depends on is not reliably reachable |

**Four of nine died because one engine — `opus3b`, the one that solved the earlier suite — already
did the thing correctly.** That is n=1, and I should not inflate it into "the models." But both that
category and `self-verifiable` get *worse* with capability, so it is a rate limit on task discovery
rather than a bug to engineer around.

Underneath it is the constraint from `results/08`: fairness requires the rules be fully stated;
solvability requires the answer be derivable from the rules plus the shipped data; and anything a
human can compute that way, a program can compute, so the agent can write that program and use it as
a self-check.

I want to state the consequence more carefully than I first did, because the obvious reading is
wrong. It is tempting to conclude that difficulty reduces to whether the agent builds a *complete
enough checker*. That explains one half — the engine that encoded a `LEGAL` table stopped having the
`ACKED -> REVOKED` bug. It does not explain the other half: the engine with by far the most complete
checker (a legality table, a fuzzer, and mutation tests against its own checker, 900/900 clean) still
failed, on liveness. Its checker could express the rule; its *generator* never reached the state
where the rule bit. That is the coverage argument in `results/29`, and it is the part that survives:
**public rules, an enormous behaviour space, a hidden graded region — difficulty from coverage, not
from secrecy.**

---

## 4. The economics, measured

Figures derived from the 35 run records under `runs/*/*/result.json` in the task repository. Nine
recorded no cost, so **$252.51 is a floor, not a total** — a further $19.32 of rubric-review runs
live under `jobs/` and are excluded, and several agent screens recorded nothing at all. Dollar
figures are imputed from token counts at list prices under subscription auth; none were invoiced.

| rung | cost |
|---|---|
| 22 static checks | $0 |
| offline sweep against preserved engines | $0 |
| paper screen against the stated constraints | $0 |
| LLM rubric review | $2.59–4.81 |
| one Codex trial | $2.85 mean (n=8) |
| one Opus trial | **$15.56 mean** (n=14, $5.51–$25.04) |
| the shipped six-trial matrix | **$48.66** |
| one `/cheat` trial | $4.43 |

Where the $252.51 went:

| | |
|---|---:|
| `v2-*` — superseded matrix (201-check suite, 10 runs) | $117.83 |
| `fh-*` — superseded hardening round (245-check, 3 Opus + 1 aborted Codex) | $54.62 |
| `cc267-*` — the matrix that shipped | $48.66 |
| `cheat-claude-code-cc267b` — the `/cheat` that shipped | $4.43 |
| a second task family (`reorg-safe-settlement`) | $22.40 |
| superseded v2-era cheat trials | $4.56 |

**$53.09 bought the evidence that shipped. $172.45 bought rounds on this same task that were later
superseded — a 3.25:1 overhead ratio.** None of the first two rounds held up. (The `fh-*` round was
never a full matrix: three Opus trials and one Codex trial killed at about a minute.)

### The ratio that decides the whole program

A mechanical screen — 22 static checks, an offline sweep against preserved engines, or a paper screen
against the stated constraints — costs **$0**. A frontier matrix costs **$48.66** plus roughly five
hours of supervision. Screening pays for itself the moment it kills more than about one candidate in
four.

It kills far more. Cycle 5 alone generated **fifteen** candidate mechanisms and killed all fifteen in
about 90 minutes for $0 (`FINDINGS.md`). `results/23`–`29` then killed nine more — eight against
preserved engines, one on paper — again without a paid trial. Of ten design cycles, **eight were
killed for $0**; only two needed a full build plus a trial to disprove.

### So what does $100k buy?

Priced honestly against what this task actually consumed rather than against its cheapest round:

```
three rounds, as actually run:  $117.83 + $54.62 + $48.66  =  $221.12 per shipped task
$100,000 / $221.12  ≈  452 tasks
```

If iteration got cheaper — one matrix per task instead of three, which never once happened here —
the ceiling is about 2,000. Both numbers are the optimistic ones, because both price only the part
that is not binding.

Authoring is binding, and here I am estimating rather than measuring: I kept no timesheet. What the
record supports is that one shipped task consumed ten design cycles and three trial rounds over weeks
of concentrated work, at a **1-in-10 cycle hit rate**. Extrapolated honestly, a thousand tasks is
years of engineering. **$100k does not buy it at any token price.**

---

## 5. What I would actually do with $100k

**Stop counting tasks. Count families.**

The one mechanism that survived every constraint in my kill log has a specific shape: *public rules,
an enormous behaviour space, a hidden graded region inside it.* Difficulty comes from coverage of
that space. The durable outbox is one such family; its 24 scenarios are instances drawn from a
declared grammar, and `instruction.md` says outright that the invariants hold "for every seed and
schedule the harness can generate."

That changes the unit of production:

1. **Author families, not tasks.** A family is the expensive artifact: a declared behaviour space, a
   reference implementation, an out-of-process verifier, an invariant model. This is where the money
   goes, and it buys people, not tokens.
2. **Generate graded instances inside each family for ~$0.** Fuzz the declared space, keep the points
   that separate a bank of preserved engines, hold out the rest. My `prototype/screenM/` chain does
   this in 793 lines across nine scripts (`fuzz`, `classify`, `minimize`, `pick`, `select`,
   `robust`, `diversify`, `validate`, `family`; the directory totals 1,363 lines including the tool
   harness they call into).
3. **Gate every family on axis count, not check count** — the tool in this repository, which I did
   not have when I built the outbox task.
4. **Spend frontier budget only on what survives 1–3.**

**And here is the number my own argument forces, which I would rather state than leave implicit.**
At ~$221 of trials and weeks of authoring per family, $100k is roughly six months of one engineer.
That buys **three to five families**, not forty. The thousand-task program is a multi-year, multi-
person effort whose first year's deliverable is 25–40 well-instrumented families plus the tooling
that proves they measure different things. If someone quotes you a thousand tasks for $100k, the
tasks are instances of a handful of families and the interesting question is how many axes they
span.

### The limit of my own gate

I should name where recommendation 3 would be wrong for you. I define diversity as *defect-axis*
diversity: orthogonal ways an implementation can be wrong about one invariant model. That is the
right axis for a distributed-systems correctness task. It is the wrong axis for a lot of what Klavis
grades. Two hundred tasks across two hundred APIs — each with its own auth model, pagination quirk,
rate limit, and half-broken schema — might collapse to three axes under my meter and still be exactly
the eval you need, because the thing under test is whether the agent handles a surface it has not
memorised, not whether it exhibits a novel defect. Measurement redundancy and coverage redundancy are
different products. A gate that only sees the first would kill useful evals, and I would not ship it
without a surface-coverage metric beside it.

---

## 6. Limits

- **n = 2 corpora, and only one of them independent.** The internal example is mine end to end; the
  SWE-bench example is independent but coarse (one bit per instance, single unreplicated runs).
- **The bank bounds the answer.** Ten subjects containing roughly two defect families cannot exhibit
  many axes however good the suite is. The honest internal headline is "three *against this bank*."
  The SWE-bench run is the experiment that addresses this, and it is why the null model exists: at
  134 subjects the constraint runs the other way, and the width has to be shown to beat chance rather
  than assumed to.
- **The instances are not independent of the bank.** Six of twenty-four were selected against seven
  of the ten engines. Read the axis count as an upper bound.
- **Cost figures are imputed**, nine runs recorded none, `jobs/` is excluded, and every labour
  estimate is mine rather than an observation. I have deliberately not published a $/task allocation
  table whose dominant term is a number I invented.
- **The tool measures co-failure structure only.** It cannot tell a redundant scenario from a
  correctness anchor doing its job, and it says so in its own output.

Reproducible in about a second:

```bash
pnpm install && pnpm build
node dist/cli.js report examples/durable-outbox/matrix.json
```

The matrix is extracted from `prototype/screenM/matrix.txt` — a complete sweep of all ten preserved
engines against the shipped 267-check verifier — and `tests/collect.py`. The extraction is recorded
in `examples/durable-outbox/PROVENANCE.md`.
