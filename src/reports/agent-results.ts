// What real agent trials actually showed, and — for an evolved family — whether the evolution worked.
//
// A pass rate is not an analysis. The question this module exists to answer is the one the whole
// evolution layer turns on: the parent family died because provenance never had to survive a store,
// the descendant separates ingestion from use by a session boundary, and the only way to know whether
// that operator produced difficulty is to look at WHERE the failures fall.
//
// So the analysis is by knob. If a submission passes at `sessionsBetween: 0` and fails at 1 and 3,
// the same implementation is correct within a session and wrong across one, and the operator did
// exactly what it claimed. If failures are flat across the knob, the difficulty came from somewhere
// else and the operator is not the reason. If there are no failures at all, the family is
// already-solved again and the hypothesis is falsified.
//
// The six outcome categories are kept apart everywhere, because collapsing any two of them is how a
// benchmark reports something it did not measure.

import type { CampaignPlan, CampaignSlot } from "../trials/campaign.js";
import type { TrialRecord, TrialSet } from "../trials/types.js";
import { countedAgentTrials } from "../trials/types.js";

export const OUTCOME_KINDS = [
  "counted_solve",
  "counted_failure",
  "provider_refusal",
  "infra_failure",
  "not_run",
  "verifier_only",
] as const;
export type OutcomeKind = (typeof OUTCOME_KINDS)[number];

export interface TrialOutcome {
  readonly runId: string;
  readonly subjectId: string;
  readonly model: string | null;
  readonly kind: OutcomeKind;
  readonly scenariosGraded: number;
  readonly scenariosFailed: number;
  /** Checks that failed at least once, with how many scenarios each. */
  readonly failedChecks: readonly { readonly check: string; readonly scenarios: number }[];
  readonly runtimeSeconds: number | null;
  readonly costUsd: number | null;
  readonly reason: string;
}

export interface KnobSplit {
  readonly knob: string;
  readonly rows: readonly {
    readonly value: string;
    readonly scenarios: number;
    readonly failed: number;
    readonly rate: number;
  }[];
  /** True when the failure rate genuinely varies across this knob's values. */
  readonly discriminates: boolean;
}

export interface FamilyTrialAnalysis {
  readonly familyId: string;
  readonly outcomes: readonly TrialOutcome[];
  readonly counted: number;
  readonly solves: number;
  readonly failures: number;
  readonly refusals: number;
  readonly infra: number;
  /** Model families represented among counted trials. One is not variance. */
  readonly modelFamilies: readonly string[];
  /** Per-knob failure split across every counted trial pooled. */
  readonly knobSplits: readonly KnobSplit[];
  /** Checks that failed, pooled across counted trials. */
  readonly checkTotals: readonly { readonly check: string; readonly scenarios: number }[];
  /** The verdict the evidence supports about the family's difficulty. */
  readonly verdict: "already-solved" | "discriminates" | "no-evidence";
  readonly plannedSlots: number;
  readonly notRunSlots: number;
}

const modelFamilyOf = (model: string | null): string =>
  model === null ? "unknown" : (model.split("/")[0] ?? model);

function plannedKindFor(slot: CampaignSlot | undefined): OutcomeKind | null {
  return slot?.state === "REFUSED"
    ? "provider_refusal"
    : slot?.state === "FAILED_INFRA"
      ? "infra_failure"
      : null;
}

function outcomeOf(record: TrialRecord, slot?: CampaignSlot): TrialOutcome {
  const graded = record.cells.length;
  const failedCells = record.cells.filter((c) => c.failed.length > 0);
  const byCheck = new Map<string, number>();
  for (const cell of record.cells) {
    for (const check of new Set(cell.failed)) byCheck.set(check, (byCheck.get(check) ?? 0) + 1);
  }
  const kind: OutcomeKind =
    !record.counts && plannedKindFor(slot) !== null
      ? (plannedKindFor(slot) as OutcomeKind)
      : !record.counts
        ? record.status === "refused"
          ? "provider_refusal"
          : record.status === "timeout" || record.status === "infrastructure_error"
            ? "infra_failure"
            : "not_run"
        : failedCells.length === 0
          ? "counted_solve"
          : "counted_failure";

  return {
    runId: record.runId,
    subjectId: record.subjectId,
    model: record.model,
    kind,
    scenariosGraded: graded,
    scenariosFailed: failedCells.length,
    failedChecks: [...byCheck.entries()]
      .map(([check, scenarios]) => ({ check, scenarios }))
      .sort((a, b) => b.scenarios - a.scenarios || a.check.localeCompare(b.check)),
    runtimeSeconds: record.runtimeSeconds,
    costUsd: record.costUsd,
    reason: record.countsReason,
  };
}

function plannedNonCountedOutcome(campaignId: string, slot: CampaignSlot): TrialOutcome | null {
  const kind =
    slot.state === "NOT_RUN"
      ? "not_run"
      : slot.state === "REFUSED"
        ? "provider_refusal"
        : slot.state === "FAILED_INFRA"
          ? "infra_failure"
          : null;

  if (kind === null) return null;
  return {
    runId: slot.runId ?? `${campaignId}:${slot.slotId.toLowerCase()}:${slot.state.toLowerCase()}`,
    subjectId: slot.subjectId,
    model: slot.model,
    kind,
    scenariosGraded: 0,
    scenariosFailed: 0,
    failedChecks: [],
    runtimeSeconds: null,
    costUsd: null,
    reason: slot.note === "" ? `planned slot state ${slot.state}` : slot.note,
  };
}

