// Phase 21 Lane 5 local-only pilot: does deliberately targeting narrow-mutant activation, versus a
// naive same-size selection, change mutant-detection rate on caa-revalidation?
//
// Operator under test: "hidden-scenario-selection-targets-narrow-mutants" (data/phase-21-operators.json).
// Substrate: caa-revalidation (migrated, not grandfathered, already separates scenario ENUMERATION
// from scenario SELECTION — Lane 0's precondition for this operator).
//
// Shared, byte-identical between both arms at every size tested: enumerateSpace(), generateScenarios(),
// MUTANTS, verify() (via runCell), reference. The ONLY thing this file adds is a naive selection
// function and a small-N targeted selector, both built from the SAME deterministic FNV-1a tie-break
// scenarios.ts's own (unexported) `ordered()` uses, so the comparison isolates exactly one variable:
// does the selection deliberately guarantee narrow-mutant activation, or take the same-size sample in
// plain deterministic order regardless of activation?
//
// TWO SIZES, BOTH REPORTED: the shipped size (24, matching selectMeasuredSet's own 18+6 split) is
// tested first. Because the operator's causal claim is specifically about GUARANTEEING coverage — a
// property that matters most when the sample is small enough that a uniform draw could plausibly miss
// the narrow mutant by chance — a second, much smaller size (3) is tested as well. Both results are
// reported regardless of outcome; this is not a search for a significant result to keep, it is
// checking whether the operator's effect is sample-size-dependent, which the operator's own causal
// claim implies it should be.
//
// This file does not modify src/families/caa-revalidation/* at all — the shipped family, its hash,
// and Phase 17's historical trials against it are untouched.

import { INTENDED_CHECK, MUTANTS } from "../families/caa-revalidation/mutants.js";
import { reference } from "../families/caa-revalidation/reference.js";
import { runCell } from "../families/caa-revalidation/runner.js";
import {
  enumerateSpace,
  generateScenarios,
  isActivated,
  selectMeasuredSet,
} from "../families/caa-revalidation/scenarios.js";
import type { ScenarioParams } from "../families/caa-revalidation/truth.js";
import { requireMatchedPair } from "./matched-pair.js";
import { operatorTreatment } from "./operator-schema.js";
import type { OperatorTreatmentSchema } from "./operator-schema.js";
import { evaluateStoppingRule, mcNemarExact } from "./stopping-rule.js";
import type {
  MatchedObservation,
  McNemarResult,
  StoppingDecision,
  StoppingRulePreregistration,
} from "./stopping-rule.js";

function naiveOrderKey(params: ScenarioParams): string {
  return `${params.seed}|${params.domainCount}|${params.agePattern}|${params.denyPosition}`;
}

/** FNV-1a. Reimplemented rather than imported: scenarios.ts's own `ordered()`/`rank()` are module-private. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

const orderedBySameTieBreak = (rows: readonly ScenarioParams[]): readonly ScenarioParams[] =>
  [...rows].sort(
    (a, b) =>
      fnv1a(naiveOrderKey(a)) - fnv1a(naiveOrderKey(b)) || naiveOrderKey(a).localeCompare(naiveOrderKey(b)),
  );

/** Naive baseline: first `quota` scenarios in deterministic order, no activation targeting at all. */
export function selectNaiveBaseline(
  space: readonly ScenarioParams[],
  quota: number,
): readonly ScenarioParams[] {
  return orderedBySameTieBreak(space).slice(0, quota);
}

/** Small-N targeted arm: first `quota` ACTIVATED scenarios in the same deterministic order. */
export function selectSmallTargeted(
  space: readonly ScenarioParams[],
  quota: number,
): readonly ScenarioParams[] {
  return orderedBySameTieBreak(space.filter(isActivated)).slice(0, quota);
}

export interface SizedPilotResult {
  readonly quotaLabel: string;
  readonly baselineScenarioIds: readonly string[];
  readonly treatedScenarioIds: readonly string[];
  readonly baselineActivatedCount: number;
  readonly treatedActivatedCount: number;
  readonly referenceCleanUnderBaseline: boolean;
  readonly referenceCleanUnderTreated: boolean;
  readonly perMutant: readonly {
    readonly mutantId: string;
    readonly intendedCheck: string;
    readonly caughtUnderBaseline: boolean;
    readonly caughtUnderTreated: boolean;
  }[];
  readonly stoppingRule: StoppingDecision;
  readonly mcNemar: McNemarResult;
}

export interface PilotResult {
  readonly operatorId: string;
  readonly shippedSize: SizedPilotResult;
  readonly smallSize: SizedPilotResult;
}

