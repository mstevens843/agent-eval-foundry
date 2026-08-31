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

> **Where this sits.** The memo is the argument; the repository around it is the system that acts on
> it. The mechanism registry, mutant bank, candidate ledger, task-family shapes, scaffold generator,
> ship gate and budget planner are all runnable — `node dist/cli.js check` validates them and
> `node dist/cli.js all` regenerates every report cited below. See [`README.md`](./README.md) for the
> architecture. Everything in section 5 that used to be a recommendation is now a command.

The foundry now separates three claims: a reference can solve it, a clean public package can be
handed to a human, and an independent human has actually solved it. Those are different evidence
levels and the reports do not merge them. The current human layer is deterministic: it audits
public challenge packages, preserves contaminated walkthroughs as non-counting records, and leaves
independent human solves pending until a clean-room reviewer actually submits one.

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

### The same category killed a family I built to test this argument

Since writing the above I built a second family end to end — prompt-injection containment, 128
measured scenarios, nine known-bad implementations, a verifier that catches all nine, four measured
axes — and then ran three real Claude trials against it through this repository's own trial layer.
Each produced a genuine 231–318 line implementation citing all eight policy rule codes and tracking
argument provenance. **All three passed 128 of 128.**

That is `already-solved`, the same cause of death as four of the nine gated mechanisms above,
arriving for a family whose verifier evidence was as good as I could make it. Two things follow, and
the second is the one I would want argued with:

1. **The kill rate is not a story about my earlier taste.** The category that dominates the source
   project's kill log dominated the next family too, and it was invisible until a model attempted it.
   Verifier quality and difficulty are independent, and no amount of the first substitutes for the
   second.
2. **The gate has to be able to kill the author's own work, and it has to be blocking.** The family
   was one advisory gate away from SHIP before the trials ran. `not-already-solved` is now blocking,
   was added *after* the evidence arrived, and its stated rationale is that this family would
   otherwise have shipped on evidence that it is easy. A gate table that has never rejected the
   person maintaining it is a formality, and `reports/ship-gate-report.md` prints which gates have
   actually rejected something for exactly that reason.

The trials cost minutes and single-digit dollars. The family cost roughly 70 hours. That ratio — the
kill is cheap, the build is not — is the whole argument for gating before building, made against my
own work rather than someone else's.

### And then the kill produced the next family

A kill is only worth its cost if something is built on it. So the reason was typed rather than
narrated — `already_solved`, derived from the trial records, disposition `harden` — and fed to a
table of fifteen evolution operators, each of which states what it changes, what it must hold fixed,
and what new way it could be unfair. Four variants came out, each with a pre-registered kill risk.

The lowest-risk one is now built and measured. Its argument is specific: all three passing
submissions tracked argument provenance correctly *within a request*, where it costs nothing because
the value never leaves memory, and none of them was ever asked to write it down and read it back. So
the descendant separates the injection from the tool call by a session boundary. By the time the call
arrives, the originating content is gone; the only thing that crossed is what the implementation
chose to store; and an implementation that stored the value without its origin must now either refuse
work the policy permits or permit work it refuses. There is no third option.

**That is what I would want the thousand-task program to look like.** Not a backlog of task ideas —
a loop where each dead family names the crutch its subjects were leaning on, and the next family
removes it. The engine is deterministic and rule-based rather than a model call, for the same reason
the rest of this repository is: a generator whose output cannot be checked is the failure mode in
every row of my kill log.

### The descendant was then trialed, and the operator held

Three counted Claude trials against the evolved family, same harness and same isolation as the
parent's. **One of the three failed, on 32 scenarios.** Every one of those failures sits at
`sessionsBetween` 1 or 3, and not one at 0 — which is the pattern the campaign plan pre-registered as
its confirm signal before anything ran. The parent's three trials had failed nothing at all.

So the operator did what it claimed: the same implementation is correct within a session and wrong
across one, and the difficulty came from the persistence boundary rather than from the family being
bigger.

**The campaign found a defect before it found difficulty, which is the part I would lead with.** One
trial cited rule `M3` on 47 scenarios and the verifier demanded `M5`. Reading the published spec, the
model was right: the rules were listed in evaluation order and M3 explicitly covered content read in
an earlier session. The family was ambiguous and had been marking a correct answer wrong. Repairing
the spec changed the challenge package, which changed its content hash, which automatically stopped
all three counted trials from counting — they measured a task that no longer exists. They are
preserved, the campaign was re-run, and the numbers above are from the repaired version.

