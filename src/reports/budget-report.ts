// The budget report: the direct answer to "with $100k, what do we actually buy?"
//
// The report quotes THREE units, because quoting one is how the previous version of this file got it
// wrong. A FAMILY is what the money builds. A DELIVERABLE TASK is an independently gradeable package
// a recipient can be handed, and this repository emits exactly one per family. A GRADED CELL is one
// scenario-check pair inside that package, and there are 24 of them per package here. The previous
// version multiplied families by cells, called the product "shipped tasks" and put it in the
// headline, so the headline overstated by 24x the number of things anyone could be handed.
//
// Correcting that also shrinks the argument this file used to make. Priced per DELIVERABLE the
// family model and hand-authoring cost the same at these inputs, because one family yields one
// deliverable either way. What the family model buys for that money is 24x the graded cells and 2x
// the independent axes. That is the claim the arithmetic supports, and it is smaller than "roughly
// two orders of magnitude", which is what this comment used to claim.
//
// Every measured input is marked. `hoursPerFamily` is ESTIMATED and now says so both here and in
// `budget.ts`; the two used to disagree, which is how an estimate spent three phases being quoted as
// a measurement. The labour rate is never marked measured — it is always the caller's assumption and
// it dominates the result, so the sensitivity table exists to let a reader find their own row.

import { shortfallForTarget } from "../foundry/budget-check.js";
import {
  type BudgetInputs,
  buildsPerShippedFamily,
  handAuthoredComparison,
  planBudget,
} from "../foundry/budget.js";
import type { CampaignFacts, ProviderSpendRow, TrialLayerFacts } from "./evidence.js";

const usd = (n: number): string =>
  !Number.isFinite(n) ? "—" : n >= 1000 ? `$${Math.round(n).toLocaleString("en-US")}` : `$${n.toFixed(2)}`;

/** Integers without a decimal tail, fractions with two. Used for derived counts like builds/survivor. */
const num = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/**
 * The per-trial figure this report used to print inside a section headed "measured".
 *
 * Nothing computes with it. It is kept so the report can state the size of its own correction rather
 * than quietly printing a better number and hoping nobody diffs the two.
 */
const RETIRED_USD_PER_TRIAL_LITERAL = 3.5;

