// The campaign report and the agent-results report.
//
// Two documents because they answer two questions that are constantly merged. The campaign report
// says WHAT WAS RUN — how many slots, which are unrun, what the counting rules were, what the plan
// said would kill the family before anything ran. The results report says WHAT WAS FOUND, and it is
// only allowed to talk about counted trials.
//
// Merging them produces the report every benchmark writes: a pass rate over whatever happened to
// execute, with the refusals and the unrun slots invisible. Six outcome kinds are printed separately
// throughout, and the difference between "no model failed this" and "no model attempted this" is
// never left to the reader to infer.

import type { CampaignPlan } from "../trials/campaign.js";
import { progressOf } from "../trials/campaign.js";
import type { FamilyTrialAnalysis, KnobSplit, OutcomeKind } from "./agent-results.js";

const esc = (s: string): string => s.replace(/\|/g, "\\|");
const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;

const KIND_LABEL: Readonly<Record<OutcomeKind, string>> = {
  counted_solve: "**counted solve** — a real attempt that passed every graded scenario",
  counted_failure: "**counted failure** — a real attempt that failed at least one scenario",
  provider_refusal: "provider refusal — no attempt was made; never counted",
  infra_failure: "infrastructure failure — the harness, not the subject; never counted",
  not_run: "not run — a declared slot with no attempt yet",
  verifier_only: "verifier-only — a mutant, not an agent; never difficulty evidence",
};

export interface CampaignReportInput {
  readonly plan: CampaignPlan;
  readonly countedRunIds: readonly string[];
  readonly challengeCurrent: string;
  readonly disagreements: readonly string[];
  /** Trials preserved from an earlier version of this challenge. */
  readonly superseded?: readonly string[];
}

export function renderCampaignReport(input: CampaignReportInput): string {
  const { plan } = input;
  const progress = progressOf(plan, input.countedRunIds);
  const matches = plan.challengeHash === input.challengeCurrent;

  return [
    `# Trial campaign — ${plan.familyId}`,
    "",
    `\`${plan.campaignId}\` · ${progress.total} slots · ${progress.run} run · ${progress.counted} counted · ${progress.notRun} not run`,
    "",
    "## Pre-registration",
    "",
    "Written before any slot ran, so the result below cannot be reinterpreted into a success.",
    "",
    `**Hypothesis.** ${plan.hypothesis}`,
    "",
    `**Kill signal.** ${plan.killSignal}`,
    "",
    `**Confirm signal.** ${plan.confirmSignal}`,
    "",
    "## The task that was run",
    "",
    "| | |",
    "|---|---|",
    `| challenge hash (plan) | \`${plan.challengeHash}\` |`,
    `| challenge hash (now) | \`${input.challengeCurrent}\` |`,
    `| match | ${matches ? "**yes** — every slot measured the task this repository currently holds" : "**NO** — the family changed after the plan was written; these slots measured a different task"} |`,
    `| scenario set | \`${plan.scenarioSetId}\`, ${plan.scenariosExpected} scenarios |`,
    `| isolation | \`${plan.isolation}\` |`,
    `| timeout | ${Math.round(plan.timeoutMs / 60000)} minutes per slot |`,
    `| budget | $${plan.budgetUsd.toFixed(2)} |`,
    "",
    "## Slots",
    "",
    "| slot | model | runner | state | run |",
    "|---|---|---|---|---|",
    ...plan.slots.map(
      (s) =>
        `| ${s.slotId} | \`${s.model}\` | ${s.runner} | ${s.state === "NOT_RUN" ? "**NOT_RUN**" : s.state} | ${s.runId === null ? "—" : `\`${s.runId}\``} |`,
    ),
    "",
    ...(progress.notRun === 0
      ? []
      : [
          "### Why the unrun slots are unrun",
          "",
          ...plan.slots
            .filter((s) => s.state === "NOT_RUN")
            .map((s) => `- **${s.slotId}** (${s.model}): ${esc(s.note)}`),
          "",
        ]),
    "## Counting rules",
    "",
    "Declared in the plan and cross-checked against the code — a plan may not redefine what counts.",
    "",
    "| | |",
    "|---|---|",
    `| never counts | ${plan.counting.neverCounts.map((s) => `\`${s}\``).join(", ")} |`,
    `| on refusal | ${esc(plan.counting.onRefusal)} |`,
    `| on infrastructure failure | ${esc(plan.counting.onInfraFailure)} |`,
    `| on crash | ${esc(plan.counting.onCrash)} |`,
    `| retries after infrastructure failure | ${plan.counting.retriesOnInfra} |`,
    `| retry after refusal | ${plan.counting.retryOnRefusal ? "yes" : "**no** — re-running until a provider complies turns a refusal into a sampling artifact"} |`,
    "",
    "## What is preserved",
    "",
    ...plan.preservation.map((p) => `- ${p}`),
    "",
    ...((input.superseded ?? []).length === 0
      ? []
      : [
          "## Superseded trials",
          "",
          "These ran against an earlier version of this challenge and are preserved without counting.",
          "A trial is evidence about the task it was run against, and that task no longer exists.",
          "",
          ...(input.superseded ?? []).map((r) => `- \`${r}\``),
          "",
        ]),
    ...(input.disagreements.length === 0
      ? ["The plan and the trial directories on disk agree."]
      : ["## Plan/evidence disagreements", "", ...input.disagreements.map((d) => `- ${d}`)]),
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}

