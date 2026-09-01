import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DEPLOYMENT_ALIAS_PROFILE } from "../challenge/package-check.js";
import { hashChallengeDir } from "../trials/run.js";
import { hiddenPath, readAllPaths } from "./packet.js";
import {
  EXTERNAL_INTAKE_STATUSES,
  EXTERNAL_PROVIDER_FAMILIES,
  EXTERNAL_RUN_RELATIONS,
  type ExternalIntakeFinding,
  type ExternalIntakeRuleCode,
  type ExternalIntakeStatus,
  type ExternalIntakeValidationResult,
  type ExternalProviderFamily,
  type ExternalReturnedPacket,
  type ExternalRunMetadata,
  type ExternalRunRelation,
} from "./types.js";

export interface ExternalIntakeContext {
  readonly familyId: string;
  readonly currentChallengeHash: string;
  readonly expectedScenarioSetId: string;
  readonly existingRunIds?: readonly string[];
}

const finding = (code: ExternalIntakeRuleCode, path: string, detail: string): ExternalIntakeFinding => ({
  code,
  path,
  detail,
});

const readJson = (path: string): Record<string, unknown> | null => {
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const readText = (path: string): string | null => {
  if (!existsSync(path)) return null;
  return statSync(path).isDirectory() ? null : readFileSync(path, "utf8");
};

const stringField = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const boolField = (record: Record<string, unknown>, key: string): boolean => record[key] === true;

const stringArrayField = (record: Record<string, unknown>, key: string): readonly string[] => {
  const value = record[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
};

const isPlaceholder = (value: string | null): boolean =>
  value === null || /^(REPLACE|EDITME|YYYY-MM-DD|TODO)/i.test(value.trim());

function normalizeStatus(value: string | null): ExternalIntakeStatus | null {
  if (value === null) return null;
  const normalized = value.toLowerCase().replace(/-/g, "_");
  if (normalized === "refused" || normalized === "provider_refused") return "provider_refusal";
  if (normalized === "infra_error" || normalized === "infrastructure_failure") return "infrastructure_error";
  if (normalized === "stale") return "stale_hash";
  return (EXTERNAL_INTAKE_STATUSES as readonly string[]).includes(normalized)
    ? (normalized as ExternalIntakeStatus)
    : null;
}

function normalizeProviderFamily(value: string | null): ExternalProviderFamily | null {
  if (value === null) return null;
  const normalized = value.toLowerCase().replace(/-/g, "_");
  return (EXTERNAL_PROVIDER_FAMILIES as readonly string[]).includes(normalized)
    ? (normalized as ExternalProviderFamily)
    : null;
}

function normalizeRelation(value: string | null): ExternalRunRelation {
  if (value === null) return "unknown";
  const normalized = value.toLowerCase().replace(/-/g, "_");
  return (EXTERNAL_RUN_RELATIONS as readonly string[]).includes(normalized)
    ? (normalized as ExternalRunRelation)
    : "unknown";
}

export function parseExternalRunMetadata(raw: Record<string, unknown> | null): ExternalRunMetadata | null {
  if (raw === null) return null;
  return {
    runId: stringField(raw, "runId"),
    familyId: stringField(raw, "familyId"),
    providerFamily: normalizeProviderFamily(stringField(raw, "providerFamily")),
    provider: stringField(raw, "provider"),
    model: stringField(raw, "model"),
    subjectId: stringField(raw, "subjectId"),
    runtime: stringField(raw, "runtime"),
    runDate: stringField(raw, "runDate") ?? stringField(raw, "date"),
    scenarioSetId: stringField(raw, "scenarioSetId"),
    challengeHash: stringField(raw, "challengeHash"),
    status: normalizeStatus(stringField(raw, "status")),
    countsRequested: boolField(raw, "countsRequested") || boolField(raw, "counts"),
    relationToAuthor: normalizeRelation(stringField(raw, "relationToAuthor")),
    privateHintsUsed: boolField(raw, "privateHintsUsed"),
    hiddenFilesSeen: stringArrayField(raw, "hiddenFilesSeen"),
    notes: stringField(raw, "notes") ?? "",
  };
}

function transcriptPath(dir: string): string | null {
  const txt = join(dir, "transcript.txt");
  const json = join(dir, "transcript.json");
  if (readText(txt)?.trim()) return txt;
  if (readText(json)?.trim()) return json;
  return null;
}

function verifierRunId(path: string): string | null {
  const parsed = readJson(path);
  return parsed === null ? null : stringField(parsed, "runId");
}

function inferProviderFamily(provider: string | null, model: string | null): ExternalProviderFamily | null {
  const text = `${provider ?? ""} ${model ?? ""}`.toLowerCase();
  if (/anthropic|claude/.test(text)) return "anthropic";
  if (/google|gemini/.test(text)) return "google";
  if (/openai|codex|gpt-/.test(text)) return "openai";
  if (/external/.test(text)) return "external";
  return null;
}

function leakedHiddenPaths(dir: string): readonly string[] {
  if (!existsSync(dir)) return [];
  const paths = readAllPaths(dir);
  const byPath = new Set(paths.filter((path) => hiddenPath(path)));
  for (const path of paths) {
    const full = join(dir, path);
    if (statSync(full).isDirectory()) continue;
    const content = readFileSync(full, "utf8");
    for (const [needle] of DEPLOYMENT_ALIAS_PROFILE.forbiddenContent) {
      if (content.includes(needle)) byPath.add(path);
    }
  }
  return [...byPath].sort();
}

function countabilityReason(
  status: ExternalIntakeStatus | "invalid",
  findings: readonly ExternalIntakeFinding[],
): string {
  if (findings.length > 0) {
    return `not counted: ${[...new Set(findings.map((f) => f.code))].sort().join(", ")}`;
  }
  if (status === "completed") return "completed external packet with current hash and preserved artifacts";
  if (status === "provider_refusal") return "provider refusal preserved as no-count evidence";
  if (status === "infrastructure_error") return "infrastructure error preserved as no-count evidence";
  if (status === "timeout") return "timeout preserved as no-count evidence";
  if (status === "contaminated") return "contaminated run preserved as no-count evidence";
  if (status === "stale_hash") return "stale-hash run preserved as no-count evidence";
  return "invalid packet preserved as no-count evidence";
}

export function validateExternalRunPacket(
  root: string,
  packetDir: string,
  context: ExternalIntakeContext,
): ExternalIntakeValidationResult {
  void root;
  const metadata = parseExternalRunMetadata(readJson(join(packetDir, "metadata.json")));
  const transcript = transcriptPath(packetDir);
  const submissionDir = join(packetDir, "submission");
  const submissionFiles = existsSync(submissionDir)
    ? readAllPaths(submissionDir)
        .filter((path) => path.endsWith(".js") || path.endsWith(".mjs"))
        .filter((path) => readFileSync(join(submissionDir, path), "utf8").trim().length > 0)
    : [];
  const verifierOutputPath = existsSync(join(packetDir, "verifier-output.json"))
    ? readText(join(packetDir, "verifier-output.json"))?.trim()
      ? join(packetDir, "verifier-output.json")
      : null
    : null;
  const actualChallengeHash = hashChallengeDir(join(packetDir, "challenge"));
  const verifierId = verifierOutputPath === null ? null : verifierRunId(verifierOutputPath);
  const hiddenLeaks = leakedHiddenPaths(packetDir);
  const packet: ExternalReturnedPacket = {
    dir: packetDir,
    familyId: context.familyId,
    expectedChallengeHash: context.currentChallengeHash,
    expectedScenarioSetId: context.expectedScenarioSetId,
    actualChallengeHash,
    metadata,
    transcriptPath: transcript,
    submissionFiles,
    verifierOutputPath,
    verifierRunId: verifierId,
    leakedHiddenPaths: hiddenLeaks,
  };
  const findings: ExternalIntakeFinding[] = [];
  const add = (code: ExternalIntakeRuleCode, path: string, detail: string) =>
    findings.push(finding(code, path, detail));

  if (metadata === null) {
    add(
      "EXTERNAL_INTAKE_METADATA_MISSING",
      `${packetDir}/metadata.json`,
      "metadata.json is missing or invalid JSON",
    );
  } else {
    const missingIdentity: string[] = [];
    if (metadata.provider === null) missingIdentity.push("provider");
    if (metadata.model === null) missingIdentity.push("model");
    if (metadata.subjectId === null) missingIdentity.push("subjectId");
    if (isPlaceholder(metadata.runtime)) missingIdentity.push("runtime");
    if (isPlaceholder(metadata.runDate)) missingIdentity.push("runDate");
    if (metadata.status === null) missingIdentity.push("status");
    if (missingIdentity.length > 0) {
      add(
        "EXTERNAL_INTAKE_PROVIDER_ID_MISSING",
        `${packetDir}/metadata.json`,
        `missing or placeholder metadata field(s): ${missingIdentity.join(", ")}`,
      );
    }
    if (metadata.providerFamily === null) {
      add(
        "EXTERNAL_INTAKE_PROVIDER_FAMILY_MISLABELLED",
        `${packetDir}/metadata.json`,
        "providerFamily must identify openai, anthropic, google, external, manual or unknown",
      );
    }
    const inferred = inferProviderFamily(metadata.provider, metadata.model);
    if (metadata.providerFamily !== null && inferred !== null && metadata.providerFamily !== inferred) {
      add(
        "EXTERNAL_INTAKE_PROVIDER_FAMILY_MISLABELLED",
        `${packetDir}/metadata.json`,
        `provider/model imply ${inferred}, but metadata says ${metadata.providerFamily}`,
      );
    }
    if (metadata.runId === null || metadata.familyId === null) {
      add(
        "EXTERNAL_INTAKE_METADATA_MISSING",
        `${packetDir}/metadata.json`,
        "runId and familyId are required",
      );
    }
    if (metadata.familyId !== null && metadata.familyId !== context.familyId) {
      add(
        "EXTERNAL_INTAKE_METADATA_MISSING",
        `${packetDir}/metadata.json`,
        `packet family ${metadata.familyId} does not match expected ${context.familyId}`,
      );
    }
    if (metadata.challengeHash === null) {
      add(
        "EXTERNAL_INTAKE_CHALLENGE_HASH_MISSING",
        `${packetDir}/metadata.json`,
        "challengeHash is required for countability",
      );
    } else if (metadata.challengeHash !== context.currentChallengeHash) {
      add(
        "EXTERNAL_INTAKE_CHALLENGE_HASH_STALE",
        `${packetDir}/metadata.json`,
        `metadata hash ${metadata.challengeHash} does not match current ${context.currentChallengeHash}`,
      );
    }
    if (metadata.scenarioSetId !== context.expectedScenarioSetId) {
      add(
        "EXTERNAL_INTAKE_SCENARIO_SET_MISMATCH",
        `${packetDir}/metadata.json`,
        `scenario set ${metadata.scenarioSetId ?? "missing"} does not match ${context.expectedScenarioSetId}`,
      );
    }
    if (metadata.runId !== null && (context.existingRunIds ?? []).includes(metadata.runId)) {
      add(
        "EXTERNAL_INTAKE_DUPLICATE_RUN_ID",
        `${packetDir}/metadata.json`,
        `run id ${metadata.runId} already exists in preserved trial evidence`,
      );
    }
    if (
      metadata.countsRequested &&
      (metadata.status === "provider_refusal" || metadata.status === "timeout")
    ) {
      add(
        "EXTERNAL_INTAKE_PROVIDER_REFUSAL_COUNTED",
        `${packetDir}/metadata.json`,
        `${metadata.status} was marked for countability; refusals and timeouts never count`,
      );
    }
    if (metadata.countsRequested && metadata.status === "infrastructure_error") {
      add(
        "EXTERNAL_INTAKE_INFRA_ERROR_COUNTED",
        `${packetDir}/metadata.json`,
        "infrastructure errors are preserved but cannot count",
      );
    }
    if (metadata.countsRequested && metadata.relationToAuthor !== "independent") {
      add(
        "EXTERNAL_INTAKE_AUTHOR_CONTAMINATED",
        `${packetDir}/metadata.json`,
        `counted external evidence requires independent relation, not ${metadata.relationToAuthor}`,
      );
    }
    if (metadata.countsRequested && metadata.privateHintsUsed) {
      add(
        "EXTERNAL_INTAKE_PRIVATE_HINT",
        `${packetDir}/metadata.json`,
        "private hints contaminate external evidence",
      );
    }
    if (metadata.hiddenFilesSeen.length > 0) {
      add(
        "EXTERNAL_INTAKE_HIDDEN_ARTIFACT_LEAK",
        `${packetDir}/metadata.json`,
        `metadata records hidden files seen: ${metadata.hiddenFilesSeen.join(", ")}`,
      );
    }
  }

  if (actualChallengeHash === null || actualChallengeHash !== context.currentChallengeHash) {
    add(
      "EXTERNAL_INTAKE_MODIFIED_CHALLENGE_PACKAGE",
      `${packetDir}/challenge`,
      `challenge directory hashes to ${actualChallengeHash ?? "missing"}, expected ${context.currentChallengeHash}`,
    );
  }
  if (hiddenLeaks.length > 0) {
    add(
      "EXTERNAL_INTAKE_HIDDEN_ARTIFACT_LEAK",
      packetDir,
      `hidden artifact path or content appears in returned packet: ${hiddenLeaks.slice(0, 5).join(", ")}`,
    );
  }

  const status = metadata?.status ?? "invalid";
  const wantsCompletedEvidence = metadata === null || metadata.countsRequested || status === "completed";
  if (wantsCompletedEvidence && transcript === null) {
    add(
      "EXTERNAL_INTAKE_TRANSCRIPT_MISSING",
      `${packetDir}/transcript.txt`,
      "a counted or completed external run must preserve a non-empty transcript",
    );
  }
  if (wantsCompletedEvidence && submissionFiles.length === 0) {
    add(
      "EXTERNAL_INTAKE_SUBMISSION_MISSING",
      `${packetDir}/submission`,
      "a counted or completed external run must preserve the submitted artifact",
    );
  }
  if (wantsCompletedEvidence && verifierOutputPath === null) {
    add(
      "EXTERNAL_INTAKE_VERIFIER_OUTPUT_MISSING",
      `${packetDir}/verifier-output.json`,
      "a counted or completed external run must preserve verifier output",
    );
  }
  if (
    wantsCompletedEvidence &&
    verifierOutputPath !== null &&
    metadata?.runId !== null &&
    metadata?.runId !== undefined &&
    verifierId !== metadata?.runId
  ) {
    add(
      "EXTERNAL_INTAKE_VERIFIER_RUN_MISMATCH",
      verifierOutputPath,
      `verifier output runId ${verifierId ?? "missing"} does not match metadata runId ${metadata?.runId ?? "missing"}`,
    );
  }

  const sorted = findings
    .filter(
      (item, index, array) =>
        array.findIndex((candidate) => candidate.code === item.code && candidate.path === item.path) ===
        index,
    )
    .sort((a, b) => a.code.localeCompare(b.code) || a.path.localeCompare(b.path));
  const countable = status === "completed" && sorted.length === 0;

  return {
    packet,
    findings: sorted,
    countable,
    countabilityReason: countabilityReason(status, sorted),
    status,
    importedTrialEligible: countable,
  };
}
