import {
  type RuleCode,
  fail,
  isRecord,
  num,
  oneOf,
  optionalText,
  str,
  strArray,
  strNullable,
} from "../foundry/schema.js";
import {
  ADVERSARIAL_AUDIT_STATUSES,
  ADVERSARIAL_AUDIT_VERSIONS,
  ADVERSARIAL_VERIFIER_STATUSES,
  ATTACK_EXECUTION_PROFILE_KINDS,
  type AdversarialAttackRecord,
  type AdversarialAttacker,
  type AdversarialBypassTriage,
  type AdversarialContainerMetadata,
  type AdversarialExecutionProfile,
  type AdversarialExploitArtifact,
  type AdversarialExploitReplayResult,
  type AdversarialIsolationProfile,
  type AdversarialRepairRecord,
  type AdversarialValidationFailure,
  type AdversarialVerifierResult,
  BYPASS_CLASSES,
  BYPASS_TRIAGE_DECISIONS,
  CONTAINER_NETWORK_MODES,
  EXPLOIT_ARTIFACT_KINDS,
  EXPLOIT_REPLAY_STATUSES,
  ISOLATION_PROFILE_IDS,
} from "./types.js";

const bool = (v: unknown, path: string): boolean =>
  typeof v === "boolean" ? v : fail("E_TYPE", path, "expected a boolean");

const maybeNum = (v: unknown, path: string): number | null =>
  v === null || v === undefined ? null : num(v, path);

function parseAttacker(v: unknown, path: string): AdversarialAttacker {
  const o = isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");
  return {
    provider: str(o.provider, `${path}.provider`),
    model: str(o.model, `${path}.model`),
    subjectId: str(o.subjectId, `${path}.subjectId`),
  };
}

function parseVerifier(v: unknown, path: string): AdversarialVerifierResult {
  const o = isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");
  return {
    status: oneOf(o.status, `${path}.status`, ADVERSARIAL_VERIFIER_STATUSES),
    command: strNullable(o.command, `${path}.command`),
    outputPath: strNullable(o.outputPath, `${path}.outputPath`),
    detail: optionalText(o.detail, `${path}.detail`),
  };
}

function parseRepair(v: unknown, path: string): AdversarialRepairRecord {
  const o = isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");
  return {
    status: oneOf(o.status, `${path}.status`, ["not-needed", "planned", "fixed", "superseded"] as const),
    repairId: strNullable(o.repairId, `${path}.repairId`),
    changedChallengePackage: bool(o.changedChallengePackage, `${path}.changedChallengePackage`),
    invalidatedAuditIds: strArray(o.invalidatedAuditIds, `${path}.invalidatedAuditIds`),
    notes: optionalText(o.notes, `${path}.notes`),
  };
}

export const defaultExecutionProfile = (): AdversarialExecutionProfile => ({
  kind: "external-import",
  command: null,
  providerRunnable: false,
  attemptedBypass: false,
  submittedNormalSolution: false,
  theoreticalOnly: false,
  notes: "v1 record: execution profile was not captured",
});

export const defaultIsolationProfile = (): AdversarialIsolationProfile => ({
  id: "subprocess",
  publicChallengeReadable: true,
  hiddenArtifactsExcluded: true,
  submissionWritable: true,
  noRepoRoot: false,
  noGeneratedReports: false,
  verifierOutsideAttackerContext: true,
  networkDisabled: false,
  containerized: false,
  adequateForCountedNoBypass: false,
  notes: "v1 record: subprocess execution only; not adequate for v2 no-bypass claims",
});

export const defaultExploitArtifact = (): AdversarialExploitArtifact => ({
  kind: "none",
  path: null,
  submittedArtifactPath: null,
  declaredContractViolation: false,
  usesForbiddenAccess: false,
  replaysWithCurrentVerifier: null,
  notes: "no exploit artifact declared",
});

