import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DEPLOYMENT_ALIAS_PROFILE, checkChallengePackage } from "../challenge/package-check.js";
import type { ExternalIntakeValidationResult } from "../external-intake/types.js";
import type {
  ProductionReadinessResult,
  ProductionReadinessStatus,
} from "../foundry/production-readiness.js";
import type { CampaignPlan } from "../trials/campaign.js";
import { hashChallengeDir } from "../trials/run.js";
import type { FamilyTrialAnalysis } from "./agent-results.js";
import type { HumanGateEvidence, VerifierIntegrityEvidence } from "./ship-report.js";

const FAMILY_ID = "deployment-model-alias-rollout-drift";
const EXTERNAL_PROVIDERS = ["claude", "gemini", "external"] as const;

export interface DeploymentAliasProductionReportInput {
  readonly readiness: ProductionReadinessResult;
  readonly analysis: FamilyTrialAnalysis;
  readonly challengeHash: string;
  readonly scenarioSetId: string;
  readonly measuredScenarios: number;
  readonly declaredSpace: number;
  readonly mutantDetectionAxes: number;
  readonly packageFiles: number;
  readonly packageBytes: number;
}

export interface DeploymentAliasBundleAudit {
  readonly providerId: string;
  readonly dir: string;
  readonly present: boolean;
  readonly providerLabel: string | null;
  readonly providerFamily: string | null;
  readonly availableHere: boolean | null;
  readonly availabilityDetail: string | null;
  readonly challengeHash: string | null;
  readonly hashMatches: boolean;
  readonly leakCheck: "pass" | "fail" | "missing";
  readonly leakDetail: string;
  readonly metadataTemplate: "pass" | "fail" | "missing";
  readonly metadataDetail: string;
  readonly hiddenFilesAbsent: boolean;
  readonly generatedReportsAbsent: boolean;
  readonly importCommand: string;
  readonly verifyCommand: string;
}

export interface DeploymentAliasCrossLabReportInput {
  readonly expectedHash: string;
  readonly expectedScenarioSetId: string;
  readonly audits: readonly DeploymentAliasBundleAudit[];
  readonly analysis: FamilyTrialAnalysis;
}

export interface DeploymentAliasAdversarialReadinessInput {
  readonly challengeHash: string;
  readonly verifierHash: string | null;
  readonly summary: VerifierIntegrityEvidence | undefined;
  readonly campaignPath: string;
  readonly bundlePath: string;
}

export interface DeploymentAliasHumanIntakeInput {
  readonly challengeHash: string;
  readonly scenarioSetId: string;
  readonly human: HumanGateEvidence | undefined;
  readonly packetPath: string;
}

export interface DeploymentAliasMatrixReadinessGapInput {
  readonly readiness: ProductionReadinessResult;
  readonly analysis: FamilyTrialAnalysis;
  readonly human: HumanGateEvidence | undefined;
  readonly adversarial: VerifierIntegrityEvidence | undefined;
  readonly externalResults: readonly ExternalIntakeValidationResult[];
  readonly openAiHalfMatrix: CampaignPlan | undefined;
  readonly challengeHash: string;
  readonly scenarioSetId: string;
}

