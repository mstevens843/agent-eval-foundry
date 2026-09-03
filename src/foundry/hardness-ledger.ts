import { isRecord } from "./schema.js";

export const HARDNESS_OPERATOR_CATEGORIES = ["validity-control", "difficulty", "scenario-selection"] as const;
export type HardnessOperatorCategory = (typeof HARDNESS_OPERATOR_CATEGORIES)[number];
export type OperatorConfidence = "high" | "medium" | "low";

export interface SolveRateEffect {
  readonly countable: boolean;
  readonly before: string | null;
  readonly after: string | null;
  readonly note: string;
}

export interface HardnessOperatorEvidence {
  readonly id: string;
  readonly category: HardnessOperatorCategory;
  readonly name: string;
  readonly changed: string;
  readonly stayedFixed: string;
  readonly beforeEvidence: string;
  readonly afterEvidence: string;
  readonly measurementStatus: "measured" | "estimated";
  readonly fairnessOutcome: string;
  readonly verifierIntegrityEffect: string;
  readonly solveRateEffect: SolveRateEffect;
  readonly capabilityAttribution: string;
  readonly provenance: readonly string[];
  readonly confidence: OperatorConfidence;
}

export interface HardnessOperatorLedger {
  readonly schema: "agent-eval-foundry/hardness-operator-ledger@1";
  readonly extractedOn: string;
  readonly scope: string;
  readonly operators: readonly HardnessOperatorEvidence[];
}

const record = (value: unknown, path: string): Record<string, unknown> => {
  if (!isRecord(value)) throw new Error(`${path}: expected object`);
  return value;
};

const text = (value: unknown, path: string): string => {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${path}: expected non-empty string`);
  return value;
};

const nullableText = (value: unknown, path: string): string | null =>
  value === null ? null : text(value, path);

export function parseHardnessOperatorLedger(value: unknown): HardnessOperatorLedger {
  const root = record(value, "hardness-ledger");
  if (root.schema !== "agent-eval-foundry/hardness-operator-ledger@1") {
    throw new Error("hardness-ledger.schema: unsupported schema");
  }
  if (!Array.isArray(root.operators) || root.operators.length === 0) {
    throw new Error("hardness-ledger.operators: expected non-empty array");
  }
  const operators = root.operators.map((item, index): HardnessOperatorEvidence => {
    const path = `hardness-ledger.operators[${index}]`;
    const row = record(item, path);
    const category = text(row.category, `${path}.category`);
    if (!HARDNESS_OPERATOR_CATEGORIES.includes(category as HardnessOperatorCategory)) {
      throw new Error(`${path}.category: unknown category ${category}`);
    }
    const measurementStatus = text(row.measurementStatus, `${path}.measurementStatus`);
    if (measurementStatus !== "measured" && measurementStatus !== "estimated") {
      throw new Error(`${path}.measurementStatus: expected measured or estimated`);
    }
    const confidence = text(row.confidence, `${path}.confidence`);
    if (!(["high", "medium", "low"] as const).includes(confidence as OperatorConfidence)) {
      throw new Error(`${path}.confidence: expected high, medium or low`);
    }
    const effect = record(row.solveRateEffect, `${path}.solveRateEffect`);
    if (typeof effect.countable !== "boolean") {
      throw new Error(`${path}.solveRateEffect.countable: expected boolean`);
    }
    const provenance = row.provenance;
    if (!Array.isArray(provenance) || provenance.length === 0) {
      throw new Error(`${path}.provenance: measured and estimated rows both require provenance`);
    }
    return {
      id: text(row.id, `${path}.id`),
      category: category as HardnessOperatorCategory,
      name: text(row.name, `${path}.name`),
      changed: text(row.changed, `${path}.changed`),
      stayedFixed: text(row.stayedFixed, `${path}.stayedFixed`),
      beforeEvidence: text(row.beforeEvidence, `${path}.beforeEvidence`),
      afterEvidence: text(row.afterEvidence, `${path}.afterEvidence`),
      measurementStatus,
      fairnessOutcome: text(row.fairnessOutcome, `${path}.fairnessOutcome`),
      verifierIntegrityEffect: text(row.verifierIntegrityEffect, `${path}.verifierIntegrityEffect`),
      solveRateEffect: {
        countable: effect.countable,
        before: nullableText(effect.before, `${path}.solveRateEffect.before`),
        after: nullableText(effect.after, `${path}.solveRateEffect.after`),
        note: text(effect.note, `${path}.solveRateEffect.note`),
      },
      capabilityAttribution: text(row.capabilityAttribution, `${path}.capabilityAttribution`),
      provenance: provenance.map((source, sourceIndex) => text(source, `${path}.provenance[${sourceIndex}]`)),
      confidence: confidence as OperatorConfidence,
    };
  });
  const ids = operators.map((operator) => operator.id);
  if (new Set(ids).size !== ids.length) throw new Error("hardness-ledger.operators: duplicate id");
  return {
    schema: "agent-eval-foundry/hardness-operator-ledger@1",
    extractedOn: text(root.extractedOn, "hardness-ledger.extractedOn"),
    scope: text(root.scope, "hardness-ledger.scope"),
    operators,
  };
}