export const defaultExploitReplay = (): AdversarialExploitReplayResult => ({
  status: "not-run",
  command: null,
  outputPath: null,
  challengeHash: null,
  verifierHash: null,
  verifierPassed: null,
  contractViolated: false,
  forbiddenAccessUsed: false,
  detail: "no exploit replay captured",
});

export const defaultTriage = (): AdversarialBypassTriage => ({
  decision: "not-triaged",
  attackerAttemptedBypass: false,
  submittedNormalSolution: false,
  theoreticalOnly: false,
  exploitArtifactProduced: false,
  exploitReplays: false,
  verifierPasses: false,
  contractViolated: false,
  forbiddenAccessUsed: false,
  verifierConfirmsNoBypass: false,
  countabilityReason: "not triaged",
});

function parseExecutionProfile(v: unknown, path: string): AdversarialExecutionProfile {
  if (v === null || v === undefined) return defaultExecutionProfile();
  const o = isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");
  return {
    kind: oneOf(o.kind, `${path}.kind`, ATTACK_EXECUTION_PROFILE_KINDS),
    command: strNullable(o.command, `${path}.command`),
    providerRunnable: bool(o.providerRunnable, `${path}.providerRunnable`),
    attemptedBypass: bool(o.attemptedBypass, `${path}.attemptedBypass`),
    submittedNormalSolution: bool(o.submittedNormalSolution, `${path}.submittedNormalSolution`),
    theoreticalOnly: bool(o.theoreticalOnly, `${path}.theoreticalOnly`),
    notes: optionalText(o.notes, `${path}.notes`),
  };
}

function parseIsolationProfile(v: unknown, path: string): AdversarialIsolationProfile {
  if (v === null || v === undefined) return defaultIsolationProfile();
  const o = isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");
  return {
    id: oneOf(o.id, `${path}.id`, ISOLATION_PROFILE_IDS),
    publicChallengeReadable: bool(o.publicChallengeReadable, `${path}.publicChallengeReadable`),
    hiddenArtifactsExcluded: bool(o.hiddenArtifactsExcluded, `${path}.hiddenArtifactsExcluded`),
    submissionWritable: bool(o.submissionWritable, `${path}.submissionWritable`),
    noRepoRoot: bool(o.noRepoRoot, `${path}.noRepoRoot`),
    noGeneratedReports: bool(o.noGeneratedReports, `${path}.noGeneratedReports`),
    verifierOutsideAttackerContext: bool(
      o.verifierOutsideAttackerContext,
      `${path}.verifierOutsideAttackerContext`,
    ),
    networkDisabled: bool(o.networkDisabled, `${path}.networkDisabled`),
    containerized: bool(o.containerized, `${path}.containerized`),
    adequateForCountedNoBypass: bool(o.adequateForCountedNoBypass, `${path}.adequateForCountedNoBypass`),
    notes: optionalText(o.notes, `${path}.notes`),
  };
}

function parseContainerMetadata(v: unknown, path: string): AdversarialContainerMetadata | null {
  if (v === null || v === undefined) return null;
  const o = isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");
  return {
    runtime: oneOf(o.runtime, `${path}.runtime`, ["docker", "podman", "other"] as const),
    runtimeAvailable: bool(o.runtimeAvailable, `${path}.runtimeAvailable`),
    image: str(o.image, `${path}.image`),
    command: strArray(o.command, `${path}.command`),
    networkMode: oneOf(o.networkMode, `${path}.networkMode`, CONTAINER_NETWORK_MODES),
    user: str(o.user, `${path}.user`),
    readOnlyRootFilesystem: bool(o.readOnlyRootFilesystem, `${path}.readOnlyRootFilesystem`),
    capDropAll: bool(o.capDropAll, `${path}.capDropAll`),
    noNewPrivileges: bool(o.noNewPrivileges, `${path}.noNewPrivileges`),
    repoRootMounted: bool(o.repoRootMounted, `${path}.repoRootMounted`),
    hiddenArtifactsMounted: bool(o.hiddenArtifactsMounted, `${path}.hiddenArtifactsMounted`),
    generatedReportsMounted: bool(o.generatedReportsMounted, `${path}.generatedReportsMounted`),
    verifierInsideContainer: bool(o.verifierInsideContainer, `${path}.verifierInsideContainer`),
    publicChallengeReadOnly: bool(o.publicChallengeReadOnly, `${path}.publicChallengeReadOnly`),
    exploitDirPreserved: bool(o.exploitDirPreserved, `${path}.exploitDirPreserved`),
    submittedBypassDirPreserved: bool(o.submittedBypassDirPreserved, `${path}.submittedBypassDirPreserved`),
    secretEnvKeysExposed: strArray(o.secretEnvKeysExposed, `${path}.secretEnvKeysExposed`),
    readiness: oneOf(o.readiness, `${path}.readiness`, ["pass", "fail", "not-run"] as const),
    readinessFailures: strArray(o.readinessFailures, `${path}.readinessFailures`),
  };
}

