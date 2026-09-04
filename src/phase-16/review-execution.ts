import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
  PHASE14_PROVIDER_IMAGE,
  phase14ProviderCommand,
  phase14ProviderContainerB6,
  stageCodexCredential,
} from "../phase-14/provider-runtime.js";
import { RigInputError, rigIntegrity } from "../screens/rig-integrity.js";
import { getProvider } from "../trials/providers.js";
import type { TrialUsage } from "../trials/types.js";
import { phase16Sha256 } from "./calibration.js";
import { PHASE16_READER_SCHEMA_SHA256, runPhase16Discovery } from "./discovery.js";

export const PHASE16_CONTINUATION_PREREGISTRATION_SHA256 =
  "8feea694bf5efa909dac60757191608641b6672eedec319648ee61ec9834b600";

const REQUIRED_DIMENSIONS = [
  "source support",
  "contract fairness",
  "natural task contract",
  "structural witness isolation",
  "semantic novelty",
  "cheap-probe falsifiability",
] as const;

export type Phase16ReaderFamily = "openai" | "anthropic";
export type Phase16ReaderDimension = (typeof REQUIRED_DIMENSIONS)[number];
export type Phase16ReaderVerdict = "pass" | "fail" | "uncertain";

interface ContinuationPreregistration {
  readonly schema: string;
  readonly continuationId: string;
  readonly registeredAt: string;
  readonly chronologyEvidence: string;
  readonly parent: {
    readonly runId: string;
    readonly preregistrationSha256: string;
    readonly blockedPreflightSha256: string;
    readonly packetArtifactSha256: string;
    readonly packetSetSha256: string;
  };
  readonly frozenReviewContract: {
    readonly readerOutputSchemaSha256: string;
    readonly readerInstructionsSha256: string;
    readonly probeImplementationSha256: string;
    readonly providerImage: string;
    readonly providerImageDigest: string;
  };
  readonly packets: readonly { readonly candidateId: string; readonly packetSha256: string }[];
  readonly reviewPlan: {
    readonly order: readonly string[];
    readonly reviewsPerCandidate: number;
    readonly maximumSemanticReviews: number;
    readonly maximumReaderSpendUsd: number;
    readonly paidSubjectTrials: number;
  };
  readonly blinding: { readonly withheld: readonly string[] };
}

interface RawReview {
  readonly candidateId: string;
  readonly packetSha256: string;
  readonly providerFamily: Phase16ReaderFamily;
  readonly dimensions: Readonly<Record<Phase16ReaderDimension, Phase16ReaderVerdict>>;
  readonly verdict: "promote" | "kill";
  readonly earliestFailedDimension: Phase16ReaderDimension | null;
  readonly rationale: string;
}

export interface Phase16ReaderReview extends RawReview {
  readonly reviewId: string;
  readonly readerId: string;
  readonly model: string;
  readonly independentlyProduced: true;
  readonly blindedTo: readonly string[];
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly runtimeSeconds: number;
  readonly classification: "completed";
  readonly usage: TrialUsage | null;
  readonly costUsd: number | null;
  readonly rawOutputPath: string;
  readonly rawOutputSha256: string;
  readonly transcriptPath: string;
  readonly metadataPath: string;
}

export interface Phase16ReviewExecutionResult {
  readonly reviewId: string;
  readonly candidateId: string;
  readonly providerFamily: Phase16ReaderFamily;
  readonly verdict: "promote" | "kill";
  readonly packetSha256: string;
  readonly runtimeSeconds: number;
  readonly costUsd: number | null;
  readonly outputPath: string;
}

const sha256Bytes = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");

const exactKeys = (value: Record<string, unknown>, expected: readonly string[], path: string): void => {
  const observed = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(observed) !== JSON.stringify(wanted)) {
    throw new RigInputError(`${path}: expected keys ${wanted.join(", ")}; got ${observed.join(", ")}`);
  }
};

const record = (value: unknown, path: string): Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new RigInputError(`${path}: expected object`);
  }
  return value as Record<string, unknown>;
};

