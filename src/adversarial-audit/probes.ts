import { ISOLATION_PROFILES } from "./isolation.js";
import { currentAdversarialPackageHash, verifierHashFor } from "./readiness.js";
import { triageAdversarialAttackRecord } from "./triage.js";
import type {
  AdversarialAttackRecord,
  AdversarialExploitReplayResult,
  AdversarialHardeningProbe,
  BypassClass,
  BypassTriageDecision,
  ExploitArtifactKind,
} from "./types.js";
import { adversarialAttackFailures } from "./validate.js";

interface ProbeSpec {
  readonly probeId: string;
  readonly bypassClass: BypassClass;
  readonly mutate: (record: AdversarialAttackRecord) => AdversarialAttackRecord;
  readonly replay?: (record: AdversarialAttackRecord) => AdversarialExploitReplayResult;
  readonly expectedRuleCode?: string;
  readonly expectedDecision?: BypassTriageDecision;
}

const replay = (
  record: AdversarialAttackRecord,
  status: AdversarialExploitReplayResult["status"],
  passed: boolean | null,
): AdversarialExploitReplayResult => ({
  ...record.exploitReplay,
  status,
  verifierPassed: passed,
  contractViolated: record.exploitArtifact.declaredContractViolation,
  forbiddenAccessUsed: record.exploitArtifact.usesForbiddenAccess,
  detail: `deterministic probe replay: ${status}`,
});

const exploit = (
  kind: ExploitArtifactKind,
  bypassClass: BypassClass,
  contractViolation: boolean,
): Pick<
  AdversarialAttackRecord,
  | "status"
  | "bypassClassification"
  | "exploitArtifactPath"
  | "submittedBypassArtifactPath"
  | "exploitArtifact"
  | "verifier"
> => ({
  status: "bypass-found",
  bypassClassification: bypassClass,
  exploitArtifactPath: "exploit/artifact.json",
  submittedBypassArtifactPath: "submitted-bypass/subject.mjs",
  exploitArtifact: {
    kind,
    path: "exploit/artifact.json",
    submittedArtifactPath: "submitted-bypass/subject.mjs",
    declaredContractViolation: contractViolation,
    usesForbiddenAccess: false,
    replaysWithCurrentVerifier: null,
    notes: "deterministic hardening probe",
  },
  verifier: {
    status: "bypass-confirmed",
    command: "foundry adversarial probe",
    outputPath: "verifier-output.json",
    detail: "probe-only verifier output",
  },
});

const bypassTriage = (
  record: AdversarialAttackRecord,
  contractViolated: boolean,
  verifierPasses: boolean,
): AdversarialAttackRecord["triage"] => ({
  ...record.triage,
  decision: "bypass-confirmed",
  exploitArtifactProduced: true,
  exploitReplays: verifierPasses,
  verifierPasses,
  contractViolated,
  verifierConfirmsNoBypass: false,
});

const replayState = (
  record: AdversarialAttackRecord,
  status: AdversarialExploitReplayResult["status"],
  verifierPassed: boolean | null,
  contractViolated: boolean,
  forbiddenAccessUsed = false,
): AdversarialAttackRecord["exploitReplay"] => ({
  ...record.exploitReplay,
  status,
  verifierPassed,
  contractViolated,
  forbiddenAccessUsed,
  detail: `deterministic probe replay: ${status}`,
});

function baseRecord(root: string, familyId: string): AdversarialAttackRecord {
  const hash = currentAdversarialPackageHash(root, familyId);
  return {
    auditVersion: "v2",
    attackId: `probe-${familyId}`,
    campaignId: `${familyId}-adversarial`,
    familyId,
    status: "no-bypass-found",
    counts: true,
    countabilityReason: "deterministic probe fixture",
    challengeHash: hash,
    verifierHash: verifierHashFor(root, familyId),
    attacker: {
      provider: "local-deterministic-probe",
      model: "local/deterministic-probe",
      subjectId: "deterministic-probe",
    },
    attackSurface: ["challenge split", "verifier trust boundary"],
    allowedAttackerAccess: ["public adversarial bundle"],
    forbiddenAttackerAccess: ["hidden verifier", "reference", "hidden scenarios"],
    attackerContextFiles: ["ATTACKER-INSTRUCTION.txt", "THREAT-MODEL.md", "challenge/README.md"],
    hiddenArtifactsInAttackerContext: [],
    transcriptPath: "transcript.txt",
    exploitArtifactPath: null,
    submittedBypassArtifactPath: null,
    verifier: {
      status: "no-bypass-confirmed",
      command: "foundry adversarial probe",
      outputPath: "verifier-output.json",
      detail: "probe-only verifier output",
    },
    bypassClassification: "no-bypass",
    repair: {
      status: "not-needed",
      repairId: null,
      changedChallengePackage: false,
      invalidatedAuditIds: [],
      notes: "",
    },
    executionProfile: {
      kind: "local-deterministic-probe",
      command: "foundry adversarial probe",
      providerRunnable: true,
      attemptedBypass: true,
      submittedNormalSolution: false,
      theoreticalOnly: false,
      notes: "deterministic local bypass probe",
    },
    isolationProfile: ISOLATION_PROFILES["fs-sandbox"],
    exploitArtifact: {
      kind: "none",
      path: null,
      submittedArtifactPath: null,
      declaredContractViolation: false,
      usesForbiddenAccess: false,
      replaysWithCurrentVerifier: null,
      notes: "probe no-artifact baseline",
    },
    exploitReplay: {
      status: "no-artifact",
      command: "foundry adversarial probe",
      outputPath: "exploit-replay-output.json",
      challengeHash: hash,
      verifierHash: verifierHashFor(root, familyId),
      verifierPassed: false,
      contractViolated: false,
      forbiddenAccessUsed: false,
      detail: "probe no-artifact baseline",
    },
    triage: {
      decision: "no-bypass-confirmed",
      attackerAttemptedBypass: true,
      submittedNormalSolution: false,
      theoreticalOnly: false,
      exploitArtifactProduced: false,
      exploitReplays: false,
      verifierPasses: false,
      contractViolated: false,
      forbiddenAccessUsed: false,
      verifierConfirmsNoBypass: true,
      countabilityReason: "probe no-bypass baseline",
    },
    startedAt: "2026-08-31T00:00:00Z",
    endedAt: "2026-08-31T00:00:01Z",
    runtimeSeconds: 1,
    notes: "deterministic local hardening probe",
  };
}