export function renderDeploymentAliasProductionReadiness(
  input: DeploymentAliasProductionReportInput,
): string {
  const { readiness, analysis } = input;
  return [
    "# deployment-model-alias-rollout-drift production readiness",
    "",
    "Deployment-alias is the first branch selected by lineage reallocation that produced an",
    "on-target real-agent smoke failure. This report is stricter than the one-agent smoke gate:",
    "it asks whether production-mode `/6` matrix spend is earned.",
    "",
    "## Verdict",
    "",
    `Production matrix: **${readiness.productionMatrixStatus}**.`,
    "",
    "| item | value |",
    "|---|---|",
    `| family | \`${readiness.familyId}\` |`,
    `| challenge hash | \`${input.challengeHash}\` |`,
    `| scenario set | \`${input.scenarioSetId}\` |`,
    `| declared behavior space | ${input.declaredSpace} |`,
    `| measured scenarios | ${input.measuredScenarios} |`,
    `| package | ${input.packageFiles} files, ${input.packageBytes} bytes |`,
    `| mutant-detection axes | ${input.mutantDetectionAxes} |`,
    `| counted smoke trials | ${analysis.counted} |`,
    `| counted smoke failures | ${analysis.failures} |`,
    `| counted smoke solves | ${analysis.solves} |`,
    `| counted provider families | ${readiness.countedProviderFamilies.map((f) => `\`${f}\``).join(", ") || "none"} |`,
    `| counted failure provider families | ${readiness.countedFailureProviderFamilies.map((f) => `\`${f}\``).join(", ") || "none"} |`,
    `| smoke difficulty evidenced | ${readiness.smokeDifficultyEvidenced ? "yes" : "no"} |`,
    `| cross-lab smoke present | ${readiness.crossLabSmokeEvidenced ? "yes" : "no"} |`,
    `| cross-lab difficulty evidenced | ${readiness.crossLabDifficultyEvidenced ? "yes" : "no"} |`,
    `| mixed cross-lab smoke | ${readiness.mixedCrossLabSmoke ? "yes" : "no"} |`,
    "",
    "## Statuses",
    "",
    renderStatusList(readiness.statuses),
    "",
    "## Blocking Rules",
    "",
    readiness.blockers.length === 0
      ? "No production-readiness blockers remain."
      : renderFindings(readiness.blockers),
    "",
    "## Advisory Rules",
    "",
    readiness.advisories.length === 0 ? "No advisory warnings." : renderFindings(readiness.advisories),
    "",
    "## Matrix Plan",
    "",
    ...matrixPlanLines(readiness),
    "",
    `Next action: ${readiness.nextAction}`,
    "",
    "## Evidence Boundary",
    "",
    "- One OpenAI/Codex on-target smoke failure is smoke-difficulty evidence for OpenAI only.",
    "- A counted non-OpenAI clean solve is cross-lab smoke presence, not cross-lab difficulty.",
    "- Mixed cross-lab smoke routes to provider-delta diagnosis or evolution, not automatic `/6` spend.",
    "- It is not a full matrix and not a human-solvability solve.",
    "- Local mutant axes remain verifier-discrimination evidence, not real-agent difficulty axes.",
    "- Adversarial-ready means attack materials are prepared; adversarial-audited requires a counted audit.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.",
    "",
  ].join("\n");
}

export function auditDeploymentAliasCrossLabBundles(
  root: string,
  expectedHash: string,
  expectedScenarioSetId: string,
): readonly DeploymentAliasBundleAudit[] {
  return EXTERNAL_PROVIDERS.map((providerId) => {
    const dir = join(root, "bundles", `${FAMILY_ID}-${providerId}`);
    return auditBundle(root, providerId, dir, expectedHash, expectedScenarioSetId);
  });
}

export function renderDeploymentAliasCrossLabReadiness(input: DeploymentAliasCrossLabReportInput): string {
  const countedNonOpenAi = input.analysis.outcomes.filter(
    (outcome) =>
      (outcome.kind === "counted_solve" || outcome.kind === "counted_failure") &&
      !["openai", "external", "unknown"].includes(providerFamilyOf(outcome.model)),
  );
  const failureProviderFamilies = [
    ...new Set(
      input.analysis.outcomes
        .filter((outcome) => outcome.kind === "counted_failure")
        .map((outcome) => providerFamilyOf(outcome.model))
        .filter((family) => !["external", "unknown"].includes(family)),
    ),
  ].sort();
  const crossLabSmokePresent = input.analysis.modelFamilies.includes("openai") && countedNonOpenAi.length > 0;
  const crossLabDifficulty = failureProviderFamilies.length >= 2;
  return [
    "# deployment-model-alias-rollout-drift cross-lab readiness",
    "",
    "This report separates prepared provider packets from imported provider evidence. A packet is",
    "only evidence after it returns a transcript, submission, metadata and verifier output that",
    "import cleanly under the current hash.",
    "",
    "| item | value |",
    "|---|---|",
    `| expected challenge hash | \`${input.expectedHash}\` |`,
    `| expected scenario set | \`${input.expectedScenarioSetId}\` |`,
    `| providers prepared | ${input.audits.filter((audit) => audit.present).length}/${input.audits.length} |`,
    `| counted smoke trials | ${input.analysis.counted} |`,
    `| counted non-OpenAI smoke trials | ${countedNonOpenAi.length} |`,
    `| counted provider families | ${input.analysis.modelFamilies.map((family) => `\`${family}\``).join(", ") || "none"} |`,
    `| counted failure provider families | ${failureProviderFamilies.map((family) => `\`${family}\``).join(", ") || "none"} |`,
    `| cross-lab smoke present | ${crossLabSmokePresent ? "yes" : "no"} |`,
    `| cross-lab difficulty evidenced | ${crossLabDifficulty ? "yes" : "no"} |`,
    "",
    "## Bundle Audit",
    "",
    "| provider | state | hash | leak check | metadata template | hidden files | reports |",
    "|---|---|---|---|---|---|---|",
    ...input.audits.map(
      (audit) =>
        `| \`${audit.providerId}\` | ${providerState(audit)} | ${
          audit.challengeHash === null ? "missing" : `\`${audit.challengeHash}\``
        } | ${audit.leakCheck} | ${audit.metadataTemplate} | ${
          audit.hiddenFilesAbsent ? "absent" : "present"
        } | ${audit.generatedReportsAbsent ? "absent" : "present"} |`,
    ),
    "",
    "## Commands For Later",
    "",
    ...input.audits.flatMap((audit) => [
      `### ${audit.providerId}`,
      "",
      `Prepare: \`node dist/cli.js external packet --family ${FAMILY_ID} --provider ${audit.providerId} --out bundles/${FAMILY_ID}-${audit.providerId}\``,
      "Validate returned packet: `node dist/cli.js external validate <returned-packet>`",
      `Import: \`${audit.importCommand}\``,
      `Verify: \`${audit.verifyCommand}\``,
      "",
    ]),
    "## Countability",
    "",
    "- One Claude/Anthropic smoke may be imported or run only under explicit authorization and the current hash.",
    "- Gemini remains import-only/infrastructure-error unless entitlement is actually available.",
    "- Generic external bundles must preserve provider and model identity before any cross-lab claim.",
    crossLabSmokePresent
      ? "- A non-OpenAI smoke exists, but cross-lab difficulty is claimed only if the non-OpenAI run also fails on target."
      : "- No cross-lab smoke claim exists yet because only OpenAI/Codex has counted smoke evidence.",
    crossLabSmokePresent && !crossLabDifficulty
      ? "- Current reading: mixed provider result; full `/6` remains blocked pending provider-delta diagnosis or evolution."
      : crossLabDifficulty
        ? "- Current reading: early cross-lab smoke difficulty exists; production matrix may be planned but was not run."
        : "- Current reading: cross-lab smoke remains missing.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.",
    "",
  ].join("\n");
}

