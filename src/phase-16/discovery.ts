import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { loadRegistry } from "../foundry/load.js";
import { frozenNoveltyBaseline } from "../phase-17/frozen-novelty-baseline.js";
import { phase16Sha256, runPhase16Calibration } from "./calibration.js";
import { auditCandidateContract } from "./contract-gate.js";
import { phase16CandidateContracts } from "./contracts.js";
import type { CandidateContract, ContractGateResult } from "./types.js";

export const PHASE16_PREREGISTRATION_SHA256 =
  "189018ba2072c6de2b2a841b919a5f78834b8585d15e7756ad11d1eb5f6ef302";
export const PHASE16_CALIBRATION_SHA256 = "dc85b9a1b79407ee3f0336bc821828ec739add7034af343c513a553413c2087a";
export const PHASE16_SOURCE_LEDGER_SHA256 =
  "9eab5ca22c0dab2ae6c35996b9116ea0fd04c78a0c9881ad74797740a3f4fb6c";
export const PHASE16_PREFLIGHT_SHA256 = "b4768def2a6c6f6f554576bc759b69db5114b22389d689d9253c6944e1953a9c";
export const PHASE16_READER_SCHEMA_SHA256 =
  "e6f076483364ecb51ab3e23e71cef264bc64667845af988346e2716c296aa293";

type Channel =
  | "benchmark-trajectory-solve-patch"
  | "agent-self-check-failure"
  | "authoritative-incident-upstream-fix"
  | "boundary-first-system-inspection";

interface PreregisteredSource {
  readonly sourceUnitId: string;
  readonly channel: Channel;
  readonly locator: string;
  readonly reason: string;
  readonly extractionLimit: number;
}

interface Phase16Preregistration {
  readonly schema: string;
  readonly runId: string;
  readonly registeredAt: string;
  readonly baselineCommit: string;
  readonly chronologyEvidence: string;
  readonly immutability: Readonly<Record<string, string>>;
  readonly sourceCorpus: readonly PreregisteredSource[];
  readonly caps: {
    readonly sourceUnits: number;
    readonly canonicalExtractions: number;
    readonly contractCompletionAttempts: number;
    readonly semanticUniqueCandidates: number;
    readonly readerPackets: number;
    readonly independentReaderReviews: number;
    readonly reviewsPerCandidate: number;
    readonly cheapProbes: number;
    readonly modelReads: number;
    readonly modelReadSpendUsd: number;
    readonly paidSubjectTrials: number;
  };
  readonly predictions: Readonly<Record<string, number | string>>;
  readonly readerProtocol: {
    readonly threshold: string;
    readonly blindedTo: readonly string[];
    readonly packetMustContain: readonly string[];
    readonly providerFailureRule: string;
  };
  readonly promotionThresholds: Readonly<Record<string, string>>;
  readonly stoppingRules: readonly string[];
}

interface SourceMeasurement {
  readonly name: string;
  readonly value: number;
  readonly denominator: number | null;
}

export interface Phase16SourceRow {
  readonly sourceUnitId: string;
  readonly channel: Channel;
  readonly locator: string;
  readonly revision: string;
  readonly digest: string;
  readonly digestAlgorithm: "directory-manifest-sha256" | "snapshot-evidence-sha256";
  readonly snapshotPath?: string;
  readonly sourceSupport:
    | "countable-local-trial"
    | "first-party-observed-incident"
    | "authoritative-protocol-without-observed-incident";
  readonly observedFailure: string;
  readonly measurements: readonly SourceMeasurement[];
  readonly extraction: {
    readonly affectedLayer: string;
    readonly failureAxis: string;
    readonly transferableMechanism: string;
    readonly candidateSubstrate: string | null;
    readonly subjectActionContract: string | null;
    readonly authorityBoundary: string | null;
    readonly validityRisks: readonly string[];
    readonly status: "validity-control-only" | "contract-drafted" | "below-contract-cap";
    readonly contractAttempted: boolean;
    readonly reason: string;
  };
}

interface SourceLedger {
  readonly schema: string;
  readonly runId: string;
  readonly preregistrationSha256: string;
  readonly sources: readonly Phase16SourceRow[];
}

