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
//   instances   generating graded cells inside a finished family. Effectively free, and the whole
//               reason families beat hand-authored tasks.
//
// WHAT THE UNIT IS, because this model got it wrong for three phases. A FAMILY is what gets built. A
// DELIVERABLE TASK is an independently gradeable package a recipient can be handed, and this
// repository emits exactly ONE per family. A GRADED CELL is one scenario-check pair inside that
// package, and there are hundreds. The model used to multiply families by 24 cells and call the
// product "shipped tasks", which inflated the headline 24-fold against anything anyone could
// receive. The three are now separate fields and the report quotes all three.
//
// The lever that matters is therefore `deliverableTasksPerFamily`, and it is currently 1. Raising it
// is what the deliverable exporter is for, and two instances count as distinct only if a knob
// separates them that changes the expected answer — nine inert knobs of fourteen, as one family
// here shipped, are not nine instances. `handAuthoredComparison` computes the degenerate case
// explicitly, because the contrast is the answer to the question rather than a footnote to it.
//
// Every default here is either measured in the source project or labelled as an assumption in the
// generated report. The planner does not invent a labour rate: the caller must supply one, and
// `budget-check.ts` rejects a plan that quietly sets it to zero.

export interface BudgetInputs {
  readonly totalUsd: number;
  /** Fully-loaded engineering cost per hour. Caller-supplied: this is the dominant term. */
  readonly labourRateUsdPerHour: number;
  /**
   * Authoring hours for one shippable family.
   *
   * ESTIMATED, not measured, and the report says so. No timesheet was ever kept; the shipped family
   * took weeks.
   *
   * The value is 45. The nineteen task shapes this repository declares estimate their own builds at
   * 18 to 120 hours, mean 65.5 — so 45 is NOT below the low end, it is 31% below the MEAN of the
   * author's own estimates, and the flagship `durable-approval-outbox` declares 120, which is 2.7x
   * it. (An earlier revision of this comment said "between 55 and 120 … below the low end". That was
   * wrong in both halves; three shapes declare 18, 36 and 40.)
   *
   * Build hours are declared in two places and neither is measured: `examples/shapes/*.json` (19
   * shapes, mean 65.5) and `BuiltFamily.estimatedBuildHours` in `src/families/registry.ts` (9 built
   * families, mean 66.0). The dao descendant carries 120 here as the parent's from-scratch estimate;
   * its measured 0.18 h marginal build remains quarantined in `descendantBuildHours`.
   *
   * 45 is retained rather than raised because raising it silently would change the headline without
   * new evidence. The sensitivity table spans the declared range, and that is where a reader should
   * look.
   */
  readonly hoursPerFamily: number;
  /**
   * Hours to derive a DESCENDANT from an existing proven mechanism. **Measured, once.**
   *
   * 0.18 hours, wall clock, Phase 9: the controlling-parameter fuzz (72 runs), the amplification
   * sweep (108), a narrow adversary, the independent-fatality screen (216 runs across two engines)
   * and the activation audit (36). First and only build figure either repository has MEASURED rather
   * than estimated.
   *
   * THE CAVEAT IS PART OF THE NUMBER AND MUST TRAVEL WITH IT. A descendant inherits a working spec,
   * harness, verifier, reference engine and cheat oracles. **It is not `hoursPerFamily` and must
   * never be substituted for it.** `hoursPerFamily` stays a labelled ESTIMATE across the declared
   * 55-120 until a family is built from nothing and timed.
   *
   * What it does establish is the marginal cost of a second task once a mechanism is proven, which is
   * the only regime where this repository has evidence.
   */
  readonly descendantBuildHours: number;
  /** Hours spent screening ONE candidate before it is killed or promoted. */
  readonly hoursPerScreenedCandidate: number;
  /** Families shipped per candidate screened. 1-in-10 measured across ten design cycles. */
  readonly cycleHitRate: number;
  /** Frontier matrices consumed per shipped family. 3 measured (201-, 245-, 267-check rounds). */
  readonly matricesPerFamily: number;
  /**
   * Cost of ONE frontier trial, measured.
   *
   * Replaces a per-matrix figure that hid how many runs a matrix is and what each one cost. The
   * value is the mean of the 28 recorded Harbor trials over $0.50 that PRODUCED A VERDICT, in
   * `data/measured-trial-costs.json`. Runs that spent money and returned nothing are excluded here
   * and priced separately by `lostRunRate`, so the two numbers do not double-count. It is deliberately a MEAN and not a median: the
   * distribution is bimodal by lab (Anthropic median $15.20, OpenAI $3.28) and a plan that buys
   * cross-lab evidence buys both.
   */
  readonly usdPerTrial: number;
  /** Runs in one matrix. 6 = 3 subjects x 2 labs, which is what a cross-lab claim costs. */
  readonly trialsPerMatrix: number;
  /**
   * Fraction of STARTED trials that spend money and return no verdict.
   *
   * Measured, and never priced before this. Across the 30 recorded runs over $0.50 in
   * `data/measured-trial-costs.json`, 2 were lost — a machine shut down mid-flight, and a harness
   * that raised `NetworkConnectionError` after 1,012 output tokens. That is 6.7% of runs and 10.7%
   * of spend, because the runs that die tend to die late.
   *
   * A plan that prices only the runs that finished is making the same optimistic error as one that
   * prices only the families that shipped, and this project made both for four phases. Buying N
   * verdicts costs `N / (1 - lostRunRate)` runs.
   */
  readonly lostRunRate: number;
  /** Infrastructure re-run tax: runs discarded for API/Docker/timeout reasons. 0.15 measured. */
  readonly retryRate: number;
  /**
   * Independently gradeable packages ONE family emits.
   *
   * This is the deliverable unit, and it is 1. The repository emits one challenge package per
   * family; the 24 scenarios inside it are graded cells of that one package, not 24 tasks. The old
   * model multiplied families by 24 and called the product `shippedTasks`, which inflated the
   * headline by a factor of 24 against anything a recipient could actually be handed.
   *
   * Raising this above 1 is what the deliverable exporter is for, and two instances count as
   * distinct only if a knob separates them that changes the expected answer.
   */
  readonly deliverableTasksPerFamily: number;
  /** Graded cells inside one deliverable: scenarios x checks. Scale, not deliverable count. */
  readonly hiddenCellsPerTask: number;
  /**
   * Independent axes a family is expected to yield.
   *
   * 2, measured. The durable-approval-outbox suite — 24 scenarios, 267 checks, the best thing this
   * project built — has an antichain width of 2 over the six agents that failed it. The previous
   * value of 3 was the width over the per-check cells pooled ACROSS both labs; inside either lab it
   * is 2, and 2 is what a plan should buy against.
   */
  readonly axesPerFamily: number;
  /**
   * Fraction of BUILT families that die after they are built.
   *
   * Distinct from `cycleHitRate`, which prices the candidates killed before anyone writes code. This
   * is the expensive kind of death: the family exists, its verifier works, its axis count is
   * measured, and a trial says every model solves it. One of the two families this repository built
   * died that way, so the measured rate is 1 in 2 — on a sample of two, which the report says.
   */
  readonly postBuildKillRate: number;
  /** Fraction of authoring hours a descendant reuses from its parent — harness, checker, packaging. */
  readonly descendantReuse: number;
}

