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
import type { CampaignFacts, ProviderSpendRow, TrialLayerFacts } from "./evidence.js";

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
  postBuildKillRate: "measured but tiny sample — one of two locally built families died after trials",
  evolutionCyclesPerSurvivor: "measured locally — the UI line now has a parent plus descendant",
  descendantReuse: "estimated — live-DOM reused the router, packager, axis meter and report loop",
  labourRateUsdPerHour: "ASSUMPTION — caller-supplied, and the dominant term",
  totalUsd: "the question",
};

export function renderBudgetReport(
  inputs: BudgetInputs,
  targetTasks: number,
  trials?: TrialLayerFacts,
  campaigns?: CampaignFacts,
  spend?: readonly ProviderSpendRow[],
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
    ...(campaigns === undefined ? [] : campaignSection(inputs, campaigns)),
    ...(spend === undefined ? [] : providerSpendSection(inputs, spend, 3.5)),
    ...pipelineConversionSection(inputs, trials, campaigns),
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
  const plan = planBudget(inputs);
  const measuredRetry = t.standardWasteRate;
  const understated = measuredRetry > inputs.retryRate;
  const corrected = planBudget({ ...inputs, retryRate: measuredRetry });
  const asPlanned = planBudget(inputs);

  return [
    "## Families die after they are built, and that is priced",
    "",
    "The earlier version of this model priced one build per shipped family. That is the same mistake as",
    "pricing only the trial runs that produced a result: it charges for the work that survived and",
    "omits the work that produced it.",
    "",
    "| | |",
    "|---|---:|",
    `| families actually built | ${plan.familiesBuilt} |`,
    `| of those, killed after being built | ${plan.familiesKilledAfterBuild} |`,
    `| families that survive to ship | ${plan.families} |`,
    `| builds per survivor | ${inputs.evolutionCyclesPerSurvivor} |`,
    `| a descendant's reuse of its parent | ${(inputs.descendantReuse * 100).toFixed(0)}% |`,
    "",
    "**Why killing prompt-injection early was the good outcome.** The family cost roughly 70 hours to",
    "build and three counted trials — about seventeen minutes of model time — to kill. Had it shipped,",
    "the cost would have been every downstream hour spent maintaining a benchmark that separates",
    "nothing, plus the credibility of every number quoted beside it. The gate that killed it cost",
    "nothing to run.",
    "",
    "That asymmetry is the argument for the whole screening layer: **a kill is cheap and a build is",
    "not**, so the discipline that pays is moving evidence earlier, not building faster.",
    "",
    "What the numbers above do NOT say is that the kill rate is 50%. One of two families built here",
    "died after being built. That is a sample of two, it is the only post-build kill rate this",
    "repository has measured, and a plan resting on it is resting on very little — but a plan assuming",
    "100% survival is resting on less, and `budget-check.ts` rejects that one.",
    "",
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

/**
 * The cost questions this phase added.
 *
 * These are estimates except where the row says it is read from trial directories or campaign
 * plans. They are derived from the same public inputs as the rest of the report so changing the
 * labour rate moves the line items consistently.
 */
function pipelineConversionSection(
  inputs: BudgetInputs,
  trials?: TrialLayerFacts,
  campaigns?: CampaignFacts,
): readonly string[] {
  const challengePackagingHours = inputs.hoursPerFamily * 0.25;
  const specHardeningHours = inputs.hoursPerFamily * 0.2;
  const campaignPrepHours = 3;
  const mutantMeasuredToTrialReadyHours = challengePackagingHours + specHardeningHours + campaignPrepHours;
  const mutantMeasuredToTrialReadyUsd = mutantMeasuredToTrialReadyHours * inputs.labourRateUsdPerHour;
  const oneTrialModelUsd = (inputs.usdPerMatrix / 6) * (1 + inputs.retryRate);
  const trialOpsHours = 2;
  const trialReadyToEvidenceUsd = trialOpsHours * inputs.labourRateUsdPerHour + oneTrialModelUsd;
  const supersededTrials = campaigns?.supersededTrials ?? 0;
  const specRepairHours = supersededTrials === 0 ? 0 : 6;
  const specAmbiguityUsd =
    supersededTrials * oneTrialModelUsd + specRepairHours * inputs.labourRateUsdPerHour;
  const plan = planBudget(inputs);

  return [
    "## Pipeline conversion costs",
    "",
    "This is the cost model for the exact live-DOM and checker-required phases: turning a",
    "mutant-measured descendant into a trial-ready family, then turning trial-ready into real-agent difficulty evidence. Rows marked",
    "`estimated` are planning figures; rows marked `measured` come from checked-in campaigns or trial",
    "directories.",
    "",
    "| question | cost at current inputs | label | what is included |",
    "|---|---:|---|---|",
    `| mutant-measured -> trial-ready | ${usd(mutantMeasuredToTrialReadyUsd)} (${mutantMeasuredToTrialReadyHours.toFixed(1)} h) | estimated | fairness SPEC, challenge package, leak tests, route, campaign plan |`,
    `| trial-ready -> difficulty-evidenced | ${usd(trialReadyToEvidenceUsd)} + provider availability | estimated | one counted provider run, grading, reconcile, report update |`,
    `| spec ambiguity waste already observed | ${supersededTrials === 0 ? "not observed in supplied campaign facts" : usd(specAmbiguityUsd)} | ${supersededTrials === 0 ? "not-run" : "measured trials + estimated repair"} | stale/superseded trials plus repair time |`,
    "| checker-required package-ready -> difficulty-evidenced | $15 campaign budget; provider cost not recorded | measured campaign | package, route, two submitted artifacts, 792 graded scenarios and one counted Codex/OpenAI failure; no cross-lab breadth |",
    "",
    "Trial-ready is not SHIP. Trial-ready means the package builds, the leak checker passes, the hash",
    "is pinned and the router can grade an artifact. Difficulty-evidenced means at least one counted",
    "real agent trial exists under that hash. SHIP still requires the family not to be already solved",
    "and all blocking gates to pass.",
    "",
    campaigns === undefined
      ? "Provider unavailability is represented when campaign facts are supplied."
      : `Provider unavailability is visible as ${campaigns.slotsNotRun} not-run slot(s) out of ${campaigns.slotsPlanned}; those slots do not become failures or passes.`,
    trials === undefined
      ? ""
      : `The current observed pipeline also carries a ${((trials.standardWasteRate ?? 0) * 100).toFixed(0)}% standard-attempt waste rate from historical trials.`,
    "",
    `Under the current observed pipeline, ${usd(inputs.totalUsd)} buys ${plan.families} shipped family line(s), about ${plan.shippedTasks} generated instances and ${plan.expectedAxes} independent axes. It does not buy ${plan.shippedTasks} independent tasks; the axis meter is the guard against that phrasing.`,
    "",
  ].filter((line) => line !== "");
}

/**
 * What a trial campaign actually costs, measured on this machine rather than estimated.
 *
 * The number worth reading is the last one: cost per counted FAILURE. A counted solve tells you the
 * family is solvable, which the reference already told you. A counted failure is the only kind of
 * trial that moves a family toward shipping, and it is the unit a benchmark programme is really
 * buying.
 */
function campaignSection(inputs: BudgetInputs, c: CampaignFacts): readonly string[] {
  const runtimeMinutes = c.medianRuntimeSeconds === null ? null : c.medianRuntimeSeconds / 60;
  const perCountedFailure = c.countedFailures === 0 ? null : c.budgetPlannedUsd / c.countedFailures;

  return [
    "## Campaigns, measured",
    "",
    "The trial layer running for real, on this machine. Every figure is read from campaign plans and",
    "trial directories rather than assumed.",
    "",
    "| | |",
    "|---|---:|",
    `| campaigns declared | ${c.campaigns} |`,
    `| slots planned | ${c.slotsPlanned} |`,
    `| slots run | ${c.slotsRun} |`,
    `| slots **not run** | ${c.slotsNotRun} |`,
    `| counted trials | ${c.countedTrials} |`,
    `| of those, failing something | ${c.countedFailures} |`,
    `| superseded by a challenge repair | ${c.supersededTrials} |`,
    `| median counted-trial runtime | ${runtimeMinutes === null ? "—" : `${runtimeMinutes.toFixed(1)} min`} |`,
    `| budget declared across campaigns | ${usd(c.budgetPlannedUsd)} |`,
    `| **budget per counted failure** | ${perCountedFailure === null ? "— (no counted failure yet)" : usd(perCountedFailure)} |`,
    "",
    "### The line item nobody budgets for",
    "",
    `${c.supersededTrials} counted trials were invalidated by a repair to the family they measured. They`,
    "are preserved and they do not count, because the task they were run against no longer exists.",
    "",
    "That is not waste in the ordinary sense — the repair came FROM those trials, which found a rule",
    "attribution the spec had left ambiguous — but it is real spend that a plan pricing only successful",
    "runs would omit. **A benchmark programme should expect to pay for each family's trials more than",
    "once**, because the first campaign is often what tells you the family is not yet fair.",
    "",
    "### Unrun slots are a budget line, not an absence",
    "",
    `${c.slotsNotRun} of ${c.slotsPlanned} declared slots have not run, almost all of them because no runner`,
    "for that model family is configured here. They are costed in the plans and visible in every",
    "report. A campaign that quietly dropped them would show a complete-looking result over one lab's",
    "model — which is the single most common way a benchmark overstates what it measured.",
    "",
  ];
}

/**
 * What a counted trial costs by provider, and what the waste actually was.
 *
 * The line this section exists for is `superseded`. A programme that repairs specs pays for some
 * trials twice, and a budget that prices only the runs that survived is understating the cost of
 * being careful. The repair came FROM those runs, so the spend bought a finding — it just did not
 * buy a difficulty measurement.
 */
function providerSpendSection(
  inputs: BudgetInputs,
  rows: readonly ProviderSpendRow[],
  usdPerTrial: number,
): readonly string[] {
  const total = rows.reduce(
    (acc, r) => ({
      counted: acc.counted + r.counted,
      failed: acc.failed + r.failed,
      refused: acc.refused + r.refused,
      infra: acc.infra + r.infra,
      superseded: acc.superseded + r.superseded,
      runs: acc.runs + r.counted + r.refused + r.infra + r.superseded,
    }),
    { counted: 0, failed: 0, refused: 0, infra: 0, superseded: 0, runs: 0 },
  );
  const wasted = total.refused + total.infra + total.superseded;
  const perCountedFailure = total.failed === 0 ? null : (total.runs * usdPerTrial) / total.failed;

  return [
    "## Spend by provider, measured",
    "",
    "Every row read from the trial directories on disk. `superseded` runs were counted once and are",
    "not counted now: the family they measured was repaired.",
    "",
    "| provider | counted | of those failed | refused | infra | superseded | model-minutes |",
    "|---|---:|---:|---:|---:|---:|---:|",
    ...rows.map(
      (r) =>
        `| \`${r.providerFamily}\` | ${r.counted} | ${r.failed} | ${r.refused} | ${r.infra} | ${r.superseded} | ${(r.runtimeSeconds / 60).toFixed(0)} |`,
    ),
    "",
    "| | |",
    "|---|---:|",
    `| runs attempted | ${total.runs} |`,
    `| counted | ${total.counted} |`,
    `| **produced no usable evidence** | **${wasted}** (${total.runs === 0 ? "—" : `${((wasted / total.runs) * 100).toFixed(0)}%`}) |`,
    `| at ${usd(usdPerTrial)} per run, spend on runs that produced nothing | ${usd(wasted * usdPerTrial)} |`,
    `| **cost per counted FAILURE** | ${perCountedFailure === null ? "— (no counted failure)" : usd(perCountedFailure)} |`,
    "",
    "**Cost per counted failure is the number to plan against.** A counted solve tells you the family",
    "is solvable, which the reference already told you. A counted failure is the only kind of trial",
    "that moves a family toward shipping, and at the observed rates it costs several times what a",
    "single run does.",
    "",
    "### The three kinds of waste, which are not the same",
    "",
    "| kind | count | can it be engineered away? |",
    "|---|---:|---|",
    `| provider refusal | ${total.refused} | no — it is a property of the provider, and re-running until it complies would fabricate a sample |`,
    `| infrastructure / auth | ${total.infra} | partly — an account-tier error is fixable by paying; a harness bug is fixable by fixing it |`,
    `| superseded by repair | ${total.superseded} | no, and it should not be. These runs found the defect that invalidated them |`,
    "",
    `Priced into the plan, ${wasted} wasted runs against ${inputs.matricesPerFamily} matrices per family is`,
    "a real multiplier on trial cost — and still a rounding error beside labour, which is the finding",
    "the whole budget model exists to make.",
    "",
  ];
}