interface ReaderPreflight {
  readonly schema: string;
  readonly runId: string;
  readonly capturedAt: string;
  readonly providers: readonly {
    readonly providerFamily: "openai" | "anthropic";
    readonly command: string;
    readonly cliVersion: string;
    readonly authenticated: boolean;
    readonly observation: string;
  }[];
  readonly containerRuntime: { readonly available: boolean; readonly observation: string };
  readonly decision: string;
}

export interface Phase16CandidateEvaluation {
  readonly candidateId: string;
  readonly sourceIncidentId: string;
  readonly channel: Channel;
  readonly contractSha256: string;
  readonly gate: ContractGateResult;
  readonly semanticFingerprint: string;
  readonly semanticDuplicateOf: string | null;
  readonly semanticNovelty: boolean;
  readonly domainBreadthUnit: string;
  readonly causalAxis: string;
  readonly subjectActionContract: string;
  readonly score: number;
  readonly scoreBreakdown: {
    readonly observedIncidentSupport: number;
    readonly contractGate: number;
    readonly structuralBoundary: number;
    readonly derivationStrength: number;
    readonly unresolvedRiskPenalty: number;
    readonly measuredOperatorUplift: 0;
  };
  readonly operatorEvidence: "no-measured-positive-agent-effect";
  readonly queueStatus:
    | "reader-packet"
    | "below-semantic-unique-cap"
    | "semantic-duplicate"
    | "contract-rejected";
  readonly queueReason: string;
}

export interface Phase16ReaderPacket {
  readonly schema: "agent-eval-foundry/phase-16-reader-packet@1";
  readonly candidateId: string;
  readonly packetSha256: string;
  readonly blindedTo: readonly string[];
  readonly reviewQuestion: string;
  readonly requiredDimensions: readonly string[];
  readonly source: CandidateContract["source"] & { readonly channel: Channel };
  readonly publicTaskContract: Pick<
    CandidateContract,
    | "publicContract"
    | "grading"
    | "hiddenInstanceEnvelope"
    | "subjectInterface"
    | "authorityBoundary"
    | "witnessInaccessibility"
  >;
  readonly noveltyBaseline: readonly {
    readonly familyId: string;
    readonly domain: string;
    readonly mechanisms: readonly string[];
  }[];
  readonly cheapProbeDefinition: CandidateContract["validation"]["cheapProbe"];
}

export interface Phase16DiscoveryRun {
  readonly schema: "agent-eval-foundry/phase-16-discovery-run@1";
  readonly runId: string;
  readonly preregistrationSha256: string;
  readonly calibrationSha256: string;
  readonly sourceLedgerSha256: string;
  readonly preflightSha256: string;
  readonly sourceCorpusSha256: string;
  readonly packetSetSha256: string;
  readonly rawReviewSetSha256: string;
  readonly normalizedReviewSetSha256: string;
  readonly sources: readonly Phase16SourceRow[];
  readonly contracts: readonly CandidateContract[];
  readonly candidates: readonly Phase16CandidateEvaluation[];
  readonly packets: readonly Phase16ReaderPacket[];
  readonly reviews: readonly never[];
  readonly readerDecisions: readonly {
    readonly candidateId: string;
    readonly status: "blocked";
    readonly reason: string;
    readonly reviewsPresent: 0;
    readonly reviewsRequired: 2;
  }[];
  readonly probes: readonly {
    readonly candidateId: string;
    readonly status: "not-run-reader-blocked";
    readonly reason: string;
    readonly b6Invocation: null;
  }[];
  readonly summary: {
    readonly sourceUnits: number;
    readonly canonicalExtractions: number;
    readonly validityOnlyDeaths: number;
    readonly belowContractCap: number;
    readonly contractAttempts: number;
    readonly contractComplete: number;
    readonly semanticUniquesFound: number;
    readonly semanticUniquesAdmitted: number;
    readonly readerPackets: number;
    readonly readerReviews: 0;
    readonly readerSurvivors: null;
    readonly probeSurvivors: null;
    readonly prospectiveYield: null;
    readonly promotionBlocked: true;
    readonly decision: "BLOCKED";
  };
  readonly conclusion: string;
}

const parseJson = <T>(root: string, path: string): T =>
  JSON.parse(readFileSync(join(root, path), "utf8")) as T;

