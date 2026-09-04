import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { RigInputError, requireShape } from "../screens/rig-integrity.js";
import { readTrialDirectory } from "../trials/directory.js";
import { getProvider, readFileTree } from "../trials/providers.js";
import { ROOT_CAUSES } from "../trials/root-cause.js";
import { REQUIRED_BLINDING, parsePhase14BlindLabel } from "./blind-labels.js";
import type { Phase14BlindLabel, Phase14ReaderFamily } from "./blind-labels.js";
import { phase14AttemptSpecs } from "./execution.js";
import { buildPhase14TrialLedger, loadPhase14Preregistration } from "./measurement.js";
import { buildPhase14ScenarioLock } from "./packages.js";
import {
  phase14ProviderCommand,
  phase14ProviderContainerB6,
  stageCodexCredential,
} from "./provider-runtime.js";

const PACKET_FILE = "blind-label-packet.json";

interface SemanticLabel {
  readonly label: Phase14BlindLabel["label"];
  readonly rationale: string;
  readonly evidenceRead: readonly string[];
}

export interface Phase14LabelExecutionResult {
  readonly attemptId: string;
  readonly familyId: string;
  readonly readerFamily: Phase14ReaderFamily;
  readonly label: Phase14BlindLabel["label"];
  readonly packetSha256: string;
  readonly runtimeSeconds: number;
  readonly costUsd: number | null;
  readonly outputPath: string;
}

const semanticLabel = (value: unknown): SemanticLabel => {
  const row = requireShape(value, "phase14.semanticLabel", ["label", "rationale", "evidenceRead"]);
  if (
    typeof row.label !== "string" ||
    !(ROOT_CAUSES as readonly string[]).includes(row.label) ||
    row.label === "clean" ||
    row.label === "unlabelled"
  ) {
    throw new RigInputError(
      `phase14.semanticLabel.label must be one of ${ROOT_CAUSES.filter((label) => label !== "clean" && label !== "unlabelled").join(" | ")}`,
    );
  }
  if (typeof row.rationale !== "string" || row.rationale.trim().length < 24) {
    throw new RigInputError("phase14.semanticLabel.rationale must contain an argument");
  }
  if (
    !Array.isArray(row.evidenceRead) ||
    row.evidenceRead.length === 0 ||
    row.evidenceRead.some((item) => typeof item !== "string")
  ) {
    throw new RigInputError("phase14.semanticLabel.evidenceRead must name inspected packet sections");
  }
  return {
    label: row.label as Phase14BlindLabel["label"],
    rationale: row.rationale,
    evidenceRead: row.evidenceRead as readonly string[],
  };
};

const packetBytes = (
  root: string,
  attemptId: string,
): { bytes: string; familyId: string; trialDir: string } => {
  const attempt = phase14AttemptSpecs(root).find((row) => row.attemptId === attemptId);
  if (attempt === undefined) throw new RigInputError(`${attemptId}: not a registered Phase 14 attempt`);
  const trialDir = join(root, "trials", attempt.familyId, attemptId);
  if (!existsSync(trialDir)) throw new RigInputError(`${attemptId}: trial directory is absent`);
  const trial = readTrialDirectory(trialDir);
  const failed = trial.record.cells.filter((cell) => cell.failed.length > 0);
  if (!trial.record.counts || failed.length === 0) {
    throw new RigInputError(`${attemptId}: blind failure labelling requires a counted failing trial`);
  }
  const scenarios = buildPhase14ScenarioLock(root).rows.filter(
    (row) => row.familyId === attempt.familyId && failed.some((cell) => cell.scenarioId === row.scenarioId),
  );
  const packet = {
    schema: "agent-eval-foundry/phase-14-blind-root-cause-packet@1",
    instructions:
      "Classify the root cause of this one failing trial from its own visible contract and evidence. Do not infer from any other trial or project summary.",
    closedVocabulary: ROOT_CAUSES.filter((label) => label !== "clean" && label !== "unlabelled"),
    decisionRule: {
      capability:
        "The visible package determines the required behavior, the rig measured it correctly, and the submitted implementation got it wrong.",
      specUnderspecified: "A graded behavior cannot be derived from the visible package.",
      specContradiction: "The visible package states something the verifier contradicts.",
      harnessContractViolation: "The host or runner broke a promise the visible package made.",
      packageLeak: "The visible package exposed hidden answer or grading information.",
      infrastructure: "The evidence did not measure the submitted implementation.",
    },
    trial: {
      runId: attemptId,
      familyId: attempt.familyId,
      model: trial.record.model,
      effort: trial.record.effort,
      challenge: readFileTree(join(trialDir, "challenge")),
      submission: readFileTree(join(trialDir, "submission")),
      transcript: readFileSync(join(trialDir, "transcript.txt"), "utf8"),
      verifierOutput: JSON.parse(readFileSync(join(trialDir, "verifier-output.json"), "utf8")),
      normalizedResult: JSON.parse(readFileSync(join(trialDir, "result.json"), "utf8")),
      failingScenarioParameters: scenarios,
    },
    excluded: [...REQUIRED_BLINDING],
    requiredOutput: {
      path: "submission/label.json",
      shape: {
        label: "one exact closed-vocabulary value",
        rationale: "why this label and not the nearest alternative",
        evidenceRead: ["packet section or challenge path actually inspected"],
      },
    },
  };
  return { bytes: `${JSON.stringify(packet, null, 2)}\n`, familyId: attempt.familyId, trialDir };
};

