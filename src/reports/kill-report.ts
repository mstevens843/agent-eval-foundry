// The postmortem: what a family proved, what it did not, and what to do about it.
//
// The structure is deliberate and the second section is the one that matters. "What it proved" and
// "what it did not prove" are separate headings because collapsing them is the specific failure this
// repository was built around: a family with an excellent verifier and no trials reads, in every
// summary anyone writes, as a family that works. Splitting the two forces the sentence "the verifier
// discriminates and the family is easy" to be written down, which is a sentence nobody writes
// voluntarily about their own work.
//
// Everything here is derived from the kill analysis. The report renders; it does not decide.

import type { VariantProposal } from "../foundry/evolve.js";
import type { KillAnalysis, KillFinding } from "../foundry/kill.js";
import { KILL_REASON_SPECS, killReasonSpec } from "../foundry/kill.js";
import type { TaskShape } from "../foundry/schema.js";
import type { FamilyEvidence } from "./ship-report.js";

const esc = (s: string): string => s.replace(/\|/g, "\\|");

export interface KillReportInput {
  readonly shape: TaskShape;
  readonly analysis: KillAnalysis;
  readonly evidence?: FamilyEvidence;
  /** Variants the evolution engine proposed in response. */
  readonly variants: readonly VariantProposal[];
  /** Trial rows, for the evidence table. */
  readonly trials: readonly {
    readonly runId: string;
    readonly model: string | null;
    readonly runtimeSeconds: number | null;
    readonly scenarios: number;
    readonly failed: number;
    readonly isolation: string;
  }[];
}

