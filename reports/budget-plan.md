# Budget plan

What $100,000 buys, priced against the measured rates from the source project.

## The answer

Three units, because they are three different numbers and the previous version of this report
printed the largest of them under the smallest one's name.

| | families | deliverable tasks | graded cells | independent axes | $ / deliverable task | $ / axis |
|---|---:|---:|---:|---:|---:|---:|
| **parameterized families** | **7** | **7** | 168 | **14** | $12,937 | **$6,468** |
| hand-authored tasks | 7 | 7 | 7 | 7 | $12,937 | $12,937 |

**A FAMILY is what the money builds. A DELIVERABLE TASK is an independently gradeable package a
recipient can be handed, and this repository emits one per family. A GRADED CELL is one
scenario-check pair inside that package, and there are 24 per package.** Those are the three columns, and
conflating the third with the second is the defect this revision fixes.

Read the two rows against each other and the honest gap is narrower than it used to look: per DELIVERABLE the two cost the same $12,937, because one family yields one deliverable either way. What the family buys for that money is **24x the graded cells and 2x the independent axes** — $6,468 per axis against $12,937. That is a real advantage and it is not two orders of magnitude.

**$100,000 does not buy 1,000 deliverable tasks.** At one deliverable per family, 1,000 deliverables means 1,000 families, so reaching that count needs a further $12,836,731. What it does buy is **7 families yielding about 168 graded instances and 14 independent axes** — and the axes are the number worth quoting, because a thousand tasks measuring two things is two measurements.

Read as graded CELLS instead, the same target is far cheaper and still not covered: 1,000 cells at 24 per family is 42 families and $443,343 more. The two shortfalls differ by 24x, and the previous version of this report printed the second one beside a headline labelled in the first one's unit.

## What this revision corrects

| | was | is | effect |
|---|---|---|---|
| cost of one frontier trial | $3.50, a literal under a heading that said "measured" | $9.62, the mean of the 28 recorded runs that PRODUCED a verdict, in `data/measured-trial-costs.json` | the plan was low by roughly 2.7x on model spend |
| the headline unit | families x 24 cells, called "shipped tasks" | families x 1 deliverable package | the deliverable count was overstated 24x |
| axes per family | 3, the antichain width pooled ACROSS both labs | 2, the width inside a single lab | the axis yield was overstated by half |
| builds per shipped family | a second input sitting beside `postBuildKillRate` and agreeing with it by luck | `buildsPerShippedFamily(0.5)` = 2 | the two can no longer disagree |

| runs bought and lost | not priced at all | 6.7% of started runs return no verdict, measured over 30 recorded runs | every trial line was low by that factor again |

**The loss rate had never appeared in any plan.** Two of the thirty recorded runs over $0.50 spent money and returned nothing — one killed by a machine shutdown, one by a harness `NetworkConnectionError` — and because runs that die tend to die late, that is 6.7% of runs but 10.7% of spend. Buying 6 verdicts costs 6.4 runs, so a matrix is $61.85 rather than $57.72. Pricing only the runs that finish is the same optimistic error as pricing only the families that ship, and this plan made both for four phases.

The trial correction is the one with money attached. $3.50 per run was never measured — it was a literal, and three phases of this report printed it inside a section headed "measured". The measurement, once taken, is $9.62: **the plan was low by roughly 2.7x on model spend.** It does not move the family count, because model spend is 3% of this plan — but a plan whose labour was cheap would have been wrong by that factor on the only line it priced.

## Where the money goes

| cost centre | per family | total | share |
|---|---:|---:|---:|
| screening (candidates killed to find one) | $3,600 | $25,200 | 28% |
| authoring the family | $8,910 | $62,370 | 69% |
| frontier trials | $426.73 | $2,987 | 3% |
| generating graded cells (168 of them) | $0.00 | $0.00 | 0% |

**Labour is 97% of spend.** Model spend is $2,987 of $90,557, at the corrected $9.62 per trial. This is the finding: the budget is an engineering budget with a rounding error of GPU time attached, and any plan that prices only the trials is wrong by the size of the rest of the table.

The plan implies **0.41 engineer-years** and **70 candidates screened** to yield 7 families.

## What is not priced here at all

`loadedUsdPerFamily` contains screening labour, authoring labour and frontier trials. It contains
nothing else. **Every family count in this report is therefore an UPPER BOUND**, and this is the
list of what would pull it down:

