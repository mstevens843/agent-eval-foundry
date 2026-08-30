import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { FamilyEvidence, HumanGateEvidence } from "../reports/ship-report.js";
import { auditHumanReadinessForFamilies } from "./readiness.js";
import {
  HUMAN_REVIEW_STATUSES,
  type HumanEvidenceSummary,
  type HumanReadinessAudit,
  type HumanReviewRecord,
  type HumanReviewStatus,
} from "./types.js";
import {
  assertHumanReviewRecordCounts,
  humanReviewFailures,
  isCleanHumanSolve,
  parseHumanReviewRecord,
} from "./validate.js";

export interface LoadedHumanReview {
  readonly dir: string;
  readonly record: HumanReviewRecord;
  readonly notesText: string | null;
  readonly transcriptText: string | null;
}

const emptyStatusCounts = (): Record<HumanReviewStatus, number> =>
  Object.fromEntries(HUMAN_REVIEW_STATUSES.map((status) => [status, 0])) as Record<HumanReviewStatus, number>;

function readMaybe(path: string | null, dir: string): string | null {
  if (path === null) return null;
  const full = join(dir, path);
  return existsSync(full) ? readFileSync(full, "utf8") : null;
}

export function loadHumanReviewRecords(root: string): readonly LoadedHumanReview[] {
  const base = join(root, "human-reviews");
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name !== "TEMPLATE")
    .sort()
    .flatMap((name) => {
      const dir = join(base, name);
      const metadata = join(dir, "metadata.json");
      if (!existsSync(metadata)) return [];
      const record = parseHumanReviewRecord(JSON.parse(readFileSync(metadata, "utf8")), metadata);
      return [
        {
          dir,
          record,
          notesText: readMaybe(record.notesPath, dir),
          transcriptText: readMaybe(record.transcriptPath, dir),
        },
      ];
    });
}

export function assertHumanReviewsValid(root: string): void {
  const audits = auditHumanReadinessForFamilies(root);
  const current = new Map(audits.map((a) => [a.familyId, a.packageHash]));
  for (const loaded of loadHumanReviewRecords(root)) {
    assertHumanReviewRecordCounts(loaded.record, {
      currentChallengeHash: current.get(loaded.record.familyId) ?? null,
      notesText: loaded.notesText,
      transcriptText: loaded.transcriptText,
    });
  }
}

export function summarizeHumanEvidence(
  audits: readonly HumanReadinessAudit[],
  reviews: readonly LoadedHumanReview[],
): readonly HumanEvidenceSummary[] {
  const current = new Map(audits.map((a) => [a.familyId, a.packageHash]));
  const byFamily = new Map<string, LoadedHumanReview[]>();
  for (const loaded of reviews) {
    byFamily.set(loaded.record.familyId, [...(byFamily.get(loaded.record.familyId) ?? []), loaded]);
  }

  return audits.map((audit) => {
    const loaded = byFamily.get(audit.familyId) ?? [];
    const statusCounts = emptyStatusCounts();
    let cleanHumanSolves = 0;
    let invalidCountedRecords = 0;
    let nonCountingRecords = 0;
    let unresolvedAmbiguities = 0;
    const validationFailures: { reviewId: string; codes: readonly string[] }[] = [];
    for (const item of loaded) {
      const record = item.record;
      statusCounts[record.status] += 1;
      unresolvedAmbiguities += record.ambiguityFindings.filter((a) => a.status === "open").length;
      const context = {
        currentChallengeHash: current.get(record.familyId) ?? null,
        notesText: item.notesText,
        transcriptText: item.transcriptText,
      };
      const failures = humanReviewFailures(record, context);
      if (!record.countsAsCleanRoomSolve) nonCountingRecords += 1;
      else if (failures.length > 0) invalidCountedRecords += 1;
      if (failures.length > 0) {
        validationFailures.push({ reviewId: record.reviewId, codes: failures.map((f) => f.code) });
      }
      if (isCleanHumanSolve(record, context)) cleanHumanSolves += 1;
    }
    const claimLevel =
      cleanHumanSolves > 0
        ? "human-evidenced"
        : audit.verdict === "human-ready"
          ? "human-ready"
          : "reference-solvable";
    return {
      familyId: audit.familyId,
      packageHash: audit.packageHash,
      humanPackageReady: audit.verdict === "human-ready",
      cleanHumanSolves,
      reviewRecords: loaded.length,
      nonCountingRecords,
      invalidCountedRecords,
      unresolvedAmbiguities,
      claimLevel,
      statusCounts,
      validationFailures,
    };
  });
}

export function humanEvidenceForFamilies(root: string): readonly HumanEvidenceSummary[] {
  return summarizeHumanEvidence(auditHumanReadinessForFamilies(root), loadHumanReviewRecords(root));
}

export function humanGateEvidenceMap(
  summaries: readonly HumanEvidenceSummary[],
): Record<string, HumanGateEvidence> {
  return Object.fromEntries(
    summaries.map((h) => [
      h.familyId,
      {
        familyId: h.familyId,
        humanPackageReady: h.humanPackageReady,
        humanPackageReadyDetail: h.humanPackageReady
          ? "public package passed human-readiness audit"
          : "public package is incomplete or not generated here",
        cleanHumanSolves: h.cleanHumanSolves,
        humanReviewRecords: h.reviewRecords,
        unresolvedHumanAmbiguities: h.unresolvedAmbiguities,
        humanClaimLevel: h.claimLevel,
      },
    ]),
  );
}

export function augmentFamilyEvidenceMap(
  root: string,
  evidence: Readonly<Record<string, FamilyEvidence>>,
): Record<string, FamilyEvidence> {
  const human = new Map(Object.entries(humanGateEvidenceMap(humanEvidenceForFamilies(root))));
  return Object.fromEntries(
    Object.entries(evidence).map(([familyId, row]) => {
      const h = human.get(familyId);
      if (h === undefined) return [familyId, row];
      return [
        familyId,
        {
          ...row,
          ...h,
        },
      ];
    }),
  );
}