const fileSha256 = (root: string, path: string): string => phase16Sha256(readFileSync(join(root, path)));

const walkFiles = (dir: string): readonly string[] =>
  readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => (entry.isDirectory() ? walkFiles(join(dir, entry.name)) : [join(dir, entry.name)]))
    .sort();

const directoryManifestSha256 = (root: string, path: string): string => {
  const rows = walkFiles(join(root, path)).map((absolute) => {
    const digest = phase16Sha256(readFileSync(absolute));
    return `${digest}  ${relative(root, absolute)}\n`;
  });
  return createHash("sha256").update(rows.join("")).digest("hex");
};

const assertHash = (root: string, path: string, expected: string): void => {
  const observed = fileSha256(root, path);
  if (observed !== expected) throw new Error(`${path}: expected SHA-256 ${expected}, got ${observed}`);
};

export function loadPhase16Preregistration(root: string): Phase16Preregistration {
  assertHash(root, "data/phase-16-preregistration.json", PHASE16_PREREGISTRATION_SHA256);
  assertHash(root, "data/phase-16-contract-calibration.json", PHASE16_CALIBRATION_SHA256);
  const registration = parseJson<Phase16Preregistration>(root, "data/phase-16-preregistration.json");
  if (registration.schema !== "agent-eval-foundry/phase-16-discovery-v3-preregistration@1") {
    throw new Error("Phase 16 preregistration schema is unsupported");
  }
  if (registration.sourceCorpus.length !== registration.caps.sourceUnits) {
    throw new Error("Phase 16 preregistered source count differs from its cap");
  }
  if (registration.sourceCorpus.some((row) => row.extractionLimit !== 1)) {
    throw new Error("Phase 16 requires one canonical extraction per incident");
  }
  if (registration.caps.paidSubjectTrials !== 0) {
    throw new Error("Phase 16 paid-subject-trial cap must remain zero");
  }
  const ids = registration.sourceCorpus.map((row) => row.sourceUnitId);
  if (new Set(ids).size !== ids.length) throw new Error("Phase 16 preregistration repeats a source id");
  const calibration = runPhase16Calibration(root);
  if (phase16Sha256(calibration) !== PHASE16_CALIBRATION_SHA256) {
    throw new Error("Phase 16 generated calibration no longer matches its frozen artifact");
  }
  if (!calibration.b6.usable || calibration.controls.some((control) => !control.held)) {
    throw new Error("Phase 16 frozen contract calibration no longer holds");
  }
  if (registration.immutability.calibrationSha256 !== PHASE16_CALIBRATION_SHA256) {
    throw new Error("Phase 16 preregistration does not bind the frozen calibration artifact");
  }
  if (calibration.gateHashes.gate !== registration.immutability.candidateContractGateSha256) {
    throw new Error("Phase 16 gate source changed after preregistration");
  }
  if (calibration.gateHashes.schema !== registration.immutability.candidateContractSchemaSha256) {
    throw new Error("Phase 16 contract schema changed after preregistration");
  }
  return registration;
}

export function loadPhase16Sources(root: string): readonly Phase16SourceRow[] {
  const registration = loadPhase16Preregistration(root);
  assertHash(root, "data/phase-16-source-ledger.json", PHASE16_SOURCE_LEDGER_SHA256);
  const ledger = parseJson<SourceLedger>(root, "data/phase-16-source-ledger.json");
  if (ledger.schema !== "agent-eval-foundry/phase-16-source-ledger@1") {
    throw new Error("Phase 16 source-ledger schema is unsupported");
  }
  if (
    ledger.runId !== registration.runId ||
    ledger.preregistrationSha256 !== PHASE16_PREREGISTRATION_SHA256
  ) {
    throw new Error("Phase 16 source ledger is not bound to the frozen registration");
  }
  const registered = new Map(registration.sourceCorpus.map((row) => [row.sourceUnitId, row]));
  if (ledger.sources.length !== registered.size) throw new Error("Phase 16 source ledger has wrong length");
  for (const source of ledger.sources) {
    const expected = registered.get(source.sourceUnitId);
    if (expected === undefined || expected.channel !== source.channel) {
      throw new Error(`${source.sourceUnitId}: source was not preregistered on this channel`);
    }
    if (source.digestAlgorithm === "directory-manifest-sha256") {
      if (!existsSync(join(root, source.locator)) || !statSync(join(root, source.locator)).isDirectory()) {
        throw new Error(`${source.sourceUnitId}: local trial directory is absent`);
      }
      const observed = directoryManifestSha256(root, source.locator);
      if (observed !== source.digest) {
        throw new Error(
          `${source.sourceUnitId}: local directory digest changed; expected ${source.digest}, got ${observed}`,
        );
      }
    } else {
      if (source.snapshotPath === undefined) throw new Error(`${source.sourceUnitId}: snapshot path missing`);
      assertHash(root, source.snapshotPath, source.digest);
    }
  }
  if (
    ledger.sources.filter((row) => row.extraction.contractAttempted).length !==
    registration.caps.contractCompletionAttempts
  ) {
    throw new Error("Phase 16 contract-attempt count differs from its registered cap");
  }
  if (ledger.sources.some((row) => /outbox|cloudflare-2019/i.test(row.sourceUnitId))) {
    throw new Error("Phase 16 retrospective calibration fixture entered the prospective source ledger");
  }
  return ledger.sources;
}

