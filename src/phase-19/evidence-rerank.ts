import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { adjudicatePhase14Labels, parsePhase14BlindLabel } from "../phase-14/blind-labels.js";
import type { Phase14BlindLabel, Phase14LabelDecision } from "../phase-14/blind-labels.js";
import { RigInputError, rigIntegrity } from "../screens/rig-integrity.js";
import { readFileTree } from "../trials/providers.js";
import { ROOT_CAUSES } from "../trials/root-cause.js";

export const PHASE19_PREREGISTRATION_SHA256 =
  "f589a204efeb03b41e6dab5254b57d441e6291393e6eb720c93c1c6ee77c7a5d";
export const PHASE19_ASSESSMENTS_SHA256 =
  "0953fc4f1351c4283d385c2915842d7dd43e173ad81050913799d319adc8d3e7";
export const PHASE19_RESEARCH_CORPUS_SHA256 =
  "d6c483403f4b9944cf54fbeb960a14bb6fce563458e6f1c3490ae9fe769b723e";
export const PHASE19_CAA_LEDGER_SHA256 =
  "e96a9e97b9571b3966115ad0565b7a98742d110bbbe23862a98fa5d166470bcb";
export const PHASE19_CAA_AUDIT_SHA256 =
  "5b94c04f803f2c481925619ac26b62ca776574246db827695850c1a2fab16e1d";

export const PHASE19_UI_RUNS = [
  "ui-claude-1",
  "ui-claude-2",
  "ui-codex-1",
  "ui-haiku-1",
  "ui-sonnet-1",
] as const;

export type Phase19UiRunId = (typeof PHASE19_UI_RUNS)[number];
export type Phase19ReaderFamily = "openai" | "anthropic";

const READER_FAMILIES = ["openai", "anthropic"] as const;
const PHASE19_BLINDING = [
  "existing root-cause sidecar",
  "other reader verdict",
  "other UI trial outcomes",
  "family promotion status",
  "research ranking",
  "author diagnosis",
  "campaign stopping decision",
] as const;

const hash = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const fileHash = (root: string, path: string): string => hash(readFileSync(join(root, path)));

const readJson = <T>(root: string, path: string): T =>
  JSON.parse(readFileSync(join(root, path), "utf8")) as T;

const assertFrozen = (root: string, path: string, expected: string): void => {
  const observed = fileHash(root, path);
  if (observed !== expected) {
    throw new RigInputError(`${path}: frozen input changed (${observed} != ${expected})`);
  }
};

export interface Phase19UiLabelPacket {
  readonly schema: "agent-eval-foundry/phase-19-ui-blind-root-cause-packet@1";
  readonly packetId: string;
  readonly instructions: string;
  readonly closedVocabulary: readonly string[];
  readonly decisionRule: Readonly<Record<string, string>>;
  readonly evidence: {
    readonly challenge: readonly { readonly path: string; readonly content: string }[];
    readonly submission: readonly { readonly path: string; readonly content: string }[];
    readonly transcript: string;
    readonly countability: unknown;
    readonly verifierOutput: unknown;
    readonly normalizedResult: unknown;
  };
  readonly excluded: readonly string[];
  readonly requiredOutput: unknown;
}

const uiAlias = (runId: Phase19UiRunId): string =>
  `ui-blind-${String(PHASE19_UI_RUNS.indexOf(runId) + 1).padStart(2, "0")}`;

const redactedResult = (value: unknown): unknown => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new RigInputError("UI normalized result must be an object");
  }
  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(source).filter(
      ([key]) =>
        ![
          "runId",
          "familyId",
          "model",
          "subjectId",
          "subjectType",
          "artifactPath",
          "notes",
        ].includes(key),
    ),
  );
};