| absent cost centre | why it is real | why it is absent |
|---|---|---|
| human solver baselines | a difficulty claim with no human baseline is a claim about models, not about difficulty | no solver has ever been paid to attempt a family here, so there is no rate to quote |
| provider credits and entitlements | Gemini slots in the checked-in campaigns are entitlement-blocked rather than merely unrun | the blocked capacity was never priced, only recorded as not-run |
| container and compute time | every trial builds and runs a Docker image, some for over an hour | only model spend was ever metered; wall-clock compute was not |
| triage of counted runs | someone reads each failing run to decide whether the family failed or the harness did | never timesheeted, and it scales with trials rather than with families |
| spec repair after a campaign | the superseded trials below are the proof that it happens | measured in wasted trials, never in the hours the repair took |
| refresh as models improve | a family that every model solves has stopped measuring anything | no family here is old enough to have needed it yet |

Three of those — solvers, compute, triage — scale with the number of TRIALS rather than with the
number of families, so they get worse in exactly the region where this plan looks cheapest.

## Sensitivity to the labour rate

The one input that is purely an assumption, so here is the whole column instead of an argument.

| rate | families | deliverable tasks | graded cells | axes | $ / axis |
|---|---:|---:|---:|---:|---:|
| $60.00/h | 14 | 14 | 336 | 28 | $3,341 |
| $90.00/h | 10 | 10 | 240 | 20 | $4,905 |
| $120.00/h | 7 | 7 | 168 | 14 | $6,468 |
| $180.00/h | 5 | 5 | 120 | 10 | $9,596 |
| $240.00/h | 3 | 3 | 72 | 6 | $12,723 |

## Sensitivity to authoring hours per family

**This is the dominant term.** `hoursPerFamily` is an estimate, not a measurement, and it is the
only input that moves the family count on its own. The 18 declared shapes in
`examples/shapes/*.json` estimate their own build at 18 to 120 hours — mean 62.4, median 57.5 —
so **45 is 28% below the mean of the author's own estimates**. It is not below their low end;
three shapes declare less. But the flagship family `durable-approval-outbox` declares 120, which
is 2.7x what this plan charges for it.

| hours/family | why this row | loaded $ / family | families | deliverable tasks | axes | $ / axis |
|---|---|---:|---:|---:|---:|---:|
| 45 h | current input | $12,937 | 7 | 7 | 14 | $6,468 |
| 62 h | mean of the 18 declared shape estimates (62.4, rounded) | $16,303 | 6 | 6 | 12 | $8,151 |
| 90 h | above 15 of the 18 declared estimates | $21,847 | 4 | 4 | 8 | $10,923 |
| 120 h | the flagship family's own estimate | $27,787 | 3 | 3 | 6 | $13,893 |

45 stays the default because moving a headline without new evidence is worse than reporting the
discrepancy — but read the table before quoting the headline. Charging the flagship family its own
declared 120 hours costs more than half the yield.

One further caveat on this input: the repository declares build hours in TWO places, and neither
is a measurement. `examples/shapes/*.json` carries an estimate for all 18 declared shapes, and
`src/families/registry.ts` carries a second `estimatedBuildHours` on each of the 8 BUILT families
(18, 36, 40, 55, 70, 75, 85, 95 — mean 59.3). Two independent guesses at the same quantity is one
more guess than evidence.

## Sensitivity to deliverable tasks per family

**This lever moves yield per family, not the family count** — the `families` column below is
constant, and that is the honest result rather than a broken table. Authoring cost does not depend
on how many packages a finished family is sliced into, so raising this divides the same spend over
more deliverables and changes nothing else. The previous version of this report ran the same table
over `instancesPerFamily` and presented the constant column as sensitivity.

It is 1 today, and it will stay 1 until a deliverable exporter exists. Two instances count as
distinct deliverables only if a knob separates them that changes the expected answer; nine inert
knobs are not nine deliverables.

| deliverables/family | families | deliverable tasks | $ / deliverable task | $ / axis |
|---|---:|---:|---:|---:|
| 1 (current — no deliverable exporter exists) | 7 | 7 | $12,937 | $6,468 |
| 2 | 7 | 14 | $6,468 | $6,468 |
| 4 | 7 | 28 | $3,234 | $6,468 |
| 8 | 7 | 56 | $1,617 | $6,468 |
| 24 | 7 | 168 | $539.03 | $6,468 |

The last row is what the previous version of this report printed as its headline: it treated all 24 graded cells as 24 deliverables. Nothing in the repository emits them that way.

## Inputs, with provenance

