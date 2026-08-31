import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { routeFor } from "../trials/router.js";
import { currentAdversarialPackageHash, verifierHashFor } from "./readiness.js";
import { loadAdversarialAttackRecords } from "./records.js";
import { adversarialExploitArtifactFor, triageAdversarialAttackRecord } from "./triage.js";
import type {
  AdversarialAttackRecord,
  AdversarialBypassTriage,
  AdversarialExploitReplayResult,
} from "./types.js";

const nonEmpty = (s: string | null | undefined): s is string => typeof s === "string" && s.trim().length > 0;

function submittedModulePath(dir: string, path: string): string | null {
  const full = join(dir, path);
  if (!existsSync(full)) return null;
  if (statSync(full).isDirectory()) {
    const subject = join(full, "subject.mjs");
    return existsSync(subject) ? subject : null;
  }
  return basename(full).endsWith(".mjs") ? full : null;
}

export function replayAdversarialExploit(
  root: string,
  attackId: string,
): { readonly record: AdversarialAttackRecord; readonly replay: AdversarialExploitReplayResult } {
  const loaded = loadAdversarialAttackRecords(root).find((r) => r.record.attackId === attackId);
  if (loaded === undefined) throw new Error(`no adversarial audit record "${attackId}"`);
  return {
    record: loaded.record,
    replay: replayAdversarialExploitRecord(root, loaded.dir, loaded.record),
  };
}

export function replayAdversarialExploitRecord(
  root: string,
  dir: string,
  record: AdversarialAttackRecord,
): AdversarialExploitReplayResult {
  const challengeHash = currentAdversarialPackageHash(root, record.familyId);
  const verifierHash = verifierHashFor(root, record.familyId);
  const command = `foundry adversarial replay ${record.attackId}`;
  if (record.challengeHash === null || challengeHash === null || record.challengeHash !== challengeHash) {
    return {
      status: "stale-hash",
      command,
      outputPath: "exploit-replay-output.json",
      challengeHash,
      verifierHash,
      verifierPassed: null,
      contractViolated: false,
      forbiddenAccessUsed: false,
      detail: `record hash ${record.challengeHash ?? "none"} does not match current ${challengeHash ?? "none"}`,
    };
  }

  const artifact = adversarialExploitArtifactFor(record);
  if (artifact.kind === "none" || !nonEmpty(artifact.path)) {
    return {
      status: "no-artifact",
      command,
      outputPath: "exploit-replay-output.json",
      challengeHash,
      verifierHash,
      verifierPassed: false,
      contractViolated: false,
      forbiddenAccessUsed: false,
      detail: "attacker produced no exploit artifact",
    };
  }
  if (artifact.usesForbiddenAccess) {
    return {
      status: "forbidden-access",
      command,
      outputPath: "exploit-replay-output.json",
      challengeHash,
      verifierHash,
      verifierPassed: null,
      contractViolated: artifact.declaredContractViolation,
      forbiddenAccessUsed: true,
      detail: "exploit depends on forbidden access and is contamination rather than a counted bypass",
    };
  }
  if (artifact.kind === "theoretical-issue") {
    return {
      status: "replay-blocked",
      command,
      outputPath: "exploit-replay-output.json",
      challengeHash,
      verifierHash,
      verifierPassed: false,
      contractViolated: artifact.declaredContractViolation,
      forbiddenAccessUsed: false,
      detail: "theoretical issue did not include a replayable submitted artifact",
    };
  }
  if (artifact.kind === "normal-solution") {
    return {
      status: "normal-solution",
      command,
      outputPath: "exploit-replay-output.json",
      challengeHash,
      verifierHash,
      verifierPassed: null,
      contractViolated: false,
      forbiddenAccessUsed: false,
      detail: "artifact is classified as a normal solution, not a verifier bypass",
    };
  }
  const submittedArtifactPath = artifact.submittedArtifactPath;
  if (!nonEmpty(submittedArtifactPath)) {
    return {
      status: "replay-blocked",
      command,
      outputPath: "exploit-replay-output.json",
      challengeHash,
      verifierHash,
      verifierPassed: false,
      contractViolated: artifact.declaredContractViolation,
      forbiddenAccessUsed: false,
      detail: "no submitted bypass module path was preserved",
    };
  }

  const modulePath = submittedModulePath(dir, submittedArtifactPath);
  if (modulePath === null) {
    return {
      status: "replay-blocked",
      command,
      outputPath: "exploit-replay-output.json",
      challengeHash,
      verifierHash,
      verifierPassed: false,
      contractViolated: artifact.declaredContractViolation,
      forbiddenAccessUsed: false,
      detail: `submitted artifact ${submittedArtifactPath} was not a replayable ES module`,
    };
  }

  try {
    const result = routeFor(record.familyId).grade(modulePath);
    const verifierPassed = result.cells.length > 0 && result.cells.every((cell) => cell.failed.length === 0);
    return {
      status: verifierPassed
        ? artifact.declaredContractViolation
          ? "replay-passed-verifier"
          : "normal-solution"
        : "replay-failed-verifier",
      command,
      outputPath: "exploit-replay-output.json",
      challengeHash,
      verifierHash,
      verifierPassed,
      contractViolated: artifact.declaredContractViolation,
      forbiddenAccessUsed: false,
      detail: result.detail,
    };
  } catch (err) {
    return {
      status: "infrastructure-error",
      command,
      outputPath: "exploit-replay-output.json",
      challengeHash,
      verifierHash,
      verifierPassed: null,
      contractViolated: artifact.declaredContractViolation,
      forbiddenAccessUsed: false,
      detail: (err as Error).message,
    };
  }
}