const parseRawReview = (
  value: unknown,
  candidateId: string,
  packetSha256: string,
  providerFamily: Phase16ReaderFamily,
): RawReview => {
  const row = record(value, "review");
  exactKeys(
    row,
    [
      "candidateId",
      "packetSha256",
      "providerFamily",
      "dimensions",
      "verdict",
      "earliestFailedDimension",
      "rationale",
    ],
    "review",
  );
  if (row.candidateId !== candidateId) throw new RigInputError("review.candidateId is stale or wrong");
  if (row.packetSha256 !== packetSha256) throw new RigInputError("review.packetSha256 is stale or wrong");
  if (row.providerFamily !== providerFamily) {
    throw new RigInputError("review.providerFamily differs from the executing provider");
  }
  const dimensionsRaw = record(row.dimensions, "review.dimensions");
  exactKeys(dimensionsRaw, REQUIRED_DIMENSIONS, "review.dimensions");
  const dimensions = Object.fromEntries(
    REQUIRED_DIMENSIONS.map((dimension) => {
      const verdict = dimensionsRaw[dimension];
      if (verdict !== "pass" && verdict !== "fail" && verdict !== "uncertain") {
        throw new RigInputError(`review.dimensions.${dimension}: invalid verdict`);
      }
      return [dimension, verdict];
    }),
  ) as unknown as RawReview["dimensions"];
  const firstNonPass = REQUIRED_DIMENSIONS.find((dimension) => dimensions[dimension] !== "pass") ?? null;
  if (row.verdict !== "promote" && row.verdict !== "kill") {
    throw new RigInputError("review.verdict must be promote or kill");
  }
  if ((row.verdict === "promote") !== (firstNonPass === null)) {
    throw new RigInputError("review promote requires all dimensions to pass");
  }
  if (row.earliestFailedDimension !== firstNonPass) {
    throw new RigInputError("review.earliestFailedDimension must name the first non-pass dimension");
  }
  if (typeof row.rationale !== "string" || row.rationale.trim().length < 80) {
    throw new RigInputError("review.rationale must contain at least 80 characters");
  }
  return {
    candidateId,
    packetSha256,
    providerFamily,
    dimensions,
    verdict: row.verdict,
    earliestFailedDimension: firstNonPass,
    rationale: row.rationale,
  };
};

export function phase16ReviewNormalizerB6(): {
  readonly usable: boolean;
  readonly sameInvocation: true;
  readonly knownGoodPassed: boolean;
  readonly knownBadFailed: boolean;
  readonly malformedInputRefused: boolean;
  readonly nondegenerate: boolean;
} {
  const candidateId = "phase16-b6-candidate";
  const packetSha256 = "a".repeat(64);
  const good = {
    candidateId,
    packetSha256,
    providerFamily: "openai",
    dimensions: Object.fromEntries(REQUIRED_DIMENSIONS.map((dimension) => [dimension, "pass"])),
    verdict: "promote",
    earliestFailedDimension: null,
    rationale:
      "Every required dimension is supported by the packet, and no competing non-pass verdict is evidenced.",
  };
  const failuresFor = (value: unknown, id = candidateId): readonly string[] => {
    try {
      parseRawReview(value, id, packetSha256, "openai");
      return [];
    } catch {
      return ["review-refused"];
    }
  };
  const goodFailures = failuresFor(good);
  const badFailures = failuresFor({ ...good, candidateId: "phase16-stale-candidate" });
  const malformedFailures = failuresFor([]);
  const integrity = rigIntegrity(
    "phase16-review-normalizer",
    [
      { id: "known-good-review", expect: "pass", observedFailures: goodFailures },
      { id: "stale-packet-review", expect: "fail", observedFailures: badFailures },
    ],
    [goodFailures, badFailures],
  );
  const malformedInputRefused = malformedFailures.includes("review-refused");
  return {
    usable: integrity.usable && malformedInputRefused,
    sameInvocation: true,
    knownGoodPassed: goodFailures.length === 0,
    knownBadFailed: badFailures.length > 0,
    malformedInputRefused,
    nondegenerate: !integrity.degenerate,
  };
}

const fileSha256 = (root: string, path: string): string => sha256Bytes(readFileSync(join(root, path)));