export function loadPhase16Preflight(root: string): ReaderPreflight {
  assertHash(root, "data/phase-16-reader-preflight-observations.json", PHASE16_PREFLIGHT_SHA256);
  assertHash(root, "data/phase-16-reader-output.schema.json", PHASE16_READER_SCHEMA_SHA256);
  const value = parseJson<ReaderPreflight>(root, "data/phase-16-reader-preflight-observations.json");
  if (value.schema !== "agent-eval-foundry/phase-16-reader-preflight-observations@1") {
    throw new Error("Phase 16 reader-preflight schema is unsupported");
  }
  const providers = new Map(value.providers.map((row) => [row.providerFamily, row]));
  if (providers.size !== 2 || !providers.has("openai") || !providers.has("anthropic")) {
    throw new Error("Phase 16 reader preflight must inspect both provider families");
  }
  return value;
}

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const fingerprint = (contract: CandidateContract): string =>
  phase16Sha256(
    `${normalize(contract.novelty.causalAxis)}|${normalize(contract.novelty.subjectActionContract)}`,
  );

const channelFor = (sources: readonly Phase16SourceRow[], sourceId: string): Channel => {
  const source = sources.find((row) => row.sourceUnitId === sourceId);
  if (source === undefined) throw new Error(`${sourceId}: missing source channel`);
  return source.channel;
};

const scoreCandidate = (
  contract: CandidateContract,
  source: Phase16SourceRow,
  gate: ContractGateResult,
): Phase16CandidateEvaluation["scoreBreakdown"] => ({
  observedIncidentSupport:
    source.sourceSupport === "first-party-observed-incident"
      ? 40
      : source.sourceSupport === "countable-local-trial"
        ? 30
        : 15,
  contractGate: gate.status === "accepted" ? 20 : 0,
  structuralBoundary:
    contract.authorityBoundary.subjectCanCross === false &&
    contract.witnessInaccessibility.locallyObservable === false
      ? 20
      : 0,
  derivationStrength:
    contract.derivation.classification === "A3"
      ? 5
      : contract.derivation.classification === "A2" || contract.derivation.classification === "fragile-A2"
        ? 10
        : 0,
  unresolvedRiskPenalty: -Math.min(10, contract.derivation.unresolvedValidityRisks.length * 5),
  measuredOperatorUplift: 0,
});

