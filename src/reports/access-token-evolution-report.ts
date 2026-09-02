import type { VariantProposal } from "../foundry/evolve.js";
import type { FamilyLoopState } from "../foundry/loop.js";
import type { ProbeResult } from "../foundry/probe-runner.js";
import type { PromotedFamilyRecord } from "../foundry/promotion.js";
import type { PromotionSmokeGateResult } from "../foundry/smoke-gates.js";

export const ACCESS_TOKEN_EVOLUTION_PARENT = "access-token-scope-expansion";
export const ACCESS_TOKEN_EVOLUTION_PROBE = "delegated-wallet-scope-reconciliation-probe";
export const ACCESS_TOKEN_EVOLUTION_FAMILY = "delegated-wallet-scope-reconciliation";

const esc = (value: string): string => value.replace(/\|/g, "\\|");

export interface AccessTokenEvolutionReportInput {
  readonly parentState: FamilyLoopState;
  readonly smokeGate: PromotionSmokeGateResult;
  readonly selectedVariant: VariantProposal | null;
  readonly selectedProbeResult: ProbeResult | null;
  readonly selectedPromotion: PromotedFamilyRecord | null;
  readonly challengeHash: string;
}

export function renderAccessTokenEvolutionReport(input: AccessTokenEvolutionReportInput): string {
  const { parentState, smokeGate, selectedVariant, selectedProbeResult, selectedPromotion, challengeHash } =
    input;
  const counted = parentState.evidence?.countedAgentTrials ?? 0;
  const passed = parentState.evidence?.agentTrialsPassed ?? 0;
  const trial = parentState.trials.find((record) => record.runId === "access-token-2026-08-o1");
  const selectedVariantId = selectedVariant?.id ?? "none";

  // The recorded smoke ran against a package whose starter WAS the answer, so it is quoted here only
  // as withdrawn evidence. `counts` on the record is about grading and says nothing about whether the
  // task still exists, which is exactly how this run was previously presented as live.
  const smokeSuperseded = counted === 0 && trial !== undefined;

  return [
    "# Access-Token Evolution v1",
    "",
    "This report tracked the recovery path after `access-token-scope-expansion` was read as cleanly",
    "solved by one counted OpenAI/Codex smoke trial. That reading has been WITHDRAWN: the package that",
    "smoke ran against shipped a `starter/subject.mjs` which was a complete passing solution, graded at",
    "0 failures out of 384. A clean pass against a package containing its own answer key says nothing",
    "about the mechanism, so the branch's status is UNKNOWN rather than solved.",
    "",
    "## Parent Signal",
    "",
    "| item | value |",
    "|---|---|",
    `| parent family | \`${parentState.shape.familyId}\` |`,
    `| challenge hash | \`${challengeHash}\` |`,
    `| counted smoke trials | ${counted} |`,
    `| clean passes | ${passed} |`,
    `| recorded smoke run | \`${trial?.runId ?? "not-found"}\`${smokeSuperseded ? " — **superseded**, invalidated by the 2026-09-01 starter-leak repair" : ""} |`,
    `| smoke result | ${trial === undefined ? "not-found" : `${trial.scenarios - trial.failed}/${trial.scenarios} pass${smokeSuperseded ? " against the superseded package; not current evidence" : ""}`} |`,
    `| primary kill/evolve reason | \`${parentState.analysis.primary?.reason ?? "none"}\` |`,
    `| disposition | \`${parentState.analysis.disposition ?? "none"}\` |`,
    `| matrix gate | ${smokeGate.matrixReadinessStatus} |`,
    "",
    smokeSuperseded
      ? "A clean smoke pass is useful evidence ONLY when the package withheld the answer. This one did not, so it neither established that the family is solved nor justified skipping a matrix. What it bought was the discovery of the leak. The family now needs one counted smoke against the repaired package before any evolution or matrix decision can be made on evidence."
      : "A clean smoke pass is useful evidence. It prevents wasting a `/6` matrix and routes the family into evolution.",
    "",
    "## Descendant Proposals",
    "",
    "| proposal | selected | operators | expected axes | kill risk | build h |",
    "|---|---|---|---:|---:|---:|",
    ...parentState.variants.map(
      (variant) =>
        `| \`${variant.id}\` | ${variant.id === selectedVariantId ? "yes" : "no"} | ${variant.operators.map((op) => `\`${op}\``).join(", ")} | ${variant.expectedAxisContribution} | ${(variant.killRisk * 100).toFixed(0)}% | ${variant.estimatedBuildHours} |`,
    ),
    "",
    selectedVariant === null
      ? "No descendant proposal was selected. The evolution route is incomplete."
      : [
          "## Selected Descendant",
          "",
          `Selected proposal: \`${selectedVariant.id}\` -> draft family \`${ACCESS_TOKEN_EVOLUTION_FAMILY}\`.`,
          "",
          "### What Stays Fixed",
          "",
          ...selectedVariant.whatStaysFixed.map((item) => `- ${item}`),
          "",
          "### What Changes",
          "",
          ...selectedVariant.whatChanges.map((item) => `- ${item}`),
          "",
          "### Pre-Registered Mutants",
          "",
          "| mutant | must fail check |",
          "|---|---|",
          ...selectedVariant.requiredMutants.map(
            (mutant) => `| \`${mutant.mutantId}\` | \`${mutant.mustFailCheck}\` |`,
          ),
          "",
        ].join("\n"),
    "",
    "## Executable Probe",
    "",
    ...(selectedProbeResult === null
      ? [`Probe \`${ACCESS_TOKEN_EVOLUTION_PROBE}\` has not run. The descendant is proposal-only.`, ""]
      : [
          "| item | value |",
          "|---|---:|",
          `| probe | \`${selectedProbeResult.probeId}\` |`,
          `| verdict | \`${selectedProbeResult.verdict}\` |`,
          `| scenarios | ${selectedProbeResult.scenarioCount} |`,
          `| reference passed | ${selectedProbeResult.referencePassed ? "yes" : "no"} |`,
          `| bad/baseline subjects caught | ${selectedProbeResult.badSubjectsCaught}/${selectedProbeResult.badSubjectsTotal} |`,
          `| distinct failed checks | ${selectedProbeResult.distinctFailedChecks.length} |`,
          "",
          "| subject | kind | caught by intended checks | failed checks |",
          "|---|---|---|---|",
          ...selectedProbeResult.subjectResults.map(
            (subject) =>
              `| \`${subject.subjectId}\` | ${subject.kind} | ${subject.caughtByIntendedChecks ? "yes" : "no"} | ${subject.failedChecks.map((check) => `\`${check}\``).join(", ") || "none"} |`,
          ),
          "",
          "The probe includes valid narrowed-spend cases and invalid broad/stale/revoked cases, so it does",
          "not reward blanket refusal and does not reduce to a static scope-equality wording variant.",
          "",
        ]),
    "## Promotion State",
    "",
    ...(selectedPromotion === null
      ? ["No promotion record points at the selected descendant probe.", ""]
      : [
          "| item | value |",
          "|---|---|",
          `| promotion | \`${selectedPromotion.promotion.id}\` |`,
          `| family id | \`${selectedPromotion.promotion.familyId}\` |`,
          `| status | \`${selectedPromotion.promotion.status}\` |`,
          `| evidence level | \`${selectedPromotion.promotion.evidence.claimedEvidenceLevel}\` |`,
          `| counted descendant trials | ${selectedPromotion.promotion.evidence.countedAgentTrials} |`,
          `| expected first smoke provider | ${esc(selectedPromotion.promotion.expectedFirstSmokeTrialProvider)} |`,
          "",
          `Confirm signal: ${selectedPromotion.promotion.preRegisteredConfirmSignal}`,
          "",
          `Kill signal: ${selectedPromotion.promotion.preRegisteredKillSignal}`,
          "",
        ]),
    "## Evidence Boundary",
    "",
    smokeSuperseded
      ? "- The parent's clean smoke pass is WITHDRAWN, not counted: it ran against a package whose visible starter was a complete passing solution, so it cannot distinguish a subject that solved the mechanism from one that kept the starter. The parent's status is unknown."
      : "- Parent clean smoke pass is counted real-agent evidence that the parent is solved by the available OpenAI/Codex subject.",
    selectedPromotion?.promotion.status === "family-built"
      ? "- The descendant now has full local verifier/mutant/package evidence, but no counted real-agent trial yet."
      : "- Descendant probe evidence is executable local evidence, not full-family evidence.",
    selectedPromotion?.promotion.status === "family-built"
      ? "- A challenge package exists for the descendant; its trial result remains not-run until a counted smoke is preserved."
      : "- The descendant has no challenge package, no full local matrix and no counted real-agent trial yet.",
    "- The wallet transfer is declared and probe-supported, not transfer-proven.",
    "- Full `/6` matrix spend remains blocked until a built descendant package, one smoke diagnosis and transfer evidence justify it.",
    "",
    "## Next Action",
    "",
    selectedPromotion === null
      ? "Create a promotion record for the selected descendant probe before building a full family."
      : selectedPromotion.promotion.status === "ready"
        ? "Build the full descendant family only after accepting this probe result as the selected evolution path."
        : "Run one OpenAI/Codex smoke trial only after the built descendant package and local verifier gates pass.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.",
    "",
  ].join("\n");
}
