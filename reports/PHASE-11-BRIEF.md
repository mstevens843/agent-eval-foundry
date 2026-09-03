# PHASE 11 — CAN IT DISCOVER, OR ONLY SCREEN?

Repo: `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`
Source repo: `/Users/devlegacy/Desktop/projects/klavis-terminal-bench-task`

Read `docs/INHERITED-EVIDENCE.md`, `docs/DEFECT-TAXONOMY.md` (note the new **B6** and **screen 9**),
`reports/PHASE-9-DESCENDANT.md`, `data/phase-10-status.json`, `data/phase-10-trials.json`, and
`data/phase-10-lane-c.json`. Phase 10 did not produce a `reports/PHASE-10-MEASURED.md`; Phase 11 must
audit the structured data and preserved trial artifacts instead of assuming that missing report exists.

---

## WHERE THIS STANDS

Ten phases produced a screening instrument that works and a task that was built through it.

| | |
|---|---|
| the screens | nine, cost-ordered, five before any code exists. Killed 9 of 9 built families in seconds; killed a screened candidate at gate 1 for 3 model reads; caught a 0.0000%-activation structure **before** shipping |
| the descendant | controlling parameter found by fuzzing (`n_workers`, hard threshold, single worker fires it 0.0% across 24 runs); amplified 3-of-24 → **105-of-108** separation; axis isolated at **18-of-18** fatal, reference **0-of-18** |
| the rig gate | built after the measurement apparatus nearly reported a fabricated result. Controls, degeneracy flagging, shape assertion. Recorded as taxonomy class **B6** |
| the sixth element | *the divergent effect must land behind a boundary the subject provably cannot cross.* Now a hard screen. All five generated candidates fail it at `no-boundary`; the survivor passes on an OS-enforced privilege boundary |

**And one thing that is not resolved, which is the reason this phase exists.**

> **Generation is 0-for-5. Finding is 1-for-1.**

Five candidates invented from the template were overturned by the first independent readers to see
them, each for the same reason. The one survivor was not invented — it was found by reading an
existing task. A search procedure was written in Phase 10 and **has not been run.**

Until it is, the defensible claim is: **this repository can screen reliably and has not shown it can
discover.** That is still a real tool. It is a narrower one than the name implies, and the honest
version of the final report has to say which it is.

---

## GROUND RULES

- Pre-register every prediction to disk before running.
- Nobody labels their own trials; two labellers from different provider families.
- **Every rig that produces a pass/fail matrix runs its B1 controls in the same invocation.** New this
  phase and non-negotiable: it is the gate that would have caught the Phase 9 near-miss.
- `difficulty-evidenced` counts only `capability`.
- Net lines: no target. Say what happened and why.

---

## LANE A — RUN THE SEARCH (the phase's purpose)

`data/phase-10-lane-c.json` holds the procedure. Its ordering is the whole point and it is the exact
inversion of what failed: **the boundary is found first and constrains everything after it.**
Generation ran it backwards — invented a mechanism, then looked for a boundary to justify it, and the
boundary was always imaginary.

**A1. Run it against three real systems.** Not invented ones. Candidates: a database's WAL/replication
boundary, a container runtime's namespace boundary, a package manager's lockfile-versus-resolver
boundary, a build cache, a message broker's ack protocol, a CI system's artifact store. Pick three
where you can *read the actual source or specification* — the boundary must be verifiable, not
assumed.

**A2. For each, work the procedure in order** and record where it dies. Most will die at step 1 or 2,
and **that is the measurement**: how many real systems have to be examined to find one candidate is
the discovery cost, and nobody has that number.

**A3. Independent readers on anything that survives**, same protocol that killed five of five. A
candidate the author likes is worth nothing until a reader who did not write it tries to break it.

**A4. Registered prediction, before running:** state how many of three you expect to yield a candidate
that survives reading. Be specific and be willing to be wrong — the last two phases' predictions were
both falsified and both were more useful than the ones that held.

**Kill signal 1: if searching three real systems yields zero candidates that survive independent
reading, the honest conclusion is that this foundry can screen but cannot discover.** Write that as
the headline, not as a caveat. It is a real finding about method and it retires the generative pool.

---

## LANE B — FINISH THE MEASUREMENT

**B1. Complete the parent matrix.** Phase 10 started it. Twelve clean zero-solve trials take the
outbox from p ≤ 0.393 to **p ≤ 0.221**, which is what a p ≤ 0.30 claim needs, and its value does not
depend on anything else in this phase.

**B2. The descendant, twelve trials, six per lab**, `captureLevel: "full"`, container isolation,
recorded cost.

