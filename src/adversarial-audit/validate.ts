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
  ADVERSARIAL_VERIFIER_STATUSES,
  type AdversarialAttackRecord,
  type AdversarialAttacker,
  type AdversarialRepairRecord,
  type AdversarialValidationFailure,
  type AdversarialVerifierResult,
  BYPASS_CLASSES,
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

export function parseAdversarialAttackRecord(v: unknown, path: string): AdversarialAttackRecord {
  const o = isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");
  return {
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
}

const nonEmpty = (s: string | null | undefined): boolean => typeof s === "string" && s.trim().length > 0;

const hasTextOrPath = (path: string | null, text: string | null | undefined, textKnown: boolean): boolean => {
  if (textKnown) return nonEmpty(text);
  return nonEmpty(text) || nonEmpty(path);
};

function advFailure(code: RuleCode, path: string, detail: string): AdversarialValidationFailure {
  return { code, path, detail };
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