/**
 * Split failures by knob across all counted trials.
 *
 * `discriminates` asks whether failures are CONCENTRATED on some values of the knob, not whether the
 * absolute rates are far apart.
 *
 * The first version used absolute spread — highest rate minus lowest, over a third counts. On real
 * data it called the memory family's `sessionsBetween` knob flat while every one of 32 failures sat
 * at values 1 and 3 and not one at value 0. With sparse failures a total concentration looks like a
 * small number: 0% against 6.6% is a spread of 0.066 and a perfect separation.
 *
 * So: a knob discriminates when something fails at all AND either some value has no failures while
 * another does, or the worst rate is at least twice the best. It is a description of the split, not
 * a significance test — with three trials there is nothing to test — and the report says so.
 */
function splitByKnob(
  records: readonly TrialRecord[],
  params: ReadonlyMap<string, Readonly<Record<string, unknown>>>,
): readonly KnobSplit[] {
  const knobs = new Set<string>();
  for (const p of params.values()) for (const k of Object.keys(p)) knobs.add(k);

  const splits: KnobSplit[] = [];
  for (const knob of [...knobs].sort()) {
    const tally = new Map<string, { scenarios: number; failed: number }>();
    for (const record of records) {
      for (const cell of record.cells) {
        const value = JSON.stringify(params.get(cell.scenarioId)?.[knob] ?? null);
        const entry = tally.get(value) ?? { scenarios: 0, failed: 0 };
        entry.scenarios += 1;
        if (cell.failed.length > 0) entry.failed += 1;
        tally.set(value, entry);
      }
    }
    const rows = [...tally.entries()]
      .map(([value, e]) => ({
        value: value.replace(/^"|"$/g, ""),
        scenarios: e.scenarios,
        failed: e.failed,
        rate: e.scenarios === 0 ? 0 : e.failed / e.scenarios,
      }))
      .sort((a, b) => a.value.localeCompare(b.value));
    const rates = rows.map((r) => r.rate);
    const max = rates.length === 0 ? 0 : Math.max(...rates);
    const min = rates.length === 0 ? 0 : Math.min(...rates);
    const concentrated = max > 0 && (min === 0 || max / min >= 2);
    splits.push({ knob, rows, discriminates: rows.length > 1 && concentrated });
  }
  return splits;
}

export function analyseFamilyTrials(
  familyId: string,
  trials: TrialSet,
  params: ReadonlyMap<string, Readonly<Record<string, unknown>>>,
  plan?: CampaignPlan,
): FamilyTrialAnalysis {
  const agents = trials.records.filter((r) => r.subjectType === "agent");
  const recordedByRunId = new Map(agents.map((r) => [r.runId, r]));
  const plannedRunIds = new Set(
    plan?.slots.map((s) => s.runId).filter((runId): runId is string => runId !== null) ?? [],
  );
  const outcomes =
    plan === undefined
      ? agents.map((record) => outcomeOf(record))
      : [
          ...plan.slots.flatMap((slot) => {
            if (slot.runId !== null && recordedByRunId.has(slot.runId)) {
              return [outcomeOf(recordedByRunId.get(slot.runId) as TrialRecord, slot)];
            }
            const planned = plannedNonCountedOutcome(plan.campaignId, slot);
            return planned === null ? [] : [planned];
          }),
          ...agents.filter((record) => !plannedRunIds.has(record.runId)).map((record) => outcomeOf(record)),
        ];
  const counted = countedAgentTrials(trials);

  const checkTotals = new Map<string, number>();
  for (const record of counted) {
    for (const cell of record.cells) {
      for (const check of new Set(cell.failed)) checkTotals.set(check, (checkTotals.get(check) ?? 0) + 1);
    }
  }

  const solves = outcomes.filter((o) => o.kind === "counted_solve").length;
  const failures = outcomes.filter((o) => o.kind === "counted_failure").length;

  // `not_run` slots are part of the picture and are read from the plan rather than invented: a
  // campaign with four unrun slots is a different state from one with none, and the difference is
  // invisible if only executed trials are counted.
  const planned = plan?.slots.length ?? outcomes.length;

  return {
    familyId,
    outcomes,
    counted: counted.length,
    solves,
    failures,
    refusals: outcomes.filter((o) => o.kind === "provider_refusal").length,
    infra: outcomes.filter((o) => o.kind === "infra_failure").length,
    modelFamilies: [...new Set(counted.map((r) => modelFamilyOf(r.model)))].sort(),
    knobSplits: splitByKnob(counted, params),
    checkTotals: [...checkTotals.entries()]
      .map(([check, scenarios]) => ({ check, scenarios }))
      .sort((a, b) => b.scenarios - a.scenarios || a.check.localeCompare(b.check)),
    verdict: counted.length === 0 ? "no-evidence" : failures === 0 ? "already-solved" : "discriminates",
    plannedSlots: planned,
    notRunSlots: outcomes.filter((o) => o.kind === "not_run").length,
  };
}
