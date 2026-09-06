import { readFileSync } from "node:fs";
import { join } from "node:path";
import { safePackagePath } from "./record.js";

export interface ImplementationGap {
  readonly id: string;
  readonly source: string;
  readonly packageId: string | null;
  readonly owner: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly status: "implemented" | "verified" | "blocked" | "pending-external";
  readonly summary: string;
  readonly dependencies: readonly string[];
  readonly proof: readonly string[];
  readonly nextAction: string;
}
export function parseGapLedger(value: unknown): readonly ImplementationGap[] {
  if (!value || typeof value !== "object") throw new Error("GAP_LEDGER_SCHEMA");
  const top = value as Record<string, unknown>;
  if (top.schemaVersion !== 1 || !Array.isArray(top.gaps)) throw new Error("GAP_LEDGER_SCHEMA");
  const seen = new Set<string>();
  for (const row of top.gaps) {
    if (!row || typeof row !== "object") throw new Error("GAP_LEDGER_ROW");
    for (const field of ["id", "source", "summary", "nextAction"])
      if (typeof row[field] !== "string" || !row[field].trim()) throw new Error(`GAP_LEDGER_FIELD: ${field}`);
    if (seen.has(row.id)) throw new Error(`GAP_LEDGER_DUPLICATE: ${row.id}`);
    seen.add(row.id);
    if (!Number.isInteger(row.owner) || row.owner < 1 || row.owner > 7)
      throw new Error(`GAP_LEDGER_OWNER: ${row.id}`);
    if (!["implemented", "verified", "blocked", "pending-external"].includes(row.status))
      throw new Error(`GAP_LEDGER_STATUS: ${row.id}`);
    if (row.packageId !== null && (typeof row.packageId !== "string" || !row.packageId))
      throw new Error("GAP_LEDGER_PACKAGE");
    if (!Array.isArray(row.dependencies) || row.dependencies.some((id: unknown) => typeof id !== "string"))
      throw new Error("GAP_LEDGER_DEPENDENCIES");
    if (!Array.isArray(row.proof) || row.proof.some((p: unknown) => typeof p !== "string"))
      throw new Error("GAP_LEDGER_PROOF");
    for (const proof of row.proof) {
      safePackagePath(proof);
      if (proof.startsWith(".local/") || proof.startsWith("IMPLEMENTATION-PROMPTS/"))
        throw new Error("GAP_LEDGER_PRIVATE_RUNTIME_DEPENDENCY");
    }
    if (row.status === "verified" && !row.proof.length)
      throw new Error(`GAP_LEDGER_UNPROVEN_CLOSURE: ${row.id}`);
  }
  for (const row of top.gaps)
    for (const id of row.dependencies)
      if (!seen.has(id)) throw new Error(`GAP_LEDGER_UNKNOWN_DEPENDENCY: ${id}`);
  return top.gaps as ImplementationGap[];
}
export function loadGapLedger(root: string): readonly ImplementationGap[] {
  return parseGapLedger(JSON.parse(readFileSync(join(root, "data/implementation-gap-ledger.json"), "utf8")));
}