That sequence is the argument for the whole apparatus. A benchmark programme without a challenge
hash would have kept the old trials, and a benchmark programme without real trials would never have
found the ambiguity at all.

### Then a second lab ran it, and failed the same 32 scenarios

The obvious objection to everything above was that every counted trial was Claude. A failure mode
one lab's model exhibits is a fact about that model until a second lab's model exhibits it too. So
the campaign was run again on GPT-5.6 Sol through the same router, the same challenge package, and
the same content hash.

**It failed the identical 32 scenarios.** Not 32 scenarios — the same 32, the same set of ids, the
same two checks, the same split across the persistence boundary and zero at `sessionsBetween: 0`.
Two independently trained models, from two labs, losing the same property on the same inputs. That
is the strongest form of the transfer claim the data can carry, and it is the one the memo's
headline was missing.

It also found a **second, unrelated failure mode**: another Codex run failed 13 scenarios on a
different check, disjoint from the first 32, concentrated on one attack at `sessionsBetween: 0`
only. The diagnosis module reads it as a capability finding that does *not* match the pre-registered
hypothesis, so it is recorded as a new finding rather than folded into the confirmed one.

The picture across the current routable families, all counted trials run through the same harness:

| family | anthropic | openai | reading |
|---|---|---|---|
| `prompt-injection-containment` | 5 counted, 0 failed | 1 counted, 0 failed | **already-solved, confirmed across two labs** |
| `prompt-injection-memory-poisoning` | 5 counted, 4 failed | 3 counted, 2 failed | **generalises** — one cross-lab pair identical, one disjoint |
| `ui-action-record-replay` | 4 counted, 4 failed | 1 counted, 1 failed | **difficulty-evidenced** — but all five runs nest |
| `ui-replay-live-dom` | import-only this phase | 1 counted, 1 failed | **difficulty-evidenced** for one OpenAI subject; cross-lab not measured |

Three things I would flag rather than bury. **The already-solved kill got stronger, not weaker**: a
second lab also passed all 128, so the containment family is easy for reasons that are not specific
to Claude. **The UI family's three trials form a chain** — 33 ⊂ 46 ⊂ 90 scenarios — which in this
repository's own terms is one axis observed at three sensitivities, not three failure modes; the
family separates subjects and has not yet been shown to measure more than one thing, and
`reports/provider-variance-report.md` says so under its own headline. And **Gemini never ran**: the
CLI is installed and the account is not entitled to it, so the slot is an `infrastructure_error`,
never a zero. The live-DOM descendant reopens the shared-bank work: only GPT-5.6 Sol has attempted
that package hash so far. Prepared bundles for an external runner are checked in under `bundles/`
with the challenge hash pinned, so a result someone else produces either measures this exact task or
is refused on import.

### And then four subjects across two labs produced one UI axis, on purpose

The obvious next move after a cross-lab confirmation is more models. So: four subjects — Opus 5,
Sonnet 5, Haiku 4.5 and GPT-5.6 Sol — against the first three built families.

**On the UI family all five counted trials failed, and every pair of failure sets nests.** 33 ⊂ 46 ⊂
62 ⊂ 90 of 324 scenarios, with the two mid-sized runs — different Anthropic models — failing the
*identical* 62. Five runs, four subjects, two labs, five different numbers, and under this
repository's own axis meter a chain has width one. The family separates implementations perfectly
and has never been shown to measure more than one thing.

That is the most useful negative result the project has produced, because of what follows from it:
**adding subjects cannot fix it.** A chain stays a chain however many implementations are laid along
it. The lever is scenarios, and only scenarios of one shape — ones where the strategy that wins
today loses. Every current scenario rewards the same disposition (bail out early when a target does
not resolve), so a stricter replayer dominates a looser one everywhere and the catch sets are
*forced* into a total order. Nesting was not bad luck; it is what a family with no trade-off in it
must produce.

The same measurement says the memory-poisoning family is fine: one of its pairs is genuinely
incomparable — Sonnet fails 42, Codex fails 45, and only 32 are shared — so it separates in more
than one direction.

**The old three-family cross-family number is available and it is small.** Four subjects attempted
containment, memory-poisoning and parent UI replay, past the threshold of three, so the width can be
computed there: **3 axes**, against a null model of 6.0 and a ceiling of 179. The axes add — no
instance in one family is failed by the same subject set as an instance in another — and the corpus is
twice as compressible as chance, so the structure is real. Three of the four subjects are from one
lab, which is the caveat that belongs in the same sentence as the number.

