// Phase 22 Lane 2 — the versioned OperatorAdapter interface, and its fail-closed registry.
//
// The corrected design this replaces: a "universal function" that edits shared JSON fields across
// arbitrary families. That was rejected because families do not actually share a shape — compare
// caa-revalidation's `verify({ scenario, report, queries })` against memory-poisoning's
// `verify({ scenario, ledger, writes, report })` — and forcing them through one editor either only
// half-works or silently assumes structure a family doesn't have.
//
// The orchestrator (orchestrator.ts) owns exactly the family-AGNOSTIC bookkeeping: running two
// selectors over a scenario space, grading a mutant bank under each, building matched-pair
// observations, and evaluating the stopping rule (reusing src/phase-21/stopping-rule.ts unchanged). It
// never inspects a scenario or a subject itself — those pass through as opaque values. An adapter owns
// exactly the family-SPECIFIC semantics: what a scenario is, how to grade one, which mutants exist and
// what each one's intended check is, and how the naive/targeted selectors work for that family. A
// family with no registered adapter is refused outright (`PHASE22_ADAPTER_NOT_FOUND`) rather than
// silently run through a generic path that was never proven to fit it.

import { fail } from "../foundry/schema.js";

/** One mutant, family-specific subject included, but referenced only opaquely by the orchestrator. */
export interface EnvelopeMutantRef {
  readonly id: string;
  readonly label: string;
  readonly subject: unknown;
  readonly intendedCheck: string;
}

export interface CellGrade {
  readonly failures: readonly string[];
}

export interface OperatorAdapter {
  readonly familyId: string;
  /** Bumped whenever this adapter's selection or grading semantics change in a way that could move a result. */
  readonly adapterVersion: string;
  readonly operatorId: string;
  /** Human-readable names for the components the matched-pair check must confirm stayed shared. */
  readonly sharedComponentDescriptions: Readonly<Record<string, string>>;
  enumerateScenarioSpace(): readonly unknown[];
  buildScenarios(params: readonly unknown[]): readonly unknown[];
  /** The uninformed baseline selector — deterministic, uniform, no knowledge of any mutant. */
  selectNaive(space: readonly unknown[], quota: number): readonly unknown[];
  /** The operator's own construction: selection informed by which mutants are hard to trigger. */
  selectTargeted(space: readonly unknown[], quota: number): readonly unknown[];
  gradeCell(scenario: unknown, subject: unknown): CellGrade;
  readonly referenceSubject: unknown;
  readonly mutantEnvelope: {
    readonly development: readonly EnvelopeMutantRef[];
    readonly heldOut: readonly EnvelopeMutantRef[];
  };
}

const REGISTRY = new Map<string, OperatorAdapter>();

export function registerAdapter(adapter: OperatorAdapter): void {
  REGISTRY.set(adapter.familyId, adapter);
}

/** Fail closed: an unregistered family gets a refusal, never a guess at its semantics. */
export function getAdapter(familyId: string): OperatorAdapter {
  const found = REGISTRY.get(familyId);
  if (found === undefined) {
    fail(
      "PHASE22_ADAPTER_NOT_FOUND",
      `adapter.${familyId}`,
      `no OperatorAdapter is registered for family "${familyId}" — refusing rather than running family-specific semantics that were never written for it`,
    );
  }
  return found;
}

export function registeredAdapterFamilyIds(): readonly string[] {
  return [...REGISTRY.keys()].sort();
}