function parseExploitArtifact(v: unknown, path: string): AdversarialExploitArtifact {
  if (v === null || v === undefined) return defaultExploitArtifact();
  const o = isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");
  return {
    kind: oneOf(o.kind, `${path}.kind`, EXPLOIT_ARTIFACT_KINDS),
    path: strNullable(o.path, `${path}.path`),
    submittedArtifactPath: strNullable(o.submittedArtifactPath, `${path}.submittedArtifactPath`),
    declaredContractViolation: bool(o.declaredContractViolation, `${path}.declaredContractViolation`),
    usesForbiddenAccess: bool(o.usesForbiddenAccess, `${path}.usesForbiddenAccess`),
    replaysWithCurrentVerifier:
      o.replaysWithCurrentVerifier === null || o.replaysWithCurrentVerifier === undefined
        ? null
        : bool(o.replaysWithCurrentVerifier, `${path}.replaysWithCurrentVerifier`),
    notes: optionalText(o.notes, `${path}.notes`),
  };
}

function parseExploitReplay(v: unknown, path: string): AdversarialExploitReplayResult {
  if (v === null || v === undefined) return defaultExploitReplay();
  const o = isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");
  return {
    status: oneOf(o.status, `${path}.status`, EXPLOIT_REPLAY_STATUSES),
    command: strNullable(o.command, `${path}.command`),
    outputPath: strNullable(o.outputPath, `${path}.outputPath`),
    challengeHash: strNullable(o.challengeHash, `${path}.challengeHash`),
    verifierHash: strNullable(o.verifierHash, `${path}.verifierHash`),
    verifierPassed:
      o.verifierPassed === null || o.verifierPassed === undefined
        ? null
        : bool(o.verifierPassed, `${path}.verifierPassed`),
    contractViolated: bool(o.contractViolated, `${path}.contractViolated`),
    forbiddenAccessUsed: bool(o.forbiddenAccessUsed, `${path}.forbiddenAccessUsed`),
    detail: optionalText(o.detail, `${path}.detail`),
  };
}

function parseTriage(v: unknown, path: string): AdversarialBypassTriage {
  if (v === null || v === undefined) return defaultTriage();
  const o = isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");
  return {
    decision: oneOf(o.decision, `${path}.decision`, BYPASS_TRIAGE_DECISIONS),
    attackerAttemptedBypass: bool(o.attackerAttemptedBypass, `${path}.attackerAttemptedBypass`),
    submittedNormalSolution: bool(o.submittedNormalSolution, `${path}.submittedNormalSolution`),
    theoreticalOnly: bool(o.theoreticalOnly, `${path}.theoreticalOnly`),
    exploitArtifactProduced: bool(o.exploitArtifactProduced, `${path}.exploitArtifactProduced`),
    exploitReplays: bool(o.exploitReplays, `${path}.exploitReplays`),
    verifierPasses: bool(o.verifierPasses, `${path}.verifierPasses`),
    contractViolated: bool(o.contractViolated, `${path}.contractViolated`),
    forbiddenAccessUsed: bool(o.forbiddenAccessUsed, `${path}.forbiddenAccessUsed`),
    verifierConfirmsNoBypass: bool(o.verifierConfirmsNoBypass, `${path}.verifierConfirmsNoBypass`),
    countabilityReason: optionalText(o.countabilityReason, `${path}.countabilityReason`),
  };
}

