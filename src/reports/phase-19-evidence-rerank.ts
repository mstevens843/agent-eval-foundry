import { buildPhase19ReviewLedger } from "../phase-19/candidate-review.js";
import {
  buildPhase19Reranking,
  buildPhase19UiLabelLedger,
  phase19CoreB6,
} from "../phase-19/evidence-rerank.js";
import { phase19CandidateReviewB6 } from "../phase-19/candidate-review.js";

const pct = (value: number): string => `${(value * 100).toFixed(0)}%`;
const dash = (value: string | number | null): string => (value === null ? "-" : String(value));

export function renderPhase19EvidenceRerank(root: string): string {
  const ui = buildPhase19UiLabelLedger(root);
  const ranking = buildPhase19Reranking(root);
  const reviews = ui.summary.labelsReceived === 10 ? buildPhase19ReviewLedger(root) : null;
  const coreB6 = phase19CoreB6(root);
  const reviewB6 = phase19CandidateReviewB6(root);
  const uiVerdict =
    ui.summary.pending > 0
      ? "PENDING"
      : ui.summary.difficultyEvidenceSurvives
        ? "UI DIFFICULTY EVIDENCE SURVIVES"
        : "ZERO SURVIVING LOCAL DIFFICULTY EVIDENCE";
  const finalDecision = reviews?.summary.decision ?? "PENDING";
  const lines: string[] = [
    "# Phase 19 - Evidence Repair And Candidate Reranking",
    "",
    `**Decision: ${finalDecision}. UI verdict: ${uiVerdict}.**`,
    "",
    "This phase does not build a new task and buys no subject trial. It independently re-reads the five",
    "existing UI failures, repairs the 20-family research ranking, reviews only the corrected top five,",
    "and runs deterministic mechanism probes only after 2-of-2 reader survival.",
    "",
    "## 1. Corrections Before Ranking",
    "",
    `- CAA V2 finished at **${ranking.caaV2Correction.cleanSolves}/${ranking.caaV2Correction.countableTrials} clean solves**, not the earlier interim 2/2 state.`,
    `- CAA V2 contributes **no valid task-difficulty estimate**: ${ranking.caaV2Correction.reason}`,
    "- Every inherited probability below is normalized to **P(agent cleanly solves the package)** on [0,1].",
    "  Lower means harder. These values remain unvalidated estimates and do not decide promotion.",
    "- Causal depth and diagnosis radius are required. Raw service size is not credited to either.",
    "- Confirmed semantic duplicates, benchmark infrastructure, and broad benchmark formats are capable",
    "  of removing a row entirely rather than merely subtracting a token score.",
    "",
    "## 2. Blind UI Relabelling",
    "",
    `Packets: ${ui.summary.trials}. Labels: ${ui.summary.labelsReceived}/${ui.summary.labelsRequired}.`,
    "Each trial is read separately by one OpenAI and one Anthropic reader. Existing sidecars, other trials,",
    "prior rankings, author diagnoses, and stopping decisions are withheld.",
    "",
    "| trial | OpenAI | Anthropic | adjudication | difficulty evidence |",
    "|---|---|---|---|---|",
    ...ui.trials.map((trial) => {
      const by = new Map(trial.labels.map((label) => [label.providerFamily, label.label]));
      return `| \`${trial.runId}\` | \`${by.get("openai") ?? "pending"}\` | \`${by.get("anthropic") ?? "pending"}\` | \`${trial.decision.status}\` | ${trial.decision.difficultyEvidence ? "yes" : "no"} |`;
    }),
    "",
    `Agreed capability: **${ui.summary.agreedCapability}/5**. Agreed non-capability: **${ui.summary.agreedNoncapability}/5**. Disagreed: **${ui.summary.disagreed}/5**. Pending: **${ui.summary.pending}/5**.`,
    "",
    ui.summary.pending > 0
      ? "The UI lineage remains unlabelled while any pair is incomplete."
      : ui.summary.difficultyEvidenceSurvives
        ? "At least one UI failure survives the project's cross-provider capability rule. This makes UI the first local lineage with independently attributed difficulty evidence, not a proven 5/6 production family."
        : "None of the five failures has 2-of-2 capability agreement. The project therefore has zero surviving local difficulty evidence and must not authorize a build cohort from historical reward-zero counts.",
    "",
    "## 3. Corrected Twenty-Family Disposition",
    "",
    "| rank | family | disposition | depth | radius | score | ordinary clean-solve | recipe clean-solve |",
    "|---:|---|---|---:|---:|---:|---:|---:|",
    ...ranking.rows.map(
      (row) =>
        `| ${dash(row.rank)} | \`${row.familyId}\` | \`${row.disposition}\` | ${row.dimensions.causalDepth}/5 | ${row.dimensions.diagnosisRadius}/5 | ${dash(row.decisionScore)} | ${pct(row.inheritedCleanSolveProbability.ordinary.value)} | ${pct(row.inheritedCleanSolveProbability.fullRecipe.value)} |`,
    ),
    "",
    "The score is a transparent queueing prior, not an empirical probability. The original artifact's",
    "unit bug is repaired, but its estimated probabilities are retained only as visibly unvalidated context.",
    "",
    "### Removed Before Review",
    "",
    ...ranking.rows
      .filter((row) => row.disposition !== "rankable")
      .map(
        (row) =>
          `- \`${row.familyId}\`: **${row.disposition}**${row.duplicateOf ? ` against ${row.duplicateOf}` : ""}. ${row.rationale}`,
      ),
    "",
    "## 4. Corrected Top Five",
    "",
    ...ranking.topFive.map((familyId, index) => {
      const row = ranking.rows.find((candidate) => candidate.familyId === familyId);
      if (row === undefined) throw new Error(`${familyId}: ranked row missing`);
      return `${index + 1}. \`${familyId}\` - score ${row.decisionScore}; depth ${row.dimensions.causalDepth}/5, radius ${row.dimensions.diagnosisRadius}/5. ${row.rationale}`;
    }),
    "",
    "## 5. Independent Candidate Review And Cheap Probes",
    "",
  ];
  if (reviews === null) {
    lines.push(
      "Candidate review is correctly blocked until all ten UI labels close. No packet selection or probe",
      "result is being inferred from incomplete evidence.",
    );
  } else {
    lines.push(
      `Reviews: **${reviews.summary.reviewsReceived}/${reviews.summary.reviewsRequired}**. Reader survivors: **${dash(reviews.summary.readerSurvivors)}**. Probes run: **${reviews.summary.probesRun}**. Probe survivors: **${dash(reviews.summary.probeSurvivors)}**.`,
      "",
      "| candidate | OpenAI | Anthropic | decision | probe |",
      "|---|---|---|---|---|",
      ...reviews.decisions.map((decision) => {
        const rows = reviews.reviews.filter((review) => review.candidateId === decision.candidateId);
        const by = new Map(rows.map((review) => [review.providerFamily, review.verdict]));
        const probe = reviews.probes.find((row) => row.candidateId === decision.candidateId);
        return `| \`${decision.candidateId}\` | \`${by.get("openai") ?? "pending"}\` | \`${by.get("anthropic") ?? "pending"}\` | \`${decision.verdict}\` | \`${probe?.status ?? "pending"}\` |`;
      }),
      "",
      "Every executed probe runs reference pass, narrow-mutant failure, non-activation, malformed-input",
      "refusal, activation, and deterministic replay in one invocation. A probe survivor establishes only",
      "that the mechanism is cheap to falsify locally; it does not establish frontier-agent difficulty.",
    );
  }
  lines.push(
    "",
    "## 6. Recommendation",
    "",
  );
  if (reviews === null || reviews.summary.decision === "PENDING") {
    lines.push("Do not authorize a full build while the registered evidence and review sequence is incomplete.");
  } else if (!ui.summary.difficultyEvidenceSurvives) {
    lines.push(
      "**REPAIR-CANDIDATES.** The UI evidence did not survive independent attribution. The project has a",
      "strong rejection system and a sourced candidate corpus, but no local capability-evidenced lineage.",
      "Repair candidate contracts and causal geometry before another full package build.",
    );
  } else if (reviews.summary.fullBuildsAuthorized) {
    const survivors = reviews.probes
      .filter((probe) => probe.status === "survived")
      .map((probe) => `\`${probe.candidateId}\``)
      .join(", ");
    lines.push(
      `**BUILD-SELECTIVELY.** Build one package at a time from the reader-and-probe survivors: ${survivors}.`,
      "Use one Codex and one Claude smoke trial per frozen package and stop immediately if both solve.",
      "Do not launch the former four-family cohort and do not treat a probe as difficulty evidence.",
    );
  } else {
    lines.push(
      "**REPAIR-CANDIDATES.** No candidate satisfies the combined UI-evidence, independent-review and",
      "mechanism-probe rule. Do not spend complete-build hours yet.",
    );
  }
  lines.push(
    "",
    "## 7. Limits",
    "",
    "- Both independent labellers are models; this is cross-provider agreement, not human adjudication.",
    "- The five UI trials are historical process-isolated runs and are provider-skewed. Relabelling repairs",
    "  attribution, not their original execution design.",
    "- UI parent evidence transfers only as a lineage prior to the proposed mutation-timing descendant.",
    "- Candidate scores and inherited solve probabilities remain estimates until immutable packages run.",
    "- CAA V2's four genuine solves inform defect-legibility calibration, but its verifier bypass and public",
    "  activation leaks prevent using it as a clean task-difficulty measurement.",
    "- A deterministic mechanism probe is necessary and intentionally insufficient for a build decision.",
    "",
    "## 8. Rig Integrity",
    "",
    `- Core packet/ranking B6 usable: **${coreB6.usable ? "yes" : "no"}**.`,
    `- Candidate-review normalizer B6 usable: **${reviewB6.usable ? "yes" : "no"}**.`,
    "- Reader and probe captures are hashed in the machine-readable ledgers.",
    "",
    "Generated deterministically from the frozen Phase 19 inputs and preserved reader artifacts.",
  );
  return `${lines.join("\n")}\n`;
}
