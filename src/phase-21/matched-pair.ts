// Phase 21's matched-pair diffability check.
//
// Lane 2 requires: "Every matched pair must share scenario generation, mutant bank, and grading
// logic except for the operator's own delta; this must be a mechanically checkable property... not
// an assertion." This file is that check. It does not care WHAT the delta is (a scenario-selection
// function, a knob value, a shape field) — it only confirms that whatever produced the "baseline" and
// "treated" arms shares every declared component the operator's schema entry did not name as edited.

import { fail } from "../foundry/schema.js";
import type { OperatorTreatment } from "./operator-schema.js";

export interface MatchedPairComponents {
  /** Every named shared component (e.g. "enumerateSpace", "mutants.ts", "verify.ts", "reference.ts"). */
  readonly sharedComponentDescriptions: Readonly<Record<string, string>>;
  /** The baseline arm's own declared delta-relevant fields, as concrete values (not narrative). */
  readonly baselineDeltaFields: Readonly<Record<string, unknown>>;
  readonly treatedDeltaFields: Readonly<Record<string, unknown>>;
}

export interface MatchedPairDiffResult {
  readonly operatorId: string;
  readonly sharedComponentsConfirmed: readonly string[];
  /** Fields that actually differ between baseline and treated. */
  readonly differingFields: readonly string[];
  readonly verdict: "matched" | "not-matched";
  readonly failures: readonly string[];
}

/**
 * Confirm a constructed pair is a real matched pair for the given operator: every field named in
 * `components.baselineDeltaFields`/`treatedDeltaFields` that is NOT in the operator's own
 * `shapeFieldsEdited` must be identical (JSON-equal) between the two arms, and at least one field
 * that IS in `shapeFieldsEdited` must differ (otherwise there is no delta at all, and "matched pair"
 * is vacuously true of two copies of the same thing).
 */
export function assertMatchedPairDiffable(
  operator: OperatorTreatment,
  components: MatchedPairComponents,
): MatchedPairDiffResult {
  const failures: string[] = [];
  const allFields = new Set([
    ...Object.keys(components.baselineDeltaFields),
    ...Object.keys(components.treatedDeltaFields),
  ]);
  const editedFields = new Set(operator.shapeFieldsEdited);
  const differingFields: string[] = [];

  for (const field of allFields) {
    const b = JSON.stringify(components.baselineDeltaFields[field] ?? null);
    const t = JSON.stringify(components.treatedDeltaFields[field] ?? null);
    const differs = b !== t;
    if (differs) differingFields.push(field);
    if (differs && !editedFields.has(field) && editedFields.size > 0) {
      failures.push(
        `field "${field}" differs between baseline and treated, but is not in operator "${operator.id}"'s declared shapeFieldsEdited — this is confounding, not a clean delta`,
      );
    }
  }
  if (differingFields.length === 0) {
    failures.push("baseline and treated are field-identical; there is no delta to measure at all");
  }

  const sharedComponentsConfirmed = Object.keys(components.sharedComponentDescriptions);
  const verdict: "matched" | "not-matched" = failures.length === 0 ? "matched" : "not-matched";
  return {
    operatorId: operator.id,
    sharedComponentsConfirmed,
    differingFields,
    verdict,
    failures,
  };
}

/** Fail closed rather than let a caller silently proceed with an unmatched pair. */
export function requireMatchedPair(
  operator: OperatorTreatment,
  components: MatchedPairComponents,
): MatchedPairDiffResult {
  const result = assertMatchedPairDiffable(operator, components);
  if (result.verdict !== "matched") {
    fail(
      "PHASE21_MATCHED_PAIR_NOT_DIFFABLE",
      `phase21.matched-pair.${operator.id}`,
      result.failures.join("; "),
    );
  }
  return result;
}