export function parseAdversarialAttackRecord(v: unknown, path: string): AdversarialAttackRecord {
  const o = isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");
  return {
    auditVersion: oneOf(o.auditVersion ?? "v1", `${path}.auditVersion`, ADVERSARIAL_AUDIT_VERSIONS),
    attackId: str(o.attackId, `${path}.attackId`),
    campaignId: strNullable(o.campaignId, `${path}.campaignId`),
    familyId: str(o.familyId, `${path}.familyId`),
    status: oneOf(o.status, `${path}.status`, ADVERSARIAL_AUDIT_STATUSES),
    counts: bool(o.counts, `${path}.counts`),
    countabilityReason: optionalText(o.countabilityReason, `${path}.countabilityReason`),
    challengeHash: strNullable(o.challengeHash, `${path}.challengeHash`),
    verifierHash: strNullable(o.verifierHash, `${path}.verifierHash`),
    attacker: parseAttacker(o.attacker, `${path}.attacker`),
    attackSurface: strArray(o.attackSurface, `${path}.attackSurface`),
    allowedAttackerAccess: strArray(o.allowedAttackerAccess, `${path}.allowedAttackerAccess`),
    forbiddenAttackerAccess: strArray(o.forbiddenAttackerAccess, `${path}.forbiddenAttackerAccess`),
    attackerContextFiles: strArray(o.attackerContextFiles, `${path}.attackerContextFiles`),
    hiddenArtifactsInAttackerContext: strArray(
      o.hiddenArtifactsInAttackerContext,
      `${path}.hiddenArtifactsInAttackerContext`,
    ),
    transcriptPath: strNullable(o.transcriptPath, `${path}.transcriptPath`),
    exploitArtifactPath: strNullable(o.exploitArtifactPath, `${path}.exploitArtifactPath`),
    submittedBypassArtifactPath: strNullable(
      o.submittedBypassArtifactPath,
      `${path}.submittedBypassArtifactPath`,
    ),
    verifier: parseVerifier(o.verifier, `${path}.verifier`),
    bypassClassification: oneOf(o.bypassClassification, `${path}.bypassClassification`, BYPASS_CLASSES),
    repair: parseRepair(o.repair, `${path}.repair`),
    executionProfile: parseExecutionProfile(o.executionProfile, `${path}.executionProfile`),
    isolationProfile: parseIsolationProfile(o.isolationProfile, `${path}.isolationProfile`),
    container: parseContainerMetadata(o.container, `${path}.container`),
    exploitArtifact: parseExploitArtifact(o.exploitArtifact, `${path}.exploitArtifact`),
    exploitReplay: parseExploitReplay(o.exploitReplay, `${path}.exploitReplay`),
    triage: parseTriage(o.triage, `${path}.triage`),
    startedAt: strNullable(o.startedAt, `${path}.startedAt`),
    endedAt: strNullable(o.endedAt, `${path}.endedAt`),
    runtimeSeconds: maybeNum(o.runtimeSeconds, `${path}.runtimeSeconds`),
    notes: optionalText(o.notes, `${path}.notes`),
  };
}

export interface AdversarialValidationContext {
  readonly currentChallengeHash: string | null;
  readonly transcriptText?: string | null;
  readonly exploitText?: string | null;
  readonly verifierText?: string | null;
  readonly hardeningProbesPass?: boolean;
}

const nonEmpty = (s: string | null | undefined): boolean => typeof s === "string" && s.trim().length > 0;

const hasTextOrPath = (path: string | null, text: string | null | undefined, textKnown: boolean): boolean => {
  if (textKnown) return nonEmpty(text);
  return nonEmpty(text) || nonEmpty(path);
};

function advFailure(code: RuleCode, path: string, detail: string): AdversarialValidationFailure {
  return { code, path, detail };
}