const PROBES: readonly ProbeSpec[] = [
  {
    probeId: "hidden-artifact-leak",
    bypassClass: "hidden-artifact-leak",
    expectedRuleCode: "ADV_HIDDEN_ARTIFACT_IN_ATTACKER_CONTEXT",
    mutate: (r) => ({
      ...r,
      hiddenArtifactsInAttackerContext: ["src/families/ui-replay-live-dom/verify.ts"],
    }),
  },
  {
    probeId: "ground-truth-rebinding",
    bypassClass: "ground-truth-rebinding",
    expectedRuleCode: "ADV_V2_COUNTED_BYPASS_FORBIDDEN_ACCESS",
    expectedDecision: "forbidden-access",
    mutate: (r) => {
      const e = exploit("submitted-bypass", "ground-truth-rebinding", true);
      return {
        ...r,
        ...e,
        exploitArtifact: { ...e.exploitArtifact, usesForbiddenAccess: true },
        exploitReplay: replayState(r, "replay-passed-verifier", true, true, true),
        triage: bypassTriage(r, true, true),
      };
    },
    replay: (r) => replay(r, "forbidden-access", null),
  },
  {
    probeId: "ledger-forgery",
    bypassClass: "ledger-forgery",
    expectedRuleCode: "ADV_V2_COUNTED_BYPASS_NO_CONTRACT_VIOLATION",
    mutate: (r) => ({
      ...r,
      ...exploit("ledger-forgery", "ledger-forgery", false),
      exploitReplay: replayState(r, "replay-passed-verifier", true, false),
      triage: bypassTriage(r, false, true),
    }),
    replay: (r) => replay(r, "replay-passed-verifier", true),
  },
  {
    probeId: "verifier-import-hijack",
    bypassClass: "verifier-import-hijack",
    expectedRuleCode: "ADV_V2_COUNTED_BYPASS_FORBIDDEN_ACCESS",
    expectedDecision: "forbidden-access",
    mutate: (r) => {
      const e = exploit("import-hijack", "verifier-import-hijack", true);
      return {
        ...r,
        ...e,
        exploitArtifact: { ...e.exploitArtifact, usesForbiddenAccess: true },
        exploitReplay: replayState(r, "replay-passed-verifier", true, true, true),
        triage: bypassTriage(r, true, true),
      };
    },
    replay: (r) => replay(r, "forbidden-access", null),
  },
  {
    probeId: "process-boundary-escape",
    bypassClass: "process-boundary-escape",
    expectedRuleCode: "ADV_V2_COUNTED_BYPASS_FORBIDDEN_ACCESS",
    expectedDecision: "forbidden-access",
    mutate: (r) => {
      const e = exploit("process-boundary-escape", "process-boundary-escape", true);
      return {
        ...r,
        ...e,
        exploitArtifact: { ...e.exploitArtifact, usesForbiddenAccess: true },
        exploitReplay: replayState(r, "replay-passed-verifier", true, true, true),
        triage: bypassTriage(r, true, true),
      };
    },
    replay: (r) => replay(r, "forbidden-access", null),
  },
  {
    probeId: "challenge-hash-confusion",
    bypassClass: "challenge-hash-confusion",
    expectedRuleCode: "ADV_COUNTED_HASH_STALE",
    mutate: (r) => ({
      ...r,
      challengeHash: "stale-probe-hash",
      bypassClassification: "challenge-hash-confusion",
    }),
  },
  {
    probeId: "baseline-imposter",
    bypassClass: "baseline-imposter",
    expectedRuleCode: "ADV_V2_COUNTED_NORMAL_SOLUTION",
    expectedDecision: "normal-solution",
    mutate: (r) => ({
      ...r,
      ...exploit("normal-solution", "baseline-imposter", false),
      executionProfile: { ...r.executionProfile, submittedNormalSolution: true },
      exploitReplay: replayState(r, "normal-solution", null, false),
      triage: { ...r.triage, decision: "normal-solution", submittedNormalSolution: true },
    }),
    replay: (r) => replay(r, "normal-solution", null),
  },
  {
    probeId: "status-only-fake-success",
    bypassClass: "status-only-fake",
    expectedRuleCode: "ADV_V2_COUNTED_BYPASS_NO_CONTRACT_VIOLATION",
    mutate: (r) => ({
      ...r,
      ...exploit("submitted-bypass", "status-only-fake", false),
      exploitReplay: replayState(r, "replay-passed-verifier", true, false),
      triage: bypassTriage(r, false, true),
    }),
    replay: (r) => replay(r, "replay-passed-verifier", true),
  },
  {
    probeId: "artifact-substitution",
    bypassClass: "artifact-substitution",
    expectedRuleCode: "ADV_V2_COUNTED_BYPASS_REPLAY_NOT_PASSING",
    mutate: (r) => ({
      ...r,
      ...exploit("submitted-bypass", "artifact-substitution", true),
      exploitReplay: replayState(r, "replay-failed-verifier", false, true),
      triage: bypassTriage(r, true, false),
    }),
    replay: (r) => replay(r, "replay-failed-verifier", false),
  },
  {
    probeId: "environment-assumption",
    bypassClass: "environment-assumption",
    expectedRuleCode: "ADV_V2_COUNTED_NO_BYPASS_THEORETICAL_ONLY",
    expectedDecision: "theoretical-only",
    mutate: (r) => ({
      ...r,
      status: "no-bypass-found",
      bypassClassification: "environment-assumption",
      executionProfile: { ...r.executionProfile, theoreticalOnly: true },
      exploitArtifact: {
        ...r.exploitArtifact,
        kind: "theoretical-issue",
        path: "exploit/theoretical.md",
        declaredContractViolation: true,
      },
      exploitArtifactPath: "exploit/theoretical.md",
      exploitReplay: replayState(r, "replay-blocked", false, true),
    }),
    replay: (r) => replay(r, "replay-blocked", false),
  },
  {
    probeId: "scorer-output-forgery",
    bypassClass: "scorer-output-forgery",
    expectedRuleCode: "ADV_V2_COUNTED_BYPASS_NO_CONTRACT_VIOLATION",
    mutate: (r) => ({
      ...r,
      ...exploit("scorer-output-forgery", "scorer-output-forgery", false),
      exploitReplay: replayState(r, "replay-passed-verifier", true, false),
      triage: bypassTriage(r, false, true),
    }),
    replay: (r) => replay(r, "replay-passed-verifier", true),
  },
  {
    probeId: "missing-transcript-countability-fraud",
    bypassClass: "no-bypass",
    expectedRuleCode: "ADV_COUNTED_NO_TRANSCRIPT",
    mutate: (r) => ({ ...r, transcriptPath: null }),
  },
  {
    probeId: "stale-package-attack",
    bypassClass: "challenge-hash-confusion",
    expectedRuleCode: "ADV_COUNTED_HASH_STALE",
    mutate: (r) => ({
      ...r,
      challengeHash: "old-package-hash",
      bypassClassification: "challenge-hash-confusion",
    }),
  },
];