const buildCandidates = (
  root: string,
  sources: readonly Phase16SourceRow[],
  registration: Phase16Preregistration,
): readonly Phase16CandidateEvaluation[] => {
  const contracts = phase16CandidateContracts(root);
  const attemptedIds = new Set(
    sources.filter((row) => row.extraction.contractAttempted).map((row) => row.sourceUnitId),
  );
  if (contracts.length !== registration.caps.contractCompletionAttempts) {
    throw new Error("Phase 16 generated contract count differs from the registered cap");
  }
  const seen = new Map<string, string>();
  const unsorted = contracts.map((contract) => {
    if (!attemptedIds.has(contract.sourceIncidentId)) {
      throw new Error(`${contract.candidateId}: contract source was not selected under the cap`);
    }
    const source = sources.find((row) => row.sourceUnitId === contract.sourceIncidentId);
    if (source === undefined) throw new Error(`${contract.candidateId}: source is absent`);
    if (
      contract.role !== "prospective" ||
      contract.source.digest !== source.digest ||
      contract.source.locator !== source.locator ||
      contract.source.revision !== source.revision
    ) {
      throw new Error(`${contract.candidateId}: contract is not bound to its prospective source record`);
    }
    const gate = auditCandidateContract(contract);
    const semanticFingerprint = fingerprint(contract);
    const semanticDuplicateOf = seen.get(semanticFingerprint) ?? null;
    if (semanticDuplicateOf === null) seen.set(semanticFingerprint, contract.candidateId);
    const scoreBreakdown = scoreCandidate(contract, source, gate);
    const score = Object.values(scoreBreakdown).reduce((total, value) => total + value, 0);
    return {
      candidateId: contract.candidateId,
      sourceIncidentId: contract.sourceIncidentId,
      channel: channelFor(sources, contract.sourceIncidentId),
      contractSha256: phase16Sha256(contract),
      gate,
      semanticFingerprint,
      semanticDuplicateOf,
      semanticNovelty: semanticDuplicateOf === null,
      domainBreadthUnit: source.extraction.candidateSubstrate ?? contract.sourceIncidentId,
      causalAxis: contract.novelty.causalAxis,
      subjectActionContract: contract.novelty.subjectActionContract,
      score,
      scoreBreakdown,
      operatorEvidence: "no-measured-positive-agent-effect" as const,
      queueStatus: "contract-rejected" as Phase16CandidateEvaluation["queueStatus"],
      queueReason: "Awaiting deterministic queue assignment.",
    };
  });
  const rankedUnique = unsorted
    .filter((row) => row.gate.status === "accepted" && row.semanticNovelty)
    .sort((a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId));
  const admittedIds = new Set(
    rankedUnique.slice(0, registration.caps.semanticUniqueCandidates).map((row) => row.candidateId),
  );
  const packetIds = new Set(
    rankedUnique
      .filter((row) => admittedIds.has(row.candidateId))
      .slice(0, registration.caps.readerPackets)
      .map((row) => row.candidateId),
  );
  return unsorted.map((candidate): Phase16CandidateEvaluation => {
    if (candidate.gate.status !== "accepted") {
      return {
        ...candidate,
        queueStatus: "contract-rejected",
        queueReason: "The frozen candidate-contract gate returned one or more deficiencies.",
      };
    }
    if (!candidate.semanticNovelty) {
      return {
        ...candidate,
        queueStatus: "semantic-duplicate",
        queueReason: `Same normalized causal axis and action contract as ${candidate.semanticDuplicateOf}.`,
      };
    }
    if (!admittedIds.has(candidate.candidateId)) {
      return {
        ...candidate,
        queueStatus: "below-semantic-unique-cap",
        queueReason:
          "Contract complete and semantically unique, but ranked below the frozen four-unique admission cap; no replacement or review is permitted in this run.",
      };
    }
    if (packetIds.has(candidate.candidateId)) {
      return {
        ...candidate,
        queueStatus: "reader-packet",
        queueReason:
          "Contract complete and within the frozen packet cap after source-support ranking; independent cross-provider review required.",
      };
    }
    throw new Error(`${candidate.candidateId}: admitted candidate was not assigned a reader packet`);
  });
};

const readerPacket = (
  contract: CandidateContract,
  candidate: Phase16CandidateEvaluation,
  registration: Phase16Preregistration,
  noveltyBaseline: Phase16ReaderPacket["noveltyBaseline"],
): Phase16ReaderPacket => {
  const base = {
    schema: "agent-eval-foundry/phase-16-reader-packet@1" as const,
    candidateId: contract.candidateId,
    blindedTo: registration.readerProtocol.blindedTo,
    reviewQuestion:
      "Does this source-supported, contract-complete proposal pass every dimension as written and merit its falsifiable cheap probe? Kill on the earliest failed or uncertain dimension.",
    requiredDimensions: [
      "source support",
      "contract fairness",
      "natural task contract",
      "structural witness isolation",
      "semantic novelty",
      "cheap-probe falsifiability",
    ],
    source: { ...contract.source, channel: candidate.channel },
    publicTaskContract: {
      publicContract: contract.publicContract,
      grading: contract.grading,
      hiddenInstanceEnvelope: contract.hiddenInstanceEnvelope,
      subjectInterface: contract.subjectInterface,
      authorityBoundary: contract.authorityBoundary,
      witnessInaccessibility: contract.witnessInaccessibility,
    },
    noveltyBaseline,
    cheapProbeDefinition: contract.validation.cheapProbe,
  };
  return { ...base, packetSha256: phase16Sha256(base) };
};