const looksDefaultV1 = (notes: string): boolean => notes.includes("v1 record:");

function pushContainerCountabilityFailures(
  record: AdversarialAttackRecord,
  failures: AdversarialValidationFailure[],
): void {
  const claimsContainer =
    record.isolationProfile.id === "container-no-network" || record.isolationProfile.id === "container";
  if (!claimsContainer) return;

  const metadata = record.container ?? null;
  if (metadata === null) {
    failures.push(
      advFailure(
        "ADV_CONTAINER_COUNTED_NO_METADATA",
        `adversarial.${record.attackId}.container`,
        "a counted container audit must preserve container runtime metadata",
      ),
    );
    return;
  }
  if (!metadata.runtimeAvailable || metadata.readiness !== "pass" || metadata.readinessFailures.length > 0) {
    failures.push(
      advFailure(
        "ADV_CONTAINER_COUNTED_READINESS_FAILED",
        `adversarial.${record.attackId}.container.readiness`,
        "a counted container audit requires a passing runtime/readiness smoke",
      ),
    );
  }
  if (!record.isolationProfile.networkDisabled || metadata.networkMode !== "none") {
    failures.push(
      advFailure(
        "ADV_CONTAINER_COUNTED_NETWORK_ENABLED",
        `adversarial.${record.attackId}.container.networkMode`,
        "a counted container/no-network audit must run with Docker/Podman network mode none",
      ),
    );
  }
  if (metadata.repoRootMounted) {
    failures.push(
      advFailure(
        "ADV_CONTAINER_COUNTED_REPO_ROOT_MOUNTED",
        `adversarial.${record.attackId}.container.repoRootMounted`,
        "the repository root cannot be mounted in the attacker container",
      ),
    );
  }
  if (metadata.hiddenArtifactsMounted) {
    failures.push(
      advFailure(
        "ADV_CONTAINER_COUNTED_HIDDEN_FILES_MOUNTED",
        `adversarial.${record.attackId}.container.hiddenArtifactsMounted`,
        "hidden verifier/reference/scenario files cannot be mounted in the attacker container",
      ),
    );
  }
  if (metadata.verifierInsideContainer) {
    failures.push(
      advFailure(
        "ADV_CONTAINER_COUNTED_VERIFIER_INSIDE",
        `adversarial.${record.attackId}.container.verifierInsideContainer`,
        "the verifier must run outside the attacker container",
      ),
    );
  }
  if (!metadata.exploitDirPreserved || !metadata.submittedBypassDirPreserved) {
    failures.push(
      advFailure(
        "ADV_CONTAINER_COUNTED_UNPRESERVED_DIRS",
        `adversarial.${record.attackId}.container.exploitDirPreserved`,
        "container audits must preserve writable exploit and submitted-bypass directories",
      ),
    );
  }
  if (metadata.secretEnvKeysExposed.length > 0) {
    failures.push(
      advFailure(
        "ADV_CONTAINER_COUNTED_SECRET_ENV",
        `adversarial.${record.attackId}.container.secretEnvKeysExposed`,
        `secret-like environment keys were exposed: ${metadata.secretEnvKeysExposed.join(", ")}`,
      ),
    );
  }
}

