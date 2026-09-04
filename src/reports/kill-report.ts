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
import type { EvidenceLedger } from "../trials/evidence-lifecycle.js";
import { isSupersededRun, renderRunRef, staleRunNote } from "../trials/migration.js";
import type { FamilyEvidence } from "./ship-report.js";

const esc = (s: string): string => s.replace(/\|/g, "\\|");

export interface KillReportInput {
  readonly shape: TaskShape;
  readonly analysis: KillAnalysis;
  readonly evidence?: FamilyEvidence;
  readonly lineage?: LineageKillContext;
  /** Variants the evolution engine proposed in response. */
  readonly variants: readonly VariantProposal[];
  /**
   * The evidence ledgers, so the trial table can say which of its rows have been withdrawn.
   *
   * Without them this report reads every row as live: `state.trials` is every preserved directory,
   * and a trial's own record still says `counts: true` after the repair that invalidated it.
   */
  readonly ledgers?: readonly EvidenceLedger[];
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

export interface LineageKillContext {
  readonly lineageId: string;
  readonly verdict: string;
  readonly decision: string;
  readonly reason: string;
  readonly nextAction: string;
  readonly estimatedMatrixSpendSavedUsd: number;
  readonly appliesToFamilyIds: readonly string[];
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
  const { shape, analysis, evidence, variants, trials, lineage } = input;
  const ledgers = input.ledgers ?? [];
  const counted = evidence?.countedAgentTrials ?? 0;
  const passed = evidence?.agentTrialsPassed ?? 0;
  const trialsNote = staleRunNote(
    trials.map((t) => t.runId),
    ledgers,
  );
  const familyLedger = ledgers.find((ledger) => ledger.familyId === shape.familyId);
  const evidenceEntryByRun = new Map(
    (familyLedger?.entries ?? []).map((entry) => [entry.runId, entry] as const),
  );
  const trialEvidenceState = (runId: string): string => {
    const entry = evidenceEntryByRun.get(runId);
    if (entry === undefined) return "not classified";
    if (entry.state === "counted") return "canonical counted";
    if (entry.state === "registered-variant") {
      return `registered variant \`${entry.variantId ?? "unknown"}\`; excluded from canonical count`;
    }
    if (entry.state === "superseded") return "**superseded**; withdrawn";
    return entry.state;
  };
  const registeredVariantRuns = trials.filter(
    (trial) => evidenceEntryByRun.get(trial.runId)?.state === "registered-variant",
  );
  const registeredVariantNote =
    registeredVariantRuns.length === 0
      ? null
      : "**Registered variants.** These rows are valid evidence for their named package profiles, but they are not canonical-family trials and do not support the counted total or this kill disposition.";
  // A family whose only trials have been withdrawn is not a family nothing has attempted, and the
  // difference is the whole point of this section. Something DID attempt it — against a package that
  // no longer exists — so what the run bought is the discovery of the defect, not a difficulty
  // reading in either direction.
  const withdrawnOnly =
    counted === 0 && trials.length > 0 && trials.every((t) => isSupersededRun(t.runId, ledgers));
  const mutantsCaught = (evidence?.mutantsCaught ?? []).filter((m) => m.caught).length;
  const mutantsTotal = evidence?.mutantsCaught.length ?? 0;
  const lineageBlocksBlindHardening =
    lineage !== undefined &&
    [
      "lineage_solved_twice",
      "lineage_killed_for_now",
      "lineage_needs_new_mechanism",
      "lineage_requires_cross_lab_before_more_build",
    ].includes(lineage.verdict);
  const nextActions = lineageBlocksBlindHardening
    ? [
        lineage.nextAction,
        "Build or probe the different mechanism cluster recommended in `reports/lineage-learning-report.md` before spending more on this branch.",
      ]
    : analysis.nextActions;

