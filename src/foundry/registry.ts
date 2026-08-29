// Cross-collection integrity, and the coverage question the individual validators cannot ask.
//
// `validate.ts` checks one document at a time: is this mechanism well-formed, is this ledger row
// justified. That is necessary and insufficient. The defects that actually rot a registry live
// BETWEEN documents:
//
//   - a mechanism suggesting a mutant nobody wrote,
//   - a shape naming a mechanism that was renamed,
//   - a mechanism with no mutant anywhere in the bank that exercises it.
//
// The last one is the important one, and it is why this file exists. A mechanism with no mutant is a
// difficulty the foundry can DESCRIBE but has no way to DETECT. Nothing breaks; the registry just
// quietly claims coverage it does not have. That is the same failure the source project measured in
// its own agents: two of three Opus runs wrote checkers that could not express the rule they were
// checking, so their fuzzers ran clean over engines carrying the bug.
//
// So coverage is computed, reported, and testable, not assumed.

import { type Candidate, type Mechanism, type Mutant, type TaskShape, fail, mustExist } from "./schema.js";

export interface Registry {
  readonly mechanisms: readonly Mechanism[];
  readonly mutants: readonly Mutant[];
  readonly shapes: readonly TaskShape[];
  readonly candidates: readonly Candidate[];
}

export interface MechanismCoverage {
  readonly mechanismId: string;
  /** Mutants that name this mechanism. Empty means nothing can detect it. */
  readonly mutants: readonly string[];
  /** Families built on this mechanism. */
  readonly shapes: readonly string[];
  /** Ledger rows exploring it. */
  readonly candidates: readonly string[];
  readonly hasDetection: boolean;
}

export interface CoverageReport {
  readonly mechanisms: readonly MechanismCoverage[];
  /** Mutants no mechanism suggests and no shape expects: written but never reachable. */
  readonly orphanedMutants: readonly string[];
  readonly mechanismsWithoutDetection: readonly string[];
  readonly mechanismsWithoutFamily: readonly string[];
  readonly measuredMechanisms: number;
}

/**
 * Check every id that points into another collection.
 *
 * Throws on the first dangling reference. Called by `buildRegistry`, and separately testable so a
 * known-bad fixture can prove it fires.
 */
export function checkReferentialIntegrity(r: Registry): void {
  const mechanismIds = new Set(r.mechanisms.map((m) => m.id));
  const mutantIds = new Set(r.mutants.map((m) => m.id));

  r.mechanisms.forEach((m, i) => {
    mustExist(m.suggestedMutants, mutantIds, `mechanisms[${i}] (${m.id}).suggestedMutants`, "mutant");
  });
  r.mutants.forEach((m, i) => {
    mustExist(m.mechanisms, mechanismIds, `mutants[${i}] (${m.id}).mechanisms`, "mechanism");
  });
  r.shapes.forEach((s, i) => {
    mustExist(s.mechanisms, mechanismIds, `shapes[${i}] (${s.familyId}).mechanisms`, "mechanism");
    mustExist(
      s.expectedMutants.map((e) => e.mutantId),
      mutantIds,
      `shapes[${i}] (${s.familyId}).expectedMutants`,
      "mutant",
    );
  });
  r.candidates.forEach((c, i) => {
    mustExist(c.mechanisms, mechanismIds, `candidates[${i}] (${c.id}).mechanisms`, "mechanism");
  });
}

/** Compute coverage. Pure; reports rather than throws, so a partial registry can still be inspected. */
export function coverage(r: Registry): CoverageReport {
  const mechanisms = r.mechanisms.map((m) => {
    const mutants = r.mutants.filter((x) => x.mechanisms.includes(m.id)).map((x) => x.id);
    const shapes = r.shapes.filter((s) => s.mechanisms.includes(m.id)).map((s) => s.familyId);
    const candidates = r.candidates.filter((c) => c.mechanisms.includes(m.id)).map((c) => c.id);
    return { mechanismId: m.id, mutants, shapes, candidates, hasDetection: mutants.length > 0 };
  });

  const referenced = new Set<string>();
  for (const m of r.mechanisms) for (const x of m.suggestedMutants) referenced.add(x);
  for (const s of r.shapes) for (const e of s.expectedMutants) referenced.add(e.mutantId);

  return {
    mechanisms,
    orphanedMutants: r.mutants.filter((m) => !referenced.has(m.id)).map((m) => m.id),
    mechanismsWithoutDetection: mechanisms.filter((m) => !m.hasDetection).map((m) => m.mechanismId),
    mechanismsWithoutFamily: mechanisms.filter((m) => m.shapes.length === 0).map((m) => m.mechanismId),
    measuredMechanisms: r.mechanisms.filter((m) => m.maturity === "measured").length,
  };
}

/**
 * The strict gate. Referential integrity plus the two coverage rules, as a hard failure.
 *
 * Separate from `coverage()` on purpose: reporting and gating are different jobs, and a report that
 * throws is useless for the case you most want it for — looking at a registry that is not yet clean.
 */
export function assertCoverage(r: Registry): CoverageReport {
  checkReferentialIntegrity(r);
  const report = coverage(r);
  const undetected = report.mechanismsWithoutDetection;
  if (undetected.length > 0) {
    fail(
      "COVERAGE_MECHANISM_WITHOUT_MUTANT",
      `coverage.mechanisms[${undetected.join(", ")}]`,
      `${undetected.length} mechanism(s) have no mutant in the bank that exercises them, so the foundry describes a difficulty it cannot detect`,
    );
  }
  if (report.orphanedMutants.length > 0) {
    fail(
      "COVERAGE_MUTANT_ORPHANED",
      `coverage.orphanedMutants[${report.orphanedMutants.join(", ")}]`,
      "mutant(s) that no mechanism suggests and no family expects will never be run against anything",
    );
  }
  return report;
}

export function buildRegistry(
  mechanisms: readonly Mechanism[],
  mutants: readonly Mutant[],
  shapes: readonly TaskShape[],
  candidates: readonly Candidate[],
): Registry {
  const r: Registry = { mechanisms, mutants, shapes, candidates };
  checkReferentialIntegrity(r);
  return r;
}