export function buildPhase19UiLabelPacket(root: string, runId: Phase19UiRunId): Phase19UiLabelPacket {
  const trialDir = join(root, "trials", "ui-action-record-replay", runId);
  const required = [
    "challenge/SPEC.md",
    "challenge/README.md",
    "challenge/types.ts",
    "submission/subject.mjs",
    "transcript.txt",
    "countability.json",
    "verifier-output.json",
    "result.json",
  ];
  const missing = required.filter((path) => !existsSync(join(trialDir, path)));
  if (missing.length > 0) throw new RigInputError(`${runId}: incomplete evidence (${missing.join(", ")})`);
  const countability = readJson<Record<string, unknown>>(trialDir, "countability.json");
  const result = readJson<Record<string, unknown>>(trialDir, "result.json");
  if (countability.counts !== true || result.counts !== true) {
    throw new RigInputError(`${runId}: only countable trials may be labelled`);
  }
  const failed = Array.isArray(result.cells)
    ? result.cells.filter(
        (cell) =>
          cell !== null &&
          typeof cell === "object" &&
          Array.isArray((cell as Record<string, unknown>).failed) &&
          ((cell as Record<string, unknown>).failed as unknown[]).length > 0,
      ).length
    : 0;
  if (failed === 0) throw new RigInputError(`${runId}: root-cause labelling requires a failing trial`);
  return {
    schema: "agent-eval-foundry/phase-19-ui-blind-root-cause-packet@1",
    packetId: uiAlias(runId),
    instructions:
      "Classify this one countable failing trial using only its own visible contract, submitted artifact, trajectory and verifier evidence. Decide whether the public package determines each failed obligation and whether the rig measured the submitted behavior. Do not infer from any other trial or project summary.",
    closedVocabulary: ROOT_CAUSES.filter((label) => label !== "clean" && label !== "unlabelled"),
    decisionRule: {
      capability:
        "The visible package determines the required behavior, the rig measured it correctly, and the submitted implementation got it wrong.",
      "spec-underspecified": "At least one outcome material to the failure cannot be derived from the visible package.",
      "spec-contradiction": "The visible package states something the verifier contradicts.",
      "harness-contract-violation": "The host or runner broke a promise the visible package made.",
      "package-leak": "The visible package exposed hidden answer or grading information.",
      infrastructure: "The evidence did not measure the submitted implementation.",
    },
    evidence: {
      challenge: readFileTree(join(trialDir, "challenge")),
      submission: readFileTree(join(trialDir, "submission")),
      transcript: readFileSync(join(trialDir, "transcript.txt"), "utf8"),
      countability,
      verifierOutput: readJson(trialDir, "verifier-output.json"),
      normalizedResult: redactedResult(result),
    },
    excluded: [...PHASE19_BLINDING],
    requiredOutput: {
      path: "submission/label.json",
      exactKeys: ["label", "rationale", "evidenceRead"],
      label: "one exact closedVocabulary value",
      rationale: "at least 80 characters explaining this label and rejecting the nearest alternative",
      evidenceRead: "non-empty packet sections or challenge/submission paths actually inspected",
    },
  };
}

export const phase19UiPacketBytes = (root: string, runId: Phase19UiRunId): string =>
  `${JSON.stringify(buildPhase19UiLabelPacket(root, runId), null, 2)}\n`;

export interface Phase19UiPacketManifest {
  readonly schema: "agent-eval-foundry/phase-19-ui-label-packet-manifest@1";
  readonly preregistrationSha256: string;
  readonly commonChallengeSha256: string;
  readonly packets: readonly {
    readonly runId: Phase19UiRunId;
    readonly packetId: string;
    readonly path: string;
    readonly sha256: string;
  }[];
}

export function buildPhase19UiPacketManifest(root: string): Phase19UiPacketManifest {
  assertFrozen(root, "data/phase-19-preregistration.json", PHASE19_PREREGISTRATION_SHA256);
  const challenges = PHASE19_UI_RUNS.map((runId) =>
    hash(JSON.stringify(readFileTree(join(root, "trials", "ui-action-record-replay", runId, "challenge")))),
  );
  if (new Set(challenges).size !== 1) {
    throw new RigInputError("UI trials do not carry one byte-consistent public challenge");
  }
  const commonChallengeSha256 = challenges[0];
  if (commonChallengeSha256 === undefined) throw new RigInputError("UI packet set is empty");
  return {
    schema: "agent-eval-foundry/phase-19-ui-label-packet-manifest@1",
    preregistrationSha256: PHASE19_PREREGISTRATION_SHA256,
    commonChallengeSha256,
    packets: PHASE19_UI_RUNS.map((runId) => ({
      runId,
      packetId: uiAlias(runId),
      path: `data/phase-19-ui-label-packets/${uiAlias(runId)}.json`,
      sha256: hash(phase19UiPacketBytes(root, runId)),
    })),
  };
}