After live-DOM, the all-family bank is deliberately **partial** again. GPT-5.6 Sol has attempted the
descendant; the Anthropic subjects have not, because Claude is import-only in this phase. That does
not weaken the live-DOM trial, but it does mean a portfolio-wide axis count over the current family
set is refused until at least three subjects share the same package hashes.

**Two gates, not one.** The threshold on shared subjects asks whether co-failure is *observable*; the
null model asks whether the observed structure *beats noise*. I collapsed them at first and read the
null backwards — the null is an upper bound, so a real corpus far below it is the good case — and
briefly flagged the project's strongest cross-family evidence as chance-level. Both gates are now
computed and printed side by side, which is the only reason that error is recoverable rather than
permanent.

### The chain has a fix, and the fix is a family

A chain is a fact about the family, so the fix has to be structural. `ui-replay-live-dom` is the
descendant: a mutable tree where acting reveals regions, arms controls and replaces the form, with a
settle budget, conflicting anchors, and `aria-busy` signals that are allowed to lie.

The realism is not the point. The point is that the family contains a **trade-off**, so that no single
disposition wins everywhere. Two opposed implementations are graded alongside the mutant bank rather
than argued about: `strict-bailer`, which refuses anything it cannot resolve on first observation, and
`patient-waiter`, which waits out every unsettled region. They fail 148 and 46 scenarios, share 18,
and **neither set contains the other**. That is the structure the parent could not express, and the
only structure that lifts an antichain width above 1.

The next phase hardened that into a categorical anchor axis rather than only a strict/patient
trade-off. The measured set is now 864 scenarios from a 3,456-point declared space, with 22 mutants
plus two poles, 17 verifier checks, a clean reference and **19 independent axes** over the mutant
bank. The three address-loyal strategies — testid, semantic anchor and structural path — are
pairwise incomparable, so the fix no longer reduces to "wait longer" or "be stricter."

It also has the missing agent-facing surface now: a leak-checked 9-file challenge package with a
precise fairness spec, hash `18c3f5afc5973604205cd7df23ce4cad`, and a campaign plan that treats
Anthropic as import-only and Gemini as entitlement-blocked. One real Codex/OpenAI trial counted:
`live-dom-2026-08-o2`, 864 scenarios graded, 219 failed on `replay_completes` and
`precondition_observed`. That is real-agent difficulty evidence for one OpenAI subject. It is not a
cross-lab generalisation claim, and it is still dom-like rather than browser-backed.

A descendant rather than an edit, for the reason the whole apparatus exists: changing the parent
would change its hash, and the five trials that produced this finding would be the first casualties
of acting on it.

### One model shipped its checker

A smaller finding that changed what I think the next family should ask for. The task requests one
file, `submission/subject.mjs`, and does not forbid a second. Fifteen of twenty-two transcripts
describe building a local harness, running the published examples through it, writing synthetic
scenarios — and then shipping one file. **Two submissions shipped the checker anyway, and both are
`claude-sonnet-5`**: a real transition table in one, a reimplemented app facade in the other. No
other subject did this on any family.

The first version of that analysis grepped submissions for `assert|invariant|sanity`, found nothing,
and concluded that models do not verify themselves. It was measuring our own submission format. It
also credited `auditAlreadyCompleted` — ordinary implementation logic in a family whose *domain* is
auditing — as a self-check, which is why the source patterns are now narrow enough to be boring and a
shipped file that imports the graded artifact is detected structurally instead.

That proposal is now implemented as `checker-required-memory-poisoning`: the visible package
requires `subject.mjs` **and** `checker.mjs`, and the hidden verifier grades the implementation and
the checker separately. The checker is run against reference traces and held-out bad traces covering
false success, missing audit history, liveness stalls, duplicate effects, late cancellation,
provenance loss, status-only checking, forged receipts, no-checker/stub-checker cases and
nondeterminism. The measured sweep is 792 scenarios from a 2,376-point declared space, 20/20
known-bad submissions are caught by intended checks, and the first counted Codex/OpenAI trial
(`checker-required-2026-08-o1`) failed 614/792 under hash
`448f2f816c51030cc97a374816226168`. That is difficulty evidence for one OpenAI subject only, not a
cross-lab breadth claim.

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

