# Phase 21 — Construction Operator Causal Laboratory

Hand-authored, like `reports/PHASE-20-VERIFIER-TRUST-BOUNDARY.md` before it — this phase's
deliverables span code, data and a mission narrative no existing canonical generator renders. Nothing
here alters a Phase 17-20 registration, trial result, hash, or historical conclusion; every correction
is dated and additive.

## The reframe this phase committed to

Not "which family sounds hard" but "which controlled construction intervention measurably causes valid
frontier-agent failure." This phase does not add candidate families. It builds the instrumentation to
measure a construction operator's effect causally, and runs it once, honestly, on real data.

## Lane 0 — audit findings

Full detail: `data/phase-21-preregistration.json`. Headline findings, several of which are not in the
roadmap discussion that preceded this phase:

- **Phase 20 re-verified clean** (`node dist/cli.js check`, `node scripts/verify-phase-20.mjs`), but
  with an important addition: migrating a family's *grading route* does not retroactively relabel its
  *past* trial records. Querying every routable family directly shows **zero families currently have
  any non-stale, counted, cell-container-isolated trial** — "migrated" means a NEW trial run today
  would be trustworthy, not that an existing one is. Any production-level evidence Phase 21 might want
  to cite has to be generated fresh, gated behind Lane 6.
- **Reuse vs. rebuild, decided explicitly for five existing systems** (full reasoning in the
  preregistration): hardness-ledger.ts (EXTEND, as a retrospective summary sink — its
  `operators[8]` missing-`confidence` defect, which has blocked `node dist/cli.js all` since before
  Phase 20, is fixed as part of this work); Phase 14's operator-effects machinery (EXTEND — reuse
  Clopper-Pearson intervals, blind adjudication, and `observedRow`'s trial-integrity verification
  near-verbatim; it lacks a paired-binary significance test and any validity-regression trigger, both
  added here); Phase 13's transfer-probe layer (EXTEND — reuse its interaction-contrast estimand and,
  as a hard rule, its three-way evidence-level honesty split; it lacks a within-family evidence level
  and is hand-written per family rather than schema-driven); `evolve.ts`'s operator/variant machinery
  (a SEPARATE, SMALLER module, not an extension — its disposition gate and whole-new-family shape do
  not fit "apply one operator to a valid family," though its `OperatorId`/`MaterialDelta` vocabulary is
  reused conceptually); `src/trials/root-cause.ts` (REUSE AS-IS, no changes).
- **`node dist/cli.js all` now runs to completion** for the first time since before Phase 20, purely as
  a consequence of fixing the pre-existing `hardness-operators.json` defect found while deciding
  whether to extend that system.

## Lane 1 — operator taxonomy and treatment schema

`src/phase-21/operator-schema.ts` (parser, fail-closed) + `data/phase-21-operators.json` (the twelve
named operators) + `docs/phase-21-operator-schema.md` (field-by-field explanation). All twelve operators
from the roadmap discussion are formalized with a causal claim, preconditions, an exact construction
delta, what stays fixed, and real (not hypothetical) candidate/excluded substrates.

Two corrections surfaced while formalizing, both documented in the schema doc:
`authoritative-state-inaccessible-to-subject` is a grading-infrastructure operator, not a task-content
one (its delta is "which process the ledger is built in," already delivered by Phase 20); and the
schema's own `measurable: false` field exists specifically to name checklist items (like `evolve.ts`'s
`upgrade_isolation`) that are not real, pilotable treatments, rather than silently reinventing them as
if they were.

## Lane 2/3/4 — protocol, evidence levels, outcome metrics, stopping rules

`docs/phase-21-protocol.md`. Matched-pair diffability is mechanically checked
(`src/phase-21/matched-pair.ts`), not asserted. The four evidence levels (within-package, within-family,
cross-family, production) are kept structurally distinct, carrying forward Phase 13's existing honesty
discipline. Outcome metrics reuse `src/trials/root-cause.ts` for failure cause rather than inventing a
second taxonomy. The stopping-rule engine (`src/phase-21/stopping-rule.ts`) adds McNemar's exact test
for paired binary outcomes and a real validity-regression early-stop trigger — both confirmed absent
from Phase 14 by direct audit.

## Lane 5 — the local pilot, and its real result

**Operator**: `hidden-scenario-selection-targets-narrow-mutants`. **Substrate**: `caa-revalidation`
(migrated, not grandfathered, already separates scenario enumeration from selection — exactly Lane 0's
precondition for this operator). **Cost**: zero — local reference/mutant sweeps only, no agent, no
provider call.

Shared, byte-identical between both arms: `enumerateSpace()`, `generateScenarios()`, the nine-mutant
bank, `verify()` (via `runCell`), the reference implementation. The only declared delta is the scenario
*selection* function: the shipped `selectMeasuredSet()` deliberately splits into an 18-scenario
activated quota plus a 6-scenario non-activation control quota; the constructed baseline
(`selectNaiveBaseline`, added by this phase, touching nothing in `src/families/caa-revalidation/`) takes
the same-size sample in the same deterministic tie-break order with no activation targeting at all.
`assertMatchedPairDiffable` confirmed this mechanically before any scenario was graded.

Tested at two sizes, both reported regardless of outcome, because the operator's own causal claim is
about *guaranteeing* coverage — a property that should matter most at small sample sizes:

| Size | Baseline activated / total | Treated activated / total | Reference clean (both arms) | McNemar (discordant T/B, p) | Stopping rule |
|---|---|---|---|---|---|
| Shipped (n=24) | 10/24 | 18/24 | yes | 0/0, p=1.000 | `stop-null` — 9/9 pairs, zero discordant, ceiling reached |
| Small (n=3) | 2/3 | 3/3 | yes | 0/0, p=1.000 | `stop-null` — 9/9 pairs, zero discordant, ceiling reached |

