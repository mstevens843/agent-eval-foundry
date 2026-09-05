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
only input that moves the family count on its own. The 19 declared shapes in
`examples/shapes/*.json` estimate their own build at 18 to 120 hours — mean 65.5, median 60 —
so **45 is 28% below the mean of the author's own estimates**. It is not below their low end;
three shapes declare less. But the flagship family `durable-approval-outbox` declares 120, which
is 2.7x what this plan charges for it.

| hours/family | why this row | loaded $ / family | families | deliverable tasks | axes | $ / axis |
|---|---|---:|---:|---:|---:|---:|
| 45 h | current input | $12,937 | 7 | 7 | 14 | $6,468 |
| 66 h | mean of the 19 declared shape estimates (65.5, rounded) | $17,095 | 5 | 5 | 10 | $8,547 |
| 90 h | above 15 of the 19 declared estimates | $21,847 | 4 | 4 | 8 | $10,923 |
| 120 h | the flagship family's own estimate | $27,787 | 3 | 3 | 6 | $13,893 |

45 stays the default because moving a headline without new evidence is worse than reporting the
discrepancy — but read the table before quoting the headline. Charging the flagship family its own
declared 120 hours costs more than half the yield.

One further caveat on this input: the repository declares build hours in TWO places, and neither
is a measurement. `examples/shapes/*.json` carries an estimate for all 19 declared shapes, and
`src/families/registry.ts` carries a second `estimatedBuildHours` on each of the 9 BUILT families
(18, 36, 40, 55, 70, 75, 85, 95, 120 — mean 66.0). The descendant's 120 is its parent's
from-scratch estimate; measured 0.18 h marginal work remains separate. Two independent guesses at the same quantity is one
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
| `hoursPerFamily` | 45 | ESTIMATED — no from-scratch timesheet was ever kept. It is **31% below the mean of the author's own 19 declared estimates** in `examples/shapes/*.json` (mean 65.5 h, median 60, range 18–120), and the flagship family `durable-approval-outbox` declares 120 — 2.7x the value this plan uses. The dao descendant's measured 0.18 h is excluded because it inherited the mechanism and infrastructure |
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

## Pipeline conversion costs

This is the cost model for the exact live-DOM and checker-required phases: turning a
mutant-measured descendant into a trial-ready family, then turning trial-ready into real-agent difficulty evidence. Rows marked
`estimated` are planning figures; rows marked `measured` come from checked-in campaigns or trial
directories.

| question | cost at current inputs | label | what is included |
|---|---:|---|---|
| mutant-measured -> trial-ready | $2,790 (23.3 h) | estimated | fairness SPEC, challenge package, leak tests, route, campaign plan |
| trial-ready -> difficulty-evidenced | $251.06 + provider availability | estimated | one counted provider run, grading, reconcile, report update |
| spec ambiguity waste already observed | not observed in supplied campaign facts | not-run | stale/superseded trials plus repair time |
| checker-required package-ready -> difficulty-evidenced | $15 campaign budget; provider cost not recorded | measured campaign | package, route, two submitted artifacts, 792 graded scenarios and one counted Codex/OpenAI failure; no cross-lab breadth |

Trial-ready is not SHIP. Trial-ready means the package builds, the leak checker passes, the hash
is pinned and the router can grade an artifact. Difficulty-evidenced means at least one counted
real agent trial exists under that hash. SHIP still requires the family not to be already solved
and all blocking gates to pass.

Provider unavailability is represented when campaign facts are supplied.

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