| input | value | source |
|---|---:|---|
| `hoursPerFamily` | 45 | ESTIMATED — no timesheet was ever kept. It is **28% below the mean of the author's own 18 declared estimates** in `examples/shapes/*.json` (mean 62.4 h, median 57.5, range 18–120), and the flagship family `durable-approval-outbox` declares 120 — 2.7x the value this plan uses |
| `hoursPerScreenedCandidate` | 3 | measured — cycle 5 killed 15 candidates in ~90 min |
| `cycleHitRate` | 0.1 | measured — 1 family shipped from 10 design cycles |
| `matricesPerFamily` | 3 | measured — the shipped family consumed 3 matrix rounds |
| `usdPerTrial` | 9.62 | measured — mean of the 19 real Harbor trials over $0.50 in `data/measured-trial-costs.json` (median $7.74; Anthropic median $15.20, OpenAI $3.28). A mean, not a median, because a cross-lab plan buys both halves of a bimodal distribution |
| `trialsPerMatrix` | 6 | measured — 3 subjects x 2 labs is what one cross-lab claim costs |
| `retryRate` | 0.15 | measured — 3 of 20 matrix runs discarded for infrastructure reasons |
| `deliverableTasksPerFamily` | 1 | measured — this repository emits ONE independently gradeable package per family. Not 24: the 24 are graded cells inside that one package |
| `hiddenCellsPerTask` | 24 | measured — the shipped package grades 24 scenarios. This is SCALE inside one deliverable, not a count of deliverables |
| `axesPerFamily` | 2 | measured — antichain width 2 within a single lab on the 267-check outbox suite. The retired value of 3 was the width pooled ACROSS labs |
| `postBuildKillRate` | 0.5 | measured but tiny sample — one of two locally built families died after trials. Read via `buildsPerShippedFamily()`, which is where the retired `evolutionCyclesPerSurvivor` input used to duplicate it |
| `descendantReuse` | 0.35 | estimated — live-DOM reused the router, packager, axis meter and report loop |
| `labourRateUsdPerHour` | 120 | ASSUMPTION — caller-supplied, and the dominant term |
| `totalUsd` | 100000 | the question |

## Families die after they are built, and that is priced

The earlier version of this model priced one build per shipped family. That is the same mistake as
pricing only the trial runs that produced a result: it charges for the work that survived and
omits the work that produced it.

| | |
|---|---:|
| families actually built | 14 |
| of those, killed after being built | 7 |
| families that survive to ship | 7 |
| builds per survivor | 2 = 1 / (1 - 0.5), derived from `postBuildKillRate` |
| a descendant's reuse of its parent | 35% |

**Why killing prompt-injection early was the good outcome.** The family cost roughly 70 hours to
build and three counted trials — about seventeen minutes of model time — to kill. Had it shipped,
the cost would have been every downstream hour spent maintaining a benchmark that separates
nothing, plus the credibility of every number quoted beside it. The gate that killed it cost
nothing to run.

That asymmetry is the argument for the whole screening layer: **a kill is cheap and a build is
not**, so the discipline that pays is moving evidence earlier, not building faster.

What the numbers above do NOT say is that the kill rate is 50%. One of two families built here
died after being built. That is a sample of two, it is the only post-build kill rate this
repository has measured, and a plan resting on it is resting on very little — but a plan assuming
100% survival is resting on less, and `budget-check.ts` rejects that one.

## Trial-layer assumptions, measured

Everything above prices *building* families. This section prices *running* them, from the trial
records this repository holds rather than from an estimate.

| | |
|---|---:|
| historical runs imported | 33 |
| of those, counted | 15 |
| total recorded spend | $252.51 |
| spend on runs that produced a counted result | $184.20 |
| spend on standard attempts that produced nothing | $59.32 |
| **effective $ per counted run** | **$16.83** |
| counted agent trials on the second family | 6 |
| median runtime of those trials | 326s |

The plan prices one trial at $9.62 and this table's effective cost per COUNTED run is $16.83. They differ because the second amortizes the runs that produced nothing over the runs that did, and both are several times the $3.50 the plan assumed for three phases. The refutation of that literal was being printed two sections below it the whole time.

### The waste rate

Of 17 genuine attempts at the task — cheat and gate runs excluded, because those are
deliberate and not waste — 15 produced a usable result. That is a waste rate of
**12%**, against the `retryRate` input of 15%.

The measured rate is at or below the input, so the plan above is not optimistic on this axis.

### What a second family costs to run

The containment family's trials cost minutes and cents rather than hours and tens of dollars: the
subject is a single module graded against 128 in-memory scenarios, not a service under a workload.
Two consequences for the budget:

- **Cheap families are how you fill a shared bank.** Cross-family axis measurement needs the same
  models to attempt both families, and the binding cost is the expensive family, not the cheap one.
- **Cheap to run is not cheap to build.** The containment family took roughly the same authoring
  effort as the expensive one and then failed the ship gate for being too easy. Run cost is the
  smaller half of the bill, and the model above is right to be dominated by labour.

## Campaigns, measured

The trial layer running for real, on this machine. Every figure is read from campaign plans and
trial directories rather than assumed.

| | |
|---|---:|
| campaigns declared | 9 |
| slots planned | 29 |
| slots run | 11 |
| slots **not run** | 18 |
| counted trials | 7 |
| of those, failing something | 7 |
| superseded by a challenge repair | 16 |
| median counted-trial runtime | 12.5 min |
| budget declared across campaigns | $100.00 |
| **budget per counted failure** | $14.29 |