function pushV2CountabilityFailures(
  record: AdversarialAttackRecord,
  context: AdversarialValidationContext,
  failures: AdversarialValidationFailure[],
): void {
  if (record.auditVersion !== "v2") return;

  if (looksDefaultV1(record.executionProfile.notes)) {
    failures.push(
      advFailure(
        "ADV_V2_COUNTED_NO_EXECUTION_PROFILE",
        `adversarial.${record.attackId}.executionProfile`,
        "a counted v2 audit must capture the execution profile instead of relying on v1 defaults",
      ),
    );
  }
  if (looksDefaultV1(record.isolationProfile.notes)) {
    failures.push(
      advFailure(
        "ADV_V2_COUNTED_NO_ISOLATION_PROFILE",
        `adversarial.${record.attackId}.isolationProfile`,
        "a counted v2 audit must capture the isolation profile instead of relying on v1 defaults",
      ),
    );
  }
  if (!record.isolationProfile.adequateForCountedNoBypass) {
    failures.push(
      advFailure(
        "ADV_V2_COUNTED_WEAK_ISOLATION",
        `adversarial.${record.attackId}.isolationProfile.adequateForCountedNoBypass`,
        "a counted v2 audit must use an isolation profile adequate for verifier-integrity evidence",
      ),
    );
  }
  if (looksDefaultV1(record.triage.countabilityReason) || record.triage.decision === "not-triaged") {
    failures.push(
      advFailure(
        "ADV_V2_COUNTED_NO_TRIAGE",
        `adversarial.${record.attackId}.triage`,
        "a counted v2 audit must preserve mechanical bypass triage",
      ),
    );
  }
  if (looksDefaultV1(record.exploitReplay.detail) || record.exploitReplay.status === "not-run") {
    failures.push(
      advFailure(
        "ADV_V2_COUNTED_NO_REPLAY_RESULT",
        `adversarial.${record.attackId}.exploitReplay`,
        "a counted v2 audit must preserve the exploit replay result, even when no exploit was found",
      ),
    );
  }
  if (context.hardeningProbesPass === false) {
    failures.push(
      advFailure(
        "ADV_V2_COUNTED_PROBES_FAILING",
        `adversarial.${record.attackId}.hardeningProbes`,
        "a counted v2 no-bypass audit cannot stand while deterministic hardening probes fail",
      ),
    );
  }
  const normalSolution =
    record.executionProfile.submittedNormalSolution || record.triage.submittedNormalSolution;
  const theoreticalOnly = record.executionProfile.theoreticalOnly || record.triage.theoreticalOnly;
  if (normalSolution) {
    failures.push(
      advFailure(
        "ADV_V2_COUNTED_NORMAL_SOLUTION",
        `adversarial.${record.attackId}.triage.submittedNormalSolution`,
        "a normal solution attempt is model difficulty evidence, not verifier-integrity evidence",
      ),
    );
  }
  if (theoreticalOnly) {
    failures.push(
      advFailure(
        "ADV_V2_COUNTED_NO_BYPASS_THEORETICAL_ONLY",
        `adversarial.${record.attackId}.triage.theoreticalOnly`,
        "theoretical notes without a concrete attempted bypass are preserved but do not count",
      ),
    );
  }
  if (normalSolution || theoreticalOnly) return;

  if (record.status === "no-bypass-found") {
    if (!record.executionProfile.attemptedBypass || !record.triage.attackerAttemptedBypass) {
      failures.push(
        advFailure(
          "ADV_V2_COUNTED_NO_BYPASS_NOT_ATTEMPTED",
          `adversarial.${record.attackId}.triage.attackerAttemptedBypass`,
          "a counted no-bypass audit requires an actual bypass attempt, not a normal task solve",
        ),
      );
    }
    if (
      record.triage.decision !== "no-bypass-confirmed" ||
      !record.triage.verifierConfirmsNoBypass ||
      record.triage.verifierPasses
    ) {
      failures.push(
        advFailure(
          "ADV_V2_COUNTED_NO_TRIAGE",
          `adversarial.${record.attackId}.triage.decision`,
          "a counted no-bypass audit must be mechanically triaged as no-bypass-confirmed",
        ),
      );
    }
  }

  if (record.status === "bypass-found") {
    if (record.triage.decision !== "bypass-confirmed") {
      failures.push(
        advFailure(
          "ADV_V2_COUNTED_NO_TRIAGE",
          `adversarial.${record.attackId}.triage.decision`,
          "a counted bypass must be mechanically triaged as bypass-confirmed",
        ),
      );
    }
    if (
      record.exploitReplay.status !== "replay-passed-verifier" ||
      record.exploitReplay.verifierPassed !== true
    ) {
      failures.push(
        advFailure(
          "ADV_V2_COUNTED_BYPASS_REPLAY_NOT_PASSING",
          `adversarial.${record.attackId}.exploitReplay.status`,
          "a counted bypass must replay and pass the current verifier",
        ),
      );
    }
    if (!record.exploitReplay.contractViolated || !record.triage.contractViolated) {
      failures.push(
        advFailure(
          "ADV_V2_COUNTED_BYPASS_NO_CONTRACT_VIOLATION",
          `adversarial.${record.attackId}.exploitReplay.contractViolated`,
          "a counted bypass must violate the public task contract, not merely solve it",
        ),
      );
    }
    if (record.exploitReplay.forbiddenAccessUsed || record.triage.forbiddenAccessUsed) {
      failures.push(
        advFailure(
          "ADV_V2_COUNTED_BYPASS_FORBIDDEN_ACCESS",
          `adversarial.${record.attackId}.exploitReplay.forbiddenAccessUsed`,
          "an exploit that works only by forbidden hidden access is contamination, not a counted bypass",
        ),
      );
    }
  }
}