export function runPhase16Discovery(root: string): Phase16DiscoveryRun {
  const registration = loadPhase16Preregistration(root);
  const sources = loadPhase16Sources(root);
  const preflight = loadPhase16Preflight(root);
  const contracts = phase16CandidateContracts(root);
  const candidates = buildCandidates(root, sources, registration);
  const contractById = new Map(contracts.map((contract) => [contract.candidateId, contract]));
  const noveltyBaseline = frozenNoveltyBaseline(root);
  const packets = candidates
    .filter((candidate) => candidate.queueStatus === "reader-packet")
    .map((candidate) => {
      const contract = contractById.get(candidate.candidateId);
      if (contract === undefined) throw new Error(`${candidate.candidateId}: missing contract`);
      return readerPacket(contract, candidate, registration, noveltyBaseline);
    });
  const providers = new Map(preflight.providers.map((row) => [row.providerFamily, row]));
  const crossProviderReady =
    providers.get("openai")?.authenticated === true && providers.get("anthropic")?.authenticated === true;
  if (crossProviderReady) {
    throw new Error(
      "Phase 16 preflight now says both providers are ready, but no frozen cross-provider review ledger exists; run the prepared review workflow before regenerating outcomes.",
    );
  }
  const readerDecisions = packets.map((packet) => ({
    candidateId: packet.candidateId,
    status: "blocked" as const,
    reason:
      "Anthropic authentication was unavailable at preflight; the registered 2-of-2 different-provider threshold cannot be evaluated.",
    reviewsPresent: 0 as const,
    reviewsRequired: 2 as const,
  }));
  const probes = packets.map((packet) => ({
    candidateId: packet.candidateId,
    status: "not-run-reader-blocked" as const,
    reason:
      "The candidate has no cross-provider 2-of-2 reader survival, so the preregistered probe gate is closed.",
    b6Invocation: null,
  }));
  const contractComplete = candidates.filter((row) => row.gate.status === "accepted").length;
  const semanticUniquesFound = candidates.filter(
    (row) => row.gate.status === "accepted" && row.semanticNovelty,
  ).length;
  const semanticUniquesAdmitted = candidates.filter((row) => row.queueStatus === "reader-packet").length;
  if (semanticUniquesAdmitted > registration.caps.semanticUniqueCandidates) {
    throw new Error("Phase 16 semantic-unique admission cap was exceeded");
  }
  return {
    schema: "agent-eval-foundry/phase-16-discovery-run@1",
    runId: registration.runId,
    preregistrationSha256: PHASE16_PREREGISTRATION_SHA256,
    calibrationSha256: PHASE16_CALIBRATION_SHA256,
    sourceLedgerSha256: PHASE16_SOURCE_LEDGER_SHA256,
    preflightSha256: PHASE16_PREFLIGHT_SHA256,
    sourceCorpusSha256: phase16Sha256(registration.sourceCorpus),
    packetSetSha256: phase16Sha256(packets),
    rawReviewSetSha256: phase16Sha256([]),
    normalizedReviewSetSha256: phase16Sha256(readerDecisions),
    sources,
    contracts,
    candidates,
    packets,
    reviews: [],
    readerDecisions,
    probes,
    summary: {
      sourceUnits: sources.length,
      canonicalExtractions: sources.length,
      validityOnlyDeaths: sources.filter((row) => row.extraction.status === "validity-control-only").length,
      belowContractCap: sources.filter((row) => row.extraction.status === "below-contract-cap").length,
      contractAttempts: contracts.length,
      contractComplete,
      semanticUniquesFound,
      semanticUniquesAdmitted,
      readerPackets: packets.length,
      readerReviews: 0,
      readerSurvivors: null,
      probeSurvivors: null,
      prospectiveYield: null,
      promotionBlocked: true,
      decision: "BLOCKED",
    },
    conclusion:
      "Discovery V3 repaired the drafting layer and produced contract-complete prospective packets, but cross-provider review was unavailable. Reader and probe yield are unknown, not zero; BUILD, REPEAT-DISCOVERY, and REPAIR-ENGINE cannot yet be selected.",
  };
}

