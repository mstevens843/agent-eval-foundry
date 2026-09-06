import type { TrialCell } from "./types.js";

export type EvaluationStatus =
  | "semantic-pass"
  | "semantic-fail"
  | "provider-failure"
  | "artifact-failure"
  | "collector-failure"
  | "verifier-failure"
  | "invalid-evidence";
export interface EvaluationOutcome {
  readonly schemaVersion: 1;
  readonly status: EvaluationStatus;
  readonly complete: boolean;
  readonly expectedIds: readonly string[];
  readonly expectedCheckIds: readonly string[] | null;
  readonly observedIds: readonly string[];
  readonly missingIds: readonly string[];
  readonly unexpectedIds: readonly string[];
  readonly duplicateIds: readonly string[];
  readonly problems: readonly string[];
}
export interface EvaluationInput {
  readonly providerStatus: string;
  readonly expectedIds: readonly string[];
  readonly expectedCheckIds?: readonly string[];
  readonly cells: unknown;
  readonly hostErrors: number;
  readonly artifactPresent: boolean;
  readonly errorStage?: "artifact" | "collector" | "verifier";
}
const validId = (id: unknown): id is string => typeof id === "string" && id.trim().length > 0;

/** Linear exact-set accounting. Counts alone cannot distinguish omissions from repeated results. */
export function evaluateOutcome(input: EvaluationInput): EvaluationOutcome {
  const problems: string[] = [];
  const expected = new Set(input.expectedIds);
  const checks = input.expectedCheckIds === undefined ? null : new Set(input.expectedCheckIds);
  if (
    checks &&
    (!checks.size || checks.size !== input.expectedCheckIds?.length || [...checks].some((id) => !validId(id)))
  )
    problems.push("invalid-expected-check-set");
  if (
    !expected.size ||
    expected.size !== input.expectedIds.length ||
    input.expectedIds.some((id) => !validId(id))
  )
    problems.push("invalid-expected-scenario-set");
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  let semanticFailures = 0;
  if (!Array.isArray(input.cells) || input.cells.length === 0) problems.push("empty-or-malformed-cells");
  for (const raw of Array.isArray(input.cells) ? input.cells : []) {
    if (raw === null || typeof raw !== "object") {
      problems.push("malformed-cell");
      continue;
    }
    const cell = raw as TrialCell;
    if (!validId(cell.scenarioId)) {
      problems.push("invalid-scenario-id");
      continue;
    }
    if (seen.has(cell.scenarioId)) duplicates.add(cell.scenarioId);
    seen.add(cell.scenarioId);
    if (
      !Array.isArray(cell.failed) ||
      cell.failed.some((id) => !validId(id)) ||
      new Set(cell.failed).size !== cell.failed.length
    )
      problems.push(`invalid-check-list:${cell.scenarioId}`);
    else {
      semanticFailures += cell.failed.length;
      if (checks && cell.failed.some((id) => !checks.has(id)))
        problems.push(`unknown-failed-check:${cell.scenarioId}`);
    }
    if (Object.keys(raw).some((key) => !["scenarioId", "failed", "unmeasured"].includes(key)))
      problems.push(`malformed-cell-envelope:${cell.scenarioId}`);
    if (cell.unmeasured !== undefined || "error" in raw || "hostError" in raw || "status" in raw)
      problems.push(`ungraded-or-error-envelope:${cell.scenarioId}`);
  }
  const missing = [...expected].filter((id) => !seen.has(id));
  const unexpected = [...seen].filter((id) => !expected.has(id));
  if (duplicates.size) problems.push("duplicate-scenario-results");
  if (missing.length) problems.push("missing-scenario-results");
  if (unexpected.length) problems.push("unexpected-scenario-results");
  if (!Number.isSafeInteger(input.hostErrors) || input.hostErrors < 0)
    problems.push("invalid-host-error-count");
  const status: EvaluationStatus =
    input.providerStatus !== "completed"
      ? "provider-failure"
      : !input.artifactPresent || input.errorStage === "artifact"
        ? "artifact-failure"
        : input.errorStage === "verifier"
          ? "verifier-failure"
          : input.hostErrors > 0 || input.errorStage === "collector"
            ? "collector-failure"
            : problems.length
              ? "invalid-evidence"
              : semanticFailures > 0
                ? "semantic-fail"
                : "semantic-pass";
  return {
    schemaVersion: 1,
    status,
    complete: status === "semantic-pass" || status === "semantic-fail",
    expectedIds: [...input.expectedIds],
    expectedCheckIds: input.expectedCheckIds ? [...input.expectedCheckIds] : null,
    observedIds: [...seen],
    missingIds: missing,
    unexpectedIds: unexpected,
    duplicateIds: [...duplicates],
    problems: [...new Set(problems)],
  };
}
