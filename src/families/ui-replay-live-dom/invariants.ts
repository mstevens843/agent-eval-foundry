// Build gates, as FIRST-CLASS NAMED CHECKS rather than a test file.
//
// Every property this family's argument rests on is re-derived from the FINISHED SWEEP on every
// build, because the alternative is trusting a design document. The parent family's nesting was
// invisible from every direction except the one nobody looked from, and a design edit that made
// settling free again — budget removed, or always generous — while the entity guard lost its teeth
// would collapse these catch sets back into a chain with the reference still passing, the mutants
// still "caught", and nothing downstream noticing.
//
// The gates are named `build:*` and are meant to appear in the family report beside the sweep, so a
// reader can see WHICH property was re-derived rather than being told the suite is healthy.

import { App } from "./app.js";
import { ANCHOR_LOYAL_SUBJECTS, BASELINES, INTENDED_CHECK, MUTANTS, POLICY_MUTANTS } from "./mutants.js";
import { REFERENCE_POLICY, reference, resetCompletionRecords } from "./reference.js";
import { type RunResult, catchSet, relate, runFamily } from "./runner.js";
import {
  buildScenario,
  enumerateSpace,
  generateScenarios,
  selectMeasuredSet,
  witnessInstances,
} from "./scenarios.js";
import type { ScenarioParams } from "./truth.js";

export interface GateResult {
  readonly gate: string;
  readonly passed: boolean;
  readonly detail: string;
}

/** The three one-field subjects the original incomparability argument names. */
const PROOF_SUBJECTS = ["impatient-halter", "anchor-credulous", "txn-blind"] as const;

const ok = (gate: string, detail: string): GateResult => ({ gate, passed: true, detail });
const bad = (gate: string, detail: string): GateResult => ({ gate, passed: false, detail });

/**
 * Catch sets restricted to one seed.
 *
 * The design's proof was witnessed at seed 11 only. Re-deriving it at 41 as well is the difference
 * between "the construction works" and "the construction works at the one point we looked at".
 */
const catchSetForSeed = (run: RunResult, subjectId: string, seed: number): ReadonlySet<string> => {
  const ids = new Set(run.scenarios.filter((s) => s.params.seed === seed).map((s) => s.id));
  return new Set(
    run.cells
      .filter((c) => c.subjectId === subjectId && c.failures.length > 0 && ids.has(c.scenarioId))
      .map((c) => c.scenarioId),
  );
};