**Stop counting tasks. Count families.** Every step below is implemented in this repository, and the
numbers come from its generated reports rather than from this document.

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
3. **Gate every family on axis count and on trial evidence, not on check count** — the tool in this
   repository, which I did not have when I built the outbox task. `node dist/cli.js ship` runs the
   gate: 28 gates per family, 14 blocking, three human-solvability gates advisory and four
   adversarial verifier-integrity gates advisory, with verdict a pure function of the blocking gates.
   Of the fifteen
   families declared here, five reach SHIP, one is NOT-READY because real agents from two labs
   solved it, and the other nine are NOT-READY because nothing has attempted them — a family must
   not ship on an estimate, and `difficulty-evidenced` became blocking once every built family was
   routable and "nobody has tried it" stopped being a fact about the tooling.
4. **Make the kill produce the next candidate.** A typed reason with cited evidence, a disposition,
   and an operator table that turns "this family was too easy" into a specific structural change with
   a pre-registered kill risk. The descendant is built, trialed, and the operator is confirmed.
5. **Pre-register every campaign and hash every challenge.** The plan says what would kill the family
   before it runs; the hash says which task each preserved trial actually measured. Both earned their
   place on the first campaign: the plan's confirm signal is what makes the result a finding rather
   than a story, and the hash is what invalidated three trials the moment the family was repaired.
   The same discipline now applies to verifier-integrity: attack packets declare the threat model
   and access boundary before an attacker sees the package. Cheat resistance is not the same claim as
   no bypass found. Cheat resistance is the design requirement; adversarial audit is the attempted
   exploit record.
6. **Spend frontier budget only on what survives 1–5.** `node dist/cli.js budget --total 100000
   --rate 120` prices it, and `budget-check.ts` refuses a plan that omits labour — the exact fake
   this section argues against.

**And here is the number my own argument forces, which I would rather state than leave implicit.**
The planner in this repository, run at $120/h against the measured screening and trial rates, returns
**7 families / 168 generated instances / ~21 independent axes** for $100k, with labour at 99% of
spend — down from ten families once the model prices the families that die AFTER being built, which
one of the two built here did. Priced as hand-authored tasks instead — one task per family, one axis per task — the same
money buys **10 tasks**. Both rows are in `reports/budget-plan.md`, and the gap between them is the
answer to the question. The thousand-task program is a multi-year, multi-
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

- **n = 3 corpora, and only one of them independent.** Two are mine end to end; the SWE-bench example
  is independent but coarse (one bit per instance, single unreplicated runs).
- **Most declared families are still unbuilt**, so their axis counts are pre-registrations
  rather than measurements, and the report labels every one of them.
- **The already-solved finding now rests on six trials across four subjects and two labs**, all of
  which passed all 128 scenarios — including Haiku 4.5, the smallest model available here. That is a
  much stronger kill than the original one-lab version and still not a proof; the right response is
  to harden the family, which is what the gate forces, rather than to average it away with more runs
  of the same kind.
- **Two labs is not many labs, and three of the four shared subjects are one lab's.** The old
  three-family combined width of 3 is therefore partly a statement about Anthropic's model family.
  The all-family bank is partial again after live-DOM because only GPT-5.6 Sol has attempted the
  descendant. The third provider in the registry is installed and its account is not entitled, so its
  slot is an infrastructure failure and counts for nothing.
- **A chain is a fact about the family, not about the models.** The UI result — four subjects, one
  axis — is the strongest evidence in this document that subject count and measurement count are
  different quantities. It is also the clearest case for spending the next dollar on scenarios rather
  than on model time.
- **Half the recorded kills have no cost attached**, so "screening is nearly free" rests on a floor
  rather than a total. `reports/candidate-ledger.md` states that in the same table as the claim.
- **The bank bounds the answer.** Ten subjects containing roughly two defect families cannot exhibit
  many axes however good the suite is. The honest internal headline is "three *against this bank*."
  The SWE-bench run is the experiment that addresses this, and it is why the null model exists: at
  134 subjects the constraint runs the other way, and the width has to be shown to beat chance rather
  than assumed to.
- **Verifier integrity is prepared, not proven.** Five package-backed families now have
  adversarial-ready attack packets and the live-DOM packet has one preserved Codex/OpenAI adversarial
  attempt, but that attempt was a provider refusal and does not count. Durable Outbox has only an
  imported historical `/cheat` summary here, not the native packet, transcript and current package
  hash needed for a counted no-bypass audit.
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