const labelPath = (root: string, runId: Phase19UiRunId, provider: Phase19ReaderFamily): string =>
  join(root, "data", "phase-19-ui-label-runs", uiAlias(runId), provider, "normalized-label.json");

export interface Phase19UiDecision {
  readonly runId: Phase19UiRunId;
  readonly packetId: string;
  readonly packetSha256: string;
  readonly labels: readonly Phase14BlindLabel[];
  readonly decision: Phase14LabelDecision;
}

export interface Phase19UiLabelLedger {
  readonly schema: "agent-eval-foundry/phase-19-ui-label-ledger@1";
  readonly packetManifestSha256: string;
  readonly trials: readonly Phase19UiDecision[];
  readonly summary: {
    readonly trials: 5;
    readonly labelsRequired: 10;
    readonly labelsReceived: number;
    readonly agreedCapability: number;
    readonly agreedNoncapability: number;
    readonly disagreed: number;
    readonly pending: number;
    readonly difficultyEvidenceSurvives: boolean;
  };
}

export function buildPhase19UiLabelLedger(root: string): Phase19UiLabelLedger {
  const manifest = buildPhase19UiPacketManifest(root);
  const trials = PHASE19_UI_RUNS.map((runId): Phase19UiDecision => {
    const packet = manifest.packets.find((row) => row.runId === runId);
    if (packet === undefined) throw new RigInputError(`${runId}: packet manifest entry missing`);
    const labels = READER_FAMILIES.flatMap((provider) => {
      const path = labelPath(root, runId, provider);
      if (!existsSync(path)) return [];
      const label = parsePhase14BlindLabel(JSON.parse(readFileSync(path, "utf8")));
      if (label.packetSha256 !== packet.sha256) {
        throw new RigInputError(`${relative(root, path)}: stale packet hash`);
      }
      return [label];
    });
    return {
      runId,
      packetId: packet.packetId,
      packetSha256: packet.sha256,
      labels,
      decision: adjudicatePhase14Labels(runId, "ui-action-record-replay", true, labels),
    };
  });
  const labelsReceived = trials.reduce((sum, row) => sum + row.labels.length, 0);
  const agreedCapability = trials.filter((row) => row.decision.status === "agreed-capability").length;
  const agreedNoncapability = trials.filter(
    (row) => row.decision.status === "agreed-noncapability",
  ).length;
  const disagreed = trials.filter((row) => row.decision.status === "disagreed").length;
  const pending = trials.filter((row) => row.decision.status === "pending").length;
  return {
    schema: "agent-eval-foundry/phase-19-ui-label-ledger@1",
    packetManifestSha256: hash(`${JSON.stringify(manifest, null, 2)}\n`),
    trials,
    summary: {
      trials: 5,
      labelsRequired: 10,
      labelsReceived,
      agreedCapability,
      agreedNoncapability,
      disagreed,
      pending,
      difficultyEvidenceSurvives: agreedCapability > 0,
    },
  };
}

type Disposition =
  | "rankable"
  | "duplicate-killed"
  | "infrastructure-excluded"
  | "broad-shape-excluded";

interface CandidateAssessment {
  readonly familyId: string;
  readonly disposition: Disposition;
  readonly duplicateOf: string | null;
  readonly sourceEvidence: number;
  readonly causalDepth: number;
  readonly diagnosisRadius: number;
  readonly authorityBoundary: number;
  readonly scenarioSpace: number;
  readonly fairContractFeasibility: number;
  readonly novelty: number;
  readonly buildTractability: number;
  readonly caaAnalogyPenalty: number;
  readonly rationale: string;
}

interface AssessmentFile {
  readonly schema: string;
  readonly scoreWeights: Readonly<Record<string, number>>;
  readonly rows: readonly CandidateAssessment[];
}

interface ResearchFamily {
  readonly familyId: string;
  readonly name: string;
  readonly definition: string;
  readonly taskShape: string;
  readonly causalAxis: string;
  readonly professionalDomain: string;
  readonly primarySourceUnitIds: readonly string[];
  readonly evidenceType: string;
  readonly authorityBoundary: string;
  readonly subjectInaccessibleWitness: string;
  readonly naturalScenarioDimensions: string;
  readonly whyAgentMayFail: string;
  readonly whyFair: string;
}

interface ProbabilityRecord {
  readonly value: number;
  readonly rangeLow: number;
  readonly rangeHigh: number;
  readonly confidence: string;
}

