// Phase 22 Lane 2 — the generic operator-experiment orchestrator.
//
// Everything family-specific lives behind an OperatorAdapter (operator-adapter.ts); everything here is
// bookkeeping any adapter can reuse: build the matched pair, mechanically confirm it only differs in
// the operator's declared field (src/phase-21/matched-pair.ts, reused unchanged), grade the mutant bank
// under both selectors, and hand the resulting matched observations to the stopping rule
// (src/phase-21/stopping-rule.ts, reused unchanged).
//
// STATISTICAL DISCIPLINE, per Phase 22's mandate: this family's mutants are hand-authored and
// mechanism-correlated, not independent statistical samples. `CoverageRunResult.primary` — the exact
// paired coverage counts and discordances — is the primary, descriptive result; report it first and
// report it always. `CoverageRunResult.secondaryCaveated` carries McNemar's p-value ONLY as a secondary
// statistic under a named, stated independence assumption the mutant construction does not actually
// satisfy. Never describe either as "statistically established," a "general effect," or a "transferable
// rule" — those claims are exactly what a handful of correlated, hand-built mutants cannot support.

import { requireMatchedPair } from "../phase-21/matched-pair.js";
import type { OperatorTreatment } from "../phase-21/operator-schema.js";
import { evaluateStoppingRule, mcNemarExact } from "../phase-21/stopping-rule.js";
import type {
  MatchedObservation,
  McNemarResult,
  StoppingDecision,
  StoppingRulePreregistration,
} from "../phase-21/stopping-rule.js";
import type { OperatorAdapter } from "./operator-adapter.js";

export type EnvelopeBank = "development" | "heldOut";

export interface MutantCoverageRow {
  readonly mutantId: string;
  readonly intendedCheck: string;
  readonly caughtByNaive: boolean;
  readonly caughtByTargeted: boolean;
}

export interface CoveragePrimaryResult {
  readonly mutantCount: number;
  readonly caughtByNaiveCount: number;
  readonly caughtByTargetedCount: number;
  /** Naive missed it, targeted caught it — the direction the operator's causal claim predicts. */
  readonly discordantTargetedWins: number;
  /** Targeted missed it, naive caught it — the direction the operator's causal claim forbids. */
  readonly discordantNaiveWins: number;
  readonly concordant: number;
}

export interface CoverageSecondaryCaveated {
  readonly pValueTwoSided: number;
  readonly independenceAssumption: string;
  readonly caveat: string;
}

export interface CoverageRunResult {
  readonly familyId: string;
  readonly operatorId: string;
  readonly adapterVersion: string;
  readonly bank: EnvelopeBank;
  readonly quota: number;
  readonly naiveScenarioCount: number;
  readonly targetedScenarioCount: number;
  readonly referenceCleanUnderNaive: boolean;
  readonly referenceCleanUnderTargeted: boolean;
  readonly perMutant: readonly MutantCoverageRow[];
  readonly primary: CoveragePrimaryResult;
  readonly secondaryCaveated: CoverageSecondaryCaveated;
  readonly stoppingRule: StoppingDecision;
}

const INDEPENDENCE_CAVEAT =
  "This family's mutants are hand-authored variations of a small number of mechanisms, not " +
  "independent random samples; McNemar's exact test assumes independent discordant pairs, which this " +
  "population does not satisfy. This p-value is reported only as a secondary, explicitly-caveated " +
  "statistic — the exact discordant/concordant counts above are the primary evidence.";

export function runCoverageExperiment(
  adapter: OperatorAdapter,
  operator: OperatorTreatment,
  bank: EnvelopeBank,
  quota: number,
  prereg: StoppingRulePreregistration,
): CoverageRunResult {
  const space = adapter.enumerateScenarioSpace();
  const naiveParams = adapter.selectNaive(space, quota);
  const targetedParams = adapter.selectTargeted(space, quota);
  const naiveScenarios = adapter.buildScenarios(naiveParams);
  const targetedScenarios = adapter.buildScenarios(targetedParams);

  requireMatchedPair(operator, {
    sharedComponentDescriptions: adapter.sharedComponentDescriptions,
    baselineDeltaFields: { "scenario selection function only": naiveParams },
    treatedDeltaFields: { "scenario selection function only": targetedParams },
  });

  const referenceCleanUnderNaive = naiveScenarios.every(
    (s) => adapter.gradeCell(s, adapter.referenceSubject).failures.length === 0,
  );
  const referenceCleanUnderTargeted = targetedScenarios.every(
    (s) => adapter.gradeCell(s, adapter.referenceSubject).failures.length === 0,
  );

  const mutants = adapter.mutantEnvelope[bank];
  const perMutant: MutantCoverageRow[] = mutants.map((mutant) => ({
    mutantId: mutant.id,
    intendedCheck: mutant.intendedCheck,
    caughtByNaive: naiveScenarios.some((s) =>
      adapter.gradeCell(s, mutant.subject).failures.includes(mutant.intendedCheck),
    ),
    caughtByTargeted: targetedScenarios.some((s) =>
      adapter.gradeCell(s, mutant.subject).failures.includes(mutant.intendedCheck),
    ),
  }));

  const observations: MatchedObservation[] = perMutant.map((m) => ({
    unitId: m.mutantId,
    baseline: m.caughtByNaive ? 1 : 0,
    treated: m.caughtByTargeted ? 1 : 0,
  }));
  const mcNemar: McNemarResult = mcNemarExact(observations);
  const referenceChecks = [
    { unitId: "reference-under-naive", referencePassed: referenceCleanUnderNaive },
    { unitId: "reference-under-targeted", referencePassed: referenceCleanUnderTargeted },
  ];
  const stoppingRule = evaluateStoppingRule(prereg, observations, referenceChecks);

  const primary: CoveragePrimaryResult = {
    mutantCount: perMutant.length,
    caughtByNaiveCount: perMutant.filter((m) => m.caughtByNaive).length,
    caughtByTargetedCount: perMutant.filter((m) => m.caughtByTargeted).length,
    discordantTargetedWins: mcNemar.discordantTreatedWins,
    discordantNaiveWins: mcNemar.discordantBaselineWins,
    concordant: mcNemar.concordant,
  };

  return {
    familyId: adapter.familyId,
    operatorId: adapter.operatorId,
    adapterVersion: adapter.adapterVersion,
    bank,
    quota,
    naiveScenarioCount: naiveScenarios.length,
    targetedScenarioCount: targetedScenarios.length,
    referenceCleanUnderNaive,
    referenceCleanUnderTargeted,
    perMutant,
    primary,
    secondaryCaveated: {
      pValueTwoSided: mcNemar.pValueTwoSided,
      independenceAssumption: "discordant pairs are i.i.d. Bernoulli(0.5) under the null",
      caveat: INDEPENDENCE_CAVEAT,
    },
    stoppingRule,
  };
}