export function loadPhase16ContinuationPreregistration(root: string): ContinuationPreregistration {
  const path = "data/phase-16-review-continuation-preregistration.json";
  if (fileSha256(root, path) !== PHASE16_CONTINUATION_PREREGISTRATION_SHA256) {
    throw new RigInputError(`${path}: continuation preregistration hash changed`);
  }
  const registration = JSON.parse(readFileSync(join(root, path), "utf8")) as ContinuationPreregistration;
  if (registration.schema !== "agent-eval-foundry/phase-16-review-continuation-preregistration@1") {
    throw new RigInputError(`${path}: unsupported schema`);
  }
  const base = runPhase16Discovery(root);
  if (
    registration.parent.runId !== base.runId ||
    registration.parent.preregistrationSha256 !== base.preregistrationSha256 ||
    registration.parent.blockedPreflightSha256 !== base.preflightSha256 ||
    registration.parent.packetSetSha256 !== base.packetSetSha256
  ) {
    throw new RigInputError(`${path}: parent run binding changed`);
  }
  if (fileSha256(root, "data/phase-16-reader-packets.json") !== registration.parent.packetArtifactSha256) {
    throw new RigInputError("Phase 16 reader-packet artifact bytes changed");
  }
  if (
    fileSha256(root, "data/phase-16-reader-output.schema.json") !==
    registration.frozenReviewContract.readerOutputSchemaSha256
  ) {
    throw new RigInputError("Phase 16 reader-output schema changed");
  }
  if (registration.frozenReviewContract.readerOutputSchemaSha256 !== PHASE16_READER_SCHEMA_SHA256) {
    throw new RigInputError("Phase 16 continuation points at the wrong reader-output schema");
  }
  if (
    fileSha256(root, "data/phase-16-reader-instructions.txt") !==
    registration.frozenReviewContract.readerInstructionsSha256
  ) {
    throw new RigInputError("Phase 16 reader instructions changed");
  }
  if (
    fileSha256(root, "src/phase-16/probes.ts") !== registration.frozenReviewContract.probeImplementationSha256
  ) {
    throw new RigInputError("Phase 16 probe implementation changed after continuation registration");
  }
  const packetMap = new Map(base.packets.map((packet) => [packet.candidateId, packet.packetSha256]));
  if (
    registration.packets.length !== base.packets.length ||
    registration.packets.some((packet) => packetMap.get(packet.candidateId) !== packet.packetSha256)
  ) {
    throw new RigInputError("Phase 16 continuation packet list differs from the frozen queue");
  }
  if (
    registration.reviewPlan.maximumSemanticReviews !== registration.reviewPlan.order.length ||
    registration.reviewPlan.paidSubjectTrials !== 0
  ) {
    throw new RigInputError("Phase 16 continuation caps are inconsistent");
  }
  return registration;
}

const modelFor = (provider: Phase16ReaderFamily): string =>
  provider === "openai" ? "openai/gpt-5.6-sol" : "anthropic/claude-opus";

const reviewRoot = (root: string): string => join(root, "data", "phase-16-reader-runs");

const normalizedReviewFiles = (root: string): readonly string[] => {
  const base = reviewRoot(root);
  if (!existsSync(base)) return [];
  return readdirSync(base, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name === "normalized-review.json")
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
};

export function loadPhase16ReaderReviews(root: string): readonly Phase16ReaderReview[] {
  const registration = loadPhase16ContinuationPreregistration(root);
  const packets = new Map(registration.packets.map((packet) => [packet.candidateId, packet.packetSha256]));
  const reviews = normalizedReviewFiles(root).map((path) => {
    const review = JSON.parse(readFileSync(path, "utf8")) as Phase16ReaderReview;
    const rawPath = join(root, review.rawOutputPath);
    if (packets.get(review.candidateId) !== review.packetSha256) {
      throw new RigInputError(`${relative(root, path)}: stale packet binding`);
    }
    if (!existsSync(rawPath) || fileSha256(root, review.rawOutputPath) !== review.rawOutputSha256) {
      throw new RigInputError(`${relative(root, path)}: raw review bytes changed`);
    }
    const raw = parseRawReview(
      JSON.parse(readFileSync(rawPath, "utf8")),
      review.candidateId,
      review.packetSha256,
      review.providerFamily,
    );
    for (const key of ["dimensions", "verdict", "earliestFailedDimension", "rationale"] as const) {
      if (JSON.stringify(raw[key]) !== JSON.stringify(review[key])) {
        throw new RigInputError(`${relative(root, path)}: normalized ${key} differs from raw review`);
      }
    }
    if (!review.independentlyProduced || review.classification !== "completed") {
      throw new RigInputError(`${relative(root, path)}: review is not a completed independent read`);
    }
    const transcriptPath = join(root, review.transcriptPath);
    const metadataPath = join(root, review.metadataPath);
    if (!existsSync(transcriptPath) || !existsSync(metadataPath)) {
      throw new RigInputError(`${relative(root, path)}: transcript or metadata is absent`);
    }
    const metadata = record(JSON.parse(readFileSync(metadataPath, "utf8")), review.metadataPath);
    for (const [key, expected] of [
      ["candidateId", review.candidateId],
      ["providerFamily", review.providerFamily],
      ["classification", review.classification],
      ["runtimeSeconds", review.runtimeSeconds],
      ["costUsd", review.costUsd],
      ["packetSha256", review.packetSha256],
    ] as const) {
      if (JSON.stringify(metadata[key]) !== JSON.stringify(expected)) {
        throw new RigInputError(`${relative(root, path)}: metadata ${key} differs from normalized review`);
      }
    }
    return review;
  });
  if (reviews.length > registration.reviewPlan.maximumSemanticReviews) {
    throw new RigInputError("Phase 16 semantic-review cap exceeded");
  }
  const identities = reviews.map((review) => `${review.candidateId}/${review.providerFamily}`);
  if (new Set(identities).size !== identities.length) {
    throw new RigInputError("Phase 16 has duplicate candidate/provider semantic reviews");
  }
  const spend = reviews.reduce((sum, review) => sum + (review.costUsd ?? 0), 0);
  if (spend > registration.reviewPlan.maximumReaderSpendUsd) {
    throw new RigInputError("Phase 16 reader-spend cap exceeded");
  }
  return reviews.sort((left, right) => {
    const a = registration.reviewPlan.order.indexOf(`${left.candidateId}/${left.providerFamily}`);
    const b = registration.reviewPlan.order.indexOf(`${right.candidateId}/${right.providerFamily}`);
    return a - b;
  });
}