/** Does any scenario in this set cause `mutant` to fail the check it was written to trip? */
function mutantCaught(
  scenarioParams: readonly ScenarioParams[],
  mutantId: string,
  intendedCheck: string,
): boolean {
  const scenarios = generateScenarios(scenarioParams);
  const mutant = MUTANTS.find((m) => m.id === mutantId);
  if (mutant === undefined) throw new Error(`unknown mutant ${mutantId}`);
  return scenarios.some((scenario) =>
    runCell(scenario, mutant).failures.some((f) => f.check === intendedCheck),
  );
}

function referenceClean(scenarioParams: readonly ScenarioParams[]): boolean {
  const scenarios = generateScenarios(scenarioParams);
  return scenarios.every((scenario) => runCell(scenario, reference).failures.length === 0);
}

const key = (p: ScenarioParams): string => naiveOrderKey(p);

function runSizedComparison(
  operator: ReturnType<typeof operatorTreatment>,
  quotaLabel: string,
  baselineParams: readonly ScenarioParams[],
  treatedParams: readonly ScenarioParams[],
): SizedPilotResult {
  const baselineScenarioIds = baselineParams.map(key);
  const treatedScenarioIds = treatedParams.map(key);

  // Mechanically confirm this really is a matched pair: everything else (the generator, the mutant
  // bank, the verifier, the reference) is imported unchanged above and never touched by this file;
  // the only declared field that legitimately differs is the scenario selection itself.
  requireMatchedPair(operator, {
    sharedComponentDescriptions: {
      enumerateSpace: "src/families/caa-revalidation/scenarios.ts#enumerateSpace (imported, unmodified)",
      "mutants.ts": "src/families/caa-revalidation/mutants.ts (imported, unmodified)",
      "reference.ts": "src/families/caa-revalidation/reference.ts (imported, unmodified)",
      "runner.ts#runCell": "src/families/caa-revalidation/runner.ts (imported, unmodified)",
    },
    baselineDeltaFields: { "scenario selection function only": baselineScenarioIds },
    treatedDeltaFields: { "scenario selection function only": treatedScenarioIds },
  });

  const referenceCleanUnderBaseline = referenceClean(baselineParams);
  const referenceCleanUnderTreated = referenceClean(treatedParams);

  const perMutant = MUTANTS.map((mutant) => {
    const intendedCheck = INTENDED_CHECK[mutant.id];
    if (intendedCheck === undefined) throw new Error(`no intended check declared for ${mutant.id}`);
    return {
      mutantId: mutant.id,
      intendedCheck,
      caughtUnderBaseline: mutantCaught(baselineParams, mutant.id, intendedCheck),
      caughtUnderTreated: mutantCaught(treatedParams, mutant.id, intendedCheck),
    };
  });

  const observations: MatchedObservation[] = perMutant.map((m) => ({
    unitId: m.mutantId,
    baseline: m.caughtUnderBaseline ? 1 : 0,
    treated: m.caughtUnderTreated ? 1 : 0,
  }));

  const prereg: StoppingRulePreregistration = {
    experimentId: `phase21-pilot-caa-scenario-selection-${quotaLabel}`,
    operatorId: operator.id,
    minimumMatchedPairs: 5,
    alpha: 0.05,
    referenceMustPass: true,
    maximumMatchedPairs: MUTANTS.length,
  };
  const referenceChecks = [
    { unitId: "reference-under-baseline", referencePassed: referenceCleanUnderBaseline },
    { unitId: "reference-under-treated", referencePassed: referenceCleanUnderTreated },
  ];
  const stoppingRule = evaluateStoppingRule(prereg, observations, referenceChecks);
  const mcNemar = mcNemarExact(observations);

  return {
    quotaLabel,
    baselineScenarioIds,
    treatedScenarioIds,
    baselineActivatedCount: baselineParams.filter(isActivated).length,
    treatedActivatedCount: treatedParams.filter(isActivated).length,
    referenceCleanUnderBaseline,
    referenceCleanUnderTreated,
    perMutant,
    stoppingRule,
    mcNemar,
  };
}

const SHIPPED_QUOTA = 24; // matches selectMeasuredSet's own 18-activated + 6-control total
const SMALL_QUOTA = 3; // stress size: small enough that a uniform draw could plausibly miss activation

export function runPilot(operatorSchema: OperatorTreatmentSchema): PilotResult {
  const operator = operatorTreatment(operatorSchema, "hidden-scenario-selection-targets-narrow-mutants");
  const space = enumerateSpace();

  const shippedSize = runSizedComparison(
    operator,
    `shipped-n${SHIPPED_QUOTA}`,
    selectNaiveBaseline(space, SHIPPED_QUOTA),
    selectMeasuredSet(space),
  );
  const smallSize = runSizedComparison(
    operator,
    `small-n${SMALL_QUOTA}`,
    selectNaiveBaseline(space, SMALL_QUOTA),
    selectSmallTargeted(space, SMALL_QUOTA),
  );

  return { operatorId: operator.id, shippedSize, smallSize };
}