interface ScoredResearchFamily {
  readonly family: ResearchFamily;
  readonly reconciled: {
    readonly probabilityOrdinaryPackage: ProbabilityRecord;
    readonly probabilityFullRecipe: ProbabilityRecord;
    readonly opportunityScoreTotal: number;
    readonly officialReviewProbability: number | null;
  };
}

interface ResearchCorpus {
  readonly families20: readonly ResearchFamily[];
  readonly scored: readonly ScoredResearchFamily[];
  readonly recipeCards: readonly Record<string, unknown>[];
  readonly sourceIndex: readonly Record<string, unknown>[];
  readonly rawMechanismPool: readonly Record<string, unknown>[];
}

const normalizeProbability = (value: number): number => {
  const normalized = value > 1 ? value / 100 : value;
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 1) {
    throw new RigInputError(`clean-solve probability ${value} cannot be normalized to [0,1]`);
  }
  return Number(normalized.toFixed(4));
};

const normalizedRange = (record: ProbabilityRecord): { value: number; low: number; high: number } => {
  const normalized = {
    value: normalizeProbability(record.value),
    low: normalizeProbability(record.rangeLow),
    high: normalizeProbability(record.rangeHigh),
  };
  if (normalized.low > normalized.value || normalized.value > normalized.high) {
    throw new RigInputError("normalized probability range does not contain its central value");
  }
  return normalized;
};

export interface Phase19RankedCandidate {
  readonly rank: number | null;
  readonly familyId: string;
  readonly name: string;
  readonly causalAxis: string;
  readonly professionalDomain: string;
  readonly disposition: Disposition;
  readonly duplicateOf: string | null;
  readonly dimensions: {
    readonly sourceEvidence: number;
    readonly causalDepth: number;
    readonly diagnosisRadius: number;
    readonly authorityBoundary: number;
    readonly scenarioSpace: number;
    readonly fairContractFeasibility: number;
    readonly novelty: number;
    readonly buildTractability: number;
    readonly uiCapabilityEvidence: number;
  };
  readonly caaAnalogyPenalty: number;
  readonly decisionScore: number | null;
  readonly inheritedCleanSolveProbability: {
    readonly ordinary: { readonly value: number; readonly low: number; readonly high: number };
    readonly fullRecipe: { readonly value: number; readonly low: number; readonly high: number };
    readonly status: "estimated-unvalidated";
  };
  readonly rationale: string;
}

export interface Phase19Reranking {
  readonly schema: "agent-eval-foundry/phase-19-reranking@1";
  readonly inputHashes: Readonly<Record<string, string>>;
  readonly probabilitySemantic: "P(agent cleanly solves the package)";
  readonly caaV2Correction: {
    readonly countableTrials: 4;
    readonly cleanSolves: 4;
    readonly rewardZero: 0;
    readonly difficultyEstimateValid: false;
    readonly reason: string;
  };
  readonly uiEvidence: Phase19UiLabelLedger["summary"];
  readonly rows: readonly Phase19RankedCandidate[];
  readonly topFive: readonly string[];
}