export function nextPhase16Review(root: string): string | null {
  const registration = loadPhase16ContinuationPreregistration(root);
  const completed = new Set(
    loadPhase16ReaderReviews(root).map((review) => `${review.candidateId}/${review.providerFamily}`),
  );
  return registration.reviewPlan.order.find((item) => !completed.has(item)) ?? null;
}

const imageDigest = (): string =>
  execFileSync("docker", ["image", "inspect", PHASE14_PROVIDER_IMAGE, "--format", "{{.Id}}"], {
    encoding: "utf8",
  }).trim();

export function executePhase16ReaderReview(
  root: string,
  candidateId: string,
  providerFamily: Phase16ReaderFamily,
): Phase16ReviewExecutionResult {
  const registration = loadPhase16ContinuationPreregistration(root);
  const expected = nextPhase16Review(root);
  const requested = `${candidateId}/${providerFamily}`;
  if (expected !== requested) {
    throw new RigInputError(
      `Phase 16 review order requires ${expected ?? "no further review"}, not ${requested}`,
    );
  }
  if (imageDigest() !== registration.frozenReviewContract.providerImageDigest) {
    throw new RigInputError("Pinned Phase 16 provider image digest changed");
  }
  const providerB6 = phase14ProviderContainerB6();
  if (!providerB6.usable) throw new RigInputError("Phase 16 provider-container B6 is not usable");
  const normalizerB6 = phase16ReviewNormalizerB6();
  if (!normalizerB6.usable) throw new RigInputError("Phase 16 review-normalizer B6 is not usable");
  if (providerFamily === "anthropic" && (process.env.CLAUDE_CODE_OAUTH_TOKEN ?? "").trim() === "") {
    throw new RigInputError("CLAUDE_CODE_OAUTH_TOKEN is absent from the review process");
  }
  const base = runPhase16Discovery(root);
  const packet = base.packets.find((row) => row.candidateId === candidateId);
  const registeredPacket = registration.packets.find((row) => row.candidateId === candidateId);
  if (packet === undefined || registeredPacket?.packetSha256 !== packet.packetSha256) {
    throw new RigInputError(`${candidateId}: frozen packet is unavailable`);
  }
  const priorSpend = loadPhase16ReaderReviews(root).reduce((sum, review) => sum + (review.costUsd ?? 0), 0);
  if (priorSpend >= registration.reviewPlan.maximumReaderSpendUsd) {
    throw new RigInputError("Phase 16 reader-spend cap has been reached");
  }

  const providerDir = join(reviewRoot(root), candidateId, providerFamily);
  const attempts = existsSync(providerDir)
    ? readdirSync(providerDir).filter((name) => /^attempt-[12]$/.test(name)).length
    : 0;
  if (attempts >= 2) throw new RigInputError(`${requested}: infrastructure retry ceiling reached`);
  const attempt = attempts + 1;
  const attemptDir = join(providerDir, `attempt-${attempt}`);
  mkdirSync(providerDir, { recursive: true, mode: 0o700 });
  mkdirSync(attemptDir, { recursive: false });

  const challengeDir = mkdtempSync(join(tmpdir(), `phase16-reader-${candidateId}-${providerFamily}-`));
  mkdirSync(join(challengeDir, "challenge"));
  writeFileSync(join(challengeDir, "challenge", "PACKET.json"), `${JSON.stringify(packet, null, 2)}\n`);
  const baseInstructions = readFileSync(join(root, "data/phase-16-reader-instructions.txt"), "utf8");
  const instruction = `${baseInstructions}\nFor this run, providerFamily must be ${providerFamily}. Copy candidateId and packetSha256 exactly from PACKET.json.\n`;
  let credentialDir: string | undefined;
  const startedAt = new Date().toISOString();
  try {
    if (providerFamily === "openai") credentialDir = stageCodexCredential();
    const command = phase14ProviderCommand(providerFamily, credentialDir);
    const providerResult = getProvider("docker").run({
      challengeDir: join(challengeDir, "challenge"),
      submissionPath: "submission/review.json",
      instruction,
      timeoutMs: 1_800_000,
      env: {},
      inheritEnv: true,
      command,
    });
    const finishedAt = new Date().toISOString();
    const transcriptPath = join(attemptDir, "transcript.jsonl");
    const metadataPath = join(attemptDir, "metadata.json");
    writeFileSync(transcriptPath, providerResult.transcript, { encoding: "utf8", mode: 0o600 });
    writeFileSync(
      metadataPath,
      `${JSON.stringify(
        {
          schema: "agent-eval-foundry/phase-16-reader-attempt@1",
          continuationPreregistrationSha256: PHASE16_CONTINUATION_PREREGISTRATION_SHA256,
          candidateId,
          providerFamily,
          attempt,
          startedAt,
          finishedAt,
          classification: providerResult.classification,
          detail: providerResult.detail,
          captureLevel: providerResult.captureLevel,
          runtimeSeconds: providerResult.runtimeSeconds,
          usage: providerResult.usage,
          costUsd: providerResult.usage?.costUsd ?? null,
          command: providerResult.command,
          packetSha256: packet.packetSha256,
        },
        null,
        2,
      )}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    const output = providerResult.submission.find((file) => file.path === "review.json");
    if (providerResult.classification !== "completed" || output === undefined) {
      throw new RigInputError(
        `${requested}: no semantic review (${providerResult.classification}: ${providerResult.detail})`,
      );
    }
    const rawOutputPath = join(attemptDir, "raw-review.json");
    writeFileSync(rawOutputPath, output.content, { encoding: "utf8", mode: 0o600 });
    const parsed = parseRawReview(
      JSON.parse(output.content),
      candidateId,
      packet.packetSha256,
      providerFamily,
    );
    const reviewId = `phase16-${candidateId}-${providerFamily}`;
    const normalized: Phase16ReaderReview = {
      ...parsed,
      reviewId,
      readerId: `phase16-reader-${providerFamily}`,
      model: modelFor(providerFamily),
      independentlyProduced: true,
      blindedTo: registration.blinding.withheld,
      startedAt,
      finishedAt,
      runtimeSeconds: providerResult.runtimeSeconds,
      classification: "completed",
      usage: providerResult.usage,
      costUsd: providerResult.usage?.costUsd ?? null,
      rawOutputPath: relative(root, rawOutputPath),
      rawOutputSha256: sha256Bytes(output.content),
      transcriptPath: relative(root, transcriptPath),
      metadataPath: relative(root, metadataPath),
    };
    const normalizedPath = join(attemptDir, "normalized-review.json");
    writeFileSync(normalizedPath, `${JSON.stringify(normalized, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    return {
      reviewId,
      candidateId,
      providerFamily,
      verdict: normalized.verdict,
      packetSha256: normalized.packetSha256,
      runtimeSeconds: normalized.runtimeSeconds,
      costUsd: normalized.costUsd,
      outputPath: relative(root, normalizedPath),
    };
  } finally {
    rmSync(challengeDir, { recursive: true, force: true });
    if (credentialDir !== undefined) rmSync(credentialDir, { recursive: true, force: true });
  }
}

export const phase16ReviewExecutionJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

export const phase16ReviewSetSha256 = (reviews: readonly Phase16ReaderReview[]): string =>
  phase16Sha256(reviews);
