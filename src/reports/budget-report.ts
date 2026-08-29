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
import type { TrialLayerFacts } from "./evidence.js";

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

export function renderBudgetReport(
  inputs: BudgetInputs,
  targetTasks: number,
  trials?: TrialLayerFacts,
): string {
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
    ...(trials === undefined ? [] : trialLayerSection(inputs, trials)),
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

/**
 * The trial layer, priced from what it actually cost rather than from what it should cost.
 *
 * The number this section exists for is the waste rate. A budget assembled from the cost of runs
 * that worked is short by the cost of the runs that did not, and "did not" here includes provider
 * refusals, timeouts and infrastructure failures — every one of which arrives in the source data as
 * a reward of 0.0 and is therefore free to misread as a cheap failure.
 */
function trialLayerSection(inputs: BudgetInputs, t: TrialLayerFacts): readonly string[] {
  const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;
  const measuredRetry = t.standardWasteRate;
  const understated = measuredRetry > inputs.retryRate;
  const corrected = planBudget({ ...inputs, retryRate: measuredRetry });
  const asPlanned = planBudget(inputs);

  return [
    "## Trial-layer assumptions, measured",
    "",
    "Everything above prices *building* families. This section prices *running* them, from the trial",
    "records this repository holds rather than from an estimate.",
    "",
    "| | |",
    "|---|---:|",
    `| historical runs imported | ${t.historicalRuns} |`,
    `| of those, counted | ${t.historicalCounted} |`,
    `| total recorded spend | ${usd(t.historicalSpendUsd)} |`,
    `| spend on runs that produced a counted result | ${usd(t.countedSpendUsd)} |`,
    `| spend on standard attempts that produced nothing | ${usd(t.wastedSpendUsd)} |`,
    `| **effective $ per counted run** | **${t.usdPerCountedRun === null ? "—" : usd(t.usdPerCountedRun)}** |`,
    `| counted agent trials on the second family | ${t.picCountedTrials} |`,
    `| median runtime of those trials | ${t.picMedianRuntimeSeconds === null ? "—" : `${Math.round(t.picMedianRuntimeSeconds)}s`} |`,
    "",
    "### The waste rate",
    "",
    `Of ${t.standardRuns} genuine attempts at the task — cheat and gate runs excluded, because those are`,
    `deliberate and not waste — ${t.standardCounted} produced a usable result. That is a waste rate of`,
    `**${pct(measuredRetry)}**, against the \`retryRate\` input of ${pct(inputs.retryRate)}.`,
    "",
    understated
      ? [
          `**The measured rate is above the \`retryRate\` input of ${pct(inputs.retryRate)}.** Re-planning at ${pct(measuredRetry)}`,
          asPlanned.shippedTasks === corrected.shippedTasks
            ? `changes nothing: ${corrected.families} families and ${corrected.shippedTasks} instances either way, and ${usd(corrected.usdPerShippedTask - asPlanned.usdPerShippedTask)} more per shipped task. That is worth stating plainly — at this scale the plan is dominated by labour, and the trial budget is small enough that a several-point error in the retry rate does not move the family count. The place to be careful about model spend is a plan whose labour is cheap, and this is not one.`
            : `yields ${corrected.families} families and ${corrected.shippedTasks} instances instead of ${asPlanned.families} and ${asPlanned.shippedTasks}, at ${usd(corrected.usdPerShippedTask - asPlanned.usdPerShippedTask)} more per shipped task.`,
          "",
          `The waste that did occur was ${Object.entries(t.standardUncountedByStatus)
            .sort()
            .map(([k, n]) => `${n} \`${k}\``)
            .join(
              ", ",
            )} — not model failure, and not something a better prompt fixes. The input is left at its`,
          "documented value rather than quietly raised to the measured one: 24 standard attempts is a small",
          "sample, and tuning an input until the plan flatters itself is the failure mode this whole",
          "repository is arguing against.",
        ].join("\n")
      : "The measured rate is at or below the input, so the plan above is not optimistic on this axis.",
    "",
    "### What a second family costs to run",
    "",
    "The containment family's trials cost minutes and cents rather than hours and tens of dollars: the",
    "subject is a single module graded against 128 in-memory scenarios, not a service under a workload.",
    "Two consequences for the budget:",
    "",
    "- **Cheap families are how you fill a shared bank.** Cross-family axis measurement needs the same",
    "  models to attempt both families, and the binding cost is the expensive family, not the cheap one.",
    "- **Cheap to run is not cheap to build.** The containment family took roughly the same authoring",
    "  effort as the expensive one and then failed the ship gate for being too easy. Run cost is the",
    "  smaller half of the bill, and the model above is right to be dominated by labour.",
    "",
  ];
}