export function buildPhase19Reranking(root: string): Phase19Reranking {
  assertFrozen(root, "data/phase-19-preregistration.json", PHASE19_PREREGISTRATION_SHA256);
  assertFrozen(root, "data/phase-19-candidate-assessments.json", PHASE19_ASSESSMENTS_SHA256);
  assertFrozen(root, "data/research-task-family-candidates.json", PHASE19_RESEARCH_CORPUS_SHA256);
  assertFrozen(root, "data/phase-18-trial-ledger.json", PHASE19_CAA_LEDGER_SHA256);
  assertFrozen(root, "data/phase-18-verifier-audit.json", PHASE19_CAA_AUDIT_SHA256);
  const corpus = readJson<ResearchCorpus>(root, "data/research-task-family-candidates.json");
  const assessments = readJson<AssessmentFile>(root, "data/phase-19-candidate-assessments.json");
  const caa = readJson<{
    summary: { countable: number; cleanSolves: number; rewardZero: number };
  }>(root, "data/phase-18-trial-ledger.json");
  if (caa.summary.countable !== 4 || caa.summary.cleanSolves !== 4 || caa.summary.rewardZero !== 0) {
    throw new RigInputError("Phase 19 expected the final CAA V2 state of four countable clean solves");
  }
  const familyIds = new Set(corpus.families20.map((family) => family.familyId));
  if (
    familyIds.size !== 20 ||
    assessments.rows.length !== 20 ||
    assessments.rows.some((row) => !familyIds.has(row.familyId))
  ) {
    throw new RigInputError("candidate assessments must cover the inherited 20-family corpus exactly");
  }
  for (const row of assessments.rows) {
    for (const key of [
      "sourceEvidence",
      "causalDepth",
      "diagnosisRadius",
      "authorityBoundary",
      "scenarioSpace",
      "fairContractFeasibility",
      "novelty",
      "buildTractability",
    ] as const) {
      if (!Number.isInteger(row[key]) || row[key] < 0 || row[key] > 5) {
        throw new RigInputError(`${row.familyId}.${key}: expected integer 0..5`);
      }
    }
    if (row.disposition === "rankable" && (row.causalDepth === 0 || row.diagnosisRadius === 0)) {
      throw new RigInputError(`${row.familyId}: mandatory depth/radius evidence is absent`);
    }
  }
  const ui = buildPhase19UiLabelLedger(root);
  const uiEvidenceValue = Math.min(5, ui.summary.agreedCapability);
  const weights = assessments.scoreWeights;
  const scored = assessments.rows.map((assessment): Phase19RankedCandidate => {
    const family = corpus.families20.find((row) => row.familyId === assessment.familyId);
    const inherited = corpus.scored.find((row) => row.family.familyId === assessment.familyId);
    if (family === undefined || inherited === undefined) {
      throw new RigInputError(`${assessment.familyId}: inherited candidate or score missing`);
    }
    const uiCapabilityEvidence = assessment.familyId === "ui-action-replay-dom-mutation-timing"
      ? uiEvidenceValue
      : 0;
    const rawScore =
      assessment.sourceEvidence * (weights.sourceEvidence ?? 0) +
      assessment.causalDepth * (weights.causalDepth ?? 0) +
      assessment.diagnosisRadius * (weights.diagnosisRadius ?? 0) +
      assessment.authorityBoundary * (weights.authorityBoundary ?? 0) +
      assessment.scenarioSpace * (weights.scenarioSpace ?? 0) +
      assessment.fairContractFeasibility * (weights.fairContractFeasibility ?? 0) +
      assessment.novelty * (weights.novelty ?? 0) +
      assessment.buildTractability * (weights.buildTractability ?? 0) +
      uiCapabilityEvidence * (weights.uiCapabilityEvidence ?? 0) -
      assessment.caaAnalogyPenalty;
    return {
      rank: null,
      familyId: family.familyId,
      name: family.name,
      causalAxis: family.causalAxis,
      professionalDomain: family.professionalDomain,
      disposition: assessment.disposition,
      duplicateOf: assessment.duplicateOf,
      dimensions: {
        sourceEvidence: assessment.sourceEvidence,
        causalDepth: assessment.causalDepth,
        diagnosisRadius: assessment.diagnosisRadius,
        authorityBoundary: assessment.authorityBoundary,
        scenarioSpace: assessment.scenarioSpace,
        fairContractFeasibility: assessment.fairContractFeasibility,
        novelty: assessment.novelty,
        buildTractability: assessment.buildTractability,
        uiCapabilityEvidence,
      },
      caaAnalogyPenalty: assessment.caaAnalogyPenalty,
      decisionScore: assessment.disposition === "rankable" ? rawScore : null,
      inheritedCleanSolveProbability: {
        ordinary: normalizedRange(inherited.reconciled.probabilityOrdinaryPackage),
        fullRecipe: normalizedRange(inherited.reconciled.probabilityFullRecipe),
        status: "estimated-unvalidated",
      },
      rationale: assessment.rationale,
    };
  });
  const rankable = scored
    .filter((row) => row.disposition === "rankable")
    .sort((left, right) => {
      const byScore = (right.decisionScore ?? 0) - (left.decisionScore ?? 0);
      if (byScore !== 0) return byScore;
      const byDepth = right.dimensions.causalDepth - left.dimensions.causalDepth;
      if (byDepth !== 0) return byDepth;
      const byRadius = right.dimensions.diagnosisRadius - left.dimensions.diagnosisRadius;
      if (byRadius !== 0) return byRadius;
      return left.familyId.localeCompare(right.familyId);
    });
  const ranks = new Map(rankable.map((row, index) => [row.familyId, index + 1]));
  const rows = scored
    .map((row) => ({ ...row, rank: ranks.get(row.familyId) ?? null }))
    .sort((left, right) => {
      if (left.rank !== null && right.rank !== null) return left.rank - right.rank;
      if (left.rank !== null) return -1;
      if (right.rank !== null) return 1;
      return left.familyId.localeCompare(right.familyId);
    });
  return {
    schema: "agent-eval-foundry/phase-19-reranking@1",
    inputHashes: {
      preregistration: PHASE19_PREREGISTRATION_SHA256,
      assessments: PHASE19_ASSESSMENTS_SHA256,
      researchCorpus: PHASE19_RESEARCH_CORPUS_SHA256,
      caaTrialLedger: PHASE19_CAA_LEDGER_SHA256,
      caaVerifierAudit: PHASE19_CAA_AUDIT_SHA256,
    },
    probabilitySemantic: "P(agent cleanly solves the package)",
    caaV2Correction: {
      countableTrials: 4,
      cleanSolves: 4,
      rewardZero: 0,
      difficultyEstimateValid: false,
      reason:
        "The four solves are genuine and general, but a fatal verifier bypass plus public activation leaks invalidate CAA V2 as a task-difficulty estimate. They still falsify the claim that realistic packaging alone hid its locally legible defect.",
    },
    uiEvidence: ui.summary,
    rows,
    topFive: rankable.slice(0, 5).map((row) => row.familyId),
  };
}

