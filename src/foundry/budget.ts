// The budget model, and the arithmetic that answers "with $100k, what do we actually buy?"
//
// The naive answer prices frontier trials and stops: $100k divided by the cost of a matrix gives a
// four-figure task count, and that number is wrong by an order of magnitude because it prices the
// part that is not binding. In the project this grew out of, the entire frontier spend across ten
// design cycles, two built task families and thirty-five runs was $252.51. The authoring was weeks.
// Model spend is not what runs out.
//
// So the model here has four cost centres, and labour dominates three of them:
//
//   screening   the candidates you kill to find one worth building. At a 1-in-10 cycle hit rate you
//               pay for ten screens per shipped family, and eight of ten cost $0 in model spend.
//   authoring   the family itself: declared behaviour space, reference, verifier, mutant bank.
//   trials      frontier matrices, plus an infrastructure re-run tax.
//   instances   generating graded points inside a finished family. Effectively free, and the whole
//               reason families beat hand-authored tasks.
//
// The lever that matters is `instancesPerFamily`. At 1 it degenerates to hand-authoring every task
// and the budget buys almost nothing; above ~20 the marginal task approaches the cost of a fuzz
// sweep. `handAuthoredComparison` computes that degenerate case explicitly, because the contrast is
// the answer to the question rather than a footnote to it.
//
// Every default here is either measured in the source project or labelled as an assumption in the
// generated report. The planner does not invent a labour rate: the caller must supply one, and
// `budget-check.ts` rejects a plan that quietly sets it to zero.

export interface BudgetInputs {
  readonly totalUsd: number;
  /** Fully-loaded engineering cost per hour. Caller-supplied: this is the dominant term. */
  readonly labourRateUsdPerHour: number;
  /** Authoring hours for one shippable family. ~45 h measured for the durable outbox. */
  readonly hoursPerFamily: number;
  /** Hours spent screening ONE candidate before it is killed or promoted. */
  readonly hoursPerScreenedCandidate: number;
  /** Families shipped per candidate screened. 1-in-10 measured across ten design cycles. */
  readonly cycleHitRate: number;
  /** Frontier matrices consumed per shipped family. 3 measured (201-, 245-, 267-check rounds). */
  readonly matricesPerFamily: number;
  /** Cost of one full matrix. $48.66 measured for the shipped six-trial matrix. */
  readonly usdPerMatrix: number;
  /** Infrastructure re-run tax: runs discarded for API/Docker/timeout reasons. 0.15 measured. */
  readonly retryRate: number;
  /** Graded instances generated inside a finished family. */
  readonly instancesPerFamily: number;
  /** Independent axes a family is expected to yield. 3 measured for the durable outbox. */
  readonly axesPerFamily: number;
}

export interface BudgetPlan {
  readonly inputs: BudgetInputs;
  readonly screeningUsdPerFamily: number;
  readonly authoringUsdPerFamily: number;
  readonly trialUsdPerFamily: number;
  readonly loadedUsdPerFamily: number;
  readonly families: number;
  readonly shippedTasks: number;
  readonly expectedAxes: number;
  readonly usdPerShippedTask: number;
  readonly usdPerAxis: number;
  readonly labourUsd: number;
  readonly modelUsd: number;
  readonly labourShare: number;
  readonly impliedEngineerYears: number;
  readonly candidatesScreened: number;
}

/** Working hours in an engineer-year. Stated rather than buried so the reader can disagree with it. */
export const HOURS_PER_ENGINEER_YEAR = 1800;

export function planBudget(inputs: BudgetInputs): BudgetPlan {
  const screeningHours = (1 / inputs.cycleHitRate) * inputs.hoursPerScreenedCandidate;
  const screeningUsdPerFamily = screeningHours * inputs.labourRateUsdPerHour;
  const authoringUsdPerFamily = inputs.hoursPerFamily * inputs.labourRateUsdPerHour;
  const trialUsdPerFamily = inputs.matricesPerFamily * inputs.usdPerMatrix * (1 + inputs.retryRate);
  const loadedUsdPerFamily = screeningUsdPerFamily + authoringUsdPerFamily + trialUsdPerFamily;

  const families = loadedUsdPerFamily > 0 ? Math.floor(inputs.totalUsd / loadedUsdPerFamily) : 0;
  const shippedTasks = families * inputs.instancesPerFamily;
  const expectedAxes = families * inputs.axesPerFamily;

  const labourUsd = families * (screeningUsdPerFamily + authoringUsdPerFamily);
  const modelUsd = families * trialUsdPerFamily;
  const spent = labourUsd + modelUsd;

  return {
    inputs,
    screeningUsdPerFamily,
    authoringUsdPerFamily,
    trialUsdPerFamily,
    loadedUsdPerFamily,
    families,
    shippedTasks,
    expectedAxes,
    usdPerShippedTask: shippedTasks > 0 ? spent / shippedTasks : Number.POSITIVE_INFINITY,
    usdPerAxis: expectedAxes > 0 ? spent / expectedAxes : Number.POSITIVE_INFINITY,
    labourUsd,
    modelUsd,
    labourShare: spent > 0 ? labourUsd / spent : 0,
    impliedEngineerYears: (families * (screeningHours + inputs.hoursPerFamily)) / HOURS_PER_ENGINEER_YEAR,
    candidatesScreened: Math.round(families / inputs.cycleHitRate),
  };
}

/**
 * The degenerate case: every task hand-authored, so every task is its own family.
 *
 * This is what "1,000 diverse tasks" means if you take it literally, and pricing it is the shortest
 * route to showing why the answer has to be families rather than tasks.
 */
export function handAuthoredComparison(inputs: BudgetInputs): BudgetPlan {
  // `axesPerFamily: 1` as well as `instancesPerFamily: 1`, and the second is the one that is easy to
  // forget. A family yields several axes because its instances sample different regions of one
  // declared space; a single hand-authored task has no such space to sample, so it measures at most
  // one thing. Carrying the family's axis count into this comparison would flatter hand-authoring
  // with diversity it cannot have.
  return planBudget({ ...inputs, instancesPerFamily: 1, axesPerFamily: 1 });
}

/** What it would cost to reach a target task count under these assumptions. */
export function costOfTarget(inputs: BudgetInputs, targetTasks: number): number {
  const perFamily = planBudget(inputs).loadedUsdPerFamily;
  const familiesNeeded = Math.ceil(targetTasks / Math.max(1, inputs.instancesPerFamily));
  return familiesNeeded * perFamily;
}

/**
 * Defaults drawn from the source project. Measured values are marked in the generated report; the
 * labour rate is deliberately NOT defaulted here — see `budget-check.ts`.
 */
export const MEASURED_DEFAULTS: Omit<BudgetInputs, "totalUsd" | "labourRateUsdPerHour"> = {
  hoursPerFamily: 45,
  hoursPerScreenedCandidate: 3,
  cycleHitRate: 0.1,
  matricesPerFamily: 3,
  usdPerMatrix: 48.66,
  retryRate: 0.15,
  instancesPerFamily: 24,
  axesPerFamily: 3,
};
