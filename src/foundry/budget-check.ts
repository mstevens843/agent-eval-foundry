// The budget sanity checker, written against the plan rather than inside the planner.
//
// The specific fake this exists to catch: a plan claiming a thousand hard hand-designed tasks for
// $100k. That plan is always constructed the same way — price the frontier trials, omit the labour,
// and divide. It is arithmetically valid and completely wrong, and it is the plan a reader will
// arrive with. So the checker refuses a plan whose labour cost is zero or negligible, and refuses
// one whose implied engineering time does not fit inside the money it claims to spend.
//
// Note what is NOT checked: whether the assumptions are right. A plan with a 200-hour family and a
// 1-in-2 hit rate passes here, because those are judgements a reader is entitled to disagree with.
// What cannot pass is a plan that is internally inconsistent, or one that hides its dominant cost.

import { type BudgetInputs, type BudgetPlan, HOURS_PER_ENGINEER_YEAR } from "./budget.js";
import { fail } from "./schema.js";

/**
 * Below this share, labour is being treated as free. Set low deliberately: the point is to catch
 * plans that omit labour entirely or price it at a token rate, not to referee reasonable estimates.
 */
export const MIN_LABOUR_SHARE = 0.5;

/** A family authored in under this many hours is not a family with a verifier and a mutant bank. */
export const MIN_PLAUSIBLE_FAMILY_HOURS = 4;

export function assertBudgetInputs(i: BudgetInputs): void {
  const positive: readonly (readonly [string, number])[] = [
    ["totalUsd", i.totalUsd],
    ["labourRateUsdPerHour", i.labourRateUsdPerHour],
    ["hoursPerFamily", i.hoursPerFamily],
    ["hoursPerScreenedCandidate", i.hoursPerScreenedCandidate],
    ["cycleHitRate", i.cycleHitRate],
    ["matricesPerFamily", i.matricesPerFamily],
    ["instancesPerFamily", i.instancesPerFamily],
    ["axesPerFamily", i.axesPerFamily],
  ];
  for (const [name, value] of positive) {
    if (!Number.isFinite(value) || value <= 0) {
      fail("BUDGET_NEGATIVE_INPUT", `budget.${name}`, `must be a positive finite number, got ${value}`);
    }
  }
  if (i.usdPerMatrix < 0 || !Number.isFinite(i.usdPerMatrix)) {
    fail("BUDGET_NEGATIVE_INPUT", "budget.usdPerMatrix", `must be zero or positive, got ${i.usdPerMatrix}`);
  }
  if (i.cycleHitRate > 1) {
    fail(
      "BUDGET_NEGATIVE_INPUT",
      "budget.cycleHitRate",
      `a hit rate above 1 means more families ship than candidates screened, got ${i.cycleHitRate}`,
    );
  }
  if (!Number.isFinite(i.retryRate) || i.retryRate < 0 || i.retryRate > 1) {
    fail(
      "BUDGET_RETRY_RATE_OUT_OF_RANGE",
      "budget.retryRate",
      `expected a fraction in [0, 1], got ${i.retryRate}; a rate above 1 means every run is discarded more than once`,
    );
  }
}

/**
 * Reject plans that hide their dominant cost or do not fit their own budget.
 *
 * `assertBudgetInputs` should be called first; this checks the derived plan.
 */
export function assertPlanHonest(plan: BudgetPlan): void {
  if (plan.inputs.hoursPerFamily < MIN_PLAUSIBLE_FAMILY_HOURS) {
    fail(
      "BUDGET_NO_LABOUR_COST",
      "budget.hoursPerFamily",
      `${plan.inputs.hoursPerFamily}h per family is not a family with a reference, a verifier and a mutant bank — this is the shape of a plan that has priced only model spend (minimum ${MIN_PLAUSIBLE_FAMILY_HOURS}h)`,
    );
  }
  if (plan.labourShare < MIN_LABOUR_SHARE) {
    fail(
      "BUDGET_NO_LABOUR_COST",
      "budget.labourShare",
      `labour is ${(100 * plan.labourShare).toFixed(1)}% of spend; in every measured instance of this work authoring dominates, so a plan where it does not has almost certainly omitted it (minimum ${100 * MIN_LABOUR_SHARE}%)`,
    );
  }
  const spent = plan.labourUsd + plan.modelUsd;
  if (spent > plan.inputs.totalUsd * 1.0001) {
    fail(
      "BUDGET_IMPLAUSIBLE_YIELD",
      "budget.total",
      `plan spends ${spent.toFixed(0)} against a budget of ${plan.inputs.totalUsd.toFixed(0)}`,
    );
  }
  const yearsAffordable = plan.inputs.totalUsd / (plan.inputs.labourRateUsdPerHour * HOURS_PER_ENGINEER_YEAR);
  if (plan.impliedEngineerYears > yearsAffordable * 1.0001) {
    fail(
      "BUDGET_IMPLAUSIBLE_YIELD",
      "budget.impliedEngineerYears",
      `plan implies ${plan.impliedEngineerYears.toFixed(2)} engineer-years but the budget buys at most ${yearsAffordable.toFixed(2)} at the stated rate`,
    );
  }
}

/**
 * The headline claim check: does this plan support the task count someone wants to quote?
 *
 * Returns the shortfall in dollars, or 0 when the plan covers the target. Used by the report to say
 * plainly what $100k does and does not buy.
 */
export function shortfallForTarget(plan: BudgetPlan, targetTasks: number): number {
  if (plan.shippedTasks >= targetTasks) return 0;
  const familiesNeeded = Math.ceil(targetTasks / plan.inputs.instancesPerFamily);
  return familiesNeeded * plan.loadedUsdPerFamily - plan.inputs.totalUsd;
}
