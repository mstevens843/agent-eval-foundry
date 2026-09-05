// Phase 21's sequential stopping-rule engine for a two-arm matched-pair experiment.
//
// EXTENDS, DOES NOT REPLACE, src/phase-14/measurement.ts
//
// Phase 14 already has: exact single-arm confidence intervals (Clopper-Pearson), a blind
// cross-provider failure-cause adjudication pattern, and — most valuably — `observedRow`'s
// trial-integrity verification (a preserved trial's model/effort/scenario-set/isolation/challenge-
// hash/preregistration-hash must all match before it is trusted, fail-closed via `RigInputError`).
// None of that is duplicated here. What Phase 14 does NOT have, confirmed by a dedicated Lane 0 audit
// (data/phase-21-preregistration.json): a paired-binary significance test (its one real matched-pair
// estimand, E2-starter, uses a bare mean of paired differences with an explicit "limits causal
// precision" disclaimer), and no validity-regression early-stop trigger at all (its
// `fixedValidityControls` are asserted once before a run, never monitored during it). This file adds
// exactly those two things, generically, so a future stochastic (real-agent) matched-pair experiment
// can reuse it instead of hand-rolling significance testing again.
//
// A MATCHED PAIR here is one (baseline outcome, treated outcome) observation from the SAME underlying
// unit (the same scenario, the same mutant, or the same agent attempt number) — never two independent
// samples. McNemar's exact test is the correct closed-form test for this shape: it only uses the
// DISCORDANT pairs (baseline and treated disagree) and asks whether they split evenly.

export type BinaryOutcome = 0 | 1;

export interface MatchedObservation {
  /** What this pair is an observation OF — a scenario id, a mutant id, an attempt number. */
  readonly unitId: string;
  /** 1 = passed/solved/caught (family-appropriate "good" outcome), 0 = did not. */
  readonly baseline: BinaryOutcome;
  readonly treated: BinaryOutcome;
}

export interface StoppingRulePreregistration {
  readonly experimentId: string;
  readonly operatorId: string;
  /** Minimum matched pairs before ANY uplift/null verdict may be drawn, however the data looks. */
  readonly minimumMatchedPairs: number;
  /** Two-sided significance level for McNemar's exact test. */
  readonly alpha: number;
  /**
   * A validity regression: the known-good reference arm failing at all is disqualifying, because it
   * means the "baseline" or "treated" construction itself is broken, not that the operator has an
   * effect. Recorded per pair, checked every time a pair arrives.
   */
  readonly referenceMustPass: boolean;
  /** Hard ceiling on matched pairs collected before the experiment is abandoned rather than continued. */
  readonly maximumMatchedPairs: number;
}

export type StoppingDecision =
  | { readonly kind: "continue"; readonly reason: string }
  | { readonly kind: "stop-uplift"; readonly reason: string; readonly pValueTwoSided: number }
  | { readonly kind: "stop-null"; readonly reason: string; readonly pValueTwoSided: number }
  | { readonly kind: "stop-validity-regression"; readonly reason: string; readonly failingUnitId: string }
  | { readonly kind: "stop-max-pairs-exhausted"; readonly reason: string };

export interface McNemarResult {
  readonly discordantTreatedWins: number;
  readonly discordantBaselineWins: number;
  readonly concordant: number;
  readonly pValueTwoSided: number;
}

/**
 * log(n!) via a simple accumulation — n stays small (matched-pair counts, never a stochastic budget).
 * `n` is always a non-negative discordant-pair count derived from array lengths in this module's own
 * call sites, so there is no reachable negative-input case to guard here.
 */
function logFactorial(n: number): number {
  let sum = 0;
  for (let i = 2; i <= n; i += 1) sum += Math.log(i);
  return sum;
}

function logBinomialCoefficient(n: number, k: number): number {
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

/** P(X = k) for X ~ Binomial(n, 0.5), computed in log-space then exponentiated once. */
function binomialPmfHalf(n: number, k: number): number {
  return Math.exp(logBinomialCoefficient(n, k) - n * Math.log(2));
}

/**
 * McNemar's EXACT test: two-sided p-value from the binomial distribution over discordant pairs.
 * Standard construction: sum the PMF over every count at least as extreme as the observed minority
 * count, doubled and capped at 1 (equivalent to summing both tails for a symmetric null).
 */
export function mcNemarExact(observations: readonly MatchedObservation[]): McNemarResult {
  let discordantTreatedWins = 0; // baseline=0, treated=1
  let discordantBaselineWins = 0; // baseline=1, treated=0
  let concordant = 0;
  for (const obs of observations) {
    if (obs.baseline === obs.treated) concordant += 1;
    else if (obs.treated === 1) discordantTreatedWins += 1;
    else discordantBaselineWins += 1;
  }
  const n = discordantTreatedWins + discordantBaselineWins;
  if (n === 0) {
    return { discordantTreatedWins, discordantBaselineWins, concordant, pValueTwoSided: 1 };
  }
  const k = Math.min(discordantTreatedWins, discordantBaselineWins);
  let tail = 0;
  for (let i = 0; i <= k; i += 1) tail += binomialPmfHalf(n, i);
  const pValueTwoSided = Math.min(1, 2 * tail);
  return { discordantTreatedWins, discordantBaselineWins, concordant, pValueTwoSided };
}

/**
 * Evaluate the current state of a sequential matched-pair experiment against its preregistration.
 * Called after every new matched pair arrives (or once, over a completed local pilot's full set).
 */
export function evaluateStoppingRule(
  prereg: StoppingRulePreregistration,
  observations: readonly MatchedObservation[],
  referenceCheck: { readonly unitId: string; readonly referencePassed: boolean }[] = [],
): StoppingDecision {
  if (prereg.referenceMustPass) {
    const failing = referenceCheck.find((r) => !r.referencePassed);
    if (failing !== undefined) {
      return {
        kind: "stop-validity-regression",
        reason: `reference arm failed on unit "${failing.unitId}"; the construction itself is broken, not the operator's effect`,
        failingUnitId: failing.unitId,
      };
    }
  }
  if (observations.length < prereg.minimumMatchedPairs) {
    return {
      kind: "continue",
      reason: `${observations.length}/${prereg.minimumMatchedPairs} minimum matched pairs collected`,
    };
  }
  const result = mcNemarExact(observations);
  if (result.pValueTwoSided <= prereg.alpha) {
    const direction = result.discordantTreatedWins > result.discordantBaselineWins ? "uplift" : "regression";
    return {
      kind: "stop-uplift",
      reason: `McNemar's exact test significant at alpha=${prereg.alpha} (p=${result.pValueTwoSided.toFixed(4)}), direction=${direction}`,
      pValueTwoSided: result.pValueTwoSided,
    };
  }
  if (observations.length >= prereg.maximumMatchedPairs) {
    if (result.discordantTreatedWins + result.discordantBaselineWins === 0) {
      return {
        kind: "stop-null",
        reason: `maximum ${prereg.maximumMatchedPairs} matched pairs reached with zero discordant pairs — no detectable effect either way`,
        pValueTwoSided: result.pValueTwoSided,
      };
    }
    return {
      kind: "stop-max-pairs-exhausted",
      reason: `maximum ${prereg.maximumMatchedPairs} matched pairs reached without significance`,
    };
  }
  return {
    kind: "continue",
    reason: `p=${result.pValueTwoSided.toFixed(4)} not significant at alpha=${prereg.alpha}; ${observations.length}/${prereg.maximumMatchedPairs} pairs collected`,
  };
}
