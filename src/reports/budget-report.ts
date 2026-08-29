// The budget report: the direct answer to "with $100k, what do we actually buy?"
//
// The report is built around a comparison rather than a number, because the number alone invites the
// wrong reading. Priced as families with generated instances, $100k buys one thing; priced as
// hand-authored tasks -- which is what "a thousand diverse tasks" means if taken literally -- it buys
// roughly two orders of magnitude less. Showing both in the same table is the argument.
//
// Every measured input is marked. The labour rate never is, because it is always the caller's
// assumption and it dominates the result; the sensitivity table exists so a reader who disagrees
// with it can find their own row instead of arguing with mine.

import { shortfallForTarget } from "../foundry/budget-check.js";
import { type BudgetInputs, type BudgetPlan, handAuthoredComparison, planBudget } from "../foundry/budget.js";

const usd = (n: number): string =>
  !Number.isFinite(n) ? "—" : n >= 1000 ? `$${Math.round(n).toLocaleString("en-US")}` : `$${n.toFixed(2)}`;

/** Which inputs come from the source project rather than from an assumption. */
const PROVENANCE: Readonly<Record<string, string>> = {
  hoursPerFamily: "estimated (no timesheet was kept; the shipped family took weeks)",
  hoursPerScreenedCandidate: "measured — cycle 5 killed 15 candidates in ~90 min",
  cycleHitRate: "measured — 1 family shipped from 10 design cycles",
  matricesPerFamily: "measured — the shipped family consumed 3 matrix rounds",
  usdPerMatrix: "measured — $48.66 for the shipped six-trial matrix",
  retryRate: "measured — 3 of 20 matrix runs discarded for infrastructure reasons",
  instancesPerFamily: "measured — the shipped family grades 24 scenarios",
  axesPerFamily: "measured — antichain width 3 against a 10-engine bank",
  labourRateUsdPerHour: "ASSUMPTION — caller-supplied, and the dominant term",
  totalUsd: "the question",
};

export function renderBudgetReport(inputs: BudgetInputs, targetTasks: number): string {
  const plan = planBudget(inputs);
  const hand = handAuthoredComparison(inputs);
  const shortfall = shortfallForTarget(plan, targetTasks);

  const sensitivity = [0.5, 0.75, 1, 1.5, 2].map((mult) => {
    const p = planBudget({ ...inputs, labourRateUsdPerHour: inputs.labourRateUsdPerHour * mult });
    return `| ${usd(inputs.labourRateUsdPerHour * mult)}/h | ${p.families} | ${p.shippedTasks} | ${p.expectedAxes} |`;
  });

  const instanceSensitivity = [1, 6, 12, 24, 48].map((n) => {
    const p = planBudget({ ...inputs, instancesPerFamily: n });
    return `| ${n} | ${p.families} | ${p.shippedTasks} | ${usd(p.usdPerShippedTask)} |`;
  });

  return [
    "# Budget plan",
    "",
    `What ${usd(inputs.totalUsd)} buys, priced against the measured rates from the source project.`,
    "",
    "## The answer",
    "",
    "| | families | shipped tasks | independent axes | $ / task |",
    "|---|---:|---:|---:|---:|",
    `| **parameterized families** | **${plan.families}** | **${plan.shippedTasks}** | **${plan.expectedAxes}** | ${usd(plan.usdPerShippedTask)} |`,
    `| hand-authored tasks | ${hand.families} | ${hand.shippedTasks} | ${hand.expectedAxes} | ${usd(hand.usdPerShippedTask)} |`,
    "",
    shortfall > 0
      ? `**${usd(inputs.totalUsd)} does not buy ${targetTasks.toLocaleString("en-US")} tasks.** Reaching that count under these assumptions needs a further ${usd(shortfall)}. What it does buy is **${plan.families} families yielding about ${plan.shippedTasks} graded instances and ${plan.expectedAxes} independent axes** — and the axes are the number worth quoting, because a thousand tasks measuring three things is three measurements.`
      : `Under these assumptions the budget covers ${targetTasks.toLocaleString("en-US")} tasks with ${usd(inputs.totalUsd - plan.labourUsd - plan.modelUsd)} to spare.`,
    "",
    "## Where the money goes",
    "",
    "| cost centre | per family | total | share |",
    "|---|---:|---:|---:|",
    `| screening (candidates killed to find one) | ${usd(plan.screeningUsdPerFamily)} | ${usd(plan.screeningUsdPerFamily * plan.families)} | ${((100 * plan.screeningUsdPerFamily) / plan.loadedUsdPerFamily).toFixed(0)}% |`,
    `| authoring the family | ${usd(plan.authoringUsdPerFamily)} | ${usd(plan.authoringUsdPerFamily * plan.families)} | ${((100 * plan.authoringUsdPerFamily) / plan.loadedUsdPerFamily).toFixed(0)}% |`,
    `| frontier trials | ${usd(plan.trialUsdPerFamily)} | ${usd(plan.modelUsd)} | ${((100 * plan.trialUsdPerFamily) / plan.loadedUsdPerFamily).toFixed(0)}% |`,
    "| generating instances | $0.00 | $0.00 | 0% |",
    "",
    `**Labour is ${(100 * plan.labourShare).toFixed(0)}% of spend.** Model spend is ${usd(plan.modelUsd)} of ${usd(plan.labourUsd + plan.modelUsd)}. This is the finding: the budget is an engineering budget with a rounding error of GPU time attached, and any plan that prices only the trials is wrong by the size of the rest of the table.`,
    "",
    `The plan implies **${plan.impliedEngineerYears.toFixed(2)} engineer-years** and ` +
      `**${plan.candidatesScreened} candidates screened** to yield ${plan.families} families.`,
    "",
    "## Sensitivity to the labour rate",
    "",
    "The one input that is purely an assumption, so here is the whole column instead of an argument.",
    "",
    "| rate | families | tasks | axes |",
    "|---|---:|---:|---:|",
    ...sensitivity,
    "",
    "## Sensitivity to instances per family",
    "",
    "This is the lever. At 1 instance per family you are hand-authoring every task, which is what",
    "makes the literal reading of the question unaffordable.",
    "",
    "| instances/family | families | tasks | $ / task |",
    "|---|---:|---:|---:|",
    ...instanceSensitivity,
    "",
    "## Inputs, with provenance",
    "",
    "| input | value | source |",
    "|---|---:|---|",
    ...(Object.keys(PROVENANCE) as (keyof BudgetInputs)[])
      .filter((k) => k in inputs)
      .map((k) => `| \`${String(k)}\` | ${String(inputs[k])} | ${PROVENANCE[String(k)]} |`),
    "",
    "## What this model does not include",
    "",
    "- **Maintenance.** Families decay as models improve; nothing here prices re-hardening.",
    "- **The first family is more expensive than the tenth**, and the model uses one flat rate.",
    "- **Axis counts do not simply add.** Two families may share an axis; the total is an upper bound",
    "  until a combined matrix is measured.",
    "- **Instances within a family are heavily correlated** — that is exactly what the axis meter",
    "  measures, and why shipped-task count is the wrong headline.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}

export function renderPlanSummary(plan: BudgetPlan): string {
  return `${plan.families} families / ${plan.shippedTasks} instances / ${plan.expectedAxes} axes at ${usd(plan.inputs.totalUsd)}`;
}