export function renderDeploymentAliasAdversarialReadiness(
  input: DeploymentAliasAdversarialReadinessInput,
): string {
  const summary = input.summary;
  const claimLevel = summary?.adversarialClaimLevel ?? "audit-pending";
  return [
    "# deployment-model-alias-rollout-drift adversarial readiness",
    "",
    "Deployment-alias now has real smoke difficulty evidence, so verifier-integrity coverage is",
    "tracked as its own evidence stream.",
    "",
    "| item | value |",
    "|---|---|",
    `| challenge hash | \`${input.challengeHash}\` |`,
    `| verifier hash | ${input.verifierHash === null ? "missing" : `\`${input.verifierHash}\``} |`,
    `| campaign path | \`${input.campaignPath}\` |`,
    `| bundle path | \`${input.bundlePath}\` |`,
    `| claim level | \`${claimLevel}\` |`,
    `| adversarial ready | ${summary?.adversarialPackageReady ? "yes" : "no"} |`,
    `| counted no-bypass audits | ${summary?.countedNoBypassAudits ?? 0} |`,
    `| counted bypass audits | ${summary?.countedBypassAudits ?? 0} |`,
    `| unrepaired bypasses | ${summary?.unrepairedBypasses ?? 0} |`,
    `| hardening probes | ${summary?.adversarialHardeningProbesPass ? "pass" : "pending/fail"} |`,
    `| imported adversarial audits | ${summary?.importedAdversarialAudits ?? 0} |`,
    `| container/no-network audits | ${summary?.adversarialContainerNoNetworkAudits ?? 0} |`,
    "",
    "## Reading",
    "",
    adversarialReading(summary),
    "",
    "## Evidence Boundary",
    "",
    "- Cheat resistance is not the same claim as no bypass found. Cheat resistance is the design requirement; adversarial audit is the attempted exploit record.",
    "- Adversarial-ready is not adversarial-audited.",
    "- OpenAI-only no-bypass evidence would not be cross-lab verifier integrity.",
    "- A refusal or infrastructure error must be preserved and counted as no evidence.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.",
    "",
  ].join("\n");
}

