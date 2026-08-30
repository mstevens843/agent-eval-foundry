# Budget plan

What $100,000 buys, priced against the measured rates from the source project.

## The answer

| | families | shipped tasks | independent axes | $ / task |
|---|---:|---:|---:|---:|
| **parameterized families** | **7** | **168** | **21** | $535.24 |
| hand-authored tasks | 7 | 7 | 7 | $12,846 |

**$100,000 does not buy 1,000 tasks.** Reaching that count under these assumptions needs a further $439,522. What it does buy is **7 families yielding about 168 graded instances and 21 independent axes** — and the axes are the number worth quoting, because a thousand tasks measuring three things is three measurements.

## Where the money goes

| cost centre | per family | total | share |
|---|---:|---:|---:|
| screening (candidates killed to find one) | $3,600 | $25,200 | 28% |
| authoring the family | $8,910 | $62,370 | 69% |
| frontier trials | $335.75 | $2,350 | 3% |
| generating instances | $0.00 | $0.00 | 0% |

**Labour is 97% of spend.** Model spend is $2,350 of $89,920. This is the finding: the budget is an engineering budget with a rounding error of GPU time attached, and any plan that prices only the trials is wrong by the size of the rest of the table.

The plan implies **0.41 engineer-years** and **70 candidates screened** to yield 7 families.

## Sensitivity to the labour rate

The one input that is purely an assumption, so here is the whole column instead of an argument.

| rate | families | tasks | axes |
|---|---:|---:|---:|
| $60.00/h | 15 | 360 | 45 |
| $90.00/h | 10 | 240 | 30 |
| $120.00/h | 7 | 168 | 21 |
| $180.00/h | 5 | 120 | 15 |
| $240.00/h | 3 | 72 | 9 |

## Sensitivity to instances per family

This is the lever. At 1 instance per family you are hand-authoring every task, which is what
makes the literal reading of the question unaffordable.

| instances/family | families | tasks | $ / task |
|---|---:|---:|---:|
| 1 | 7 | 7 | $12,846 |
| 6 | 7 | 42 | $2,141 |
| 12 | 7 | 84 | $1,070 |
| 24 | 7 | 168 | $535.24 |
| 48 | 7 | 336 | $267.62 |

## Inputs, with provenance

| input | value | source |
|---|---:|---|
| `hoursPerFamily` | 45 | estimated (no timesheet was kept; the shipped family took weeks) |
| `hoursPerScreenedCandidate` | 3 | measured — cycle 5 killed 15 candidates in ~90 min |
| `cycleHitRate` | 0.1 | measured — 1 family shipped from 10 design cycles |
| `matricesPerFamily` | 3 | measured — the shipped family consumed 3 matrix rounds |
| `usdPerMatrix` | 48.66 | measured — $48.66 for the shipped six-trial matrix |
| `retryRate` | 0.15 | measured — 3 of 20 matrix runs discarded for infrastructure reasons |
| `instancesPerFamily` | 24 | measured — the shipped family grades 24 scenarios |
| `axesPerFamily` | 3 | measured — antichain width 3 against a 10-engine bank |
| `postBuildKillRate` | 0.5 | measured but tiny sample — one of two locally built families died after trials |
| `evolutionCyclesPerSurvivor` | 2 | measured locally — the UI line now has a parent plus descendant |
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
| builds per survivor | 2 |
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
| of those, counted | 20 |
| total recorded spend | $252.51 |
| spend on runs that produced a counted result | $215.60 |
| spend on standard attempts that produced nothing | $27.92 |
| **effective $ per counted run** | **$12.63** |
| counted agent trials on the second family | 6 |
| median runtime of those trials | 326s |

### The waste rate

Of 24 genuine attempts at the task — cheat and gate runs excluded, because those are
deliberate and not waste — 20 produced a usable result. That is a waste rate of
**17%**, against the `retryRate` input of 15%.

**The measured rate is above the `retryRate` input of 15%.** Re-planning at 17%
changes nothing: 7 families and 168 instances either way, and $0.20 more per shipped task. That is worth stating plainly — at this scale the plan is dominated by labour, and the trial budget is small enough that a several-point error in the retry rate does not move the family count. The place to be careful about model spend is a plan whose labour is cheap, and this is not one.

The waste that did occur was 3 `infrastructure_error`, 1 `timeout` — not model failure, and not something a better prompt fixes. The input is left at its
documented value rather than quietly raised to the measured one: 24 standard attempts is a small
sample, and tuning an input until the plan flatters itself is the failure mode this whole
repository is arguing against.

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
| campaigns declared | 3 |
| slots planned | 16 |
| slots run | 12 |
| slots **not run** | 4 |
| counted trials | 14 |
| of those, failing something | 11 |
| superseded by a challenge repair | 3 |
| median counted-trial runtime | 8.2 min |
| budget declared across campaigns | $37.00 |
| **budget per counted failure** | $3.36 |

