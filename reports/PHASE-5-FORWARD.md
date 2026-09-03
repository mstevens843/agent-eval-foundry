# Phase 5 — Build One Forward

**Hand-authored. Not generated.** Dated 2026-09-02.

Phase 4 settled A2 and left one question: is there anything real underneath the specification defect?
This phase answers it, and then builds a family forward through the instrument rather than auditing
one after the fact — which nothing in this repository has ever done.

---

## 0. Lane 0 — the infrastructure gate

The verification suite has now run, for the first time in four phases, with everything green:

| gate | result |
|---|---|
| `tsc --noEmit` | clean |
| `biome check src test` | clean, 263 files |
| `vitest run` | **988 passing**, 45 files |
| `pnpm build` | ok |
| `node dist/cli.js check` | ok |
| `pnpm verify` | **all reports reproducible** |
| **clean-checkout divergence** | **0** |

### The clone-fidelity bug, generalised

Twenty-eight directories existed only because somebody had run a command. `bundles/*/exploit/` and
`submitted-bypass/` are empty **on purpose** — the attacker is handed empty directories to write into,
and the isolation check reads them — and git cannot store an empty directory. So every package-backed
family read `adversarial-ready` here and `audit-pending` on CI, the generated reports differed between
the two, and `pnpm verify` passed locally every single time.

That is the same defect class as the three specification withdrawals: **state that is true on one
machine, invisible precisely because it is true there.** The instance is fixed with 28 `.gitkeep`
files, each explaining why its directory matters.

The general question is the one worth asking, and `scripts/clean-checkout-check.mjs` now asks it:

> From a checkout containing only what git tracks, does every gate reach the same verdict?

It renders every gate report from `git archive HEAD` and diffs. **Kill signal 5 does not fire: zero
gate reports diverge.** 110 reports rendered, 6 gate reports compared, no verdict depends on this
machine.

**The check was vacuous when first written, and the way it failed is worth recording.** `src/cli.ts`
takes its root from `process.cwd()`. An early version ran the checkout's CLI without setting `cwd`,
so it read the *real* repository — including exactly the untracked state it existed to find — and
reported zero divergence no matter what was deleted. It was only caught by deliberately removing a
directory and observing that the check still passed. The hazard is now documented at the call site,
and the check is verified to fire: removing one `exploit/` directory from the archive flips
`checker-required-memory-poisoning` from `adversarial-ready` to `audit-pending` and produces 3 and 4
diverging lines in the two reports that carry it.

### A third instance of the same class, found in the container runner

The container isolation tests were failing on CI and passing here, and the cause is the same shape as
the `.gitkeep` bug one level down in the stack.

`mkdtempSync` creates a staging directory at **0700**, owned by whoever ran the process. The container
is deliberately forced to `--user=1000:1000` so nothing runs as root, and on a Linux host that uid is
almost never the one that staged the files — GitHub's runners are uid 1001. The container therefore
cannot traverse into its own bind mount, and node reports the mounted script as `MODULE_NOT_FOUND`:
**a permission error wearing a missing-file error's clothes.**

It cannot reproduce on macOS. Docker Desktop shares the host filesystem through a VM layer that
remaps ownership, so every uid inside the container can read the mount whatever its mode.

The fix is `chmod 0755` on the staging directory and `0644` on the two files staged into it — under a
read-only mount, in a per-run temp directory, holding a host script and a subject module, with
nothing secret staged and nothing writable back. It is in `src/trials/runners.ts`, which is hashed
into every family's verifier hash, so the seven campaign JSONs were regenerated; Phase 4 established
that regenerating them changes no evidence claim, and it did not here either.

The test guard was wrong too, and separately. It checked that a *daemon answered* — which GitHub's
runners do — rather than that a *container could start*. So the tests ran, failed on the mount, and
their isolation assertions were never reached. The guard now starts a trivial container first, skips
loudly when it cannot, and `FOUNDRY_REQUIRE_CONTAINER=1` turns that skip into a failure for a
pipeline that believes it is checking isolation. Both paths were verified with a stub `docker` on
`PATH`: 3 skipped and 5 still running without one, hard failure with the flag set.