export function runAdversarialHardeningProbes(
  root: string,
  familyId: string,
): readonly AdversarialHardeningProbe[] {
  const current = currentAdversarialPackageHash(root, familyId);
  return PROBES.map((probe) => {
    const record = probe.mutate(baseRecord(root, familyId));
    const replayResult = probe.replay?.(record) ?? record.exploitReplay;
    const triage = triageAdversarialAttackRecord(record, replayResult);
    const failures = adversarialAttackFailures(record, {
      currentChallengeHash: current,
      transcriptText: record.transcriptPath === null ? null : "probe transcript",
      exploitText: record.exploitArtifactPath === null ? null : "probe exploit",
      verifierText: "probe verifier output",
      hardeningProbesPass: true,
    });
    const codeOk =
      probe.expectedRuleCode === undefined ||
      failures.some((failure) => failure.code === probe.expectedRuleCode);
    const decisionOk = probe.expectedDecision === undefined || triage.decision === probe.expectedDecision;
    return {
      probeId: probe.probeId,
      familyId,
      bypassClass: probe.bypassClass,
      status: codeOk && decisionOk ? "pass" : "fail",
      expectedRuleCode: probe.expectedRuleCode ?? null,
      expectedDecision: probe.expectedDecision ?? null,
      detail:
        failures.length === 0
          ? `triage=${triage.decision}`
          : `rules=${failures.map((failure) => failure.code).join(", ")}; triage=${triage.decision}`,
    };
  });
}

export function runAllAdversarialHardeningProbes(
  root: string,
  familyIds: readonly string[],
): readonly AdversarialHardeningProbe[] {
  return familyIds.flatMap((familyId) => runAdversarialHardeningProbes(root, familyId));
}