export function renderDeploymentAliasHumanIntake(input: DeploymentAliasHumanIntakeInput): string {
  const human = input.human;
  return [
    "# deployment-model-alias-rollout-drift human intake",
    "",
    "This report describes the clean-room packet for a human engineer. It does not assert a human",
    "solve exists.",
    "",
    "| item | value |",
    "|---|---|",
    `| challenge hash | \`${input.challengeHash}\` |`,
    `| scenario set | \`${input.scenarioSetId}\` |`,
    `| packet path | \`${input.packetPath}\` |`,
    `| human-ready | ${human?.humanPackageReady ? "yes" : "no"} |`,
    `| human-evidenced | ${(human?.cleanHumanSolves ?? 0) > 0 ? "yes" : "no"} |`,
    `| clean human solves | ${human?.cleanHumanSolves ?? 0} |`,
    `| review records | ${human?.humanReviewRecords ?? 0} |`,
    `| unresolved ambiguity findings | ${human?.unresolvedHumanAmbiguities ?? 0} |`,
    "",
    "## Reviewer Must Receive",
    "",
    "- The public challenge package only.",
    "- The clean-room instructions and metadata template in `human-reviews/deployment-model-alias-rollout-drift/`.",
    "- No verifier, reference, hidden scenario, mutant bank, answer matrix, source internals or author notes.",
    "",
    "## Reviewer Must Return",
    "",
    "- `metadata.json` with reviewer id/profile, challenge hash, scenario set id, start/end time and contamination flags.",
    "- `notes.md` or `transcript.md` explaining what was read and what was ambiguous.",
    "- `submission/subject.mjs`.",
    "- `verifier-output.json` from a verifier run outside the review context.",
    "",
    "## Countability",
    "",
    "- A solve counts only if the reviewer is independent, saw no hidden files, used no private hints,",
    "  recorded time/notes, and passed the verifier under the current hash.",
    "- Assisted or contaminated reviews are preserved but do not count.",
    "- Human-ready is not human-evidenced.",
    "",
    "Current reading: no independent clean-room human solve is claimed unless the count above is nonzero.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.",
    "",
  ].join("\n");
}