/** Which inputs come from the source project rather than from an assumption. */
const PROVENANCE: Readonly<Record<string, string>> = {
  hoursPerFamily:
    "ESTIMATED — no timesheet was ever kept. It is **28% below the mean of the author's own 18 declared estimates** in `examples/shapes/*.json` (mean 62.4 h, median 57.5, range 18–120), and the flagship family `durable-approval-outbox` declares 120 — 2.7x the value this plan uses",
  hoursPerScreenedCandidate: "measured — cycle 5 killed 15 candidates in ~90 min",
  cycleHitRate: "measured — 1 family shipped from 10 design cycles",
  matricesPerFamily: "measured — the shipped family consumed 3 matrix rounds",
  usdPerTrial:
    "measured — mean of the 19 real Harbor trials over $0.50 in `data/measured-trial-costs.json` (median $7.74; Anthropic median $15.20, OpenAI $3.28). A mean, not a median, because a cross-lab plan buys both halves of a bimodal distribution",
  trialsPerMatrix: "measured — 3 subjects x 2 labs is what one cross-lab claim costs",
  retryRate: "measured — 3 of 20 matrix runs discarded for infrastructure reasons",
  deliverableTasksPerFamily:
    "measured — this repository emits ONE independently gradeable package per family. Not 24: the 24 are graded cells inside that one package",
  hiddenCellsPerTask:
    "measured — the shipped package grades 24 scenarios. This is SCALE inside one deliverable, not a count of deliverables",
  axesPerFamily:
    "measured — antichain width 2 within a single lab on the 267-check outbox suite. The retired value of 3 was the width pooled ACROSS labs",
  postBuildKillRate:
    "measured but tiny sample — one of two locally built families died after trials. Read via `buildsPerShippedFamily()`, which is where the retired `evolutionCyclesPerSurvivor` input used to duplicate it",
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

  // The same target read in the other unit. Quoting only one of these is how the previous version of
  // this report printed a shortfall of $439,522 against a headline of 168 "shipped tasks": the
  // shortfall was priced in graded cells and the headline was labelled as deliverables.
  const cellsPerFamily = inputs.deliverableTasksPerFamily * inputs.hiddenCellsPerTask;
  const familiesForTargetCells = Math.ceil(targetTasks / cellsPerFamily);
  const cellShortfall = Math.max(0, familiesForTargetCells * plan.loadedUsdPerFamily - inputs.totalUsd);
  const trialCorrection = inputs.usdPerTrial / RETIRED_USD_PER_TRIAL_LITERAL;

  const sensitivity = [0.5, 0.75, 1, 1.5, 2].map((mult) => {
    const p = planBudget({ ...inputs, labourRateUsdPerHour: inputs.labourRateUsdPerHour * mult });
    return `| ${usd(inputs.labourRateUsdPerHour * mult)}/h | ${p.families} | ${p.deliverableTasks} | ${p.gradedCells} | ${p.expectedAxes} | ${usd(p.usdPerAxis)} |`;
  });

  // The declared estimates in `examples/shapes/*.json`, which are the only evidence this repository
  // has about how long a family takes to build. 45 is NOT below the low end of them — three shapes
  // declare less — but it is 28% below their mean of 62.4, and the flagship family declares 120.
  const hoursSensitivity: readonly (readonly [number, string])[] = [
    [45, "current input"],
    [62, "mean of the 18 declared shape estimates (62.4, rounded)"],
    [90, "above 15 of the 18 declared estimates"],
    [120, "the flagship family's own estimate"],
  ];
  const hoursRows = hoursSensitivity.map(([h, note]) => {
    const p = planBudget({ ...inputs, hoursPerFamily: h });
    return `| ${h} h | ${note} | ${usd(p.loadedUsdPerFamily)} | ${p.families} | ${p.deliverableTasks} | ${p.expectedAxes} | ${usd(p.usdPerAxis)} |`;
  });

  const deliverableSensitivity = [1, 2, 4, 8, 24].map((n) => {
    const p = planBudget({ ...inputs, deliverableTasksPerFamily: n });
    return `| ${n}${n === inputs.deliverableTasksPerFamily ? " (current — no deliverable exporter exists)" : ""} | ${p.families} | ${p.deliverableTasks} | ${usd(p.usdPerDeliverableTask)} | ${usd(p.usdPerAxis)} |`;
  });

  return [
    "# Budget plan",
    "",
    `What ${usd(inputs.totalUsd)} buys, priced against the measured rates from the source project.`,
    "",
    "## The answer",
    "",
    "Three units, because they are three different numbers and the previous version of this report",
    "printed the largest of them under the smallest one's name.",
    "",
    "| | families | deliverable tasks | graded cells | independent axes | $ / deliverable task | $ / axis |",
    "|---|---:|---:|---:|---:|---:|---:|",
    `| **parameterized families** | **${plan.families}** | **${plan.deliverableTasks}** | ${plan.gradedCells} | **${plan.expectedAxes}** | ${usd(plan.usdPerDeliverableTask)} | **${usd(plan.usdPerAxis)}** |`,
    `| hand-authored tasks | ${hand.families} | ${hand.deliverableTasks} | ${hand.gradedCells} | ${hand.expectedAxes} | ${usd(hand.usdPerDeliverableTask)} | ${usd(hand.usdPerAxis)} |`,
    "",
    "**A FAMILY is what the money builds. A DELIVERABLE TASK is an independently gradeable package a",
    "recipient can be handed, and this repository emits one per family. A GRADED CELL is one",
    `scenario-check pair inside that package, and there are ${inputs.hiddenCellsPerTask} per package.** Those are the three columns, and`,
    "conflating the third with the second is the defect this revision fixes.",
    "",
    `Read the two rows against each other and the honest gap is narrower than it used to look: per DELIVERABLE the two cost the same ${usd(plan.usdPerDeliverableTask)}, because one family yields one deliverable either way. What the family buys for that money is **${inputs.hiddenCellsPerTask}x the graded cells and ${(plan.expectedAxes / Math.max(1, hand.expectedAxes)).toFixed(0)}x the independent axes** — ${usd(plan.usdPerAxis)} per axis against ${usd(hand.usdPerAxis)}. That is a real advantage and it is not two orders of magnitude.`,
    "",
    shortfall > 0
      ? `**${usd(inputs.totalUsd)} does not buy ${targetTasks.toLocaleString("en-US")} deliverable tasks.** At one deliverable per family, ${targetTasks.toLocaleString("en-US")} deliverables means ${targetTasks.toLocaleString("en-US")} families, so reaching that count needs a further ${usd(shortfall)}. What it does buy is **${plan.families} families yielding about ${plan.gradedCells} graded instances and ${plan.expectedAxes} independent axes** — and the axes are the number worth quoting, because a thousand tasks measuring two things is two measurements.`
      : `Under these assumptions the budget covers ${targetTasks.toLocaleString("en-US")} deliverable tasks with ${usd(inputs.totalUsd - plan.labourUsd - plan.modelUsd)} to spare.`,
    "",
    `Read as graded CELLS instead, the same target is far cheaper and still not covered: ${targetTasks.toLocaleString("en-US")} cells at ${cellsPerFamily} per family is ${familiesForTargetCells} families and ${usd(cellShortfall)} more. The two shortfalls differ by ${inputs.hiddenCellsPerTask}x, and the previous version of this report printed the second one beside a headline labelled in the first one's unit.`,
    "",
    "## What this revision corrects",
    "",
    "| | was | is | effect |",
    "|---|---|---|---|",
    `| cost of one frontier trial | ${usd(RETIRED_USD_PER_TRIAL_LITERAL)}, a literal under a heading that said "measured" | ${usd(inputs.usdPerTrial)}, the mean of the 28 recorded runs that PRODUCED a verdict, in \`data/measured-trial-costs.json\` | the plan was low by roughly ${trialCorrection.toFixed(1)}x on model spend |`,
    `| the headline unit | families x ${inputs.hiddenCellsPerTask} cells, called "shipped tasks" | families x ${inputs.deliverableTasksPerFamily} deliverable package | the deliverable count was overstated ${inputs.hiddenCellsPerTask}x |`,
    `| axes per family | 3, the antichain width pooled ACROSS both labs | ${inputs.axesPerFamily}, the width inside a single lab | the axis yield was overstated by half |`,
    `| builds per shipped family | a second input sitting beside \`postBuildKillRate\` and agreeing with it by luck | \`buildsPerShippedFamily(${inputs.postBuildKillRate})\` = ${num(buildsPerShippedFamily(inputs.postBuildKillRate))} | the two can no longer disagree |`,
    "",
    `| runs bought and lost | not priced at all | ${(100 * inputs.lostRunRate).toFixed(1)}% of started runs return no verdict, measured over 30 recorded runs | every trial line was low by that factor again |`,
    "",
    `**The loss rate had never appeared in any plan.** Two of the thirty recorded runs over $0.50 spent money and returned nothing — one killed by a machine shutdown, one by a harness \`NetworkConnectionError\` — and because runs that die tend to die late, that is ${(100 * inputs.lostRunRate).toFixed(1)}% of runs but ${"10.7"}% of spend. Buying ${inputs.trialsPerMatrix} verdicts costs ${(inputs.trialsPerMatrix / (1 - inputs.lostRunRate)).toFixed(1)} runs, so a matrix is ${usd((inputs.usdPerTrial * inputs.trialsPerMatrix) / (1 - inputs.lostRunRate))} rather than ${usd(inputs.usdPerTrial * inputs.trialsPerMatrix)}. Pricing only the runs that finish is the same optimistic error as pricing only the families that ship, and this plan made both for four phases.`,
    "",
    `The trial correction is the one with money attached. ${usd(RETIRED_USD_PER_TRIAL_LITERAL)} per run was never measured — it was a literal, and three phases of this report printed it inside a section headed "measured". The measurement, once taken, is ${usd(inputs.usdPerTrial)}: **the plan was low by roughly ${trialCorrection.toFixed(1)}x on model spend.** It does not move the family count, because model spend is ${(100 * (1 - plan.labourShare)).toFixed(0)}% of this plan — but a plan whose labour was cheap would have been wrong by that factor on the only line it priced.`,
    "",
    "## Where the money goes",
    "",
    "| cost centre | per family | total | share |",
    "|---|---:|---:|---:|",
    `| screening (candidates killed to find one) | ${usd(plan.screeningUsdPerFamily)} | ${usd(plan.screeningUsdPerFamily * plan.families)} | ${((100 * plan.screeningUsdPerFamily) / plan.loadedUsdPerFamily).toFixed(0)}% |`,
    `| authoring the family | ${usd(plan.authoringUsdPerFamily)} | ${usd(plan.authoringUsdPerFamily * plan.families)} | ${((100 * plan.authoringUsdPerFamily) / plan.loadedUsdPerFamily).toFixed(0)}% |`,
    `| frontier trials | ${usd(plan.trialUsdPerFamily)} | ${usd(plan.modelUsd)} | ${((100 * plan.trialUsdPerFamily) / plan.loadedUsdPerFamily).toFixed(0)}% |`,
    `| generating graded cells (${plan.gradedCells} of them) | $0.00 | $0.00 | 0% |`,
    "",
    `**Labour is ${(100 * plan.labourShare).toFixed(0)}% of spend.** Model spend is ${usd(plan.modelUsd)} of ${usd(plan.labourUsd + plan.modelUsd)}, at the corrected ${usd(inputs.usdPerTrial)} per trial. This is the finding: the budget is an engineering budget with a rounding error of GPU time attached, and any plan that prices only the trials is wrong by the size of the rest of the table.`,
    "",
    `The plan implies **${plan.impliedEngineerYears.toFixed(2)} engineer-years** and ` +
      `**${plan.candidatesScreened} candidates screened** to yield ${plan.families} families.`,
    "",
    "## What is not priced here at all",
    "",
    "`loadedUsdPerFamily` contains screening labour, authoring labour and frontier trials. It contains",
    "nothing else. **Every family count in this report is therefore an UPPER BOUND**, and this is the",
    "list of what would pull it down:",
    "",
    "| absent cost centre | why it is real | why it is absent |",
    "|---|---|---|",
    "| human solver baselines | a difficulty claim with no human baseline is a claim about models, not about difficulty | no solver has ever been paid to attempt a family here, so there is no rate to quote |",
    "| provider credits and entitlements | Gemini slots in the checked-in campaigns are entitlement-blocked rather than merely unrun | the blocked capacity was never priced, only recorded as not-run |",
    "| container and compute time | every trial builds and runs a Docker image, some for over an hour | only model spend was ever metered; wall-clock compute was not |",
    "| triage of counted runs | someone reads each failing run to decide whether the family failed or the harness did | never timesheeted, and it scales with trials rather than with families |",
    "| spec repair after a campaign | the superseded trials below are the proof that it happens | measured in wasted trials, never in the hours the repair took |",
    "| refresh as models improve | a family that every model solves has stopped measuring anything | no family here is old enough to have needed it yet |",
    "",
    "Three of those — solvers, compute, triage — scale with the number of TRIALS rather than with the",
    "number of families, so they get worse in exactly the region where this plan looks cheapest.",
    "",
    "## Sensitivity to the labour rate",
    "",
    "The one input that is purely an assumption, so here is the whole column instead of an argument.",
    "",
    "| rate | families | deliverable tasks | graded cells | axes | $ / axis |",
    "|---|---:|---:|---:|---:|---:|",
    ...sensitivity,
    "",
    "## Sensitivity to authoring hours per family",
    "",
    "**This is the dominant term.** `hoursPerFamily` is an estimate, not a measurement, and it is the",
    "only input that moves the family count on its own. The 18 declared shapes in",
    "`examples/shapes/*.json` estimate their own build at 18 to 120 hours — mean 62.4, median 57.5 —",
    "so **45 is 28% below the mean of the author's own estimates**. It is not below their low end;",
    "three shapes declare less. But the flagship family `durable-approval-outbox` declares 120, which",
    "is 2.7x what this plan charges for it.",
    "",
    "| hours/family | why this row | loaded $ / family | families | deliverable tasks | axes | $ / axis |",
    "|---|---|---:|---:|---:|---:|---:|",
    ...hoursRows,
    "",
    "45 stays the default because moving a headline without new evidence is worse than reporting the",
    "discrepancy — but read the table before quoting the headline. Charging the flagship family its own",
    "declared 120 hours costs more than half the yield.",
    "",
    "One further caveat on this input: the repository declares build hours in TWO places, and neither",
    "is a measurement. `examples/shapes/*.json` carries an estimate for all 18 declared shapes, and",
    "`src/families/registry.ts` carries a second `estimatedBuildHours` on each of the 8 BUILT families",
    "(18, 36, 40, 55, 70, 75, 85, 95 — mean 59.3). Two independent guesses at the same quantity is one",
    "more guess than evidence.",
    "",
    "## Sensitivity to deliverable tasks per family",
    "",
    "**This lever moves yield per family, not the family count** — the `families` column below is",
    "constant, and that is the honest result rather than a broken table. Authoring cost does not depend",
    "on how many packages a finished family is sliced into, so raising this divides the same spend over",
    "more deliverables and changes nothing else. The previous version of this report ran the same table",
    "over `instancesPerFamily` and presented the constant column as sensitivity.",
    "",
    `It is ${inputs.deliverableTasksPerFamily} today, and it will stay ${inputs.deliverableTasksPerFamily} until a deliverable exporter exists. Two instances count as`,
    "distinct deliverables only if a knob separates them that changes the expected answer; nine inert",
    "knobs are not nine deliverables.",
    "",
    "| deliverables/family | families | deliverable tasks | $ / deliverable task | $ / axis |",
    "|---|---:|---:|---:|---:|",
    ...deliverableSensitivity,
    "",
    `The last row is what the previous version of this report printed as its headline: it treated all ${inputs.hiddenCellsPerTask} graded cells as ${inputs.hiddenCellsPerTask} deliverables. Nothing in the repository emits them that way.`,
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
    ...(spend === undefined ? [] : providerSpendSection(inputs, spend)),
    ...pipelineConversionSection(inputs, trials, campaigns),
    "## What this model does not include",
    "",
    "- **Every cost centre in *What is not priced here at all*.** They are not repeated here; the",
    "  point stands that each family count above is an upper bound.",
    "- **The first family is more expensive than the tenth**, and the model uses one flat rate.",
    "- **Axis counts do not simply add.** Two families may share an axis; the total is an upper bound",
    "  until a combined matrix is measured.",
    "- **Graded cells within a family are heavily correlated** — that is exactly what the axis meter",
    "  measures, and why the cell count is the wrong headline and the axis count is the right one.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
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
    `| builds per survivor | ${num(buildsPerShippedFamily(inputs.postBuildKillRate))} = 1 / (1 - ${inputs.postBuildKillRate}), derived from \`postBuildKillRate\` |`,
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
    `The plan prices one trial at ${usd(inputs.usdPerTrial)} and this table's effective cost per COUNTED run is ${t.usdPerCountedRun === null ? "—" : usd(t.usdPerCountedRun)}. They differ because the second amortizes the runs that produced nothing over the runs that did, and both are several times the ${usd(RETIRED_USD_PER_TRIAL_LITERAL)} the plan assumed for three phases. The refutation of that literal was being printed two sections below it the whole time.`,
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
          asPlanned.deliverableTasks === corrected.deliverableTasks
            ? `changes nothing: ${corrected.families} families and ${corrected.gradedCells} graded cells either way, and ${usd(corrected.usdPerDeliverableTask - asPlanned.usdPerDeliverableTask)} more per deliverable task. That is worth stating plainly — at this scale the plan is dominated by labour, and the trial budget is small enough that a several-point error in the retry rate does not move the family count. The place to be careful about model spend is a plan whose labour is cheap, and this is not one.`
            : `yields ${corrected.families} families and ${corrected.deliverableTasks} deliverable tasks instead of ${asPlanned.families} and ${asPlanned.deliverableTasks}, at ${usd(corrected.usdPerDeliverableTask - asPlanned.usdPerDeliverableTask)} more per deliverable task.`,
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
  const oneTrialModelUsd = inputs.usdPerTrial * (1 + inputs.retryRate);
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
    ...(trials === undefined
      ? []
      : [
          `The current observed pipeline also carries a ${((trials.standardWasteRate ?? 0) * 100).toFixed(0)}% standard-attempt waste rate from historical trials.`,
        ]),
    "",
    `Under the current observed pipeline, ${usd(inputs.totalUsd)} buys ${plan.families} shipped family line(s), ${plan.deliverableTasks} independently gradeable package(s), about ${plan.gradedCells} graded cells and ${plan.expectedAxes} independent axes. It does not buy ${plan.gradedCells} independent tasks — those cells sit inside ${plan.deliverableTasks} package(s) — and the axis meter is the guard against that phrasing.`,
    "",
    // No `.filter(line => line !== "")` here. It used to strip the optional trials line and took
    // every paragraph break in this section with it, gluing the headings to the tables below them.
  ];
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
 *
 * The per-run price used to arrive here as a $3.50 argument from the caller, which no measurement
 * backed. It now comes from `inputs.usdPerTrial`, so this section and the plan above cannot price
 * the same run differently.
 */
function providerSpendSection(inputs: BudgetInputs, rows: readonly ProviderSpendRow[]): readonly string[] {
  // Priced from the input rather than from a caller-supplied literal. The literal is what this
  // section got wrong, and a parameter is how it stayed wrong while the plan above moved on.
  const usdPerTrial = inputs.usdPerTrial;
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
    `Runs are priced at the measured ${usd(usdPerTrial)} — the mean of the 19 real Harbor trials over $0.50 in \`data/measured-trial-costs.json\`. This section used to price them at ${usd(RETIRED_USD_PER_TRIAL_LITERAL)}, a literal with no measurement behind it printed under a heading that said "measured", so every dollar figure below was low by roughly ${(usdPerTrial / RETIRED_USD_PER_TRIAL_LITERAL).toFixed(1)}x.`,
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