export function phase19CoreB6(root: string): {
  readonly usable: boolean;
  readonly knownGoodPassed: boolean;
  readonly knownBadFailed: boolean;
  readonly malformedInputRefused: boolean;
  readonly nondegenerate: boolean;
} {
  const manifest = buildPhase19UiPacketManifest(root);
  const goodFailures = manifest.packets.length === 5 && new Set(manifest.packets.map((p) => p.sha256)).size === 5
    ? []
    : ["packet-manifest-invalid"];
  let knownBadFailed = false;
  try {
    normalizeProbability(101);
  } catch {
    knownBadFailed = true;
  }
  let malformedInputRefused = false;
  try {
    redactedResult([]);
  } catch {
    malformedInputRefused = true;
  }
  const badFailures = knownBadFailed ? ["bad-probability-refused"] : [];
  const integrity = rigIntegrity(
    "phase19-evidence-rerank-core",
    [
      { id: "five-complete-distinct-ui-packets", expect: "pass", observedFailures: goodFailures },
      { id: "out-of-range-probability", expect: "fail", observedFailures: badFailures },
    ],
    [goodFailures, badFailures],
  );
  return {
    usable: integrity.usable && malformedInputRefused,
    knownGoodPassed: goodFailures.length === 0,
    knownBadFailed,
    malformedInputRefused,
    nondegenerate: !integrity.degenerate,
  };
}

export const phase19Json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

export function phase19CandidateCorpus(root: string): ResearchCorpus {
  assertFrozen(root, "data/research-task-family-candidates.json", PHASE19_RESEARCH_CORPUS_SHA256);
  return readJson<ResearchCorpus>(root, "data/research-task-family-candidates.json");
}

export function phase19AssessmentFor(root: string, familyId: string): CandidateAssessment {
  assertFrozen(root, "data/phase-19-candidate-assessments.json", PHASE19_ASSESSMENTS_SHA256);
  const file = readJson<AssessmentFile>(root, "data/phase-19-candidate-assessments.json");
  const row = file.rows.find((candidate) => candidate.familyId === familyId);
  if (row === undefined) throw new RigInputError(`${familyId}: Phase 19 assessment missing`);
  return row;
}

export function phase19UiRunForPacketId(packetId: string): Phase19UiRunId {
  const index = Number(packetId.replace(/^ui-blind-/, "")) - 1;
  const runId = PHASE19_UI_RUNS[index];
  if (runId === undefined || uiAlias(runId) !== packetId) {
    throw new RigInputError(`${packetId}: unknown UI packet`);
  }
  return runId;
}

export const phase19UiPacketId = uiAlias;

export function phase19CapturedFiles(root: string, base: string): readonly string[] {
  const dir = join(root, base);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(root, join(entry.parentPath, entry.name)))
    .sort();
}