**B3. Score against the registrations already on disk**, not against what happened:
- **≥ 4 of 6 self-check-green** (parent baseline was 3 of 6).
- **Failures concentrated on the recompute checks**, not spread. Broad failure across unrelated checks
  means the suite is catching something other than what it isolates.

**B4. Root-cause every counted trial** under the blind protocol.

**Kill signal 2: if the descendant's p̂ interval includes 0.80**, amplification produced discrimination
against *mutants* without producing difficulty against *agents*. That distinction is exactly what the
mutant-axis/agent-axis split exists to detect and this is the case it was built for.

---

## LANE C — THE ECONOMICS, WITH THE FIRST REAL TRIAL SPEND

Six phases overdue. Every input now exists or is measurable.

**C1. Guard the build-hours figure.** `descendantBuildHours = 0.18` with the caveat attached: spec,
harness, verifier, reference engine and cheat oracles all existed. **It is not `hoursPerFamily`.**
Leave that a labelled estimate at 55–120 until a from-scratch family is timed.

**C2. Fix the rest:** `axesPerFamily` against measured values, `instancesPerFamily` per family noting
how many separate nothing, the dead `postBuildKillRate`, the `$3.50` literal against A2's measured
$120.20 counted / $152.81 including losses, and Lane B's spend — **the first native measured trial
cost in this repository.**

**C3. Price the screens, which are now unusually well evidenced:** a forward pass killed at gate 1 for
3 model reads; a full spec probe is ~8; the mechanical screens kill in seconds; five of five generated
candidates died to a reader pass; and Lane A will supply *the discovery cost per surviving candidate*,
which is the number the whole thesis has been missing.

**C4. Model expected builds per shipped task at each bar** and state the screening argument as a
measurement: *without screening you build N families at $X to find one worth trialling; with screening
you spend K model reads and Y searches to reach the same place.*

---

## LANE D — THE DECISION, AND THE WRITE-UP

The write-up has been deferred since Phase 4 and the material is now complete either way Lane A goes.
Write it with Lane A's result in it.

The spine, unchanged: problem → my own artifacts → the instrument → the arithmetic → the interior →
the build → **what searching found** → the limits.

**And make the recommendation explicit**, because ten phases of evidence now support one:

- If Lane A finds candidates: the foundry discovers and screens, and the plan is *search, screen,
  build descendants of what survives.*
- If Lane A finds nothing: **the foundry is a screening instrument, and the honest $100k answer is to
  buy screening rather than production.** A tool that reliably tells you which tasks not to build,
  for 3–8 model reads against an 18–120 hour build, is worth having and worth saying plainly.

Section 7 keeps its lead and now has ten instances:

> The most useful output has consistently been the corrections, not the production. Each was found by
> something other than me agreeing with myself.

Phase 9 and 10 supply the two best: a near-fabricated result caught by disbelief rather than a gate,
and a candidate-generation record of zero for five where every death had the same cause.

---

## PRE-REGISTERED KILL SIGNALS

1. **Search yields zero survivors across three real systems** → the foundry screens but does not
   discover. Headline, not caveat.
2. **Descendant p̂ interval includes 0.80** → mutant discrimination without agent difficulty.
3. **Self-check-green below 3 of 6** → isolation diluted the mechanism.
4. **Failures spread rather than concentrated** → the suite catches something other than its axis.
5. **A B1 control inverts on any rig** → that run is void and anything built on it is restated. That
   is the gate working, and it applies retroactively to Phase 9's numbers if it fires there.

---

## DELIVERABLE

`reports/PHASE-11-DISCOVERY.md`:

1. **Search results**, system by system, with where each died and the cost per surviving candidate.
2. **p̂ and interval** for parent and descendant, both bars derived.
3. **Self-check coverage and failure distribution** against the registrations.
4. **The economics**, every input labelled measured or estimated.
5. **The recommendation**, stated plainly.
6. **The write-up**, standalone.

---

## WHAT SUCCESS LOOKS LIKE

Success is **an answered question**, not a found candidate:

> Three real systems were searched with a procedure written before any of them was opened. N produced
> a candidate; M survived independent reading. The discovery cost is K reads per surviving candidate,
> against an 18–120 hour build. The parent bounds at p ≤ 0.221 and the descendant at p̂ = X. On this
> evidence the foundry can / cannot discover, and here is what I would spend $100k on.

Zero survivors is a complete answer and a publishable one. The failure mode this phase must avoid is
not "search found nothing" — it is searching badly, liking the result, and not having a reader check it.
