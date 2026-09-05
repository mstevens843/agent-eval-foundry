// Phase 21's operator-treatment schema.
//
// WHY THIS IS A NEW SCHEMA RATHER THAN AN EXTENSION OF hardness-ledger.ts
//
// `src/foundry/hardness-ledger.ts`'s `HardnessOperatorEvidence` is a retrospective record: free-text
// `changed`/`stayedFixed`/`beforeEvidence`/`afterEvidence` describing what was already learned. It has
// no preconditions field, no structured/diffable delta, and no matched-pair (baseline vs treated)
// identifiers — because it was never meant to drive a NEW experiment, only to summarise a finished
// one. This schema is prospective: it describes an operator well enough, before any measurement runs,
// that a machine can check whether a substrate satisfies its preconditions and whether a constructed
// "treated" variant actually differs from its "baseline" ONLY in the declared way. Once an experiment
// concludes, `toHardnessOperatorEvidence` (in operator-ledger-bridge.ts) converts the result into a
// `HardnessOperatorEvidence`-shaped record, so the two systems stay linked rather than forking.
//
// The closed, non-vacuous style below (explicit enums, `fail` rather than silent coercion) matches
// every other parser in this repository — see src/trials/root-cause.ts and
// src/foundry/hardness-ledger.ts, which this file deliberately imitates rather than reinvents.

import { fail, isRecord } from "../foundry/schema.js";

/**
 * How a precondition is checked. `family-mechanism` and `family-not-grandfathered` are checked
 * against this repository's own registries (mechanism list, Phase 20's grandfathered-leak set);
 * `family-migrated` against `SECURELY_MIGRATED_FAMILIES`; `custom` is checked by hand and must say
 * exactly what was checked and how, in `detail`.
 */
export const PRECONDITION_KINDS = [
  "family-mechanism",
  "family-not-grandfathered",
  "family-migrated",
  "custom",
] as const;
export type PreconditionKind = (typeof PRECONDITION_KINDS)[number];

export interface OperatorPrecondition {
  readonly kind: PreconditionKind;
  /** What exactly is required. For `family-mechanism`, the mechanism id required. */
  readonly detail: string;
}

export const EVIDENCE_STATUSES = ["untested", "piloted", "measured"] as const;
export type OperatorEvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export interface OperatorTreatment {
  readonly id: string;
  /** One sentence: "applying this operator causes X, holding everything else fixed." */
  readonly causalClaim: string;
  /** Mechanism ids (from the mechanism registry) this operator is meant to make harder to shortcut. */
  readonly targetsMechanisms: readonly string[];
  readonly preconditions: readonly OperatorPrecondition[];
  /** The EXACT delta a treated variant makes. Precise enough that two implementations would agree. */
  readonly constructionDelta: string;
  /** What must NOT change between baseline and treated, stated as explicitly as the delta itself. */
  readonly staysFixed: string;
  /**
   * The declared TaskShape/scenario-generator fields this operator's delta touches. This is what
   * makes "everything else held fixed" mechanically checkable: a treated variant whose declared
   * fields differ from its baseline anywhere outside this list is not a matched pair.
   */
  readonly shapeFieldsEdited: readonly string[];
  /**
   * True if the operator's own causal claim depends on a defect's location or mechanism being
   * non-obvious from the visible package. An operator marked true here may not be piloted on a
   * family in the Phase 20 grandfathered-leak set (dao-descendant, trading-reconciliation-recompute,
   * deployment-rollback-recompute) until that family is re-baselined — the leak would confound
   * exactly what the operator claims to measure.
   */
  readonly legibilitySensitive: boolean;
  /**
   * False for a prerequisite/checklist item that is not itself a measurable treatment — e.g. an
   * "upgrade this family's isolation" step changes the harness, not the family, and produces no
   * shape delta at all. Phase 21 never pilots or measures an operator with measurable: false; it is
   * recorded here only so it is not silently reinvented as if it were a real operator.
   */
  readonly measurable: boolean;
  readonly evidenceStatus: OperatorEvidenceStatus;
  /** Existing repository evidence this operator's causal claim can already point to, if any. */
  readonly priorEvidence: readonly string[];
  /**
   * Family ids Lane 0's substrate audit confirmed CAN carry a matched pair for this operator today,
   * and which cannot yet plus why — required so a schema entry cannot claim measurability nobody
   * checked.
   */
  readonly candidateSubstrates: readonly string[];
  readonly excludedSubstrates: readonly { readonly familyId: string; readonly reason: string }[];
}

export interface OperatorTreatmentSchema {
  readonly schema: "agent-eval-foundry/phase-21-operator-schema@1";
  readonly extractedOn: string;
  readonly operators: readonly OperatorTreatment[];
}

const record = (value: unknown, path: string): Record<string, unknown> => {
  if (!isRecord(value)) fail("PHASE21_OPERATOR_SCHEMA_INVALID", path, "expected object");
  return value;
};

const text = (value: unknown, path: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    fail("PHASE21_OPERATOR_SCHEMA_INVALID", path, "expected non-empty string");
  }
  return value as string;
};

const bool = (value: unknown, path: string): boolean => {
  if (typeof value !== "boolean") {
    fail("PHASE21_OPERATOR_SCHEMA_INVALID", path, "expected boolean");
  }
  return value as boolean;
};

