import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { FamilyEvidence, VerifierIntegrityEvidence } from "../reports/ship-report.js";
import { auditAdversarialReadinessForFamilies } from "./readiness.js";
import {
  ADVERSARIAL_AUDIT_STATUSES,
  type AdversarialAttackRecord,
  type AdversarialAuditStatus,
  type AdversarialEvidenceSummary,
  BYPASS_CLASSES,
  type BypassClass,
  type LoadedAdversarialAttack,
} from "./types.js";
import {
  adversarialAttackFailures,
  assertAdversarialAttackRecordCounts,
  isCountedBypassAudit,
  isCountedNoBypassAudit,
  parseAdversarialAttackRecord,
} from "./validate.js";

const emptyStatusCounts = (): Record<AdversarialAuditStatus, number> =>
  Object.fromEntries(ADVERSARIAL_AUDIT_STATUSES.map((status) => [status, 0])) as Record<
    AdversarialAuditStatus,
    number
  >;

const emptyBypassCounts = (): Record<BypassClass, number> =>
  Object.fromEntries(BYPASS_CLASSES.map((kind) => [kind, 0])) as Record<BypassClass, number>;

function readTextTree(dir: string, prefix = ""): string {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const next = join(dir, entry.name);
      const rel = `${prefix}${entry.name}`;
      return entry.isDirectory()
        ? readTextTree(next, `${rel}/`)
        : [`--- ${rel} ---\n${readFileSync(next, "utf8")}`];
    })
    .join("\n");
}

function readMaybe(path: string | null, dir: string): string | null {
  if (path === null) return null;
  const full = join(dir, path);
  if (!existsSync(full)) return null;
  return statSync(full).isDirectory() ? readTextTree(full) : readFileSync(full, "utf8");
}

export function loadAdversarialAttackRecords(root: string): readonly LoadedAdversarialAttack[] {
  const base = join(root, "adversarial-audits", "runs");
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .flatMap((name) => {
      const dir = join(base, name);
      const metadata = join(dir, "metadata.json");
      if (!existsSync(metadata)) return [];
      const record = parseAdversarialAttackRecord(JSON.parse(readFileSync(metadata, "utf8")), metadata);
      return [
        {
          dir,
          record,
          transcriptText: readMaybe(record.transcriptPath, dir),
          exploitText: readMaybe(record.exploitArtifactPath, dir),
          verifierText: readMaybe(record.verifier.outputPath, dir),
        },
      ];
    });
}

export function assertAdversarialAuditsValid(root: string): void {
  const current = new Map(
    auditAdversarialReadinessForFamilies(root).map((audit) => [audit.familyId, audit.packageHash]),
  );
  for (const loaded of loadAdversarialAttackRecords(root)) {
    assertAdversarialAttackRecordCounts(loaded.record, {
      currentChallengeHash: current.get(loaded.record.familyId) ?? null,
      transcriptText: loaded.transcriptText,
      exploitText: loaded.exploitText,
      verifierText: loaded.verifierText,
    });
  }
}

export function summarizeAdversarialEvidence(
  root: string,
  attacks: readonly LoadedAdversarialAttack[] = loadAdversarialAttackRecords(root),
): readonly AdversarialEvidenceSummary[] {
  const audits = auditAdversarialReadinessForFamilies(root);
  const current = new Map(audits.map((a) => [a.familyId, a.packageHash]));
  const byFamily = new Map<string, LoadedAdversarialAttack[]>();
  for (const loaded of attacks) {
    byFamily.set(loaded.record.familyId, [...(byFamily.get(loaded.record.familyId) ?? []), loaded]);
  }

  return audits.map((audit) => {
    const loaded = byFamily.get(audit.familyId) ?? [];
    const statusCounts = emptyStatusCounts();
    const bypassCounts = emptyBypassCounts();
    let countedNoBypassAudits = 0;
    let countedBypassAudits = 0;
    let uncountedRecords = 0;
    let invalidCountedRecords = 0;
    let unrepairedBypasses = 0;
    let repairedBypasses = 0;
    const validationFailures: { attackId: string; codes: readonly string[] }[] = [];
    for (const item of loaded) {
      const record = item.record;
      statusCounts[record.status] += 1;
      bypassCounts[record.bypassClassification] += 1;
      const context = {
        currentChallengeHash: current.get(record.familyId) ?? null,
        transcriptText: item.transcriptText,
        exploitText: item.exploitText,
        verifierText: item.verifierText,
      };
      const failures = adversarialAttackFailures(record, context);
      if (!record.counts) uncountedRecords += 1;
      else if (failures.length > 0) invalidCountedRecords += 1;
      if (failures.length > 0) {
        validationFailures.push({ attackId: record.attackId, codes: failures.map((f) => f.code) });
      }
      if (isCountedNoBypassAudit(record, context)) countedNoBypassAudits += 1;
      if (isCountedBypassAudit(record, context)) {
        countedBypassAudits += 1;
        if (record.repair.status === "fixed" || record.repair.status === "superseded") repairedBypasses += 1;
        else unrepairedBypasses += 1;
      }
    }
    const claimLevel =
      unrepairedBypasses > 0
        ? "bypass-found"
        : repairedBypasses > 0
          ? "bypass-repaired"
          : countedNoBypassAudits > 0
            ? "adversarial-audited"
            : audit.verdict === "adversarial-ready"
              ? "adversarial-ready"
              : "audit-pending";
    return {
      familyId: audit.familyId,
      packageHash: audit.packageHash,
      adversarialReady: audit.verdict === "adversarial-ready",
      campaignId: audit.campaignId,
      auditRecords: loaded.length,
      countedNoBypassAudits,
      countedBypassAudits,
      uncountedRecords,
      invalidCountedRecords,
      unrepairedBypasses,
      repairedBypasses,
      claimLevel,
      statusCounts,
      bypassCounts,
      validationFailures,
    };
  });
}

export function adversarialGateEvidenceMap(
  summaries: readonly AdversarialEvidenceSummary[],
): Record<string, VerifierIntegrityEvidence> {
  return Object.fromEntries(
    summaries.map((s) => [
      s.familyId,
      {
        familyId: s.familyId,
        adversarialThreatModelDeclared: s.campaignId !== null,
        adversarialPackageReady: s.adversarialReady,
        adversarialPackageReadyDetail: s.adversarialReady
          ? "adversarial campaign, package hash and attack bundle are ready"
          : "adversarial campaign or attack bundle is incomplete",
        countedNoBypassAudits: s.countedNoBypassAudits,
        countedBypassAudits: s.countedBypassAudits,
        unrepairedBypasses: s.unrepairedBypasses,
        repairedBypasses: s.repairedBypasses,
        adversarialAuditRecords: s.auditRecords,
        adversarialClaimLevel: s.claimLevel,
      },
    ]),
  );
}

export function augmentAdversarialEvidenceMap(
  root: string,
  evidence: Readonly<Record<string, FamilyEvidence>>,
): Record<string, FamilyEvidence> {
  const adversarial = new Map(Object.entries(adversarialGateEvidenceMap(summarizeAdversarialEvidence(root))));
  return Object.fromEntries(
    Object.entries(evidence).map(([familyId, row]) => {
      const a = adversarial.get(familyId);
      if (a === undefined) return [familyId, row];
      return [familyId, { ...row, ...a }];
    }),
  );
}

export function attacksForFamily(
  attacks: readonly LoadedAdversarialAttack[],
  familyId: string,
): readonly AdversarialAttackRecord[] {
  return attacks.filter((attack) => attack.record.familyId === familyId).map((attack) => attack.record);
}
