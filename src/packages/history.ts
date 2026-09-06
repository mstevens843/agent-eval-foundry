import { readFileSync } from "node:fs";
import { join } from "node:path";
import { safePackagePath, sha256 } from "./record.js";

/** Explicit legacy scope: verifies retained report bytes, never claims to reproduce its old runtime. */
export function readLockedHistory(root: string, relative: string): unknown {
  safePackagePath(relative);
  const lock = JSON.parse(readFileSync(join(root, "data/package-history-lock.json"), "utf8"));
  if (lock.schemaVersion !== 1 || typeof lock.files?.[relative] !== "string")
    throw new Error(`HISTORICAL_IDENTITY_UNKNOWN: ${relative}`);
  const bytes = readFileSync(join(root, relative));
  if (sha256(bytes) !== lock.files[relative]) throw new Error(`HISTORICAL_BYTES_MISMATCH: ${relative}`);
  return JSON.parse(bytes.toString("utf8"));
}

export function historicalPhase13Calibration(root: string): readonly {
  readonly id: "dao-descendant" | "trading-reconciliation-recompute" | "deployment-rollback-recompute";
  readonly selected: Readonly<
    Record<
      | "referenceFailures"
      | "narrowTargetFailures"
      | "targetScenarios"
      | "narrowControlFailures"
      | "controls"
      | "narrowFailures"
      | "scenarios",
      number
    >
  >;
}[] {
  const value = readLockedHistory(root, "data/phase-13-activation-results.json") as Record<string, unknown>;
  if (value.schema !== "agent-eval-foundry/phase-13-transfer-results@1" || !Array.isArray(value.substrates))
    throw new Error("HISTORICAL_CALIBRATION_SCHEMA");
  const expected = new Set([
    "dao-descendant",
    "trading-reconciliation-recompute",
    "deployment-rollback-recompute",
  ]);
  const fields = [
    "referenceFailures",
    "narrowTargetFailures",
    "targetScenarios",
    "narrowControlFailures",
    "controls",
    "narrowFailures",
    "scenarios",
  ] as const;
  const rows = value.substrates.map((row) => {
    if (!expected.delete(row.id)) throw new Error("HISTORICAL_CALIBRATION_FAMILY");
    for (const key of fields)
      if (!Number.isSafeInteger(row.selected?.[key]) || row.selected[key] < 0)
        throw new Error(`HISTORICAL_CALIBRATION_COUNT: ${key}`);
    return {
      id: row.id as "dao-descendant" | "trading-reconciliation-recompute" | "deployment-rollback-recompute",
      selected: row.selected as Record<(typeof fields)[number], number>,
    };
  });
  if (expected.size) throw new Error("HISTORICAL_CALIBRATION_INCOMPLETE");
  return rows;
}