**Three instances of one class this phase**: a directory git cannot store, a file mode the host
happens to grant, and a guard that tested the wrong precondition. All three were green locally and
red — or silently unchecked — everywhere else.

---

## 1. Lane A — the residue verdict

After the one-sentence repair, 5 cells fail across 3 of 6 subjects. This section establishes what
they are.

### The blind labelling: 0 of 5 agreement, and that is the answer

Two labellers, arm identity withheld, from different provider families:

| | R1 | R2 | R3 | R4 | R5 |
|---|---|---|---|---|---|
| labeller 1 (Anthropic, spec-first) | `spec-underspecified` | `spec-underspecified` | `spec-underspecified` | `spec-underspecified` | `spec-underspecified` |
| labeller 2 (**OpenAI, cross-family**) | `capability` | `capability` | `capability` | `capability` | `capability` |

**Cross-family agreement: 0 / 5 = 0.000.** Both labellers were `high` confidence on every case. Both
quoted the same sentence, `SEMANTICS.md:140-141`, and reached opposite verdicts.

Under this project's own committed boundary rule, that disagreement is not a tie to be broken. It is
the answer:

> A graded requirement is `capability` if and only if the visible text ADJUDICATES between the
> readings that lead to different answers.

Two competent readers, each citing visible normative text, reaching opposite answers, is the
definition of text that does not adjudicate.

### And the underlying fact settles it independently

I did not take either labeller's word. The dispute is empirical and it resolves:

- `SEMANTICS.md:129-130` scopes the settlement channel: *"a receipt exists for every call whose
  outcome was `UNKNOWN`"* — the outcome the **tool returned**, not a call interrupted by a crash.
- `tool_server.py` mints a receipt only inside the planned-`unknowns` branch.
- **`crash-after-tool.json` and `hostile-mix.json` declare `unknowns: null`.** On exactly the two
  schedules carrying all nine uncertainty failures, **no receipt is ever minted.**
- `SEMANTICS.md:140-141` tells the engine that which side of the boundary it is on *"is not something
  the engine can determine locally, and it is not permitted to guess."*

So the visible text tells the engine: do not guess, wait for the receipt. And on these schedules the
receipt never comes. The strategy that passes is a presumption — and the string `presumed` appears
exactly once in the whole task, at `solution/files/db.py:123`, **in the reference solution, which the
subject cannot read.** It appears nowhere under `environment/` or in `instruction.md`.

The cross-family labeller's reading is defensible on the document: `SEMANTICS.md:154-156` does say
*"`after_tool` is the important one: the side effect has happened but nothing local records it yet."*
That is a fact told to the READER. It is not available to the ENGINE, which at recovery sees a
durable intent and no result, and cannot distinguish a crash before the call from a crash after it —
which is precisely what `:140-141` says.

### The residue verdict — reversing what this section first said

An earlier draft of this section concluded that the residue was *not* another underspecification, on
the strength of the spec-only probe clearing the repaired arm. **That was wrong, and the way it was
wrong is worth more than the conclusion.**

> **The durable approval outbox has nothing capability-shaped left in it. Both of its axes are
> specification defects.** The first was removed by one sentence in A2. The second tells the engine
> not to guess, names a settlement channel, and then never fires that channel on the only two
> schedules where it matters.

The family is withdrawn in full. That is the fifth withdrawal, and the first found *after* a
controlled repair rather than before one.

### Three findings that outlive the family

**1. The probe cannot see this defect class.** It cleared the repaired arm — 1 finding, 16 cleared —
because it asks whether a rule is *stated*, and the rule *is* stated: the receipt is authoritative.
It cannot ask whether the stated mechanism is ever *reachable*. **"The specification names a channel
that never fires" is a measured false-negative class for this instrument**, and it is now the third
such class on record.

**2. Phase 4's calibration overstated the instrument, exactly where I said it might.** Cross-family
agreement was **0.967 on 61 constructed controls** and is **0.000 on the five real cases**. Phase 4
flagged the constructed set as a probable ceiling effect — only 2 of 22 negatives were one-sentence
deletions — and this is what that ceiling was hiding. **Kill signal 3 fires: below 0.7, the standard
is model-specific on the cases that matter.** The 0.967 does not generalise and should not be quoted
without this beside it.

