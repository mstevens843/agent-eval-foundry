import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import {
  PHASE14_PROVIDER_IMAGE,
  phase14ProviderCommand,
  phase14ProviderContainerB6,
  stageCodexCredential,
} from "../phase-14/provider-runtime.js";
import { REQUIRED_BLINDING, parsePhase14BlindLabel } from "../phase-14/blind-labels.js";
import type { Phase14BlindLabel } from "../phase-14/blind-labels.js";
import { RigInputError } from "../screens/rig-integrity.js";
import { getProvider } from "../trials/providers.js";
import { ROOT_CAUSES } from "../trials/root-cause.js";
import type { TrialUsage } from "../trials/types.js";
import {
  PHASE19_REVIEW_DIMENSIONS,
  buildPhase19CandidatePacket,
  parsePhase19CandidateReview,
  phase19CandidatePacketBytes,
  phase19CandidateReviewB6,
} from "./candidate-review.js";
import type { Phase19CandidateReview, Phase19RawCandidateReview } from "./candidate-review.js";
import {
  buildPhase19Reranking,
  buildPhase19UiLabelLedger,
  buildPhase19UiPacketManifest,
  phase19CoreB6,
  phase19UiPacketBytes,
  phase19UiPacketId,
  phase19UiRunForPacketId,
} from "./evidence-rerank.js";
import type { Phase19ReaderFamily, Phase19UiRunId } from "./evidence-rerank.js";

const hash = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");

const exactKeys = (value: Record<string, unknown>, expected: readonly string[], path: string): void => {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new RigInputError(`${path}: expected keys ${wanted.join(", ")}; got ${actual.join(", ")}`);
  }
};

const semanticUiLabel = (value: unknown): {
  readonly label: Phase14BlindLabel["label"];
  readonly rationale: string;
  readonly evidenceRead: readonly string[];
} => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new RigInputError("phase19 UI label must be an object");
  }
  const row = value as Record<string, unknown>;
  exactKeys(row, ["label", "rationale", "evidenceRead"], "phase19.uiLabel");
  if (
    typeof row.label !== "string" ||
    !(ROOT_CAUSES as readonly string[]).includes(row.label) ||
    row.label === "clean" ||
    row.label === "unlabelled"
  ) {
    throw new RigInputError("phase19.uiLabel.label is not a failure-attributing closed-vocabulary label");
  }
  if (typeof row.rationale !== "string" || row.rationale.trim().length < 80) {
    throw new RigInputError("phase19.uiLabel.rationale must contain at least 80 characters");
  }
  if (
    !Array.isArray(row.evidenceRead) ||
    row.evidenceRead.length === 0 ||
    row.evidenceRead.some((entry) => typeof entry !== "string")
  ) {
    throw new RigInputError("phase19.uiLabel.evidenceRead must name inspected packet sections");
  }
  return {
    label: row.label as Phase14BlindLabel["label"],
    rationale: row.rationale,
    evidenceRead: row.evidenceRead as readonly string[],
  };
};

interface ReaderCapture {
  readonly transcript: string;
  readonly rawOutput: string;
  readonly runtimeSeconds: number;
  readonly usage: TrialUsage | null;
  readonly classification: string;
  readonly classificationDetail: string;
  readonly captureLevel: string;
}

const runReader = (
  packetBytes: string,
  outputName: string,
  instruction: string,
  providerFamily: Phase19ReaderFamily,
): ReaderCapture => {
  const providerB6 = phase14ProviderContainerB6();
  if (!providerB6.usable) throw new RigInputError("provider-container B6 is not usable");
  if (providerFamily === "anthropic" && (process.env.CLAUDE_CODE_OAUTH_TOKEN ?? "").trim() === "") {
    throw new RigInputError(
      "CLAUDE_CODE_OAUTH_TOKEN is absent from this process; load the existing Keychain token before invoking the reader",
    );
  }
  const challengeDir = mkdtempSync(join(tmpdir(), "phase19-reader-packet-"));
  writeFileSync(join(challengeDir, "PACKET.json"), packetBytes, "utf8");
  let credentialDir: string | undefined;
  try {
    if (providerFamily === "openai") credentialDir = stageCodexCredential();
    const command = phase14ProviderCommand(providerFamily, credentialDir);
    const result = getProvider("docker").run({
      challengeDir,
      submissionPath: `submission/${outputName}`,
      instruction,
      timeoutMs: 1_800_000,
      env: {},
      inheritEnv: true,
      command,
    });
    const output = result.submission.find((file) => file.path === outputName);
    if (result.classification !== "completed" || output === undefined) {
      const diagnostic = result.transcript
        .replace(/sk-ant-[A-Za-z0-9_-]+/g, "[REDACTED_ANTHROPIC_TOKEN]")
        .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
        .slice(-2_000);
      throw new RigInputError(
        `${providerFamily} reader did not produce ${outputName} (${result.classification}: ${result.detail}); transcript tail: ${diagnostic}`,
      );
    }
    return {
      transcript: result.transcript,
      rawOutput: output.content,
      runtimeSeconds: result.runtimeSeconds,
      usage: result.usage,
      classification: result.classification,
      classificationDetail: result.detail,
      captureLevel: result.captureLevel,
    };
  } finally {
    rmSync(challengeDir, { recursive: true, force: true });
    if (credentialDir !== undefined) rmSync(credentialDir, { recursive: true, force: true });
  }
};

