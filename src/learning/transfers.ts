import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { writeEvidence } from "../execution/artifacts.js";
import { safeId } from "../execution/store.js";
import { canonicalJson, sha256 } from "../packages/record.js";
import { type LearningView, type TransferRecord, assessTransfer } from "./findings.js";

export interface TransferRevision {
  schemaVersion: 1;
  revision: number;
  previous: string | null;
  record: TransferRecord;
  digest: string;
}
const EMPTY: LearningView = { schemaVersion: 1, digest: "", claims: [], sources: [] };
function validateStep(next: TransferRevision, prior?: TransferRevision) {
  assessTransfer(next.record, EMPTY);
  const { digest, ...body } = next;
  if (
    next.schemaVersion !== 1 ||
    next.revision !== (prior?.revision ?? 0) + 1 ||
    next.previous !== (prior?.digest ?? null) ||
    digest !== sha256(canonicalJson(body))
  )
    throw Error("TRANSFER_HISTORY_BROKEN");
  if (
    prior &&
    (canonicalJson(next.record.target) !== canonicalJson(prior.record.target) ||
      next.record.id !== prior.record.id ||
      next.record.category !== prior.record.category ||
      next.record.source.findingId !== prior.record.source.findingId ||
      next.record.source.claimId !== prior.record.source.claimId ||
      canonicalJson(next.record.exposures.slice(0, prior.record.exposures.length)) !==
        canonicalJson(prior.record.exposures))
  )
    throw Error("TRANSFER_IDENTITY_OR_EXPOSURE_RESET");
}
export function loadTransfers(store: string): TransferRevision[] {
  if (!existsSync(store)) return [];
  const heads: TransferRevision[] = [];
  for (const dir of readdirSync(store, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    safeId(dir.name);
    let prior: TransferRevision | undefined;
    for (const name of readdirSync(join(store, dir.name))
      .filter((n) => /^\d{6}\.json$/.test(n))
      .sort()) {
      const next = JSON.parse(readFileSync(join(store, dir.name, name), "utf8")) as TransferRevision;
      validateStep(next, prior);
      if (next.record.id !== dir.name || name !== `${String(next.revision).padStart(6, "0")}.json`)
        throw Error("TRANSFER_HISTORY_BROKEN");
      prior = next;
    }
    if (prior) heads.push(prior);
  }
  return heads;
}
/** Explicit append only. Prior exposure survives rewording or a source correction. */
export function appendTransfer(store: string, record: TransferRecord, previous: string | null) {
  safeId(record.id);
  const prior = loadTransfers(store).find((r) => r.record.id === record.id);
  const body = { schemaVersion: 1 as const, revision: (prior?.revision ?? 0) + 1, previous, record };
  const next = { ...body, digest: sha256(canonicalJson(body)) };
  validateStep(next, prior);
  const dir = join(store, record.id);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeEvidence(join(dir, `${String(next.revision).padStart(6, "0")}.json`), next);
  return next;
}
/** Exposure follows the exact target across transfer aliases, not just one convenient record. */
export function assessStoredTransfers(store: string, learning: LearningView) {
  const heads = loadTransfers(store);
  const exposures = new Map<string, Map<string, TransferRecord["exposures"][number]>>();
  for (const { record } of heads) {
    let seen = exposures.get(record.target.packageDigest);
    if (!seen) {
      seen = new Map();
      exposures.set(record.target.packageDigest, seen);
    }
    for (const e of record.exposures) seen.set(canonicalJson(e), e);
  }
  return heads.map((r) => ({
    revision: r.digest,
    assessment: assessTransfer(
      { ...r.record, exposures: [...(exposures.get(r.record.target.packageDigest)?.values() ?? [])] },
      learning,
    ),
  }));
}