export function triageAdversarialAttack(
  root: string,
  attackId: string,
): {
  readonly record: AdversarialAttackRecord;
  readonly replay: AdversarialExploitReplayResult;
  readonly triage: AdversarialBypassTriage;
} {
  const loaded = loadAdversarialAttackRecords(root).find((r) => r.record.attackId === attackId);
  if (loaded === undefined) throw new Error(`no adversarial audit record "${attackId}"`);
  const replay = replayAdversarialExploitRecord(root, loaded.dir, loaded.record);
  return {
    record: loaded.record,
    replay,
    triage: triageAdversarialAttackRecord(loaded.record, replay),
  };
}

export function renderReplayResult(
  record: AdversarialAttackRecord,
  replay: AdversarialExploitReplayResult,
): string {
  return [
    "Exploit replay",
    `attack     ${record.attackId}`,
    `family     ${record.familyId}`,
    `status     ${replay.status}`,
    `verifier   ${replay.verifierPassed === null ? "n/a" : replay.verifierPassed ? "pass" : "fail"}`,
    `contract   ${replay.contractViolated ? "violated" : "not violated"}`,
    `forbidden  ${replay.forbiddenAccessUsed ? "yes" : "no"}`,
    `detail     ${replay.detail}`,
    "",
  ].join("\n");
}

export function renderTriageResult(
  record: AdversarialAttackRecord,
  replay: AdversarialExploitReplayResult,
  triage: AdversarialBypassTriage,
): string {
  return [
    "Bypass triage",
    `attack       ${record.attackId}`,
    `family       ${record.familyId}`,
    `decision     ${triage.decision}`,
    `attempted    ${triage.attackerAttemptedBypass ? "yes" : "no"}`,
    `normal       ${triage.submittedNormalSolution ? "yes" : "no"}`,
    `theoretical  ${triage.theoreticalOnly ? "yes" : "no"}`,
    `artifact     ${triage.exploitArtifactProduced ? "yes" : "no"}`,
    `replay       ${replay.status}`,
    `counts       ${record.counts ? "yes" : "NO"} -- ${record.countabilityReason}`,
    `reason       ${triage.countabilityReason}`,
    "",
  ].join("\n");
}