  return [
    `# Kill analysis — ${shape.name}`,
    "",
    `\`${shape.familyId}\` · verdict **${analysis.verdict}** · primary reason **\`${analysis.primary?.reason ?? "none"}\`** · disposition **\`${analysis.disposition ?? "none"}\`**${lineage === undefined ? "" : ` · lineage decision **\`${lineage.decision}\`**`}`,
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
    withdrawnOnly
      ? [
          "**That it is anything.** Every trial this family has is WITHDRAWN: each was graded against a",
          "package this repository no longer produces, so none of them is evidence about the task as it",
          "stands. That is not the same as never having been attempted — an attempt was made and paid",
          "for — and it is not a difficulty reading in either direction. A clean pass against a package",
          "that contained its own answer distinguishes nothing, and a failure against a package with a",
          "defect in it measures the defect.",
          "",
          "What those runs bought is the discovery that invalidated them. The family's status is UNKNOWN",
          "until one counted trial exists under the current hash, and no routing decision — evolution,",
          "matrix spend, lineage verdict — may be made on the withdrawn numbers.",
        ].join("\n")
      : counted === 0
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
              "A clean smoke pass is useful evidence ONLY when the package withheld the answer. Given that, it prevents wasting a `/6` matrix and routes the family into evolution.",
              "",
              `It also did not prove the opposite: ${counted} counted clean pass${counted === 1 ? "" : "es"} by the available model family is a signal, not a proof about every provider. What it forecloses is *shipping on the current evidence*.`,
            ].join("\n")
          : `**Nothing outstanding on difficulty**: ${counted - passed} of ${counted} counted trials failed at least one scenario.`,
    "",
    ...(lineage === undefined
      ? []
      : [
          "## Lineage Learning",
          "",
          `This family is part of lineage \`${lineage.lineageId}\`, which currently has verdict **\`${lineage.verdict}\`**.`,
          "",
          `Lineage reason: ${lineage.reason}.`,
          "",
          `Portfolio decision: ${lineage.nextAction}.`,
          "",
          `Estimated matrix spend avoided by this lineage: $${lineage.estimatedMatrixSpendSavedUsd.toFixed(2)}.`,
          "",
          lineageBlocksBlindHardening
            ? "The generic `already_solved` disposition is the single-family default after a first clean pass. The lineage verdict supersedes blind hardening here because the branch already spent one descendant attempt and the same subject solved both packages cleanly."
            : "The lineage does not currently override the single-family disposition.",
          "",
        ]),
    trials.length === 0
      ? ""
      : [
          "### The trials",
          "",
          "| run | evidence state | model | runtime | scenarios | failed | isolation |",
          "|---|---|---|---:|---:|---:|---|",
          ...trials.map(
            (t) =>
              `| ${renderRunRef(t.runId, ledgers)} | ${trialEvidenceState(t.runId)} | ${t.model ?? "—"} | ${t.runtimeSeconds === null ? "—" : `${Math.round(t.runtimeSeconds)}s`} | ${t.scenarios} | ${t.failed} | ${t.isolation} |`,
          ),
          "",
          ...(trialsNote === null ? [] : [trialsNote, ""]),
          ...(registeredVariantNote === null ? [] : [registeredVariantNote, ""]),
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
    `| **Lack of trial evidence** — nothing has attempted it | ${withdrawnOnly ? "**yes, by withdrawal**" : counted === 0 ? "**yes**" : "no — trials exist"} | ${counted} counted trials${withdrawnOnly ? `; ${trials.length} preserved and withdrawn, which is spend without evidence rather than an untried family` : ""} |`,
    "",
    "## What would make it stronger",
    "",
    lineageBlocksBlindHardening
      ? [
          "_Generic variants are not the next recommended spend for this lineage._",
          "",
          "The single-family evolution engine can still propose descendants, but the portfolio-level",
          "lineage result says to buy evidence from a different mechanism cluster first.",
        ].join("\n")
      : variants.length === 0
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
    ...nextActions.map((a, i) => `${i + 1}. ${a}`),
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