const ensurePacket = (path: string, bytes: string): void => {
  if (existsSync(path) && readFileSync(path, "utf8") !== bytes) {
    throw new RigInputError(`${path}: frozen packet differs from fresh construction`);
  }
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path)) writeFileSync(path, bytes, "utf8");
};

const writeCapture = (
  dir: string,
  capture: ReaderCapture,
  metadata: Readonly<Record<string, unknown>>,
  rawName: string,
  normalizedName: string,
  normalized: unknown,
): void => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "transcript.txt"), capture.transcript, "utf8");
  writeFileSync(join(dir, rawName), capture.rawOutput, "utf8");
  writeFileSync(join(dir, normalizedName), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  writeFileSync(
    join(dir, "metadata.json"),
    `${JSON.stringify(
      {
        ...metadata,
        providerImage: PHASE14_PROVIDER_IMAGE,
        classification: capture.classification,
        classificationDetail: capture.classificationDetail,
        captureLevel: capture.captureLevel,
        runtimeSeconds: capture.runtimeSeconds,
        usage: capture.usage,
        costUsd: capture.usage?.costUsd ?? null,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
};

const preserveRawAttempt = (
  runDir: string,
  capture: ReaderCapture,
  metadata: Readonly<Record<string, unknown>>,
  rawName: string,
): string => {
  const attemptsDir = join(runDir, "attempts");
  let attempt = 1;
  while (existsSync(join(attemptsDir, `attempt-${attempt}`))) attempt += 1;
  const dir = join(attemptsDir, `attempt-${attempt}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "transcript.txt"), capture.transcript, "utf8");
  writeFileSync(join(dir, rawName), capture.rawOutput, "utf8");
  writeFileSync(
    join(dir, "metadata.json"),
    `${JSON.stringify(
      {
        ...metadata,
        attempt,
        providerImage: PHASE14_PROVIDER_IMAGE,
        classification: capture.classification,
        classificationDetail: capture.classificationDetail,
        captureLevel: capture.captureLevel,
        runtimeSeconds: capture.runtimeSeconds,
        usage: capture.usage,
        costUsd: capture.usage?.costUsd ?? null,
        normalizationStatus: "pending",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return dir;
};

export interface Phase19ExecutionResult {
  readonly kind: "ui-root-cause-label" | "candidate-review";
  readonly subjectId: string;
  readonly providerFamily: Phase19ReaderFamily;
  readonly verdict: string;
  readonly packetSha256: string;
  readonly runtimeSeconds: number;
  readonly costUsd: number | null;
  readonly outputPath: string;
}

export function executePhase19UiLabel(
  root: string,
  packetId: string,
  providerFamily: Phase19ReaderFamily,
): Phase19ExecutionResult {
  const coreB6 = phase19CoreB6(root);
  if (!coreB6.usable) throw new RigInputError("Phase 19 core B6 is not usable");
  const runId = phase19UiRunForPacketId(packetId);
  const manifest = buildPhase19UiPacketManifest(root);
  const packet = manifest.packets.find((row) => row.runId === runId);
  if (packet === undefined) throw new RigInputError(`${packetId}: packet manifest entry missing`);
  const ledger = buildPhase19UiLabelLedger(root);
  if (ledger.summary.labelsReceived >= ledger.summary.labelsRequired) {
    throw new RigInputError("all registered UI labels are already complete");
  }
  const outDir = join(root, "data", "phase-19-ui-label-runs", packetId, providerFamily);
  if (existsSync(join(outDir, "normalized-label.json"))) {
    throw new RigInputError(`${packetId}/${providerFamily}: normalized label already exists`);
  }
  const bytes = phase19UiPacketBytes(root, runId);
  const packetPath = join(root, packet.path);
  ensurePacket(packetPath, bytes);
  const instruction = [
    "You are an independent root-cause labeller, not the task solver or benchmark author.",
    "Read challenge/PACKET.json in full and classify only this one failing trial.",
    "Use no outside project knowledge. Do not search for another verdict or infer campaign outcomes.",
    "Distinguish a determinate public rule the submission violated from a rule the package does not determine.",
    "Write exactly one JSON object to submission/label.json with keys label, rationale, evidenceRead.",
    "Use one exact label from closedVocabulary. The rationale must reject the nearest alternative.",
    "evidenceRead MUST be a JSON array of one or more strings, never a single string or object.",
    "Do not write Markdown or any other file.",
  ].join("\n");
  const capture = runReader(bytes, "label.json", instruction, providerFamily);
  const attemptDir = preserveRawAttempt(
    outDir,
    capture,
    {
      schema: "agent-eval-foundry/phase-19-ui-reader-attempt@1",
      packetId,
      runId,
      familyId: "ui-action-record-replay",
      providerFamily,
      packetPath: relative(root, packetPath),
      packetSha256: packet.sha256,
      independentlyProduced: true,
    },
    "raw-label.json",
  );
  const semantic = semanticUiLabel(JSON.parse(capture.rawOutput));
  const normalized = parsePhase14BlindLabel({
    runId,
    familyId: "ui-action-record-replay",
    readerId: `phase19-${packetId}-${providerFamily}`,
    providerFamily,
    label: semantic.label,
    rationale: semantic.rationale,
    evidenceRead: semantic.evidenceRead,
    packetPath: relative(root, packetPath),
    packetSha256: packet.sha256,
    independentlyProduced: true,
    blindedTo: [
      ...REQUIRED_BLINDING,
      "existing root-cause sidecar",
      "other UI trial outcomes",
      "family promotion status",
      "research ranking",
    ],
  });
  writeCapture(
    outDir,
    capture,
    {
      schema: "agent-eval-foundry/phase-19-ui-reader-run@1",
      packetId,
      runId,
      familyId: "ui-action-record-replay",
      providerFamily,
      packetPath: relative(root, packetPath),
      packetSha256: packet.sha256,
      independentlyProduced: true,
    },
    "raw-label.json",
    "normalized-label.json",
    normalized,
  );
  writeFileSync(
    join(attemptDir, "normalized-label.json"),
    `${JSON.stringify(normalized, null, 2)}\n`,
    "utf8",
  );
  return {
    kind: "ui-root-cause-label",
    subjectId: packetId,
    providerFamily,
    verdict: normalized.label,
    packetSha256: packet.sha256,
    runtimeSeconds: capture.runtimeSeconds,
    costUsd: capture.usage?.costUsd ?? null,
    outputPath: relative(root, join(outDir, "normalized-label.json")),
  };
}

export function executePhase19CandidateReview(
  root: string,
  candidateId: string,
  providerFamily: Phase19ReaderFamily,
): Phase19ExecutionResult {
  const b6 = phase19CandidateReviewB6(root);
  if (!b6.usable) throw new RigInputError("Phase 19 candidate-review B6 is not usable");
  const ranking = buildPhase19Reranking(root);
  if (!ranking.topFive.includes(candidateId)) {
    throw new RigInputError(`${candidateId}: not in the corrected top-five queue`);
  }
  const ui = buildPhase19UiLabelLedger(root);
  if (ui.summary.labelsReceived !== ui.summary.labelsRequired) {
    throw new RigInputError("all UI labels must close before candidate review begins");
  }
  const bytes = phase19CandidatePacketBytes(root, candidateId);
  const packetSha256 = hash(bytes);
  const packetPath = join(root, "data", "phase-19-candidate-review-packets", `${candidateId}.json`);
  ensurePacket(packetPath, bytes);
  const outDir = join(root, "data", "phase-19-candidate-review-runs", candidateId, providerFamily);
  if (existsSync(join(outDir, "normalized-review.json"))) {
    throw new RigInputError(`${candidateId}/${providerFamily}: normalized review already exists`);
  }
  const instruction = [
    "You are an independent benchmark-candidate reviewer, not the candidate author.",
    "Read challenge/PACKET.json in full. Audit readiness for the cheap probe, not topic appeal.",
    `Your providerFamily is ${providerFamily}. The immutable packetSha256 is ${packetSha256}.`,
    `Evaluate exactly these dimensions in order: ${PHASE19_REVIEW_DIMENSIONS.join("; ")}.`,
    "A missing fact is uncertain, and uncertain kills this bounded run. Raw file count is not causal depth.",
    "Promote only if every dimension passes. Otherwise kill at the earliest non-pass dimension.",
    "Write exactly one JSON object to submission/review.json using the requiredOutput keys and no Markdown.",
  ].join("\n");
  const capture = runReader(bytes, "review.json", instruction, providerFamily);
  const attemptDir = preserveRawAttempt(
    outDir,
    capture,
    {
      schema: "agent-eval-foundry/phase-19-candidate-reader-attempt@1",
      candidateId,
      providerFamily,
      packetPath: relative(root, packetPath),
      packetSha256,
      independentlyProduced: true,
    },
    "raw-review.json",
  );
  const raw = parsePhase19CandidateReview(
    JSON.parse(capture.rawOutput),
    candidateId,
    packetSha256,
    providerFamily,
  );
  const rawOutputSha256 = hash(capture.rawOutput);
  const normalized: Phase19CandidateReview = {
    ...raw,
    reviewId: `phase19-${candidateId}-${providerFamily}`,
    independentlyProduced: true,
    blindedTo: [
      "corrected rank",
      "numeric decision score",
      "estimated clean-solve probabilities",
      "Phase 19 assessment rationale",
      "prior skeptic verdicts and repairs",
      "other reader verdict",
      "author recommendation",
      "predicted survivor count",
    ],
    transcriptPath: relative(root, join(outDir, "transcript.txt")),
    rawOutputPath: relative(root, join(outDir, "raw-review.json")),
    rawOutputSha256,
    metadataPath: relative(root, join(outDir, "metadata.json")),
    runtimeSeconds: capture.runtimeSeconds,
    usage: capture.usage,
    costUsd: capture.usage?.costUsd ?? null,
  };
  writeCapture(
    outDir,
    capture,
    {
      schema: "agent-eval-foundry/phase-19-candidate-reader-run@1",
      candidateId,
      providerFamily,
      packetPath: relative(root, packetPath),
      packetSha256,
      independentlyProduced: true,
    },
    "raw-review.json",
    "normalized-review.json",
    normalized,
  );
  writeFileSync(
    join(attemptDir, "normalized-review.json"),
    `${JSON.stringify(normalized, null, 2)}\n`,
    "utf8",
  );
  return {
    kind: "candidate-review",
    subjectId: candidateId,
    providerFamily,
    verdict: raw.verdict,
    packetSha256,
    runtimeSeconds: capture.runtimeSeconds,
    costUsd: capture.usage?.costUsd ?? null,
    outputPath: relative(root, join(outDir, "normalized-review.json")),
  };
}

export function nextPhase19UiLabel(root: string): { packetId: string; provider: Phase19ReaderFamily } | null {
  for (const runId of PHASE19_UI_RUNS_ORDERED) {
    const packetId = phase19UiPacketId(runId);
    for (const provider of ["openai", "anthropic"] as const) {
      const path = join(
        root,
        "data",
        "phase-19-ui-label-runs",
        packetId,
        provider,
        "normalized-label.json",
      );
      if (!existsSync(path)) return { packetId, provider };
    }
  }
  return null;
}

const PHASE19_UI_RUNS_ORDERED: readonly Phase19UiRunId[] = [
  "ui-claude-1",
  "ui-claude-2",
  "ui-codex-1",
  "ui-haiku-1",
  "ui-sonnet-1",
];

export function nextPhase19CandidateReview(
  root: string,
): { candidateId: string; provider: Phase19ReaderFamily } | null {
  const ranking = buildPhase19Reranking(root);
  if (ranking.uiEvidence.labelsReceived !== 10) return null;
  for (const candidateId of ranking.topFive) {
    for (const provider of ["openai", "anthropic"] as const) {
      const path = join(
        root,
        "data",
        "phase-19-candidate-review-runs",
        candidateId,
        provider,
        "normalized-review.json",
      );
      if (!existsSync(path)) return { candidateId, provider };
    }
  }
  return null;
}

export const phase19ExecutionJson = (value: Phase19ExecutionResult): string =>
  `${JSON.stringify(value, null, 2)}\n`;

export function phase19ReaderPreflight(root: string): {
  readonly providerImage: string;
  readonly providerContainerB6: ReturnType<typeof phase14ProviderContainerB6>;
  readonly phase19CoreB6: ReturnType<typeof phase19CoreB6>;
  readonly candidateReviewB6: ReturnType<typeof phase19CandidateReviewB6>;
  readonly codexCredentialPresent: boolean;
  readonly anthropicCredentialPresent: boolean;
  readonly nextUiLabel: ReturnType<typeof nextPhase19UiLabel>;
  readonly nextCandidateReview: ReturnType<typeof nextPhase19CandidateReview>;
} {
  return {
    providerImage: PHASE14_PROVIDER_IMAGE,
    providerContainerB6: phase14ProviderContainerB6(),
    phase19CoreB6: phase19CoreB6(root),
    candidateReviewB6: phase19CandidateReviewB6(root),
    codexCredentialPresent: existsSync(
      join(process.env.CODEX_HOME ?? join(process.env.HOME ?? "", ".codex"), "auth.json"),
    ),
    anthropicCredentialPresent: (process.env.CLAUDE_CODE_OAUTH_TOKEN ?? "").trim().length > 0,
    nextUiLabel: nextPhase19UiLabel(root),
    nextCandidateReview: nextPhase19CandidateReview(root),
  };
}