const stringArray = (value: unknown, path: string): readonly string[] => {
  if (!Array.isArray(value)) fail("PHASE21_OPERATOR_SCHEMA_INVALID", path, "expected array");
  return value.map((item, index) => text(item, `${path}[${index}]`));
};

function parsePrecondition(value: unknown, path: string): OperatorPrecondition {
  const row = record(value, path);
  const kind = text(row.kind, `${path}.kind`);
  if (!(PRECONDITION_KINDS as readonly string[]).includes(kind)) {
    fail(
      "PHASE21_OPERATOR_SCHEMA_INVALID",
      `${path}.kind`,
      `expected one of ${PRECONDITION_KINDS.join(" | ")}`,
    );
  }
  return { kind: kind as PreconditionKind, detail: text(row.detail, `${path}.detail`) };
}

function parseOperator(value: unknown, path: string): OperatorTreatment {
  const row = record(value, path);
  const evidenceStatus = text(row.evidenceStatus, `${path}.evidenceStatus`);
  if (!(EVIDENCE_STATUSES as readonly string[]).includes(evidenceStatus)) {
    fail(
      "PHASE21_OPERATOR_SCHEMA_INVALID",
      `${path}.evidenceStatus`,
      `expected one of ${EVIDENCE_STATUSES.join(" | ")}`,
    );
  }
  const preconditions = Array.isArray(row.preconditions)
    ? row.preconditions.map((p, i) => parsePrecondition(p, `${path}.preconditions[${i}]`))
    : fail("PHASE21_OPERATOR_SCHEMA_INVALID", `${path}.preconditions`, "expected array");
  const excluded = Array.isArray(row.excludedSubstrates)
    ? row.excludedSubstrates.map((e, i) => {
        const r = record(e, `${path}.excludedSubstrates[${i}]`);
        return {
          familyId: text(r.familyId, `${path}.excludedSubstrates[${i}].familyId`),
          reason: text(r.reason, `${path}.excludedSubstrates[${i}].reason`),
        };
      })
    : fail("PHASE21_OPERATOR_SCHEMA_INVALID", `${path}.excludedSubstrates`, "expected array");
  const measurable = bool(row.measurable, `${path}.measurable`);
  const legibilitySensitive = bool(row.legibilitySensitive, `${path}.legibilitySensitive`);
  if (!measurable && evidenceStatus !== "untested") {
    fail(
      "PHASE21_OPERATOR_SCHEMA_INVALID",
      `${path}.evidenceStatus`,
      "an operator marked measurable:false is a prerequisite checklist item, not a treatment; it cannot be piloted or measured",
    );
  }
  return {
    id: text(row.id, `${path}.id`),
    causalClaim: text(row.causalClaim, `${path}.causalClaim`),
    targetsMechanisms: stringArray(row.targetsMechanisms ?? [], `${path}.targetsMechanisms`),
    preconditions,
    constructionDelta: text(row.constructionDelta, `${path}.constructionDelta`),
    staysFixed: text(row.staysFixed, `${path}.staysFixed`),
    shapeFieldsEdited: stringArray(row.shapeFieldsEdited ?? [], `${path}.shapeFieldsEdited`),
    legibilitySensitive,
    measurable,
    evidenceStatus: evidenceStatus as OperatorEvidenceStatus,
    priorEvidence: stringArray(row.priorEvidence ?? [], `${path}.priorEvidence`),
    candidateSubstrates: stringArray(row.candidateSubstrates ?? [], `${path}.candidateSubstrates`),
    excludedSubstrates: excluded,
  };
}

export function parseOperatorTreatmentSchema(value: unknown): OperatorTreatmentSchema {
  const root = record(value, "phase21-operator-schema");
  if (root.schema !== "agent-eval-foundry/phase-21-operator-schema@1") {
    fail("PHASE21_OPERATOR_SCHEMA_INVALID", "phase21-operator-schema.schema", "unsupported schema");
  }
  if (!Array.isArray(root.operators) || root.operators.length === 0) {
    fail("PHASE21_OPERATOR_SCHEMA_INVALID", "phase21-operator-schema.operators", "expected non-empty array");
  }
  const operators = root.operators.map((item, index) =>
    parseOperator(item, `phase21-operator-schema.operators[${index}]`),
  );
  const ids = operators.map((o) => o.id);
  if (new Set(ids).size !== ids.length) {
    fail("PHASE21_OPERATOR_SCHEMA_INVALID", "phase21-operator-schema.operators", "duplicate operator id");
  }
  return {
    schema: "agent-eval-foundry/phase-21-operator-schema@1",
    extractedOn: text(root.extractedOn, "phase21-operator-schema.extractedOn"),
    operators,
  };
}

/** Look up one operator by id, or throw — mirrors evolve.ts's `operator()` lookup style. */
export function operatorTreatment(schema: OperatorTreatmentSchema, id: string): OperatorTreatment {
  const found = schema.operators.find((o) => o.id === id);
  if (found === undefined) {
    fail(
      "PHASE21_OPERATOR_SCHEMA_INVALID",
      `phase21-operator-schema.operators[${id}]`,
      "unknown operator id",
    );
  }
  return found as OperatorTreatment;
}