**3. Kill signal 1 fires, and Lane B builds on the concept.** Control's four `executed_iff_called`
cells and treatment's two share one instance. The cells do not repeat across arms; the *mechanism*
repeats at p = 3.8 × 10⁻⁶. Lane B rebuilds the concept from scratch, which is what the signal directs
and now also what the evidence demands — the residue is not a foundation, it is a fifth defect.

---

## 2. Lane B — the forward build, killed at gate 1

**Kill signal 2 fired. The family was stopped at the spec-only probe, before one line of
implementation existed.**

### What was built and why

Not a new mechanism — the one the evidence pointed at: the dual obligation where refusing to resolve
uncertainty is exactly as wrong as resolving it incorrectly. And not the outbox again:
`payment-unknown-capture-receipt` was already a registered probe candidate in this repository, in a
different domain (external payments), so building it forward followed the pipeline's own
candidate → probe → family path rather than copying a family that had just been withdrawn.

The SPEC was written by someone who knew, in detail, all four defect classes that had withdrawn this
project's flagships — and wrote explicitly against them. It named its terminal states in the state
model. It enumerated the complete transition set and said "exactly these and no others". It stated
the ACKED lesson from line one.

### Gate 1: the spec-only probe

Four independent readers — one from a different model family — were given **the SPEC alone**. No
implementation, no reference, no tests; none existed. Each answered 15 questions designed to hit the
exact defect classes on record, and listed every ambiguity that would change a graded answer.

| | v1 | v2 (after one repair pass) |
|---|---:|---:|
| raw ambiguities pooled | **94** | **75** |
| defect clusters found by **all four** readers | **11** | **10** |
| questions with an unconfident answer | 10 of 15 | 4 of 15 |

**One full repair pass moved the cluster count from 11 to 10.**

### What it found in v1

Among the eleven, in a document written specifically to avoid them:

- **A fresh instance of the ACKED defect.** A `"timeout"` on a `PENDING` capture reaches `UNKNOWN`
  through an edge the "exactly these and no others" table does not contain. The complete transition
  set was incomplete.
- **A direct rule contradiction.** An accepted-but-unsettled capture: `PUC6` says `SUBMITTED`,
  `PUC5`'s unconditioned antecedent says `UNKNOWN`, the Decision Order ranks `PUC6` first, and Legal
  Outcomes never lists `SUBMITTED` as an ending. All four readers found it; none could resolve it.
- **A requirement the audit schema cannot express.** `PUC9` (rank 1) demands reporting a state the
  ledger supports; `PUC7` says terminal states have no outgoing edge; so a contradicted terminal
  state must be re-reported through a transition that is illegal to record.
- **"Before the clock stops" is a fact about the ledger or about the subject's observations**, and
  the subject cannot distinguish them.

### What survived v2, and it is worse than the count suggests

Ten clusters, and at least two of them were **introduced by the repair**:

- `"At most one submit call per capture"` in the facade section contradicts `PUC3`'s
  `"Exactly one submit call per capture"` — under which a capture cancelled before submit, receiving
  zero submits, violates the rule.
- `while-unknown` remained a live value in the `view.cancellations` interface and got its own
  paragraph of guidance, while the repaired knob table removed it from the declared space.

And two are fatal to the task as a measurement:

- **Nothing requires the subject to call `tick()`.** A subject that never ticks satisfies `PUC5` and
  `PUC6` by the letter for every capture, never violates `PUC4` because no record is ever visible,
  and passes. **The task is trivially defeated by doing nothing** — which is the `nop` baseline the
  starter-must-fail gate exists to catch, reached through the specification rather than the code.
- **The settlement record's object shape is never specified.** `settlements()` is the pivot of the
  entire task and the subject cannot read it without guessing field names.

### The verdict, and why it is the phase's result

> *If Lane B's family is flagged by its own spec-only probe more than twice after repair, stop
> building it. A SPEC that cannot be made unambiguous in two passes is telling you the mechanism is
> not cleanly specifiable, which is a finding about the mechanism.*

Ten is more than two. **The family is retired at gate 1.**