const readerInstruction = [
  "You are an independent root-cause labeller, not the task solver and not the benchmark author.",
  "Read challenge/PACKET.json in full. Classify this one failing trial using only that packet.",
  "Do not search for or infer another reader's verdict, an author diagnosis, cross-cell outcomes,",
  "or the campaign stopping decision. Distinguish a determinate rule the model violated from a rule",
  "the public package does not actually determine.",
  "",
  "Write exactly one JSON object to submission/label.json with keys label, rationale, evidenceRead.",
  "Use an exact label from the packet's closedVocabulary. Do not add Markdown or other files.",
].join("\n");

export function executePhase14BlindLabel(
  root: string,
  attemptId: string,
  readerFamily: Phase14ReaderFamily,
): Phase14LabelExecutionResult {
  const providerB6 = phase14ProviderContainerB6();
  if (!providerB6.usable) throw new RigInputError("Phase 14 provider-container B6 is not usable");
  const ledger = buildPhase14TrialLedger(root);
  const preregistration = loadPhase14Preregistration(root);
  if (ledger.summary.blindLabelsRun >= preregistration.maximumBlindLabels) {
    throw new RigInputError("Phase 14 blind-label ceiling has been reached");
  }
  if (ledger.summary.blindLabelSpendUsd >= preregistration.maximumBlindLabellingUsd) {
    throw new RigInputError("Phase 14 blind-labelling dollar ceiling has been reached");
  }
  if (ledger.summary.pricedCampaignSpendUsd >= preregistration.maximumTotalUsd) {
    throw new RigInputError("Phase 14 total campaign dollar ceiling has been reached");
  }
  const { bytes, familyId, trialDir } = packetBytes(root, attemptId);
  const packetPath = join(trialDir, PACKET_FILE);
  if (existsSync(packetPath) && readFileSync(packetPath, "utf8") !== bytes) {
    throw new RigInputError(`${attemptId}: preserved blind packet differs from a fresh construction`);
  }
  if (!existsSync(packetPath)) writeFileSync(packetPath, bytes, "utf8");
  const packetSha256 = createHash("sha256").update(bytes).digest("hex");
  const labelDir = join(trialDir, "blind-labels", readerFamily);
  if (existsSync(labelDir)) {
    throw new RigInputError(`${attemptId}/${readerFamily}: reader output already exists`);
  }

  const challengeDir = mkdtempSync(join(tmpdir(), `phase14-label-${attemptId}-`));
  writeFileSync(join(challengeDir, "PACKET.json"), bytes, "utf8");
  let credentialDir: string | undefined;
  try {
    if (readerFamily === "openai") credentialDir = stageCodexCredential();
    if (readerFamily === "anthropic" && (process.env.CLAUDE_CODE_OAUTH_TOKEN ?? "").trim().length === 0) {
      throw new RigInputError("CLAUDE_CODE_OAUTH_TOKEN is absent from the labelling process");
    }
    const command = phase14ProviderCommand(readerFamily, credentialDir);
    const providerResult = getProvider("docker").run({
      challengeDir,
      submissionPath: "submission/label.json",
      instruction: readerInstruction,
      timeoutMs: 1_800_000,
      env: {},
      inheritEnv: true,
      command,
    });
    mkdirSync(labelDir, { recursive: true });
    writeFileSync(join(labelDir, "transcript.txt"), providerResult.transcript, "utf8");
    writeFileSync(
      join(labelDir, "metadata.json"),
      `${JSON.stringify(
        {
          schema: "agent-eval-foundry/phase-14-blind-reader-run@1",
          runId: attemptId,
          familyId,
          readerFamily,
          readerId: `phase14-reader-${readerFamily}`,
          classification: providerResult.classification,
          classificationDetail: providerResult.detail,
          captureLevel: providerResult.captureLevel,
          runtimeSeconds: providerResult.runtimeSeconds,
          usage: providerResult.usage,
          costUsd: providerResult.usage?.costUsd ?? null,
          packetPath: PACKET_FILE,
          packetSha256,
          independentlyProduced: true,
          blindedTo: [...REQUIRED_BLINDING],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    const output = providerResult.submission.find((file) => file.path === "label.json");
    if (providerResult.classification !== "completed" || output === undefined) {
      throw new RigInputError(
        `${attemptId}/${readerFamily}: reader did not produce a label (${providerResult.classification})`,
      );
    }
    writeFileSync(join(labelDir, "raw-label.json"), output.content, "utf8");
    const semantic = semanticLabel(JSON.parse(output.content));
    const label = parsePhase14BlindLabel({
      runId: attemptId,
      familyId,
      readerId: `phase14-reader-${readerFamily}`,
      providerFamily: readerFamily,
      label: semantic.label,
      rationale: semantic.rationale,
      evidenceRead: semantic.evidenceRead,
      packetPath: PACKET_FILE,
      packetSha256,
      independentlyProduced: true,
      blindedTo: [...REQUIRED_BLINDING],
    });
    const outputPath = join(labelDir, "label.json");
    writeFileSync(outputPath, `${JSON.stringify(label, null, 2)}\n`, "utf8");
    return {
      attemptId,
      familyId,
      readerFamily,
      label: label.label,
      packetSha256,
      runtimeSeconds: providerResult.runtimeSeconds,
      costUsd: providerResult.usage?.costUsd ?? null,
      outputPath: relative(root, outputPath),
    };
  } finally {
    rmSync(challengeDir, { recursive: true, force: true });
    if (credentialDir !== undefined) rmSync(credentialDir, { recursive: true, force: true });
  }
}

export const renderPhase14LabelExecutionResult = (result: Phase14LabelExecutionResult): string =>
  `${JSON.stringify(result, null, 2)}\n`;