### The line item nobody budgets for

16 counted trials were invalidated by a repair to the family they measured. They
are preserved and they do not count, because the task they were run against no longer exists.

That is not waste in the ordinary sense — the repair came FROM those trials, which found a rule
attribution the spec had left ambiguous — but it is real spend that a plan pricing only successful
runs would omit. **A benchmark programme should expect to pay for each family's trials more than
once**, because the first campaign is often what tells you the family is not yet fair.

### Unrun slots are a budget line, not an absence

18 of 29 declared slots have not run, almost all of them because no runner
for that model family is configured here. They are costed in the plans and visible in every
report. A campaign that quietly dropped them would show a complete-looking result over one lab's
model — which is the single most common way a benchmark overstates what it measured.

## Spend by provider, measured

Every row read from the trial directories on disk. `superseded` runs were counted once and are
not counted now: the family they measured was repaired.

Runs are priced at the measured $9.62 — the mean of the 19 real Harbor trials over $0.50 in `data/measured-trial-costs.json`. This section used to price them at $3.50, a literal with no measurement behind it printed under a heading that said "measured", so every dollar figure below was low by roughly 2.7x.

| provider | counted | of those failed | refused | infra | superseded | model-minutes |
|---|---:|---:|---:|---:|---:|---:|
| `anthropic` | 9 | 4 | 0 | 0 | 9 | 122 |
| `google` | 0 | 0 | 0 | 0 | 1 | 0 |
| `openai` | 4 | 3 | 0 | 1 | 6 | 75 |

| | |
|---|---:|
| runs attempted | 30 |
| counted | 13 |
| **produced no usable evidence** | **17** (57%) |
| at $9.62 per run, spend on runs that produced nothing | $163.54 |
| **cost per counted FAILURE** | $41.23 |

**Cost per counted failure is the number to plan against.** A counted solve tells you the family
is solvable, which the reference already told you. A counted failure is the only kind of trial
that moves a family toward shipping, and at the observed rates it costs several times what a
single run does.

### The three kinds of waste, which are not the same

| kind | count | can it be engineered away? |
|---|---:|---|
| provider refusal | 0 | no — it is a property of the provider, and re-running until it complies would fabricate a sample |
| infrastructure / auth | 1 | partly — an account-tier error is fixable by paying; a harness bug is fixable by fixing it |
| superseded by repair | 16 | no, and it should not be. These runs found the defect that invalidated them |

Priced into the plan, 17 wasted runs against 3 matrices per family is
a real multiplier on trial cost — and still a rounding error beside labour, which is the finding
the whole budget model exists to make.

## Pipeline conversion costs

This is the cost model for the exact live-DOM and checker-required phases: turning a
mutant-measured descendant into a trial-ready family, then turning trial-ready into real-agent difficulty evidence. Rows marked
`estimated` are planning figures; rows marked `measured` come from checked-in campaigns or trial
directories.

| question | cost at current inputs | label | what is included |
|---|---:|---|---|
| mutant-measured -> trial-ready | $2,790 (23.3 h) | estimated | fairness SPEC, challenge package, leak tests, route, campaign plan |
| trial-ready -> difficulty-evidenced | $251.06 + provider availability | estimated | one counted provider run, grading, reconcile, report update |
| spec ambiguity waste already observed | $897.01 | measured trials + estimated repair | stale/superseded trials plus repair time |
| checker-required package-ready -> difficulty-evidenced | $15 campaign budget; provider cost not recorded | measured campaign | package, route, two submitted artifacts, 792 graded scenarios and one counted Codex/OpenAI failure; no cross-lab breadth |

Trial-ready is not SHIP. Trial-ready means the package builds, the leak checker passes, the hash
is pinned and the router can grade an artifact. Difficulty-evidenced means at least one counted
real agent trial exists under that hash. SHIP still requires the family not to be already solved
and all blocking gates to pass.

Provider unavailability is visible as 18 not-run slot(s) out of 29; those slots do not become failures or passes.
The current observed pipeline also carries a 12% standard-attempt waste rate from historical trials.

Under the current observed pipeline, $100,000 buys 7 shipped family line(s), 7 independently gradeable package(s), about 168 graded cells and 14 independent axes. It does not buy 168 independent tasks — those cells sit inside 7 package(s) — and the axis meter is the guard against that phrasing.

## What this model does not include

- **Every cost centre in *What is not priced here at all*.** They are not repeated here; the
  point stands that each family count above is an upper bound.
- **The first family is more expensive than the tenth**, and the model uses one flat rate.
- **Axis counts do not simply add.** Two families may share an axis; the total is an upper bound
  until a combined matrix is measured.
- **Graded cells within a family are heavily correlated** — that is exactly what the axis meter
  measures, and why the cell count is the wrong headline and the axis count is the right one.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