**Result: a genuine, honest null, robust across both sizes.** Every one of the nine mutants
(`first-name-reuse` included — the one deliberately modeled on the real incident this family is based
on) is caught by BOTH the targeted and the naive selection, at both 24 and 3 scenarios. There is no
measured advantage from deliberate narrow-mutant targeting over naive selection, for this operator, on
this substrate, at either tested size.

**The honest caveat, stated because overclaiming a null is exactly as wrong as overclaiming an uplift**:
this family's nine LOCAL mutants (categorical bugs — reuse-first-name, off-by-one boundaries, reversed
output order, four cheat oracles) are not the same shape as the REAL planted defect in the Go/Python
`tasks/caa-revalidation-repair/` task this family is modeled on (a concurrency-timing pairing bug that
only misfires when out-of-order authority responses interact with a specific stale-identifier count).
It is plausible this local mutant bank is simply not narrow enough for the operator's claim to bite —
every mutant here may just be broadly wrong enough that almost any small sample catches it. This null
result does NOT generalize to "scenario-selection targeting doesn't matter" — it specifically means it
did not matter for catching THESE nine mutants on THIS substrate. The natural next step, not attempted
this phase, is running the identical protocol against a mutant deliberately constructed to be as narrow
as the real Go-task defect.

Full machine-readable result: run `node -e "const {runPilot,parseOperatorTreatmentSchema}=require('./dist/index.cjs'); console.log(JSON.stringify(runPilot(parseOperatorTreatmentSchema(JSON.parse(require('fs').readFileSync('data/phase-21-operators.json','utf8')))),null,2))"` — reproduced byte-for-byte across repeated runs (verified in `scripts/verify-phase-21.mjs`).

## Lane 6 — conditional real-agent pilot

**Not attempted.** No explicit authorization to spend was given for this phase, and the mission is
explicit that Lane 6 requires it. Given Lane 0's finding that zero families currently have valid
production-level evidence, the smallest genuinely useful Lane 6 experiment would be a fresh real-agent
trial through the migrated `caa-revalidation` or `prompt-injection-memory-poisoning` cell-container
route — a real cost, not estimated or projected here, and deferred to explicit authorization.

## Lane 7 — Phase 19B

**Not attempted**, per the priority override. Phase 19's frozen research-candidate corpus hash mismatch
remains exactly as Phase 20 found it — unresolved, not worsened, not touched.

## Verification

- `pnpm run typecheck`, `pnpm run lint` (biome), `pnpm run build` — clean.
- `node scripts/secret-scan.mjs` — clean.
- `node dist/cli.js check` — clean; re-verified after every correction in this phase.
- `node scripts/verify-phase-21.mjs` — passes, run twice for byte-for-byte reproducibility of the
  pilot's own output.
- `test/phase-21-operator-lab.test.ts` (19 tests) — schema parsing and its closed-world rejections,
  matched-pair diffability (accepts a clean delta, refuses a confounded one, refuses a no-op pair),
  McNemar's exact test (null, strong-signal, and 50/50 cases), the stopping rule's four branches
  (continue, validity-regression, uplift, null), and the full local pilot end to end on the real
  family — all pass.
- Full relevant suite re-run; only pre-existing, independently-confirmed-unrelated failures remain
  (the same set Phase 20 already named: the Phase 12 hardness-ledger gap now resolved for
  `operators[8]` specifically but the class of check itself is unchanged; the Phase 19 corpus-hash
  mismatch this phase deliberately did not touch; `test/tmp-recipe-classify.test.ts`, a pre-existing
  unrelated scratch file; the `caa-revalidation` measured-count drift in
  `test/foundry-system.test.ts`; and the evolution-engine consequence of Phase 20's `grader_gameable`
  reclassification).

## Remaining blockers

- No family has current production-level (Lane 6-tier) evidence; generating any requires explicit
  spend authorization.
- The local pilot's null result needs a narrower mutant to be a strong test of the operator's claim —
  the current nine-mutant bank may be too broadly-wrong to discriminate targeted from naive selection.
- Within-family replication (evidence level 2) has no built infrastructure yet beyond this phase's
  two-size demonstration inside one pilot script — it needs its own reusable module if Phase 22 is to
  build on it.
- Phase 13's per-family `Adapter` objects are still hand-written, not yet schema-driven against this
  phase's operator taxonomy.

## GOOD / BAD / MEH: **GOOD**

A real operator was formalized, measured end to end on real data with a mechanically-checked matched
pair and a rigorous (not bare-mean) statistical test, and produced an honest null with its own stated
caveat — not a comprehensive framework nobody ran. A genuinely pre-existing, unrelated defect
(`node dist/cli.js all` crashing) was found and fixed as a side effect of doing the reuse-vs-rebuild
audit properly. Nothing here overclaims: no operator was promoted to a rule, no production evidence was
manufactured, and Lane 6/7 were correctly left untouched without authorization.

**Recommended next phase**: run the SAME protocol (schema, matched-pair check, McNemar, stopping rule)
against a mutant deliberately constructed to be as narrow as `tasks/caa-revalidation-repair/`'s real
planted defect, to give the `hidden-scenario-selection-targets-narrow-mutants` operator a fair test
before concluding anything about it — and only then, with a real signal in hand either way, consider
Lane 6 (with explicit spend authorization) or Phase 22's within-family/cross-family replication.