export interface BudgetPlan {
  readonly inputs: BudgetInputs;
  readonly screeningUsdPerFamily: number;
  readonly authoringUsdPerFamily: number;
  readonly trialUsdPerFamily: number;
  readonly loadedUsdPerFamily: number;
  readonly families: number;
  /** Independently gradeable packages a recipient could be handed. The deliverable unit. */
  readonly deliverableTasks: number;
  /** Graded cells across those deliverables. Scale of the hidden suite, not a deliverable count. */
  readonly gradedCells: number;
  readonly expectedAxes: number;
  readonly usdPerDeliverableTask: number;
  /**
   * Dollars per independent axis.
   *
   * The number the whole argument turns on, computed since the first version of this file and
   * rendered by nothing. The report's own thesis is that axes are what is worth quoting; it then
   * quoted tasks. It is now rendered.
   */
  readonly usdPerAxis: number;
  readonly labourUsd: number;
  readonly modelUsd: number;
  readonly labourShare: number;
  readonly impliedEngineerYears: number;
  readonly candidatesScreened: number;
  /** Families actually built, including the ones that die after being built. */
  readonly familiesBuilt: number;
  readonly familiesKilledAfterBuild: number;
}

/** Working hours in an engineer-year. Stated rather than buried so the reader can disagree with it. */
export const HOURS_PER_ENGINEER_YEAR = 1800;

/**
 * How many families you must BUILD to ship one, given the rate at which built families die.
 *
 * These used to be two independent inputs — `postBuildKillRate` and `evolutionCyclesPerSurvivor` —
 * and only one of them was ever read. The plan derived "7 killed of 14 built" from the cycle count
 * while the kill rate sat unused beside it, and the two happened to agree at 50%, which is the kind
 * of coincidence that keeps a defect invisible for three phases. They are one quantity: if half of
 * built families die, shipping one costs two builds. Deriving it means they cannot disagree.
 */
/**
 * What one matrix actually costs, including the runs that will be bought and lost.
 *
 * Exported because `lineage.ts` was computing this independently to price avoided and deferred
 * matrices, so the two could — and did — drift the moment the measured per-trial cost moved. One
 * definition, one place.
 */
export function usdPerMatrix(
  inputs: Pick<BudgetInputs, "usdPerTrial" | "trialsPerMatrix" | "lostRunRate">,
): number {
  const runs = inputs.trialsPerMatrix / Math.max(1e-9, 1 - inputs.lostRunRate);
  return inputs.usdPerTrial * runs;
}

export function buildsPerShippedFamily(postBuildKillRate: number): number {
  const survival = 1 - postBuildKillRate;
  return survival > 0 ? 1 / survival : Number.POSITIVE_INFINITY;
}