export function adversarialAttackFailures(
  record: AdversarialAttackRecord,
  context: AdversarialValidationContext,
): readonly AdversarialValidationFailure[] {
  const failures: AdversarialValidationFailure[] = [];

  if (record.hiddenArtifactsInAttackerContext.length > 0) {
    failures.push(
      advFailure(
        "ADV_HIDDEN_ARTIFACT_IN_ATTACKER_CONTEXT",
        `adversarial.${record.attackId}.hiddenArtifactsInAttackerContext`,
        `attacker context included forbidden hidden artifacts: ${record.hiddenArtifactsInAttackerContext.join(", ")}`,
      ),
    );
  }

  if (record.repair.status === "fixed" && nonEmpty(record.repair.repairId) === false) {
    failures.push(
      advFailure(
        "ADV_BYPASS_FIXED_WITHOUT_REPAIR",
        `adversarial.${record.attackId}.repair.repairId`,
        "a fixed bypass must name the repair record that closed it",
      ),
    );
  }
  if (
    record.repair.changedChallengePackage &&
    record.repair.invalidatedAuditIds.length === 0 &&
    record.repair.status !== "superseded"
  ) {
    failures.push(
      advFailure(
        "ADV_REPAIR_CHANGED_PACKAGE_WITHOUT_INVALIDATION",
        `adversarial.${record.attackId}.repair.invalidatedAuditIds`,
        "a repair that changes the public challenge package must invalidate or supersede prior audits",
      ),
    );
  }

  if (!record.counts) return failures;

  if (!nonEmpty(record.countabilityReason)) {
    failures.push(
      advFailure(
        "ADV_COUNTED_NO_COUNTABILITY_REASON",
        `adversarial.${record.attackId}.countabilityReason`,
        "a counted adversarial audit must explain why it counts",
      ),
    );
  }
  if (!nonEmpty(record.challengeHash)) {
    failures.push(
      advFailure(
        "ADV_COUNTED_HASH_MISSING",
        `adversarial.${record.attackId}.challengeHash`,
        "a counted adversarial audit must record the challenge hash the attacker saw",
      ),
    );
  } else if (context.currentChallengeHash === null || record.challengeHash !== context.currentChallengeHash) {
    failures.push(
      advFailure(
        "ADV_COUNTED_HASH_STALE",
        `adversarial.${record.attackId}.challengeHash`,
        `record uses ${record.challengeHash}; current package hash is ${context.currentChallengeHash ?? "none"}`,
      ),
    );
  }
  if (!hasTextOrPath(record.transcriptPath, context.transcriptText, "transcriptText" in context)) {
    failures.push(
      advFailure(
        "ADV_COUNTED_NO_TRANSCRIPT",
        `adversarial.${record.attackId}.transcriptPath`,
        "a counted adversarial audit must preserve the attacker transcript",
      ),
    );
  }
  if (record.attackSurface.length === 0) {
    failures.push(
      advFailure(
        "ADV_COUNTED_NO_ATTACK_SURFACE",
        `adversarial.${record.attackId}.attackSurface`,
        "a counted adversarial audit must declare which verifier surfaces were attacked",
      ),
    );
  }
  if (record.allowedAttackerAccess.length === 0 || record.forbiddenAttackerAccess.length === 0) {
    failures.push(
      advFailure(
        "ADV_COUNTED_NO_ACCESS_BOUNDARY",
        `adversarial.${record.attackId}.allowedAttackerAccess`,
        "a counted adversarial audit must declare both allowed and forbidden attacker access",
      ),
    );
  }
  if (record.status === "provider-refusal") {
    failures.push(
      advFailure(
        "ADV_COUNTED_PROVIDER_REFUSAL",
        `adversarial.${record.attackId}.status`,
        "provider refusals are preserved but never count as verifier defense",
      ),
    );
  }
  if (record.status === "infrastructure-error") {
    failures.push(
      advFailure(
        "ADV_COUNTED_INFRA_ERROR",
        `adversarial.${record.attackId}.status`,
        "infrastructure errors are preserved but never count as verifier defense",
      ),
    );
  }
  if (record.status === "timeout") {
    failures.push(
      advFailure(
        "ADV_COUNTED_TIMEOUT",
        `adversarial.${record.attackId}.status`,
        "timeouts are preserved but never count as verifier defense",
      ),
    );
  }
  if (
    record.status === "no-bypass-found" &&
    (record.verifier.status !== "no-bypass-confirmed" ||
      !hasTextOrPath(record.verifier.outputPath, context.verifierText, "verifierText" in context))
  ) {
    failures.push(
      advFailure(
        "ADV_COUNTED_NO_BYPASS_WITHOUT_VERIFIER",
        `adversarial.${record.attackId}.verifier.outputPath`,
        "a counted no-bypass claim requires preserved verifier output confirming no bypass",
      ),
    );
  }
  if (
    record.status === "bypass-found" &&
    !hasTextOrPath(record.exploitArtifactPath, context.exploitText, "exploitText" in context)
  ) {
    failures.push(
      advFailure(
        "ADV_COUNTED_BYPASS_WITHOUT_EXPLOIT",
        `adversarial.${record.attackId}.exploitArtifactPath`,
        "a counted bypass claim must preserve the exploit artifact or proof-of-concept",
      ),
    );
  }

  pushV2CountabilityFailures(record, context, failures);
  pushContainerCountabilityFailures(record, failures);

  return failures;
}