### The line item nobody budgets for

3 counted trials were invalidated by a repair to the family they measured. They
are preserved and they do not count, because the task they were run against no longer exists.

That is not waste in the ordinary sense — the repair came FROM those trials, which found a rule
attribution the spec had left ambiguous — but it is real spend that a plan pricing only successful
runs would omit. **A benchmark programme should expect to pay for each family's trials more than
once**, because the first campaign is often what tells you the family is not yet fair.

### Unrun slots are a budget line, not an absence

4 of 16 declared slots have not run, almost all of them because no runner
for that model family is configured here. They are costed in the plans and visible in every
report. A campaign that quietly dropped them would show a complete-looking result over one lab's
model — which is the single most common way a benchmark overstates what it measured.

## Spend by provider, measured

Every row read from the trial directories on disk. `superseded` runs were counted once and are
not counted now: the family they measured was repaired.

| provider | counted | of those failed | refused | infra | superseded | model-minutes |
|---|---:|---:|---:|---:|---:|---:|
| `anthropic` | 14 | 7 | 0 | 0 | 3 | 122 |
| `google` | 0 | 0 | 0 | 1 | 0 | 0 |
| `openai` | 6 | 4 | 0 | 1 | 0 | 47 |

| | |
|---|---:|
| runs attempted | 25 |
| counted | 20 |
| **produced no usable evidence** | **5** (20%) |
| at $3.50 per run, spend on runs that produced nothing | $17.50 |
| **cost per counted FAILURE** | $7.95 |

**Cost per counted failure is the number to plan against.** A counted solve tells you the family
is solvable, which the reference already told you. A counted failure is the only kind of trial
that moves a family toward shipping, and at the observed rates it costs several times what a
single run does.

### The three kinds of waste, which are not the same

| kind | count | can it be engineered away? |
|---|---:|---|
| provider refusal | 0 | no — it is a property of the provider, and re-running until it complies would fabricate a sample |
| infrastructure / auth | 2 | partly — an account-tier error is fixable by paying; a harness bug is fixable by fixing it |
| superseded by repair | 3 | no, and it should not be. These runs found the defect that invalidated them |

Priced into the plan, 5 wasted runs against 3 matrices per family is
a real multiplier on trial cost — and still a rounding error beside labour, which is the finding
the whole budget model exists to make.

## Pipeline conversion costs
This is the cost model for the exact live-DOM phase: turning a mutant-measured descendant into
a trial-ready family, then turning trial-ready into real-agent difficulty evidence. Rows marked
`estimated` are planning figures; rows marked `measured` come from checked-in campaigns or trial
directories.
| question | cost at current inputs | label | what is included |
|---|---:|---|---|
| mutant-measured -> trial-ready | $2,790 (23.3 h) | estimated | fairness SPEC, challenge package, leak tests, route, campaign plan |
| trial-ready -> difficulty-evidenced | $249.33 + provider availability | estimated | one counted provider run, grading, reconcile, report update |
| spec ambiguity waste already observed | $747.98 | measured trials + estimated repair | stale/superseded trials plus repair time |
| checker-required package-ready draft | $1,890 (15.7 h) | estimated | checker contract, held-out checker mutant plan, draft package |
Trial-ready is not SHIP. Trial-ready means the package builds, the leak checker passes, the hash
is pinned and the router can grade an artifact. Difficulty-evidenced means at least one counted
real agent trial exists under that hash. SHIP still requires the family not to be already solved
and all blocking gates to pass.
Provider unavailability is visible as 4 not-run slot(s) out of 16; those slots do not become failures or passes.
The current observed pipeline also carries a 17% standard-attempt waste rate from historical trials.
Under the current observed pipeline, $100,000 buys 7 shipped family line(s), about 168 generated instances and 21 independent axes. It does not buy 168 independent tasks; the axis meter is the guard against that phrasing.
## What this model does not include

- **Maintenance.** Families decay as models improve; nothing here prices re-hardening.
- **The first family is more expensive than the tenth**, and the model uses one flat rate.
- **Axis counts do not simply add.** Two families may share an axis; the total is an upper bound
  until a combined matrix is measured.
- **Instances within a family are heavily correlated** — that is exactly what the axis meter
  measures, and why shipped-task count is the wrong headline.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