export function planBudget(inputs: BudgetInputs): BudgetPlan {
  const screeningHours = (1 / inputs.cycleHitRate) * inputs.hoursPerScreenedCandidate;
  const screeningUsdPerFamily = screeningHours * inputs.labourRateUsdPerHour;

  // Authoring now prices the LINEAGE rather than the family. A survivor costs one full build plus
  // `evolutionCyclesPerSurvivor - 1` descendants, each of which reuses part of its parent's harness.
  // Pricing only the survivor is the same error as pricing only the counted trial runs: it charges
  // for the work that succeeded and omits the work that produced it.
  const buildsPerSurvivor = buildsPerShippedFamily(inputs.postBuildKillRate);
  const descendants = Math.max(0, buildsPerSurvivor - 1);
  const lineageHours =
    inputs.hoursPerFamily + descendants * inputs.hoursPerFamily * (1 - inputs.descendantReuse);
  const authoringUsdPerFamily = lineageHours * inputs.labourRateUsdPerHour;

  // Every family in the lineage is trialed, including the ones that die — that is HOW they die.
  const trialUsdPerFamily =
    buildsPerSurvivor * inputs.matricesPerFamily * usdPerMatrix(inputs) * (1 + inputs.retryRate);
  const loadedUsdPerFamily = screeningUsdPerFamily + authoringUsdPerFamily + trialUsdPerFamily;

  const families = loadedUsdPerFamily > 0 ? Math.floor(inputs.totalUsd / loadedUsdPerFamily) : 0;
  const deliverableTasks = families * inputs.deliverableTasksPerFamily;
  const gradedCells = deliverableTasks * inputs.hiddenCellsPerTask;
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
    deliverableTasks,
    gradedCells,
    expectedAxes,
    usdPerDeliverableTask: deliverableTasks > 0 ? spent / deliverableTasks : Number.POSITIVE_INFINITY,
    usdPerAxis: expectedAxes > 0 ? spent / expectedAxes : Number.POSITIVE_INFINITY,
    labourUsd,
    modelUsd,
    labourShare: spent > 0 ? labourUsd / spent : 0,
    impliedEngineerYears: (families * (screeningHours + lineageHours)) / HOURS_PER_ENGINEER_YEAR,
    candidatesScreened: Math.round(families / inputs.cycleHitRate),
    familiesBuilt: Math.round(families * buildsPerSurvivor),
    familiesKilledAfterBuild: Math.round(families * (buildsPerSurvivor - 1)),
  };
}

/**
 * The degenerate case: every task hand-authored, so every task is its own family.
 *
 * This is what "1,000 diverse tasks" means if you take it literally, and pricing it is the shortest
 * route to showing why the answer has to be families rather than tasks.
 */
export function handAuthoredComparison(inputs: BudgetInputs): BudgetPlan {
  // `axesPerFamily: 1` as well as the unit fields, and the axis one is easy to forget. A family yields several axes because its instances sample different regions of one
  // declared space; a single hand-authored task has no such space to sample, so it measures at most
  // one thing. Carrying the family's axis count into this comparison would flatter hand-authoring
  // with diversity it cannot have.
  return planBudget({ ...inputs, deliverableTasksPerFamily: 1, hiddenCellsPerTask: 1, axesPerFamily: 1 });
}

/**
 * Defaults drawn from the source project. Measured values are marked in the generated report; the
 * labour rate is deliberately NOT defaulted here — see `budget-check.ts`.
 */
export const MEASURED_DEFAULTS: Omit<BudgetInputs, "totalUsd" | "labourRateUsdPerHour"> = {
  hoursPerFamily: 45,
  descendantBuildHours: 0.18,
  hoursPerScreenedCandidate: 3,
  cycleHitRate: 0.1,
  matricesPerFamily: 3,
  // Mean of 19 real trials over $0.50 in `data/measured-trial-costs.json`. The model previously
  // carried a $3.50 literal under a heading that said "measured"; the measurement, when finally
  // taken, was 2.8x that.
  // Mean of the 28 recorded runs over $0.50 that actually produced a verdict.
  usdPerTrial: 9.62,
  trialsPerMatrix: 6,
  // 2 of 30 recorded runs spent money and returned nothing. See the field docstring.
  lostRunRate: 0.0667,
  retryRate: 0.15,
  // ONE package per family. This is what the repository actually emits, and it is the number the
  // headline was inflated 24-fold by not using.
  deliverableTasksPerFamily: 1,
  hiddenCellsPerTask: 24,
  // Measured on the outbox, inside a single lab. See the field docstring.
  axesPerFamily: 2,
  // 1 of 2 families built here died after being built. A sample of two, stated as such wherever it
  // is used, and the direction is the one that matters: the rate is not zero, and a plan assuming
  // 100% survival is the optimistic fiction `budget-check.ts` exists to reject.
  postBuildKillRate: 0.5,
  // The descendant reused the trial layer, the challenge packager, the axis meter and the report
  // pipeline, and reused none of the domain model. Roughly a third, measured by neither of us.
  descendantReuse: 0.35,
};
