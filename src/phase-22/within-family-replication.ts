// Phase 22 Lane 4 — a general within-family replication module.
//
// "Within-family replication" is Phase 21's own protocol's four evidence levels' second tier (below
// cross-family transfer, above bare within-package evidence — docs/phase-21-protocol.md), and it did
// not exist as running code before this phase: only one variant existed per family, so there was
// nothing to replicate against. This module is generic over any set of independent coverage runs
// (different quotas, different held-out sub-splits, different seeds — whatever the caller constructed
// as genuinely independent conditions within the same family) and asks one question: does the SAME
// qualitative conclusion hold across all of them, or does it depend on which one you happened to run?
//
// A result that only shows up at one quota size, or only on one sub-split, is not "the operator has an
// effect" — it is "this specific condition produced this specific outcome", which Phase 21's own pilot
// already warned reads very differently once you are honest about it. Reusable is a stopping-rule kind
// that appears identically across every independent run supplied.

import type { StoppingDecision } from "../phase-21/stopping-rule.js";
import type { CoverageRunResult } from "./orchestrator.js";

export type ReplicationVerdict =
  | "REPLICATED-NULL"
  | "REPLICATED-UPLIFT-TOWARD-TARGETED"
  | "REPLICATED-UPLIFT-TOWARD-NAIVE"
  | "INCONSISTENT-NOT-REPLICATED"
  | "VALIDITY-REGRESSION-BLOCKS-REPLICATION"
  | "INSUFFICIENT-RUNS";

export interface ReplicationResult {
  readonly verdict: ReplicationVerdict;
  readonly runCount: number;
  readonly conditions: readonly string[];
  readonly stoppingRuleKinds: readonly StoppingDecision["kind"][];
  readonly reason: string;
}

/** Which "direction" a stop-uplift decision points, using the SAME run's own primary counts. */
const upliftDirection = (run: CoverageRunResult): "toward-targeted" | "toward-naive" | "n/a" => {
  if (run.stoppingRule.kind !== "stop-uplift") return "n/a";
  return run.primary.discordantTargetedWins > run.primary.discordantNaiveWins
    ? "toward-targeted"
    : "toward-naive";
};

/**
 * At least two genuinely independent runs are required — one run cannot replicate itself. Each
 * `conditionLabel` should name what varies between runs (a quota size, a sub-split id); the caller is
 * responsible for those conditions actually being independent (this module has no way to check that).
 */
export function assessWithinFamilyReplication(
  runs: readonly { readonly conditionLabel: string; readonly result: CoverageRunResult }[],
): ReplicationResult {
  const stoppingRuleKinds = runs.map((r) => r.result.stoppingRule.kind);
  const conditions = runs.map((r) => r.conditionLabel);

  if (runs.length < 2) {
    return {
      verdict: "INSUFFICIENT-RUNS",
      runCount: runs.length,
      conditions,
      stoppingRuleKinds,
      reason: `${runs.length} run(s) supplied; at least 2 independent conditions are required to claim replication`,
    };
  }

  const anyValidityRegression = runs.some((r) => r.result.stoppingRule.kind === "stop-validity-regression");
  if (anyValidityRegression) {
    const failing = runs
      .filter((r) => r.result.stoppingRule.kind === "stop-validity-regression")
      .map((r) => r.conditionLabel);
    return {
      verdict: "VALIDITY-REGRESSION-BLOCKS-REPLICATION",
      runCount: runs.length,
      conditions,
      stoppingRuleKinds,
      reason: `reference arm failed under condition(s) ${failing.join(", ")} — the construction itself is suspect, so no replication claim can be made either way`,
    };
  }

  const allNull = stoppingRuleKinds.every((k) => k === "stop-null" || k === "stop-max-pairs-exhausted");
  if (allNull) {
    return {
      verdict: "REPLICATED-NULL",
      runCount: runs.length,
      conditions,
      stoppingRuleKinds,
      reason: `every one of ${runs.length} independent condition(s) (${conditions.join(", ")}) reached a null or exhausted-without-significance stopping decision — no effect detected, consistently`,
    };
  }

  const allUplift = stoppingRuleKinds.every((k) => k === "stop-uplift");
  if (allUplift) {
    const directions = new Set(runs.map((r) => upliftDirection(r.result)));
    if (directions.size === 1) {
      const [only] = [...directions];
      return {
        verdict:
          only === "toward-targeted" ? "REPLICATED-UPLIFT-TOWARD-TARGETED" : "REPLICATED-UPLIFT-TOWARD-NAIVE",
        runCount: runs.length,
        conditions,
        stoppingRuleKinds,
        reason: `every one of ${runs.length} independent condition(s) reached stop-uplift in the SAME direction (${only})`,
      };
    }
    return {
      verdict: "INCONSISTENT-NOT-REPLICATED",
      runCount: runs.length,
      conditions,
      stoppingRuleKinds,
      reason: `every run reached stop-uplift, but the direction differed across conditions (${[...directions].join(", ")}) — this is disagreement, not replication`,
    };
  }

  return {
    verdict: "INCONSISTENT-NOT-REPLICATED",
    runCount: runs.length,
    conditions,
    stoppingRuleKinds,
    reason: `stopping-rule kinds differed across conditions (${stoppingRuleKinds.join(", ")}) — the conclusion depends on which condition was run, which is the opposite of replication`,
  };
}
