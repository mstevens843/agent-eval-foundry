import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import {
  type AdapterAudit,
  DISCOVERY_CHANNELS,
  type DiscoveryChannel,
  type Phase15Preregistration,
  type Phase15ReaderReview,
  type Phase15ReaderReviewLedger,
  type Phase15SourceCorpus,
  type ReaderDimensionVerdict,
  SOURCE_ADAPTERS,
  SOURCE_ROLES,
  type SourceAdapterId,
  type SourceCorpusRow,
  type SourceRole,
} from "./types.js";

export const PHASE15_PREREGISTRATION_SHA256 =
  "dd2a3f95c9933ab32aafc35aa10700e834d956d64f57f6c35f565488f226de18";
export const PHASE15_SOURCE_CORPUS_SHA256 =
  "c69a96d399e5e1dc0852168039e2225b034975b08e6368e65f7eded65b32f1eb";
export const PHASE15_READER_REVIEWS_SHA256 =
  "79365fdde531602a5a148884ee77c407a220bde4443cbbfd0fb73bf40e948c19";

const sha256 = (bytes: string | Buffer): string => createHash("sha256").update(bytes).digest("hex");

const record = (value: unknown, path: string): Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path}: expected object`);
  }
  return value as Record<string, unknown>;
};

const text = (value: unknown, path: string): string => {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${path}: expected non-empty string`);
  return value;
};

const bool = (value: unknown, path: string): boolean => {
  if (typeof value !== "boolean") throw new Error(`${path}: expected boolean`);
  return value;
};

const finite = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`${path}: expected finite number`);
  return value;
};