const finding = (f: KillFinding): readonly string[] => {
  const spec = killReasonSpec(f.reason);
  return [
    `### \`${f.reason}\` — ${spec.kind}, ${f.source}`,
    "",
    f.detail,
    "",
    `**Disposition:** \`${spec.disposition}\`. **Evidence required:** ${spec.evidenceRequirement}.`,
    "",
    "| evidence |",
    "|---|",
    ...f.evidence.map((e) => `| ${esc(e)} |`),
    "",
    f.gates.length > 0 ? `Supporting gates: ${f.gates.map((g) => `\`${g}\``).join(", ")}.` : "",
    "",
  ];
};

export function renderKillReport(input: KillReportInput): string {
  const { shape, analysis, evidence, variants, trials } = input;
  const counted = evidence?.countedAgentTrials ?? 0;
  const passed = evidence?.agentTrialsPassed ?? 0;
  const mutantsCaught = (evidence?.mutantsCaught ?? []).filter((m) => m.caught).length;
  const mutantsTotal = evidence?.mutantsCaught.length ?? 0;

  return [
    `# Kill analysis — ${shape.name}`,
    "",
    `\`${shape.familyId}\` · verdict **${analysis.verdict}** · primary reason **\`${analysis.primary?.reason ?? "none"}\`** · disposition **\`${analysis.disposition ?? "none"}\`**`,
    "",
    analysis.fullyDerived
      ? "Every finding below is derived from a gate result or a trial record. Nothing here is an opinion."
      : "Some findings below are author declarations rather than measurements, and are labelled `declared` where they appear.",
    "",
    "## What this family tested",
    "",
    shape.hiddenGradedRegion,
    "",
    `It targets ${shape.mechanisms.map((m) => `\`${m}\``).join(", ")} across a declared space of ${shape.knobs.length} knobs.`,
    "",
    "## What it proved",
    "",
    counted === 0 && mutantsTotal === 0
      ? "_Nothing yet: the family has not been run._"
      : [
          "| claim | evidence | status |",
          "|---|---|---|",
          evidence !== undefined
            ? `| The reference is solvable | reference sweep over every graded scenario | ${evidence.referencePasses ? "**proved**" : "FAILED"} |`
            : "",
          mutantsTotal > 0
            ? `| The verifier discriminates | ${mutantsCaught} of ${mutantsTotal} mutants caught by the check each was written to trip | ${mutantsCaught === mutantsTotal ? "**proved**" : "partial"} |`
            : "",
          evidence !== undefined
            ? `| Trivial strategies lose | ${evidence.baselinesBlocked.length} of ${evidence.baselinesTotal} baselines rejected | ${evidence.baselinesBlocked.length === evidence.baselinesTotal ? "**proved**" : "partial"} |`
            : "",
          evidence !== undefined
            ? `| Scenarios exercise their mechanism | every attack blocks on its governing rule | ${evidence.mechanismsExercised ? "**proved**" : "FAILED"} |`
            : "",
          counted > 0
            ? `| Real models can be graded on it | ${counted} counted agent trial(s) under ${evidence?.isolation} isolation, artifacts preserved | **proved** |`
            : "",
        ]
          .filter((l) => l.length > 0)
          .join("\n"),
    "",
    "## What it did **not** prove",
    "",
    counted === 0
      ? [
          "**That it is hard.** Nothing that could plausibly fail this family has attempted it. A measured",
          "axis count against a bank of hand-written mutants is a statement about the verifier, and the two",
          "get written in the same font unless something forces them apart.",
        ].join("\n")
      : passed === counted
        ? [
            `**That it is hard.** All ${counted} counted agent trials passed every graded scenario. The`,
            "submissions were genuine implementations, not refusals or stubs — which makes this a",
            "measurement rather than a harness failure, and the measurement is that the task is easy for",
            "the models it was built to separate.",
            "",
            "It also did not prove the opposite: three trials by one model family is a strong signal and not",
            "a proof. What it forecloses is *shipping on the current evidence*.",
          ].join("\n")
        : `**Nothing outstanding on difficulty**: ${counted - passed} of ${counted} counted trials failed at least one scenario.`,
    "",
    trials.length === 0
      ? ""
      : [
          "### The trials",
          "",
          "| run | model | runtime | scenarios | failed | isolation |",
          "|---|---|---:|---:|---:|---|",
          ...trials.map(
            (t) =>
              `| \`${t.runId}\` | ${t.model ?? "—"} | ${t.runtimeSeconds === null ? "—" : `${Math.round(t.runtimeSeconds)}s`} | ${t.scenarios} | ${t.failed} | ${t.isolation} |`,
          ),
          "",
        ].join("\n"),
    "## Why it is not ready",
    "",
    analysis.blockingFailures.length === 0
      ? "No blocking gate fails; the holds below are advisory."
      : `Blocking gates failing: ${analysis.blockingFailures.map((g) => `\`${g}\``).join(", ")}.`,
    "",
    analysis.advisoryFailures.length === 0
      ? ""
      : `Advisory gates failing: ${analysis.advisoryFailures.map((g) => `\`${g}\``).join(", ")}.`,
    "",
    "## Findings",
    "",
    ...analysis.findings.flatMap(finding),
    "## Which of these it is",
    "",
    "The question a postmortem has to answer and usually dodges: is the problem the task, the models,",
    "the spec, the data, or the absence of evidence? Each row is a hypothesis with a test attached.",
    "",
    "| hypothesis | verdict here | how it was decided |",
    "|---|---|---|",
    `| **Task weakness** — the family is too easy | ${analysis.findings.some((f) => f.reason === "already_solved") ? "**yes, primary**" : "no"} | counted trials all passing |`,
    "| **Model strength** — the models are simply good at this | contributory | the submissions were real implementations citing the rules, not lucky guesses. That is a fact about the models AND about the task: the task did not distinguish them. |",
    "| **Policy explicitness** — the spec gave away the answer | likely contributory | the published rule order made attribution a lookup rather than a derivation. `reduce_policy_explicitness` is the operator that tests this directly. |",
    `| **Synthetic data** — the fixtures are too clean to transfer | ${analysis.findings.some((f) => f.reason === "too_synthetic") ? "declared" : "unmeasured"} | scenarios are single-turn and fully observable; nothing has tested whether a pass transfers to a longer, noisier setting |`,
    `| **Lack of trial evidence** — nothing has attempted it | ${counted === 0 ? "**yes**" : "no — trials exist"} | ${counted} counted trials |`,
    "",
    "## What would make it stronger",
    "",
    variants.length === 0
      ? "_No variants proposed: the disposition is not `harden` or `mutate`._"
      : [
          "The evolution engine proposes the following, each a composition of named operators rather than",
          "a fresh idea. Kill risk is the pre-registered probability that the variant dies of the same",
          "cause as its parent.",
          "",
          "| variant | operators | new mechanisms | axes | kill risk | build h |",
          "|---|---|---|---:|---:|---:|",
          ...variants.map(
            (v) =>
              `| \`${v.id}\` | ${v.operators.map((o) => `\`${o}\``).join(", ")} | ${
                v.mechanisms
                  .filter((m) => !shape.mechanisms.includes(m))
                  .map((m) => `\`${m}\``)
                  .join(", ") || "—"
              } | ${v.expectedAxisContribution} | ${(v.killRisk * 100).toFixed(0)}% | ${v.estimatedBuildHours} |`,
          ),
          "",
          "See `reports/foundry-evolution-report.md` for each variant in full.",
        ].join("\n"),
    "",
    "## Next actions",
    "",
    ...analysis.nextActions.map((a, i) => `${i + 1}. ${a}`),
    "",
    "## The taxonomy this was graded against",
    "",
    "Reasons not found here are as informative as the one that was. A family that dies of",
    "`already_solved` is a different problem from one that dies of `no_mechanism_fire`, and the",
    "disposition column is why the distinction is worth keeping.",
    "",
    "| reason | kind | disposition | found here |",
    "|---|---|---|---|",
    ...KILL_REASON_SPECS.map(
      (s) =>
        `| \`${s.reason}\` | ${s.kind} | \`${s.disposition}\` | ${analysis.findings.some((f) => f.reason === s.reason) ? "**yes**" : "no"} |`,
    ),
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}