Cost: two probe passes, eight independent reads, roughly 380,000 tokens of model time. Minutes, and
dollars. Against a build the shape files in this repository estimate at **18 to 120 hours, mean
62.4**.

**No implementation was written. No reference, no verifier, no mutants, no starter, no trials. Zero
paid model runs.** The screen caught it first, which is the entire economic argument the previous
four phases were arguing for without ever demonstrating.

### The finding about the mechanism

The dual obligation under uncertainty has now failed specification **three times**:

1. The outbox's ACKED axis — a specification defect, proven by a controlled twelve-run experiment.
2. The outbox's uncertainty axis — a specification defect, found this phase (§1).
3. A fresh SPEC in a different domain, by an author who knew all four prior defect classes and wrote
   against them — 11 defects, then 10 after a full repair pass, with two more introduced by the
   repair itself.

That is not three unlucky documents. **It is evidence that "the agent must act correctly on an
external effect whose outcome it cannot observe" resists the kind of specification a benchmark needs
— because the grader must know the truth, the subject must not, and every sentence that gives the
subject a way to find out either leaks the answer or names a channel that does not fire.**

Kill signal 2 predicted this shape of finding in advance. It is worth more than the family would have
been.

---

## 3. What is demonstrated

**Families with capability evidence surviving a controlled experiment: zero.**

Not "few". Zero, and the number went *down* this phase. The durable approval outbox was the last
candidate and it is now withdrawn in full: its ACKED axis was a specification defect proven by a
twelve-run controlled experiment, and its uncertainty axis is a specification defect proven by a
blind labelling that split 0/5 and by the fact that the settlement channel the SPEC names never fires
on the only two schedules where it matters.

Measured axis counts for families with surviving capability evidence: **there are none to report.**

What the project has instead, stated as small as it deserves:

> An instrument that has now caught five specification defects in its author's own work, including
> two found *after* a controlled repair, and that killed a sixth family at the specification stage
> for the cost of eight model reads — before an implementation existed.

### The economic argument, finally demonstrated rather than asserted

This is what four phases were arguing for without ever showing:

| | cost |
|---|---|
| the spec-only probe that killed `payment-unknown-capture-receipt` | 2 passes, 8 independent reads, ~380k tokens — **minutes, and dollars** |
| the build it prevented | **18 to 120 hours**, mean 62.4, per this repository's own shape files |
| the trials it prevented | 6 runs/matrix × 3 matrices × 2 builds = **$371 at the measured $61.85/matrix** |

Nothing was built past the gate. That is asserted rather than described:
`test/spec-probe-forward.test.ts` fails if `src/families/payment-unknown-capture-receipt`,
`examples/families/payment-unknown-capture-receipt` or `trials/payment-unknown-capture-receipt` ever
appears.

### What the instrument still cannot do

Three measured false-negative classes now, the third found this phase:

1. Thresholds of 0 and 1 are ignored as structural.
2. Clearing is generous — a value mentioned anywhere visible clears the commitment.
3. **A specification that names a mechanism which never fires.** The probe cleared the repaired
   outbox arm because the rule *is* stated. It cannot ask whether the stated channel is reachable.

And one measured overstatement:

4. **Cross-family labeller agreement is 0.967 on constructed controls and 0.000 on the real cases.**
   Phase 4 flagged its control set as a probable ceiling effect. It was.

---

## 4. The repriced plan

`data/measured-trial-costs.json` now holds 30 recorded runs, and the budget model reads it.

| input | was | now | why |
|---|---|---|---|
| cost of one trial | `$3.50` literal under a "measured" heading | **$9.62**, mean of the 28 runs that produced a verdict | the plan was low by 2.7× on model spend |
| runs bought and lost | **not priced at all** | **6.7% of runs, 10.7% of spend** | runs that die tend to die late |
| cost of one matrix | `$48.66` constant | **$61.85** — 6 verdicts at $9.62, ÷ (1 − 0.0667) | one definition, shared by the budget and the lineage learner |
| deliverable tasks | `families × 24`, called "shipped tasks" | **1 per family** | the repo emits one package per family |
| independent axes | 3, "measured" | **2**, measured within a lab | |
| post-build kill rate | declared, read by nothing | derived into builds-per-shipped-family | |