const nonnegativeInteger = (value: unknown, path: string): number => {
  const parsed = finite(value, path);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${path}: expected non-negative integer`);
  return parsed;
};

const array = (value: unknown, path: string): readonly unknown[] => {
  if (!Array.isArray(value)) throw new Error(`${path}: expected array`);
  return value;
};

const textArray = (value: unknown, path: string, allowEmpty = false): readonly string[] => {
  const items = array(value, path).map((item, index) => text(item, `${path}[${index}]`));
  if (!allowEmpty && items.length === 0) throw new Error(`${path}: expected non-empty array`);
  return items;
};

const enumValue = <T extends string>(value: unknown, path: string, values: readonly T[]): T => {
  const parsed = text(value, path);
  if (!values.includes(parsed as T)) throw new Error(`${path}: unsupported value ${parsed}`);
  return parsed as T;
};

const nullableText = (value: unknown, path: string): string | null =>
  value === null ? null : text(value, path);

const parseJson = (bytes: string, path: string): unknown => {
  try {
    return JSON.parse(bytes) as unknown;
  } catch (error) {
    throw new Error(`${path}: invalid JSON: ${(error as Error).message}`);
  }
};

const unique = (values: readonly string[], path: string): void => {
  if (new Set(values).size !== values.length) throw new Error(`${path}: duplicate values`);
};

export function loadPhase15Preregistration(root: string): Phase15Preregistration {
  const path = join(root, "data", "phase-15-preregistration.json");
  const bytes = readFileSync(path);
  const digest = sha256(bytes);
  if (digest !== PHASE15_PREREGISTRATION_SHA256) {
    throw new Error(
      `${path}: preregistration changed after registration; expected ${PHASE15_PREREGISTRATION_SHA256}, got ${digest}`,
    );
  }
  const top = record(parseJson(bytes.toString("utf8"), path), path);
  if (top.schema !== "agent-eval-foundry/phase-15-discovery-preregistration@1") {
    throw new Error(`${path}.schema: unsupported schema`);
  }
  const immutability = record(top.immutability, `${path}.immutability`);
  const sourceCorpus = array(top.sourceCorpus, `${path}.sourceCorpus`).map((item, index) => {
    const rowPath = `${path}.sourceCorpus[${index}]`;
    const row = record(item, rowPath);
    return {
      sourceUnitId: text(row.sourceUnitId, `${rowPath}.sourceUnitId`),
      role: enumValue(row.role, `${rowPath}.role`, SOURCE_ROLES),
      channel: enumValue(row.channel, `${rowPath}.channel`, DISCOVERY_CHANNELS),
      locator: text(row.locator, `${rowPath}.locator`),
      extractionLimit: nonnegativeInteger(row.extractionLimit, `${rowPath}.extractionLimit`),
    };
  });
  unique(
    sourceCorpus.map((row) => row.sourceUnitId),
    `${path}.sourceCorpus.sourceUnitId`,
  );
  const channelsImplemented = array(top.channelsImplemented, `${path}.channelsImplemented`).map(
    (item, index) => enumValue(item, `${path}.channelsImplemented[${index}]`, DISCOVERY_CHANNELS),
  );
  unique(channelsImplemented, `${path}.channelsImplemented`);
  const limits = record(top.limits, `${path}.limits`);
  const predictions = record(top.predictions, `${path}.predictions`);
  const readerProtocol = record(top.readerProtocol, `${path}.readerProtocol`);
  const novelty = record(top.noveltyStandard, `${path}.noveltyStandard`);
  const ranking = record(top.rankingPolicy, `${path}.rankingPolicy`);
  const rankingPolicy: Record<string, string> = {};
  for (const [key, value] of Object.entries(ranking))
    rankingPolicy[key] = text(value, `${path}.rankingPolicy.${key}`);
  const parsed: Phase15Preregistration = {
    schema: "agent-eval-foundry/phase-15-discovery-preregistration@1",
    baselineCommit: text(top.baselineCommit, `${path}.baselineCommit`),
    immutability: { runId: text(immutability.runId, `${path}.immutability.runId`) },
    channelsImplemented,
    sourceCorpus,
    limits: {
      sourceUnits: nonnegativeInteger(limits.sourceUnits, `${path}.limits.sourceUnits`),
      prospectiveSourceUnits: nonnegativeInteger(
        limits.prospectiveSourceUnits,
        `${path}.limits.prospectiveSourceUnits`,
      ),
      patternsPerSourceUnit: nonnegativeInteger(
        limits.patternsPerSourceUnit,
        `${path}.limits.patternsPerSourceUnit`,
      ),
      prospectiveCandidateDrafts: nonnegativeInteger(
        limits.prospectiveCandidateDrafts,
        `${path}.limits.prospectiveCandidateDrafts`,
      ),
      readerReviews: nonnegativeInteger(limits.readerReviews, `${path}.limits.readerReviews`),
      readerReviewsPerCandidate: nonnegativeInteger(
        limits.readerReviewsPerCandidate,
        `${path}.limits.readerReviewsPerCandidate`,
      ),
      cheapProbes: nonnegativeInteger(limits.cheapProbes, `${path}.limits.cheapProbes`),
      modelReadBudgetUsd: finite(limits.modelReadBudgetUsd, `${path}.limits.modelReadBudgetUsd`),
      paidSubjectTrials: nonnegativeInteger(limits.paidSubjectTrials, `${path}.limits.paidSubjectTrials`),
      engineerHours: finite(limits.engineerHours, `${path}.limits.engineerHours`),
    },
    predictions: {
      patternsExtractedFromProspectiveSources: nonnegativeInteger(
        predictions.patternsExtractedFromProspectiveSources,
        `${path}.predictions.patternsExtractedFromProspectiveSources`,
      ),
      candidateDrafts: nonnegativeInteger(predictions.candidateDrafts, `${path}.predictions.candidateDrafts`),
      unanimousReaderSurvivors: nonnegativeInteger(
        predictions.unanimousReaderSurvivors,
        `${path}.predictions.unanimousReaderSurvivors`,
      ),
      probeSurvivors: nonnegativeInteger(predictions.probeSurvivors, `${path}.predictions.probeSurvivors`),
      note: text(predictions.note, `${path}.predictions.note`),
    },
    readerProtocol: {
      threshold: text(readerProtocol.threshold, `${path}.readerProtocol.threshold`),
      blindedTo: textArray(readerProtocol.blindedTo, `${path}.readerProtocol.blindedTo`),
      requiredPassDimensions: textArray(
        readerProtocol.requiredPassDimensions,
        `${path}.readerProtocol.requiredPassDimensions`,
      ),
      use: text(readerProtocol.use, `${path}.readerProtocol.use`),
    },
    noveltyStandard: {
      required: text(novelty.required, `${path}.noveltyStandard.required`),
      breadth: text(novelty.breadth, `${path}.noveltyStandard.breadth`),
      deduplication: text(novelty.deduplication, `${path}.noveltyStandard.deduplication`),
    },
    promotionCriteria: textArray(top.promotionCriteria, `${path}.promotionCriteria`),
    rankingPolicy,
    stoppingRules: textArray(top.stoppingRules, `${path}.stoppingRules`),
  };
  if (parsed.sourceCorpus.length !== parsed.limits.sourceUnits) {
    throw new Error(`${path}: source corpus length does not match registered sourceUnits`);
  }
  if (parsed.limits.paidSubjectTrials !== 0) throw new Error(`${path}: Phase 15 forbids paid subject trials`);
  if (parsed.limits.patternsPerSourceUnit !== 1) {
    throw new Error(`${path}: this run requires one canonical pattern per source incident`);
  }
  if (
    parsed.channelsImplemented.length !== DISCOVERY_CHANNELS.length ||
    DISCOVERY_CHANNELS.some((channel) => !parsed.channelsImplemented.includes(channel))
  ) {
    throw new Error(
      `${path}: channelsImplemented must declare every Discovery V2 source channel exactly once`,
    );
  }
  return parsed;
}

const parseSource = (value: unknown, path: string): SourceCorpusRow => {
  const row = record(value, path);
  const provenance = record(row.provenance, `${path}.provenance`);
  const evidence = record(row.evidence, `${path}.evidence`);
  const extraction = record(row.extraction, `${path}.extraction`);
  const boundary = record(extraction.authorityBoundary, `${path}.extraction.authorityBoundary`);
  const eligibility = record(extraction.eligibility, `${path}.extraction.eligibility`);
  const existingFamilyEquivalence =
    extraction.existingFamilyEquivalence === null || extraction.existingFamilyEquivalence === undefined
      ? null
      : (() => {
          const item = record(
            extraction.existingFamilyEquivalence,
            `${path}.extraction.existingFamilyEquivalence`,
          );
          return {
            familyId: text(item.familyId, `${path}.extraction.existingFamilyEquivalence.familyId`),
            sameFailureAxis: bool(
              item.sameFailureAxis,
              `${path}.extraction.existingFamilyEquivalence.sameFailureAxis`,
            ),
            sameSubjectActionContract: bool(
              item.sameSubjectActionContract,
              `${path}.extraction.existingFamilyEquivalence.sameSubjectActionContract`,
            ),
            reason: text(item.reason, `${path}.extraction.existingFamilyEquivalence.reason`),
          };
        })();
  const measurements = array(evidence.measurements, `${path}.evidence.measurements`).map((item, index) => {
    const measurementPath = `${path}.evidence.measurements[${index}]`;
    const measurement = record(item, measurementPath);
    return {
      name: text(measurement.name, `${measurementPath}.name`),
      value: finite(measurement.value, `${measurementPath}.value`),
      denominator:
        measurement.denominator === null
          ? null
          : finite(measurement.denominator, `${measurementPath}.denominator`),
    };
  });
  const probe =
    extraction.cheapProbe === null
      ? null
      : (() => {
          const item = record(extraction.cheapProbe, `${path}.extraction.cheapProbe`);
          return {
            probeType: text(item.probeType, `${path}.extraction.cheapProbe.probeType`),
            falsifier: text(item.falsifier, `${path}.extraction.cheapProbe.falsifier`),
            witnessIsolation: text(item.witnessIsolation, `${path}.extraction.cheapProbe.witnessIsolation`),
          };
        })();
  return {
    sourceUnitId: text(row.sourceUnitId, `${path}.sourceUnitId`),
    role: enumValue(row.role, `${path}.role`, SOURCE_ROLES),
    channel: enumValue(row.channel, `${path}.channel`, DISCOVERY_CHANNELS),
    adapter: enumValue(row.adapter, `${path}.adapter`, SOURCE_ADAPTERS),
    provenance: {
      locator: text(provenance.locator, `${path}.provenance.locator`),
      revision: text(provenance.revision, `${path}.provenance.revision`),
      contentDigest: text(provenance.contentDigest, `${path}.provenance.contentDigest`),
      digestAlgorithm: enumValue(provenance.digestAlgorithm, `${path}.provenance.digestAlgorithm`, [
        "sha256",
        "git-blob-sha1",
        "snapshot-evidence-sha256",
      ] as const),
      snapshotPath: nullableText(provenance.snapshotPath ?? null, `${path}.provenance.snapshotPath`),
      primary: bool(provenance.primary, `${path}.provenance.primary`),
    },
    evidence: {
      class: text(evidence.class, `${path}.evidence.class`),
      countable: bool(evidence.countable, `${path}.evidence.countable`),
      countabilityReason: text(evidence.countabilityReason, `${path}.evidence.countabilityReason`),
      observedFailure: text(evidence.observedFailure, `${path}.evidence.observedFailure`),
      measurements,
      locations: textArray(evidence.locations, `${path}.evidence.locations`),
    },
    extraction: {
      affectedLayer: text(extraction.affectedLayer, `${path}.extraction.affectedLayer`),
      failureAxis: text(extraction.failureAxis, `${path}.extraction.failureAxis`),
      transferableMechanism: text(
        extraction.transferableMechanism,
        `${path}.extraction.transferableMechanism`,
      ),
      candidateSubstrate: nullableText(
        extraction.candidateSubstrate,
        `${path}.extraction.candidateSubstrate`,
      ),
      subjectActionContract: text(
        extraction.subjectActionContract,
        `${path}.extraction.subjectActionContract`,
      ),
      existingFamilyEquivalence,
      authorityBoundary: {
        kind: text(boundary.kind, `${path}.extraction.authorityBoundary.kind`),
        enforcement: text(boundary.enforcement, `${path}.extraction.authorityBoundary.enforcement`),
        subjectCanCross: bool(
          boundary.subjectCanCross,
          `${path}.extraction.authorityBoundary.subjectCanCross`,
        ),
      },
      applicableOperators: textArray(
        extraction.applicableOperators,
        `${path}.extraction.applicableOperators`,
      ),
      validityRisks: textArray(extraction.validityRisks, `${path}.extraction.validityRisks`),
      cheapProbe: probe,
      eligibility: {
        eligible: bool(eligibility.eligible, `${path}.extraction.eligibility.eligible`),
        reason: text(eligibility.reason, `${path}.extraction.eligibility.reason`),
      },
    },
  };
};

export function loadPhase15SourceCorpus(
  root: string,
  preregistration = loadPhase15Preregistration(root),
): Phase15SourceCorpus {
  const path = join(root, "data", "phase-15-source-corpus.json");
  const bytes = readFileSync(path);
  const digest = sha256(bytes);
  if (digest !== PHASE15_SOURCE_CORPUS_SHA256) {
    throw new Error(
      `${path}: acquired corpus changed after extraction; expected ${PHASE15_SOURCE_CORPUS_SHA256}, got ${digest}`,
    );
  }
  const top = record(parseJson(bytes.toString("utf8"), path), path);
  if (top.schema !== "agent-eval-foundry/phase-15-source-corpus@1") {
    throw new Error(`${path}.schema: unsupported schema`);
  }
  const sources = array(top.sources, `${path}.sources`).map((item, index) =>
    parseSource(item, `${path}.sources[${index}]`),
  );
  unique(
    sources.map((source) => source.sourceUnitId),
    `${path}.sources.sourceUnitId`,
  );
  const parsed: Phase15SourceCorpus = {
    schema: "agent-eval-foundry/phase-15-source-corpus@1",
    runId: text(top.runId, `${path}.runId`),
    preregistrationSha256: text(top.preregistrationSha256, `${path}.preregistrationSha256`),
    acquiredAt: nullableText(top.acquiredAt, `${path}.acquiredAt`),
    sources,
  };
  if (parsed.runId !== preregistration.immutability.runId)
    throw new Error(`${path}: runId was not registered`);
  if (parsed.preregistrationSha256 !== PHASE15_PREREGISTRATION_SHA256) {
    throw new Error(`${path}: source corpus does not pin the immutable preregistration`);
  }
  if (parsed.sources.length !== preregistration.sourceCorpus.length) {
    throw new Error(`${path}: source count differs from preregistration`);
  }
  parsed.sources.forEach((source, index) => {
    const registered = preregistration.sourceCorpus[index];
    if (
      registered === undefined ||
      source.sourceUnitId !== registered.sourceUnitId ||
      source.role !== registered.role ||
      source.channel !== registered.channel
    ) {
      throw new Error(`${path}.sources[${index}]: source identity/order differs from preregistration`);
    }
  });
  const prospective = parsed.sources.filter((source) => source.role === "prospective").length;
  if (prospective !== preregistration.limits.prospectiveSourceUnits) {
    throw new Error(`${path}: prospective source count differs from preregistration`);
  }
  return parsed;
}

export interface EvidenceSourceAdapter {
  readonly id: SourceAdapterId;
  audit(root: string, source: SourceCorpusRow): AdapterAudit;
}

const digestPattern = (algorithm: SourceCorpusRow["provenance"]["digestAlgorithm"]): RegExp =>
  algorithm === "git-blob-sha1" ? /^[a-f0-9]{40}$/ : /^[a-f0-9]{64}$/;

const snapshotAudit = (source: SourceCorpusRow): AdapterAudit => ({
  adapter: source.adapter,
  valid:
    source.provenance.primary &&
    digestPattern(source.provenance.digestAlgorithm).test(source.provenance.contentDigest),
  checks: [
    "primary-source flag present",
    `${source.provenance.digestAlgorithm} content address recorded`,
    "source facts preserved in the checked-in corpus rather than fetched during report generation",
  ],
  sourceFamilyId: null,
});

const localDocumentAdapter: EvidenceSourceAdapter = {
  id: "local-document-snapshot",
  audit(root, source) {
    const base = snapshotAudit(source);
    const locator = source.provenance.locator.split("#", 1)[0] ?? source.provenance.locator;
    const path = isAbsolute(locator) ? locator : join(root, locator);
    const exists = existsSync(path);
    const digestMatches = exists && sha256(readFileSync(path)) === source.provenance.contentDigest;
    return {
      ...base,
      valid: base.valid && source.provenance.digestAlgorithm === "sha256" && digestMatches,
      checks: [
        ...base.checks,
        exists ? "local source exists" : "local source missing",
        digestMatches ? "local source digest current" : "local source digest stale",
      ],
    };
  },
};

const trialDirectoryAdapter: EvidenceSourceAdapter = {
  id: "trial-directory-snapshot",
  audit(root, source) {
    const base = isAbsolute(source.provenance.locator)
      ? source.provenance.locator
      : join(root, source.provenance.locator);
    const resultPath = join(base, "result.json");
    const countabilityPath = join(base, "countability.json");
    if (!existsSync(resultPath) || !existsSync(countabilityPath)) {
      return {
        adapter: source.adapter,
        valid: false,
        checks: ["trial result/countability artifacts missing"],
        sourceFamilyId: null,
      };
    }
    const resultBytes = readFileSync(resultPath);
    const result = record(parseJson(resultBytes.toString("utf8"), resultPath), resultPath);
    const countability = record(
      parseJson(readFileSync(countabilityPath, "utf8"), countabilityPath),
      countabilityPath,
    );
    const digestMatches = sha256(resultBytes) === source.provenance.contentDigest;
    const counts = result.counts === true && countability.counts === true;
    return {
      adapter: source.adapter,
      valid: digestMatches && counts,
      checks: [
        digestMatches ? "result digest current" : "result digest stale",
        counts ? "result and countability artifacts agree that the trial counts" : "trial does not count",
        "trial artifacts are read through the adapter; ranking logic is source-agnostic",
      ],
      sourceFamilyId: typeof result.familyId === "string" ? result.familyId : null,
    };
  },
};

const pinnedTaskAdapter: EvidenceSourceAdapter = {
  id: "pinned-upstream-task-snapshot",
  audit(_root, source) {
    const base = snapshotAudit(source);
    const pinned = /\/tree\/[a-f0-9]{40}\//.test(source.provenance.locator);
    return {
      ...base,
      valid: base.valid && pinned && source.provenance.digestAlgorithm === "git-blob-sha1",
      checks: [...base.checks, pinned ? "upstream URL pins an immutable commit" : "upstream URL is mutable"],
    };
  },
};

const incidentAdapter: EvidenceSourceAdapter = {
  id: "authoritative-incident-snapshot",
  audit(root, source) {
    const base = snapshotAudit(source);
    const official = source.provenance.locator.startsWith("https://blog.cloudflare.com/");
    const snapshotPath = source.provenance.snapshotPath;
    const snapshotExists = snapshotPath !== null && existsSync(join(root, snapshotPath));
    const digestMatches =
      snapshotExists && sha256(readFileSync(join(root, snapshotPath))) === source.provenance.contentDigest;
    return {
      ...base,
      valid:
        base.valid &&
        official &&
        source.provenance.digestAlgorithm === "snapshot-evidence-sha256" &&
        digestMatches,
      checks: [
        ...base.checks,
        official ? "first-party incident host" : "incident source is not first-party",
        snapshotExists ? "checked-in evidence snapshot exists" : "checked-in evidence snapshot missing",
        digestMatches ? "evidence snapshot digest current" : "evidence snapshot digest stale",
      ],
    };
  },
};

export const PHASE15_SOURCE_ADAPTERS: Readonly<Record<SourceAdapterId, EvidenceSourceAdapter>> = {
  "local-document-snapshot": localDocumentAdapter,
  "trial-directory-snapshot": trialDirectoryAdapter,
  "pinned-upstream-task-snapshot": pinnedTaskAdapter,
  "authoritative-incident-snapshot": incidentAdapter,
};

export const auditPhase15Source = (root: string, source: SourceCorpusRow): AdapterAudit =>
  PHASE15_SOURCE_ADAPTERS[source.adapter].audit(root, source);

const REVIEW_DIMENSION_VERDICTS = ["pass", "fail", "uncertain"] as const;

const parseReview = (value: unknown, path: string): Phase15ReaderReview => {
  const row = record(value, path);
  const dimensions = record(row.dimensions, `${path}.dimensions`);
  const parsedDimensions: Record<string, ReaderDimensionVerdict> = {};
  for (const [key, item] of Object.entries(dimensions)) {
    parsedDimensions[key] = enumValue(item, `${path}.dimensions.${key}`, REVIEW_DIMENSION_VERDICTS);
  }
  const costUsd = row.costUsd === null ? null : finite(row.costUsd, `${path}.costUsd`);
  return {
    reviewId: text(row.reviewId, `${path}.reviewId`),
    candidateId: text(row.candidateId, `${path}.candidateId`),
    readerId: text(row.readerId, `${path}.readerId`),
    sessionId: text(row.sessionId, `${path}.sessionId`),
    providerFamily: text(row.providerFamily, `${path}.providerFamily`),
    model: text(row.model, `${path}.model`),
    packetSha256: text(row.packetSha256, `${path}.packetSha256`),
    independentlyProduced: bool(row.independentlyProduced, `${path}.independentlyProduced`),
    blindedTo: textArray(row.blindedTo, `${path}.blindedTo`),
    dimensions: parsedDimensions,
    verdict: enumValue(row.verdict, `${path}.verdict`, ["promote", "kill"] as const),
    rationale: text(row.rationale, `${path}.rationale`),
    earliestFailedDimension:
      row.earliestFailedDimension === null
        ? null
        : text(row.earliestFailedDimension, `${path}.earliestFailedDimension`),
    costUsd,
    tokensUsed: nonnegativeInteger(row.tokensUsed, `${path}.tokensUsed`),
    rawOutputPath: text(row.rawOutputPath, `${path}.rawOutputPath`),
    rawOutputSha256: text(row.rawOutputSha256, `${path}.rawOutputSha256`),
  };
};

export function loadPhase15ReaderReviews(root: string): Phase15ReaderReviewLedger {
  const path = join(root, "data", "phase-15-reader-reviews.json");
  if (!existsSync(path)) {
    throw new Error(`${path}: finalized blind-review ledger is missing`);
  }
  const bytes = readFileSync(path);
  const digest = sha256(bytes);
  if (digest !== PHASE15_READER_REVIEWS_SHA256) {
    throw new Error(
      `${path}: completed blind-review ledger changed; expected ${PHASE15_READER_REVIEWS_SHA256}, got ${digest}`,
    );
  }
  const top = record(parseJson(bytes.toString("utf8"), path), path);
  if (top.schema !== "agent-eval-foundry/phase-15-reader-reviews@1") {
    throw new Error(`${path}.schema: unsupported schema`);
  }
  const reviews = array(top.reviews, `${path}.reviews`).map((item, index) =>
    parseReview(item, `${path}.reviews[${index}]`),
  );
  unique(
    reviews.map((review) => review.reviewId),
    `${path}.reviews.reviewId`,
  );
  return {
    schema: "agent-eval-foundry/phase-15-reader-reviews@1",
    runId: text(top.runId, `${path}.runId`),
    reviews,
  };
}

export const phase15Json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

export const phase15Sha256 = (value: unknown): string => sha256(JSON.stringify(value));

export type { DiscoveryChannel, SourceAdapterId, SourceRole };