export function renderDeploymentAliasMatrixReadinessGap(
  input: DeploymentAliasMatrixReadinessGapInput,
): string {
  const { readiness, analysis, adversarial, human, openAiHalfMatrix } = input;
  const nonOpenAiExternal = input.externalResults.filter(
    (result) =>
      result.countable &&
      result.packet.metadata?.providerFamily !== null &&
      result.packet.metadata?.providerFamily !== undefined &&
      !["openai", "external", "manual", "unknown"].includes(result.packet.metadata.providerFamily),
  );
  return [
    "# deployment-model-alias-rollout-drift matrix readiness gap",
    "",
    "This is the blunt checklist for production `/6` spend. It separates what is already measured",
    "from what is only planned or still missing.",
    "",
    "| requirement | state | reading |",
    "|---|---|---|",
    row(
      "local reference/verifier/mutant evidence",
      "pass",
      "reference clean; intended known-bad bank caught",
    ),
    row("package hash current", "pass", `current hash \`${input.challengeHash}\``),
    row("scenario set current", "pass", `scenario set \`${input.scenarioSetId}\``),
    row(
      "OpenAI smoke",
      analysis.failures > 0 ? "pass" : "pending",
      analysis.failures > 0
        ? `${analysis.failures}/${analysis.counted} counted smoke run(s) failed on target`
        : "no counted OpenAI on-target failure",
    ),
    row(
      "cross-lab smoke",
      readiness.crossLabSmokeEvidenced ? (readiness.mixedCrossLabSmoke ? "mixed" : "pass") : "missing",
      readiness.crossLabSmokeEvidenced
        ? readiness.mixedCrossLabSmoke
          ? "non-OpenAI smoke imported cleanly, but it solved the suite rather than failing on target"
          : "non-OpenAI smoke evidence exists and failure-provider evidence is shared"
        : "no non-OpenAI counted smoke under the current hash",
    ),
    row(
      "external intake",
      input.externalResults.length > 0 ? "attempted" : "ready",
      input.externalResults.length > 0
        ? `${input.externalResults.filter((result) => result.countable).length} countable / ${input.externalResults.length} imported packet(s)`
        : "packet/validator ready; no returned packet imported",
    ),
    row(
      "human evidence",
      (human?.cleanHumanSolves ?? 0) > 0 ? "pass" : "pending",
      (human?.cleanHumanSolves ?? 0) > 0
        ? `${human?.cleanHumanSolves ?? 0} clean solve(s)`
        : "human-ready, but no clean-room solve on record",
    ),
    row(
      "adversarial OpenAI fs-sandbox",
      (adversarial?.countedNoBypassAudits ?? 0) > 0 ? "pass" : "pending",
      `${adversarial?.countedNoBypassAudits ?? 0} counted no-bypass audit(s)`,
    ),
    row(
      "container/no-network adversarial audit",
      (adversarial?.adversarialContainerNoNetworkAudits ?? 0) > 0 ? "pass" : "missing",
      "no counted container/no-network deployment-alias audit yet",
    ),
    row("transfer", "declared", "feature-flag/model-routing transfer plans exist; not proved"),
    row(
      "OpenAI half-matrix",
      openAiHalfMatrix === undefined ? "missing" : "planned",
      openAiHalfMatrix === undefined
        ? "no OpenAI half-matrix plan file"
        : `${openAiHalfMatrix.slots.length} OpenAI slot(s); ${openAiHalfMatrix.slots.filter((slot) => slot.state === "RUN" || slot.state === "IMPORTED").length} already recorded`,
    ),
    row("Anthropic half-matrix", "blocked", "Anthropic quota unavailable; import only until restored"),
    row("full `/6` matrix", readiness.fullMatrixReady ? "ready" : "blocked", readiness.nextAction),
    "",
    "## OpenAI Half-Matrix Plan",
    "",
    openAiHalfMatrix === undefined
      ? "No OpenAI half-matrix plan file is present."
      : [
          `Campaign: \`${openAiHalfMatrix.campaignId}\`.`,
          "",
          "| slot | model | state | run | note |",
          "|---|---|---|---|---|",
          ...openAiHalfMatrix.slots.map(
            (slot) =>
              `| \`${slot.slotId}\` | \`${slot.model}\` | \`${slot.state}\` | ${
                slot.runId === null ? "pending" : `\`${slot.runId}\``
              } | ${slot.note} |`,
          ),
        ].join("\n"),
    "",
    "## Current Answer",
    "",
    readiness.fullMatrixReady
      ? "Production matrix spend is allowed by the current gate calculation."
      : readiness.mixedCrossLabSmoke
        ? "Do not run the full `/6` matrix yet. The non-OpenAI smoke imported cleanly but solved the suite, so the next step is provider-delta diagnosis or evolution."
        : "Do not run the full `/6` matrix yet. Import or run one non-OpenAI counted smoke under the same hash first; OpenAI-only 3/6 would strengthen same-provider stability only.",
    "",
    `Countable non-OpenAI external packets currently imported: ${nonOpenAiExternal.length}.`,
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.",
    "",
  ].join("\n");
}

function auditBundle(
  root: string,
  providerId: string,
  dir: string,
  expectedHash: string,
  expectedScenarioSetId: string,
): DeploymentAliasBundleAudit {
  const relDir = dir.replace(`${root}/`, "");
  const importCommand = "node dist/cli.js external import <returned-packet>";
  const verifyCommand = `node dist/cli.js trials verify --family ${FAMILY_ID} <run-id>`;
  if (!existsSync(dir)) {
    return {
      providerId,
      dir: relDir,
      present: false,
      providerLabel: null,
      providerFamily: null,
      availableHere: null,
      availabilityDetail: null,
      challengeHash: null,
      hashMatches: false,
      leakCheck: "missing",
      leakDetail: "bundle directory missing",
      metadataTemplate: "missing",
      metadataDetail: "metadata.json missing",
      hiddenFilesAbsent: false,
      generatedReportsAbsent: false,
      importCommand,
      verifyCommand,
    };
  }
  const challengeDir = join(dir, "challenge");
  const challengeFiles = existsSync(challengeDir) ? readChallengeFiles(challengeDir) : [];
  const challengeHash = existsSync(challengeDir) ? hashChallengeDir(challengeDir) : null;
  const hiddenFilesAbsent = challengeFiles.every((file) => !hiddenPath(file.path));
  const generatedReportsAbsent = !readAllPaths(dir).some(
    (path) => path.startsWith("reports/") || /^.*-report\.md$/.test(path),
  );
  let leakCheck: DeploymentAliasBundleAudit["leakCheck"] = "missing";
  let leakDetail = "challenge directory missing";
  if (challengeFiles.length > 0) {
    try {
      const check = checkChallengePackage(challengeFiles, DEPLOYMENT_ALIAS_PROFILE);
      leakCheck = "pass";
      leakDetail = `${check.files} visible files, ${check.specCodesFound} spec codes`;
    } catch (err) {
      leakCheck = "fail";
      leakDetail = (err as Error).message;
    }
  }
  const metadata = readJson(join(dir, "metadata.json"));
  const provider = readJson(join(dir, "PROVIDER.json"));
  const metadataChecks = metadataTemplateCheck(metadata, expectedHash, expectedScenarioSetId);

  return {
    providerId,
    dir: relDir,
    present: true,
    providerLabel: readString(provider, "label"),
    providerFamily: readString(provider, "family"),
    availableHere: readBoolean(provider, "availableHere"),
    availabilityDetail: readString(provider, "availabilityDetail"),
    challengeHash,
    hashMatches: challengeHash === expectedHash,
    leakCheck,
    leakDetail,
    metadataTemplate: metadataChecks.ok ? "pass" : "fail",
    metadataDetail: metadataChecks.detail,
    hiddenFilesAbsent,
    generatedReportsAbsent,
    importCommand,
    verifyCommand,
  };
}

function readChallengeFiles(
  dir: string,
  prefix = "",
): readonly { readonly path: string; readonly content: string }[] {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const rel = `${prefix}${entry.name}`;
      const full = join(dir, entry.name);
      return entry.isDirectory()
        ? readChallengeFiles(full, `${rel}/`)
        : [{ path: rel, content: readFileSync(full, "utf8") }];
    });
}

function readAllPaths(dir: string, prefix = ""): readonly string[] {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const rel = `${prefix}${entry.name}`;
      const full = join(dir, entry.name);
      return entry.isDirectory() ? readAllPaths(full, `${rel}/`) : [rel];
    });
}

function hiddenPath(path: string): boolean {
  const base = path.split("/").pop() ?? path;
  return [
    "verify.ts",
    "reference.ts",
    "mutants.ts",
    "truth.ts",
    "scenarios.json",
    "matrix.json",
    "answer-matrix.json",
  ].includes(base);
}

function readJson(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function readString(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readBoolean(record: Record<string, unknown> | null, key: string): boolean | null {
  const value = record?.[key];
  return typeof value === "boolean" ? value : null;
}

function metadataTemplateCheck(
  metadata: Record<string, unknown> | null,
  expectedHash: string,
  expectedScenarioSetId: string,
): { readonly ok: boolean; readonly detail: string } {
  if (metadata === null) return { ok: false, detail: "metadata.json missing or invalid" };
  const required = ["runId", "familyId", "provider", "model", "subjectId", "scenarioSetId", "challengeHash"];
  const missing = required.filter(
    (key) => typeof metadata[key] !== "string" || String(metadata[key]).length === 0,
  );
  if (missing.length > 0) return { ok: false, detail: `missing ${missing.join(", ")}` };
  if (metadata["familyId"] !== FAMILY_ID) return { ok: false, detail: "familyId mismatch" };
  if (metadata["challengeHash"] !== expectedHash) return { ok: false, detail: "challengeHash mismatch" };
  if (metadata["scenarioSetId"] !== expectedScenarioSetId) {
    return { ok: false, detail: "scenarioSetId mismatch" };
  }
  return { ok: true, detail: "pinned hash and scenario set present" };
}

function renderStatusList(statuses: readonly ProductionReadinessStatus[]): string {
  return statuses.map((status) => `- \`${status}\``).join("\n");
}

function renderFindings(findings: readonly { readonly code: string; readonly detail: string }[]): string {
  return ["| code | detail |", "|---|---|", ...findings.map((f) => `| \`${f.code}\` | ${f.detail} |`)].join(
    "\n",
  );
}

function providerState(audit: DeploymentAliasBundleAudit): string {
  if (!audit.present) return "missing";
  if (audit.availableHere === null) return audit.providerFamily ?? "unknown";
  if (audit.availableHere) return "configured";
  return audit.availabilityDetail ?? "import-only";
}

function providerFamilyOf(model: string | null): string {
  return model?.split("/")[0] ?? "unknown";
}

function matrixPlanLines(readiness: ProductionReadinessResult): readonly string[] {
  if (readiness.fullMatrixReady) {
    return [
      "- Production `/6` matrix may be scheduled, but it is still a separate spend decision.",
      "- Preserve the current challenge hash and scenario set for every remaining slot.",
      "- Provider refusal, infrastructure error, stale hash, contaminated run or missing artifacts still count nothing.",
    ];
  }
  if (readiness.mixedCrossLabSmoke) {
    return [
      "- Do not run a full `/6` matrix from this state.",
      "- The non-OpenAI smoke imported cleanly, but it solved the suite rather than failing on target.",
      "- Diagnose the provider delta before buying more matrix slots.",
      "- If the mechanism is too provider-specific, evolve or repair the family instead of expanding spend.",
      "- Preserve transcript, submission, verifier output, package hash, scenario set id and provider identity for any future run.",
    ];
  }
  return [
    "- Do not run a full `/6` matrix from this state.",
    "- First import or run one non-OpenAI counted smoke under the same challenge hash.",
    "- Preserve transcript, submission, verifier output, package hash, scenario set id and provider identity.",
    "- A provider refusal, infrastructure error, stale hash, contaminated run or missing artifact counts nothing.",
    "- If a non-OpenAI smoke also fails on target, production matrix spend can be considered.",
    "- If the smoke passes cleanly, route to evolve/repair instead of buying a matrix by default.",
  ];
}

function adversarialReading(summary: VerifierIntegrityEvidence | undefined): string {
  if (summary === undefined) return "No adversarial readiness summary exists for this family yet.";
  if (summary.unrepairedBypasses > 0) {
    return "A counted unrepaired bypass exists. Verifier-integrity claims are blocked until repair and invalidation are recorded.";
  }
  if (summary.countedNoBypassAudits > 0) {
    return "At least one counted no-bypass audit exists. Scope remains bounded by provider family and isolation level.";
  }
  if (summary.adversarialPackageReady) {
    return "The campaign and bundle are ready, but no counted deployment-alias adversarial audit exists yet.";
  }
  return "The family is not adversarial-ready yet; prepare the campaign and attack bundle before claiming verifier-integrity coverage.";
}

function row(requirement: string, state: string, reading: string): string {
  return `| ${requirement} | **${state}** | ${reading} |`;
}