const knobTable = (split: KnobSplit): readonly string[] => [
  `### \`${split.knob}\`${split.discriminates ? " — **the failure rate moves with this knob**" : ""}`,
  "",
  "| value | scenarios | failed | rate |",
  "|---|---:|---:|---:|",
  ...split.rows.map((r) => `| \`${r.value}\` | ${r.scenarios} | ${r.failed} | ${pct(r.rate)} |`),
  "",
];

export interface AgentResultsInput {
  readonly analysis: FamilyTrialAnalysis;
  readonly plan: CampaignPlan | null;
  /** The parent family's result, when this family is an evolved descendant. */
  readonly parent?: {
    readonly familyId: string;
    readonly counted: number;
    readonly failures: number;
    readonly operator: string;
  };
}

export function renderAgentResults(input: AgentResultsInput): string {
  const a = input.analysis;
  const counted = a.outcomes.filter((o) => o.kind === "counted_solve" || o.kind === "counted_failure");
  const discriminatingKnobs = a.knobSplits.filter((k) => k.discriminates);

  return [
    `# Agent trial results — ${a.familyId}`,
    "",
    a.counted === 0
      ? "**No counted agent trial exists.** Nothing below is difficulty evidence."
      : `**${a.counted} counted agent trial(s): ${a.failures} failed at least one scenario, ${a.solves} passed everything.**`,
    "",
    a.verdict === "discriminates"
      ? "The family **discriminates**: at least one real attempt failed, so the suite separates something."
      : a.verdict === "already-solved"
        ? "The family is **already-solved** on this bank: every counted attempt passed everything."
        : "**No evidence either way.**",
    "",
    "## Outcomes, kept apart",
    "",
    "| kind | count | what it means |",
    "|---|---:|---|",
    ...(["counted_solve", "counted_failure", "provider_refusal", "infra_failure", "not_run"] as const).map(
      (kind) => `| \`${kind}\` | ${a.outcomes.filter((o) => o.kind === kind).length} | ${KIND_LABEL[kind]} |`,
    ),
    "",
    "A refusal is not a failure and an unrun slot is not a pass. The two rows most often merged are",
    "`provider_refusal` and `counted_failure`, and merging them is how a benchmark reports difficulty",
    "it never measured.",
    "",
    "## Per trial",
    "",
    "| run | model | outcome | graded | failed | runtime |",
    "|---|---|---|---:|---:|---:|",
    ...a.outcomes.map(
      (o) =>
        `| \`${o.runId}\` | ${o.model ?? "—"} | ${o.kind} | ${o.scenariosGraded} | ${o.scenariosFailed} | ${o.runtimeSeconds === null ? "—" : `${Math.round(o.runtimeSeconds)}s`} |`,
    ),
    "",
    ...(a.counted === 0
      ? []
      : [
          "## Which checks failed",
          "",
          "Pooled across counted trials. A check that never fires is not evidence it cannot.",
          "",
          "| check | scenarios |",
          "|---|---:|",
          ...a.checkTotals.map((c) => `| \`${c.check}\` | ${c.scenarios} |`),
          "",
          "## Where the failures fall",
          "",
          "The analysis that decides whether an evolution operator worked. A knob whose values produce",
          "different failure rates is a knob that is doing something; a flat split means the difficulty",
          "came from somewhere else.",
          "",
          ...a.knobSplits.flatMap(knobTable),
          discriminatingKnobs.length === 0
            ? "**No knob moves the failure rate.** Whatever the family measures, it is not any single declared parameter."
            : `**${discriminatingKnobs.length} knob(s) move the failure rate: ${discriminatingKnobs.map((k) => `\`${k.knob}\``).join(", ")}.**`,
          "",
        ]),
    ...(input.parent === undefined
      ? []
      : [
          "## Against the parent family",
          "",
          "| | parent | this family |",
          "|---|---|---|",
          `| family | \`${input.parent.familyId}\` | \`${a.familyId}\` |`,
          `| counted trials | ${input.parent.counted} | ${a.counted} |`,
          `| trials that failed something | ${input.parent.failures} | ${a.failures} |`,
          `| operator applied | — | \`${input.parent.operator}\` |`,
          "",
          a.failures > input.parent.failures
            ? "**The descendant separates subjects the parent could not.** Same model family, same isolation, same harness; the difference is the operator."
            : "The descendant did not fail more attempts than its parent, so the operator has no support from this bank.",
          "",
        ]),
    "## Model coverage",
    "",
    a.modelFamilies.length <= 1
      ? [
          `Counted trials come from **one model family** (${a.modelFamilies.join(", ") || "none"}). One family has no measured variance: a result here says what that lab's model does, not what models do.`,
          a.notRunSlots > 0
            ? "The unrun slots in the campaign are the planned fix, and they are still unrun."
            : "There are no remaining planned slots in this campaign; cross-lab breadth would require a separate imported or future campaign.",
        ].join(" ")
      : `Counted trials span ${a.modelFamilies.length} model families: ${a.modelFamilies.join(", ")}.`,
    "",
    ...(input.plan === null
      ? []
      : [
          "## Against the pre-registration",
          "",
          `**Kill signal was:** ${input.plan.killSignal}`,
          "",
          `**Confirm signal was:** ${input.plan.confirmSignal}`,
          "",
          a.verdict === "already-solved"
            ? "**The kill signal fired.**"
            : a.verdict === "discriminates"
              ? "**The kill signal did not fire.** Read the knob splits above against the confirm signal: the claim is only as strong as the pattern, not the pass rate."
              : "Neither signal fired: there is no counted evidence.",
          "",
        ]),
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}