export function assertAdversarialAttackRecordCounts(
  record: AdversarialAttackRecord,
  context: AdversarialValidationContext,
): void {
  const first = adversarialAttackFailures(record, context)[0];
  if (first !== undefined) fail(first.code as RuleCode, first.path, first.detail);
}

export function isCountedNoBypassAudit(
  record: AdversarialAttackRecord,
  context: AdversarialValidationContext,
): boolean {
  return (
    record.counts &&
    record.status === "no-bypass-found" &&
    record.bypassClassification === "no-bypass" &&
    adversarialAttackFailures(record, context).length === 0
  );
}

export function isCountedBypassAudit(
  record: AdversarialAttackRecord,
  context: AdversarialValidationContext,
): boolean {
  return (
    record.counts &&
    record.status === "bypass-found" &&
    record.bypassClassification !== "no-bypass" &&
    adversarialAttackFailures(record, context).length === 0
  );
}

export function assertAdversarialAuditedClaim(
  familyId: string,
  claimsAdversarialAudited: boolean,
  records: readonly AdversarialAttackRecord[],
  currentChallengeHash: string | null,
): void {
  if (!claimsAdversarialAudited) return;
  const hasClean = records.some((r) => isCountedNoBypassAudit(r, { currentChallengeHash }));
  if (!hasClean) {
    fail(
      "ADV_CLAIM_WITHOUT_NO_BYPASS_AUDIT",
      `adversarial.${familyId}`,
      "family claims adversarial-audited verifier integrity with zero counted no-bypass audits",
    );
  }
}
