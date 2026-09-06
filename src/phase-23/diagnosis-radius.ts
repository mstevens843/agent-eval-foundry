// Phase 23 Lane 2/3 — diagnosis-radius on prompt-injection-memory-poisoning.
//
// causal-depth on caa-revalidation was attempted first and found NOT constructible without editing
// verify.ts (see data/phase-23-preregistration.json#lane2CausalDepthInfeasibilityFinding — the family's
// own applicableAnswer defines a fresh name's ground truth AS its cache, so no scenarios/truth-only
// construction can make a poisoned-but-fresh cache detectable). This is the disciplined pivot to the
// pre-registered alternative.
//
// diagnosis-radius's constructionDelta is a single existing scenario PARAMETER value
// (`scenarios.params.sessionsBetween`, already declared in SPACE — [0, 1, 3], see
// src/families/memory-poisoning/scenarios.ts's own doc comment: "At 0 this degenerates almost exactly
// to the parent family... At 1 and 3 the segment is gone by the time the action arrives"). Building the
// matched pair here means nothing new needs to be added to the family at all — only a HIDDEN GRADED
// SCENARIO SET restricted to one fixed sessionsBetween value per arm, exactly the same kind of
// selection-only delta as hidden-scenario-selection-targets-narrow-mutants, one level more specific
// (a parameter value, not a whole selection function).
//
// VISIBLE package files (README.md, SPEC.md, types.ts, starter/subject.mjs, examples/) are produced by
// buildMemoryChallengePackage UNCHANGED for both arms — that function takes no sessionsBetween input at
// all, so the only thing that can differ between the two calls is the scenarioSetId string embedded in
// MANIFEST.json, which is exactly the declared delta and nothing else.

import { createHash } from "node:crypto";
import { buildMemoryChallengePackage } from "../challenge/memory-package.js";
import type { ChallengePackage } from "../challenge/package.js";
import { INTENDED_CHECK, MUTANTS } from "../families/memory-poisoning/mutants.js";
import { reference } from "../families/memory-poisoning/reference.js";
import { runCell } from "../families/memory-poisoning/runner.js";
import { SPACE, enumerateSpace, generateScenarios } from "../families/memory-poisoning/scenarios.js";
import type { ScenarioParams } from "../families/memory-poisoning/truth.js";
import { assertKnobCoverage, sampleSpace } from "../foundry/sample.js";
import { challengeHash } from "../trials/run.js";

export const BASELINE_SESSIONS_BETWEEN = 0;
export const TREATED_SESSIONS_BETWEEN = 3;

/**
 * Fix sessionsBetween to one value, then sample the remaining 5-dimension space the same way the
 * shipped family does (grouped by attack, hash-ranked within each group) — reusing sampleSpace
 * unchanged. Coverage is asserted over every OTHER knob's full declared range; sessionsBetween itself
 * is intentionally pinned, which is the whole point of this arm, so its "coverage" is checked against a
 * space narrowed to the one value this arm fixes rather than the family's full three-value range.
 */
export function selectFixedSessionsBetween(
  space: readonly ScenarioParams[],
  sessionsBetween: number,
  fraction: number,
): readonly ScenarioParams[] {
  // Historical five-knob experiment predates lateDispute. Preserve its original slice rather than
  // alias three new points to one sampler identity (which also broke the public library import).
  const filtered = space.filter((p) => p.sessionsBetween === sessionsBetween && p.lateDispute === "none");
  const selected = sampleSpace(filtered, {
    keyOf: (p) => `${p.attack}|${p.memoryKind}|${p.benignActions}|${p.decoySimilarity}|${p.seed}`,
    groupOf: (p) => p.attack,
    fraction,
  });
  assertKnobCoverage(
    selected,
    { ...SPACE, sessionsBetween: [sessionsBetween], lateDispute: ["none"] },
    (p, knob) => (p as unknown as Record<string, unknown>)[knob],
    `phase23.diagnosis-radius.sessionsBetween=${sessionsBetween}`,
  );
  return selected;
}

export interface ArmScenarioSet {
  readonly sessionsBetween: number;
  readonly params: readonly ScenarioParams[];
  readonly scenarios: ReturnType<typeof generateScenarios>;
}

const buildArm = (sessionsBetween: number, fraction: number): ArmScenarioSet => {
  const params = selectFixedSessionsBetween(enumerateSpace(), sessionsBetween, fraction);
  return { sessionsBetween, params, scenarios: generateScenarios(params) };
};

export const BASELINE_ARM: ArmScenarioSet = buildArm(BASELINE_SESSIONS_BETWEEN, 1 / 3);
export const TREATED_ARM: ArmScenarioSet = buildArm(TREATED_SESSIONS_BETWEEN, 1 / 3);

export interface ValidityGateResult {
  readonly sessionsBetween: number;
  readonly scenarioCount: number;
  readonly referenceClean: boolean;
  readonly referenceFailures: readonly {
    readonly scenarioId: string;
    readonly failures: readonly string[];
  }[];
  readonly mutantsCaught: readonly {
    readonly mutantId: string;
    readonly intendedCheck: string;
    readonly caught: boolean;
  }[];
  readonly allMutantsCaught: boolean;
}

/** Reference-clean and every known-bad mutant still caught — a VALIDITY check, not hardness evidence. */
export function runValidityGates(arm: ArmScenarioSet): ValidityGateResult {
  const referenceFailures = arm.scenarios
    .map((scenario) => ({ scenarioId: scenario.id, failures: runCell(scenario, reference).failures }))
    .filter((row) => row.failures.length > 0)
    .map((row) => ({ scenarioId: row.scenarioId, failures: row.failures.map((f) => f.check) }));

  const mutantsCaught = MUTANTS.map((mutant) => {
    const intendedCheck = INTENDED_CHECK[mutant.id];
    if (intendedCheck === undefined) {
      return { mutantId: mutant.id, intendedCheck: "(undeclared)", caught: false };
    }
    const caught = arm.scenarios.some((scenario) =>
      runCell(scenario, mutant).failures.some((f) => f.check === intendedCheck),
    );
    return { mutantId: mutant.id, intendedCheck, caught };
  });

  return {
    sessionsBetween: arm.sessionsBetween,
    scenarioCount: arm.scenarios.length,
    referenceClean: referenceFailures.length === 0,
    referenceFailures,
    mutantsCaught,
    allMutantsCaught: mutantsCaught.every((m) => m.caught),
  };
}

export interface FrozenArmPackage {
  readonly sessionsBetween: number;
  readonly scenarioSetId: string;
  readonly packageHash: string;
  readonly scenarioParamsHash: string;
}

/** Content hash of the hidden graded scenario PARAMS (never shipped) — pins exactly which scenarios this arm grades against, independent of the visible package. */
function paramsHash(params: readonly ScenarioParams[]): string {
  const hash = createHash("sha256");
  for (const row of [...params].map((p) => JSON.stringify(p)).sort()) {
    hash.update(row);
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 32);
}

export function freezeArmPackage(
  typesSource: string,
  arm: ArmScenarioSet,
  scenarioSetId: string,
): FrozenArmPackage {
  const pkg: ChallengePackage = buildMemoryChallengePackage(typesSource, scenarioSetId);
  return {
    sessionsBetween: arm.sessionsBetween,
    scenarioSetId,
    packageHash: challengeHash(pkg),
    scenarioParamsHash: paramsHash(arm.params),
  };
}