export function runBuildGates(run: RunResult = runFamily()): readonly GateResult[] {
  const gates: GateResult[] = [];
  const measured = selectMeasuredSet(enumerateSpace());

  // ---- build:reference_clean --------------------------------------------------------------------
  const refFailures = run.cells.filter((c) => c.subjectId === "reference" && c.failures.length > 0);
  gates.push(
    refFailures.length === 0
      ? ok("build:reference_clean", `reference passes all ${run.scenarios.length} measured scenarios`)
      : bad(
          "build:reference_clean",
          `reference fails ${refFailures.length} scenario(s), starting with ${refFailures[0]?.scenarioId}: the family is measuring its own bugs`,
        ),
  );

  // ---- build:knob_coverage ----------------------------------------------------------------------
  // `selectMeasuredSet` throws on a frozen knob, so reaching here is the assertion. Recorded as a
  // gate anyway, because a property enforced somewhere invisible is a property nobody re-checks.
  gates.push(
    ok(
      "build:knob_coverage",
      `every declared value of every knob survives the hash sample (${measured.length} of ${run.spaceSize})`,
    ),
  );

  // ---- build:single_field_diff ------------------------------------------------------------------
  const multi = Object.entries(POLICY_MUTANTS).filter(([, policy]) => {
    const keys = Object.keys(REFERENCE_POLICY) as (keyof typeof REFERENCE_POLICY)[];
    return keys.filter((k) => policy[k] !== REFERENCE_POLICY[k]).length !== 1;
  });
  gates.push(
    multi.length === 0
      ? ok(
          "build:single_field_diff",
          `all ${Object.keys(POLICY_MUTANTS).length} policy mutants differ from the reference in exactly one field`,
        )
      : bad(
          "build:single_field_diff",
          `${multi.map(([id]) => id).join(", ")} differ in more than one field; their catch sets become the universe and the private witnesses disappear`,
        ),
  );

  // ---- build:mutants_caught_by_intended_check ---------------------------------------------------
  const uncaught = MUTANTS.filter((m) => {
    const check = INTENDED_CHECK[m.id];
    if (check === undefined) return true;
    return !run.cells.some((c) => c.subjectId === m.id && c.failures.some((f) => f.check === check));
  });
  gates.push(
    uncaught.length === 0
      ? ok(
          "build:mutants_caught_by_intended_check",
          `all ${MUTANTS.length} mutants trip the check they were written to trip`,
        )
      : bad(
          "build:mutants_caught_by_intended_check",
          `${uncaught.map((m) => m.id).join(", ")} never trip their intended check — either the defect is unreachable in the measured set or the check does not detect it`,
        ),
  );

  // ---- build:baselines_blocked ------------------------------------------------------------------
  const unblocked = BASELINES.filter(
    (b) => !run.cells.some((c) => c.subjectId === b && c.failures.length > 0),
  );
  gates.push(
    unblocked.length === 0
      ? ok(
          "build:baselines_blocked",
          `${BASELINES.join(", ")} both fail: refusing everything and doing nothing are both losing strategies`,
        )
      : bad("build:baselines_blocked", `${unblocked.join(", ")} pass the suite`),
  );

  // ---- build:witness_present --------------------------------------------------------------------
  try {
    const found = witnessInstances(measured);
    gates.push(ok("build:witness_present", [...found].map(([k, v]) => `${k}=${v}`).join(", ")));
  } catch (err) {
    gates.push(bad("build:witness_present", (err as Error).message));
  }

  // ---- build:witness_pair_incomparable ----------------------------------------------------------
  //
  // Compared by PRIVATE WITNESS — each set contains an element absent from the other — never by
  // equality or cardinality. Both baselines fail every scenario by construction, so every catch set
  // contains both; a cardinality test would fail on the first commit and get "fixed" by weakening the
  // assertion, which is how an incomparability guarantee turns into a comment.
  for (const seed of [11, 41]) {
    for (let i = 0; i < PROOF_SUBJECTS.length; i += 1) {
      for (let j = i + 1; j < PROOF_SUBJECTS.length; j += 1) {
        const a = PROOF_SUBJECTS[i] ?? "";
        const b = PROOF_SUBJECTS[j] ?? "";
        const rel = relate(catchSetForSeed(run, a, seed), catchSetForSeed(run, b, seed), a, b);
        gates.push(
          rel.relation === "incomparable"
            ? ok(
                `build:witness_pair_incomparable[${a}|${b}|seed${seed}]`,
                `private witnesses ${rel.aOnly} and ${rel.bOnly}`,
              )
            : bad(
                `build:witness_pair_incomparable[${a}|${b}|seed${seed}]`,
                `the two catch sets are ${rel.relation}: the family has re-nested and the antichain width has dropped below 3`,
              ),
        );
      }
    }
  }

  // ---- build:categorical_anchor_axis ------------------------------------------------------------
  const conflictCounts = new Map<string, number>();
  for (const scenario of run.scenarios) {
    const key = scenario.params.anchorConflict;
    conflictCounts.set(key, (conflictCounts.get(key) ?? 0) + 1);
  }
  const missingConflicts = ["testid_wins", "semantic_wins", "path_wins"].filter(
    (key) => (conflictCounts.get(key) ?? 0) === 0,
  );
  gates.push(
    missingConflicts.length === 0
      ? ok(
          "build:categorical_anchor_categories_covered",
          [...conflictCounts].map(([k, v]) => `${k}=${v}`).join(", "),
        )
      : bad(
          "build:categorical_anchor_categories_covered",
          `${missingConflicts.join(", ")} absent from the measured set; address-loyal strategies cannot be compared categorically`,
        ),
  );

  // ---- build:anchor_loyalists_incomparable ------------------------------------------------------
  for (const seed of [11, 41]) {
    for (let i = 0; i < ANCHOR_LOYAL_SUBJECTS.length; i += 1) {
      for (let j = i + 1; j < ANCHOR_LOYAL_SUBJECTS.length; j += 1) {
        const a = ANCHOR_LOYAL_SUBJECTS[i] ?? "";
        const b = ANCHOR_LOYAL_SUBJECTS[j] ?? "";
        const rel = relate(catchSetForSeed(run, a, seed), catchSetForSeed(run, b, seed), a, b);
        gates.push(
          rel.relation === "incomparable"
            ? ok(
                `build:anchor_loyalists_incomparable[${a}|${b}|seed${seed}]`,
                `private witnesses ${rel.aOnly} and ${rel.bOnly}`,
              )
            : bad(
                `build:anchor_loyalists_incomparable[${a}|${b}|seed${seed}]`,
                `the two catch sets are ${rel.relation}: address preference has collapsed back into an ordinal chain`,
              ),
        );
      }
    }
  }

  // ---- build:anti_correlation_distinct ----------------------------------------------------------
  //
  // The risk the design names about itself: superseded-vs-late_mount and foreign_hold-vs-arming may
  // be ONE mechanism wearing two names. The honest test is an instance that demands OPPOSITE answers
  // from the same subject — patient at step 4, strict at step 6 — where the two poles fail on
  // DIFFERENT checks. Checks, not scenario counts.
  const iD = run.witnesses.get("i_D");
  if (iD === undefined) {
    gates.push(bad("build:anti_correlation_distinct", "witness i_D is absent from the measured set"));
  } else {
    const checksOf = (id: string): string =>
      [
        ...new Set(
          run.cells
            .filter((c) => c.subjectId === id && c.scenarioId === iD)
            .flatMap((c) => c.failures.map((f) => f.check)),
        ),
      ]
        .sort()
        .join(",");
    const strict = checksOf("strict-bailer");
    const patient = checksOf("patient-waiter");
    gates.push(
      strict !== "" && patient !== "" && strict !== patient
        ? ok(
            "build:anti_correlation_distinct",
            `on ${iD} the strict pole fails {${strict}} and the patient pole fails {${patient}} — two mechanisms, not one`,
          )
        : bad(
            "build:anti_correlation_distinct",
            `on ${iD} the poles fail {${strict}} and {${patient}}: if a single disposition explains both, the family has one axis after all`,
          ),
    );
  }

  // ---- build:aria_busy_unread -------------------------------------------------------------------
  //
  // The fairness argument for `busyFidelity: misleading` evaporates the moment the reference starts
  // consulting the attribute it is allowed to lie with, and it would evaporate quietly.
  resetCompletionRecords();
  let busyReads = 0;
  let settledOnForeignHold = 0;
  for (const scenario of run.scenarios) {
    const app = new App(scenario.params, scenario.trace);
    for (let i = 0; i < scenario.params.replayCount; i += 1) {
      app.beginReplay(i);
      reference.replay(scenario.trace, app.facade());
    }
    const calls = app.sealedCalls();
    busyReads += calls.filter((c) => c.detail.includes("aria-busy")).length;
    if (scenario.params.priorState === "foreign_hold" && calls.some((c) => c.method === "settle")) {
      settledOnForeignHold += 1;
    }
  }
  resetCompletionRecords();
  gates.push(
    busyReads === 0
      ? ok("build:aria_busy_unread", "`aria-busy` never appears in the reference's call ledger")
      : bad(
          "build:aria_busy_unread",
          `the reference reads \`aria-busy\` ${busyReads} time(s); a knob that is allowed to lie must not be load-bearing`,
        ),
  );

  // ---- build:txn_precedence ---------------------------------------------------------------------
  //
  // L12 must be evaluated BEFORE the clock. If it drifted below the settle loop, the impatient and
  // the credulous subject would stop being pointwise identical to the reference on a `foreign_hold`
  // scenario and the third incomparable catch set would be lost. This gate asserts the ORDER, not the
  // rule: the reference spends no tick at all on a foreign hold.
  gates.push(
    settledOnForeignHold === 0
      ? ok(
          "build:txn_precedence",
          "the reference never calls settle() on a `foreign_hold` scenario: L12 precedes L8",
        )
      : bad(
          "build:txn_precedence",
          `the reference settled on ${settledOnForeignHold} foreign-hold scenario(s); the published precedence is not what the code does`,
        ),
  );

  // ---- build:busy_fidelity_neutral --------------------------------------------------------------
  //
  // The part the design omitted: it is not enough that the reference ignores `aria-busy`. NO
  // scenario's expected outcome may differ between `honest` and `misleading` at identical other
  // knobs, or the knob is deciding answers through some other route.
  const mismatches: string[] = [];
  for (const p of enumerateSpace()) {
    if (p.busyFidelity !== "honest") continue;
    const a = buildScenario(p);
    const b = buildScenario({ ...p, busyFidelity: "misleading" } as ScenarioParams);
    if (
      a.expectedOutcome !== b.expectedOutcome ||
      a.expectedReason !== b.expectedReason ||
      a.expectedEffects.join("|") !== b.expectedEffects.join("|")
    ) {
      mismatches.push(a.id);
    }
  }
  gates.push(
    mismatches.length === 0
      ? ok(
          "build:busy_fidelity_neutral",
          "no point in the 864-point space changes its expected outcome with `busyFidelity`",
        )
      : bad(
          "build:busy_fidelity_neutral",
          `${mismatches.length} point(s) change outcome with a knob that is allowed to lie, starting at ${mismatches[0]}: drop the knob rather than argue about it`,
        ),
  );

  // ---- build:no_fixed_patience_constant ---------------------------------------------------------
  //
  // Kills "read the spec, hardcode wait-N-then-halt". Two legs: a completed scenario needs more ticks
  // than any small N, AND a `foreign_hold` scenario is answered wrongly by spending even one. No
  // constant satisfies both, which is why patience has to be a decision rather than a setting.
  const deepest = Math.max(
    0,
    ...run.scenarios.filter((s) => s.expectedOutcome === "completed").map((s) => s.settlesNeeded),
  );
  const foreign = run.scenarios.filter((s) => s.params.priorState === "foreign_hold");
  gates.push(
    deepest >= 5 && foreign.length > 0
      ? ok(
          "build:no_fixed_patience_constant",
          `a completed scenario needs ${deepest} ticks, so no N < ${deepest} is enough; ${foreign.length} foreign-hold scenarios are answered wrongly by spending even one, so no N >= 1 is right either`,
        )
      : bad(
          "build:no_fixed_patience_constant",
          `deepest completed scenario needs ${deepest} ticks and ${foreign.length} foreign-hold scenarios exist: a fixed patience constant may now be correct across the space`,
        ),
  );

  return gates;
}

/** Throws with every failing gate named. Wire this into the family's test file. */
export function assertBuildGates(run?: RunResult): void {
  const gates = runBuildGates(run);
  const failed = gates.filter((g) => !g.passed);
  if (failed.length > 0) {
    throw new Error(
      `ui-replay-live-dom build gates failed:\n${failed.map((g) => `  ${g.gate}: ${g.detail}`).join("\n")}`,
    );
  }
}

/** Scenario-count-free summary. Any report quoting a width must print this beside it. */
export const gateSummary = (gates: readonly GateResult[]): string =>
  gates.map((g) => `${g.passed ? "PASS" : "FAIL"} ${g.gate} — ${g.detail}`).join("\n");

/** Re-exported so `generateScenarios` is reachable from a gate runner without a second import. */
export { generateScenarios };
