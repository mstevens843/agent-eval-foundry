import type {
  AdversarialAttackRecord,
  AdversarialBypassTriage,
  AdversarialExploitArtifact,
  AdversarialExploitReplayResult,
} from "./types.js";

const nonEmpty = (s: string | null | undefined): s is string => typeof s === "string" && s.trim().length > 0;

export function adversarialExploitArtifactFor(record: AdversarialAttackRecord): AdversarialExploitArtifact {
  return {
    ...record.exploitArtifact,
    path: record.exploitArtifact.path ?? record.exploitArtifactPath,
    submittedArtifactPath: record.exploitArtifact.submittedArtifactPath ?? record.submittedBypassArtifactPath,
  };
}

export function triageAdversarialAttackRecord(
  record: AdversarialAttackRecord,
  replay: AdversarialExploitReplayResult,
): AdversarialBypassTriage {
  const artifact = adversarialExploitArtifactFor(record);
  const attempted = record.executionProfile.attemptedBypass || record.status === "bypass-found";
  const normal = record.executionProfile.submittedNormalSolution || artifact.kind === "normal-solution";
  const theoretical = record.executionProfile.theoreticalOnly || artifact.kind === "theoretical-issue";
  const produced = artifact.kind !== "none" && nonEmpty(artifact.path);
  const passes = replay.status === "replay-passed-verifier" && replay.verifierPassed === true;
  const forbidden = artifact.usesForbiddenAccess || replay.forbiddenAccessUsed;
  const contract = artifact.declaredContractViolation || replay.contractViolated;

  if (
    record.status === "provider-refusal" ||
    record.status === "infrastructure-error" ||
    record.status === "timeout"
  ) {
    return {
      decision: "not-triaged",
      attackerAttemptedBypass: attempted,
      submittedNormalSolution: normal,
      theoreticalOnly: theoretical,
      exploitArtifactProduced: produced,
      exploitReplays: passes,
      verifierPasses: passes,
      contractViolated: contract,
      forbiddenAccessUsed: forbidden,
      verifierConfirmsNoBypass: false,
      countabilityReason: `${record.status}: preserved but not counted`,
    };
  }
  if (forbidden) {
    return {
      decision: "forbidden-access",
      attackerAttemptedBypass: attempted,
      submittedNormalSolution: normal,
      theoreticalOnly: theoretical,
      exploitArtifactProduced: produced,
      exploitReplays: passes,
      verifierPasses: passes,
      contractViolated: contract,
      forbiddenAccessUsed: true,
      verifierConfirmsNoBypass: false,
      countabilityReason: "exploit used forbidden access and is contamination",
    };
  }
  if (normal) {
    return {
      decision: "normal-solution",
      attackerAttemptedBypass: attempted,
      submittedNormalSolution: true,
      theoreticalOnly: theoretical,
      exploitArtifactProduced: produced,
      exploitReplays: passes,
      verifierPasses: passes,
      contractViolated: false,
      forbiddenAccessUsed: false,
      verifierConfirmsNoBypass: false,
      countabilityReason: "attacker submitted a normal solution rather than a verifier bypass",
    };
  }
  if (theoretical) {
    return {
      decision: "theoretical-only",
      attackerAttemptedBypass: attempted,
      submittedNormalSolution: false,
      theoreticalOnly: true,
      exploitArtifactProduced: produced,
      exploitReplays: false,
      verifierPasses: false,
      contractViolated: contract,
      forbiddenAccessUsed: false,
      verifierConfirmsNoBypass: false,
      countabilityReason: "attacker described a possible issue without replayable exploit evidence",
    };
  }
  if (record.status === "bypass-found" && passes && contract) {
    return {
      decision: "bypass-confirmed",
      attackerAttemptedBypass: attempted,
      submittedNormalSolution: false,
      theoreticalOnly: false,
      exploitArtifactProduced: produced,
      exploitReplays: true,
      verifierPasses: true,
      contractViolated: true,
      forbiddenAccessUsed: false,
      verifierConfirmsNoBypass: false,
      countabilityReason: "exploit replay passes the current verifier while violating the public contract",
    };
  }
  if (record.status === "bypass-found") {
    return {
      decision: "exploit-blocked",
      attackerAttemptedBypass: attempted,
      submittedNormalSolution: false,
      theoreticalOnly: false,
      exploitArtifactProduced: produced,
      exploitReplays: false,
      verifierPasses: passes,
      contractViolated: contract,
      forbiddenAccessUsed: false,
      verifierConfirmsNoBypass: false,
      countabilityReason: "claimed bypass does not replay as a passing contract-violating artifact",
    };
  }
  return {
    decision: "no-bypass-confirmed",
    attackerAttemptedBypass: attempted,
    submittedNormalSolution: false,
    theoreticalOnly: false,
    exploitArtifactProduced: produced,
    exploitReplays: false,
    verifierPasses: false,
    contractViolated: false,
    forbiddenAccessUsed: false,
    verifierConfirmsNoBypass:
      record.verifier.status === "no-bypass-confirmed" || record.status === "no-bypass-found",
    countabilityReason: "attacker attempted a bounded verifier-integrity audit and no bypass artifact passed",
  };
}