export const phase16SourceArtifact = (run: Phase16DiscoveryRun): unknown => ({
  schema: "agent-eval-foundry/phase-16-source-results@1",
  runId: run.runId,
  preregistrationSha256: run.preregistrationSha256,
  sourceLedgerSha256: run.sourceLedgerSha256,
  sources: run.sources,
});

export const phase16ContractsArtifact = (run: Phase16DiscoveryRun): unknown => ({
  schema: "agent-eval-foundry/phase-16-candidate-contracts@1",
  runId: run.runId,
  preregistrationSha256: run.preregistrationSha256,
  contracts: run.contracts,
});

export const phase16GateArtifact = (run: Phase16DiscoveryRun): unknown => ({
  schema: "agent-eval-foundry/phase-16-contract-gate-results@1",
  runId: run.runId,
  calibrationSha256: run.calibrationSha256,
  results: run.candidates.map((candidate) => ({
    candidateId: candidate.candidateId,
    contractSha256: candidate.contractSha256,
    gate: candidate.gate,
  })),
});

export const phase16TraceabilityArtifact = (run: Phase16DiscoveryRun): unknown => ({
  schema: "agent-eval-foundry/phase-16-traceability@1",
  runId: run.runId,
  candidates: run.contracts.map((contract) => ({
    candidateId: contract.candidateId,
    sourceIncidentId: contract.sourceIncidentId,
    sourceDigest: contract.source.digest,
    rules: contract.grading.rules.map((rule) => ({
      ruleId: rule.id,
      agentVisibleText: rule.agentVisibleText,
      publicSection: rule.publicSection,
      checks: contract.grading.checks
        .filter((check) => check.ruleIds.includes(rule.id))
        .map((check) => check.id),
    })),
    metrics: contract.grading.metrics.map((metric) => ({
      metricId: metric.id,
      comparator: metric.comparator,
      threshold: metric.threshold,
      formula: metric.derivation.formula,
      inputs: metric.derivation.inputs,
      checks: contract.grading.checks
        .filter((check) => check.metricIds.includes(metric.id))
        .map((check) => check.id),
    })),
    envelopeDimensions: contract.hiddenInstanceEnvelope.dimensions.map((dimension) => ({
      dimensionId: dimension.id,
      values: dimension.values,
      checks: contract.grading.checks
        .filter((check) => check.envelopeDimensionIds.includes(dimension.id))
        .map((check) => check.id),
    })),
  })),
});

export const phase16QueueArtifact = (run: Phase16DiscoveryRun): unknown => ({
  schema: "agent-eval-foundry/phase-16-candidate-queue@1",
  runId: run.runId,
  candidates: run.candidates,
  readerDecisions: run.readerDecisions,
  summary: run.summary,
});

export const phase16PacketsArtifact = (run: Phase16DiscoveryRun): unknown => ({
  schema: "agent-eval-foundry/phase-16-reader-packets@1",
  runId: run.runId,
  preregistrationSha256: run.preregistrationSha256,
  packetsSha256: run.packetSetSha256,
  packets: run.packets,
});

export const phase16ReviewsArtifact = (run: Phase16DiscoveryRun): unknown => ({
  schema: "agent-eval-foundry/phase-16-reader-reviews@1",
  runId: run.runId,
  packetSetSha256: run.packetSetSha256,
  rawReviewSetSha256: run.rawReviewSetSha256,
  normalizedReviewSetSha256: run.normalizedReviewSetSha256,
  reviews: run.reviews,
  decisions: run.readerDecisions,
  promotionBlocked: true,
  blocker:
    "Required Anthropic reader authentication was unavailable; same-provider substitution is forbidden.",
});

export const phase16ProbesArtifact = (run: Phase16DiscoveryRun): unknown => ({
  schema: "agent-eval-foundry/phase-16-probe-results@1",
  runId: run.runId,
  results: run.probes,
  executed: 0,
  reason: "No packet had a completed 2-of-2 cross-provider reader decision.",
});