**$100,000 buys 7 families, 7 deliverable tasks, ~168 graded cells and 14 measured axes** — at
**$12,937 per deliverable and $6,468 per axis**. Reaching 1,000 deliverables needs a further
**$12.8M**; reaching 1,000 graded cells needs **$443k**. The two differ by 24×, and earlier versions
of this plan printed the second beside a headline labelled in the first one's unit.

The loss rate is the line that had never been priced anywhere, and it is now an input with a
validator and a known-bad case.

**Still owed:** the deliverable exporter. `deliverableTasksPerFamily` remains 1 because nothing emits
more, so kill signal 4 is neither fired nor cleared — it is unanswered, and saying so is better than
answering it with an exporter written to make the number look right.

---

## 5. Net code delta — the rule was missed again, and by less

**Code rose by 272 lines. The rule says it must fall.** Stating that first.

| area | added | removed | net |
|---|---:|---:|---:|
| `src/` `test/` `scripts/` — **code** | 334 | 62 | **+272** |
| `data/` — preserved evidence | 2,247 | 0 | +2,247 |
| `reports/` — prose | 341 | 0 | +341 |
| **all** | 3,247 | 188 | +3,059 |

The code that went in is two gates and a budget input:

| | lines | what it is |
|---|---:|---|
| `scripts/clean-checkout-check.mjs` | 139 | renders every gate report from a tracked-files-only checkout and diffs. Found the class of bug that made CI red and local green. |
| `test/spec-probe-forward.test.ts` | 119 | pins the family that was killed at gate 1, including an assertion that nothing was built past it |
| `lostRunRate` and its validator | ~74 | the measured 6.7% loss rate, which no plan had ever priced |

Removed: nine genuinely unreferenced exports, deleted by hand with anchored edits after an automated
attempt in Phase 4 over-consumed adjacent code and had to be reverted. Two rule-code tables
(`KILL_RULE_CODES`, `CAMPAIGN_RULE_CODES`) were left alone because the rule-coverage test may reach
them indirectly and a line count is not worth guessing about that.

### Why the big deletion still did not happen

`src/foundry/probe-runner.ts` remains, at roughly 1,838 lines plus a 157-line renderer and a 328-line
test. Phase 5 strengthened the *argument* for retiring it — the spec-only probe has now demonstrably
killed a family, while the mechanism probe has returned `promote_to_task_shape` on every probe it has
ever run — and did not remove the *blocker*.

`assertPromotionsValid` requires each promotion's `sourceProbeId` to resolve to a **live** probe
result and the recorded verdict to match one produced by re-running the probe today. Deleting the
probe therefore means editing `data/promotions.json` and `data/lineages.json`, which are preserved
evidence.

Two phase rules conflict, and the evidence rule wins again. The right repair is to make a promotion
validate against the verdict **recorded at promotion time** plus a hash of the probe definition,
rather than against a re-run of code that has changed since — which is a better design on its own
terms, because a promotion is a historical decision and re-deriving it from today's code means a code
change silently invalidates a past one. That migration is the debt. It was not attempted at the end of
a long session against a tree that finally typechecks clean.

---

## 6. Clean-checkout divergence count

**Zero.** Six gate reports render identically from a checkout containing only what git tracks. The
check is `scripts/clean-checkout-check.mjs`, it runs in CI, and it is verified to fire — see §0.

---

## 7. Kill signals, against their pre-registration

| signal | fired? | what happened |
|---|---|---|
| 1 — residue cells differ between arms → build on the concept | **YES** | one instance in common of four. Lane B built the concept from scratch. The *mechanism* still repeats at p = 3.8 × 10⁻⁶, so the signal's test was coarser than the thing it detected — recorded rather than reinterpreted. |
| 2 — probe flags the new family more than twice after repair → stop | **YES** | 11 clusters, then 10 after a full repair pass, two of them introduced by the repair. Family retired at gate 1. |
| 3 — family survives every gate then both labs solve it | no | it never reached a lab. |
| 4 — exporter cannot produce more than two distinct instances | **unanswered** | no exporter was built. Stated rather than assumed. |
| 5 — clean-checkout finds another divergent gate | **no** | zero divergences over six gate reports. |