export const phase16ComparisonArtifact = (root: string, run: Phase16DiscoveryRun): unknown => {
  const phase15 = parseJson<{ readonly methods: readonly unknown[] }>(
    root,
    "data/phase-15-method-comparison.json",
  );
  return {
    schema: "agent-eval-foundry/phase-16-method-comparison@1",
    runId: run.runId,
    phase15MethodsUnchanged: phase15.methods,
    discoveryV3: {
      method: "contract-complete-evidence-mining-v3",
      systemsRead: run.summary.sourceUnits,
      candidatesDrafted: run.summary.contractAttempts,
      contractComplete: run.summary.contractComplete,
      semanticUniquesFound: run.summary.semanticUniquesFound,
      semanticUniquesAdmitted: run.summary.semanticUniquesAdmitted,
      readerPackets: run.summary.readerPackets,
      readerReviewed: 0,
      readerSurvivors: null,
      probeRun: 0,
      probeSurvivors: null,
      domainBreadth: new Set(run.candidates.map((row) => row.domainBreadthUnit)).size,
      failureAxisBreadth: new Set(run.candidates.map((row) => row.causalAxis)).size,
      modelReads: 0,
      pricedUsd: 0,
      claimBoundary:
        "Drafting yield is measured; reader and probe yield remain unknown because the required second provider was unavailable.",
    },
  };
};

export const phase16InputHashesArtifact = (root: string, run: Phase16DiscoveryRun): unknown => ({
  schema: "agent-eval-foundry/phase-16-input-hashes@1",
  runId: run.runId,
  inputs: {
    preregistration: PHASE16_PREREGISTRATION_SHA256,
    sourceCorpus: run.sourceCorpusSha256,
    calibration: PHASE16_CALIBRATION_SHA256,
    sourceLedger: PHASE16_SOURCE_LEDGER_SHA256,
    preflight: PHASE16_PREFLIGHT_SHA256,
    readerOutputSchema: PHASE16_READER_SCHEMA_SHA256,
    contractGateSource: fileSha256(root, "src/phase-16/contract-gate.ts"),
    contractSchema: fileSha256(root, "data/phase-16-candidate-contract.schema.json"),
    contractSet: phase16Sha256(run.contracts),
    packetSet: run.packetSetSha256,
    rawReviewSet: run.rawReviewSetSha256,
    normalizedReviewSet: run.normalizedReviewSetSha256,
    snapshots: Object.fromEntries(
      run.sources
        .filter((source) => source.snapshotPath !== undefined)
        .map((source) => [source.sourceUnitId, source.digest]),
    ),
  },
});

export const phase16CorrectionsArtifact = (run: Phase16DiscoveryRun): unknown => ({
  schema: "agent-eval-foundry/phase-16-corrections@1",
  runId: run.runId,
  corrections: [
    "Two preregistered local benchmark solves were complete-solution starter leaks, so they contribute validity-control patterns rather than evidence that either mechanism was easy.",
    "The deployment-alias failure was caused by an unpublished numeric threshold present only in a passing starter; it is not a capability failure and now calibrates the threshold-derivation gate.",
    "The memory-poisoning failure was caused by the host violating its published same-facade lifetime contract; it is not a candidate source for difficulty.",
    "The initial run could not score reader or probe predictions because Anthropic authentication was unavailable. Its base artifacts preserve null rather than zero; the separately preregistered continuation owns the later measured outcomes.",
    "All six attempted contracts passed the machine completeness gate. This validates drafting structure only; it does not establish fairness, naturalness, novelty, probe survival, or agent difficulty without independent review.",
    "Six unique drafts were found, but only the top four were admitted under the preregistered semantic-unique and reader-packet caps; the other two remain measured below-cap outcomes.",
    "Boundary-first protocol sources without observed incidents receive no incident-support credit and no measured operator uplift. Phase 14 measured no positive agent effect.",
  ],
});

export const phase16PreflightArtifact = (root: string): unknown => {
  const preflight = loadPhase16Preflight(root);
  return {
    ...preflight,
    preflightSha256: PHASE16_PREFLIGHT_SHA256,
    crossProviderReady: preflight.providers.every((provider) => provider.authenticated),
  };
};
