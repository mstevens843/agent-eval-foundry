// The shared subject bank, and the rule that decides when a combined axis count may be claimed.
//
// The cross-family report currently refuses to add axes, and it is right to. But "refuses" is only
// the correct answer for the disjoint case, and the repository had no way to express the other two.
// This file makes the decision a computed verdict with a stated threshold instead of a permanent no:
//
//   REFUSED   no subject appears in more than one family. Each family's instances separate only its
//             own subjects, so the union's antichain width is the sum BY CONSTRUCTION — two families
//             testing the identical mechanism would also "add". Nothing can be claimed.
//   PARTIAL   some overlap, below threshold. Overlap is reported and the combined count is given as
//             a bound with the sample size attached, never as a headline.
//   MEASURED  enough shared subjects that co-failure across families is observable. The combined
//             axis count is computed over the shared subjects only — the ones where "did the same
//             implementation fail both?" is a question with an answer.
//
// The threshold is a judgement and is therefore a named constant with an argument attached rather
// than a magic number buried in a conditional.

import { fail } from "../foundry/schema.js";
import type { Matrix } from "../types.js";
import type { TrialRecord } from "./types.js";

/**
 * Below this many shared subjects, a cross-family axis count is noise.
 *
 * The reasoning: the antichain width over the shared bank is bounded above by the number of shared
 * subjects, so with two shared subjects the maximum possible combined width is 2 and the measurement
 * cannot distinguish "the families overlap completely" from "they are independent". Three is the
 * smallest bank where the answer can be non-trivial, and it is still small enough that the report
 * must print the sample size beside the number.
 */
export const MIN_SHARED_SUBJECTS = 3;

export type OverlapVerdict = "measured" | "partial" | "refused";

export interface FamilyBank {
  readonly familyId: string;
  readonly matrix: Matrix;
  /** How the bank was assembled. Drives how the axis count may be read. */
  readonly provenance: string;
  /** True when subjects are real agent attempts rather than authored mutants. */
  readonly agentDerived: boolean;
}

export interface BankOverlap {
  readonly verdict: OverlapVerdict;
  readonly families: readonly string[];
  readonly sharedSubjects: readonly string[];
  readonly perFamilySubjects: Readonly<Record<string, number>>;
  readonly threshold: number;
  /** Why this verdict, in one sentence, ready to render. */
  readonly rationale: string;
  /** Present only when the verdict is `measured`: the combined view over shared subjects. */
  readonly combined: CombinedView | null;
}

export interface CombinedView {
  readonly subjects: readonly string[];
  /** Instances from every family, restricted to the shared subjects. */
  readonly matrix: Matrix;
}

const subjectIds = (m: Matrix): readonly string[] => m.subjects.map((s) => s.id);

/**
 * Restrict several family matrices to the subjects they share, producing one matrix the axis meter
 * can grade. Returns null when there is nothing to restrict to.
 */
export function combineOverSharedSubjects(
  banks: readonly FamilyBank[],
  shared: readonly string[],
): CombinedView | null {
  if (shared.length === 0) return null;
  const sharedSet = new Set(shared);

  const instances = banks.flatMap((b) =>
    b.matrix.instances.map((i) => ({ ...i, id: `${b.familyId}::${i.id}`, family: b.familyId })),
  );
  const results: Record<string, Record<string, { failed: readonly string[] } | null>> = {};
  for (const b of banks) {
    for (const inst of b.matrix.instances) {
      const row: Record<string, { failed: readonly string[] } | null> = {};
      for (const sid of shared) {
        const cell = b.matrix.results[inst.id]?.[sid];
        row[sid] = cell === undefined ? null : cell;
      }
      results[`${b.familyId}::${inst.id}`] = row;
    }
  }

  const subjects = banks
    .flatMap((b) => b.matrix.subjects)
    .filter((s) => sharedSet.has(s.id))
    .filter((s, i, a) => a.findIndex((x) => x.id === s.id) === i);

  return {
    subjects: shared,
    matrix: {
      schema: "agent-eval-foundry/matrix@1",
      suite: `combined:${banks.map((b) => b.familyId).join("+")}`,
      provenance: {
        repo: null,
        artifact_commit: null,
        task_sha256: null,
        suite_shape: `${instances.length} instances across ${banks.length} families / ${shared.length} shared subjects`,
        checks_total: instances.length,
        extracted_from: banks.map((b) => b.familyId),
        caveat: `Restricted to the ${shared.length} subject(s) that attempted every family. Instances are prefixed by family id. A cell is null where that family never graded that subject, and nulls are excluded from catch sets rather than imputed as passes.`,
      },
      reference_subject: null,
      subjects,
      instances,
      results,
    },
  };
}

export function computeOverlap(banks: readonly FamilyBank[]): BankOverlap {
  const families = banks.map((b) => b.familyId);
  const perFamilySubjects = Object.fromEntries(banks.map((b) => [b.familyId, b.matrix.subjects.length]));

  const counts = new Map<string, number>();
  for (const b of banks) {
    for (const id of new Set(subjectIds(b.matrix))) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const shared = [...counts.entries()]
    .filter(([, n]) => n === banks.length)
    .map(([id]) => id)
    .sort();

  if (shared.length === 0) {
    return {
      verdict: "refused",
      families,
      sharedSubjects: [],
      perFamilySubjects,
      threshold: MIN_SHARED_SUBJECTS,
      rationale:
        "No subject attempted more than one family, so co-failure across families is unobservable. " +
        "The union matrix is null in every cross cell and its antichain width is the sum of the parts " +
        "by construction — two families testing the identical mechanism would also 'add'. No combined " +
        "count is available.",
      combined: null,
    };
  }

  if (shared.length < MIN_SHARED_SUBJECTS) {
    return {
      verdict: "partial",
      families,
      sharedSubjects: shared,
      perFamilySubjects,
      threshold: MIN_SHARED_SUBJECTS,
      rationale: `Only ${shared.length} subject(s) attempted every family, below the threshold of ${MIN_SHARED_SUBJECTS}. The combined width is bounded above by the shared bank size, so it cannot distinguish complete overlap from independence. Overlap is reported; no combined axis count is quoted as a headline.`,
      combined: combineOverSharedSubjects(banks, shared),
    };
  }

  return {
    verdict: "measured",
    families,
    sharedSubjects: shared,
    perFamilySubjects,
    threshold: MIN_SHARED_SUBJECTS,
    rationale: `${shared.length} subject(s) attempted every family, so "did the same implementation fail both?" is a question with an answer. The combined axis count below is computed over the shared subjects only, and is the number that says whether the families measure different things.`,
    combined: combineOverSharedSubjects(banks, shared),
  };
}

/**
 * The guarded way to obtain a combined matrix. Every caller that is about to quote a cross-family
 * number must come through here.
 *
 * `combineOverSharedSubjects` will happily build a union matrix from disjoint banks — it has to, so
 * the report can show what the union would look like — and that matrix's antichain width is the sum
 * of the parts by construction. Publishing it as a measurement is the single most tempting mistake
 * available in this repository, because the number is large and looks like a portfolio total. This
 * function is the checker that refuses it.
 */
export function combinedMatrixFor(overlap: BankOverlap): Matrix {
  if (overlap.verdict === "refused" || overlap.combined === null) {
    fail(
      "BANK_ADDITIVE_WITHOUT_OVERLAP",
      "bank.combined",
      `a combined axis count was requested for ${overlap.families.join(" + ")} with ${overlap.sharedSubjects.length} shared subject(s); with no overlap the union's width is the sum of the parts by construction and measures nothing`,
    );
  }
  return overlap.combined.matrix;
}

/**
 * A family's bank is only a bank if every counted trial in it was graded against the same scenario
 * set. Merging a 128-scenario run with a later 256-scenario run produces cells that look uniform and
 * are not: an instance absent from the smaller set reads as "never caught" rather than "never run".
 */
export function assertBankCoherent(familyId: string, records: readonly TrialRecord[]): void {
  const sets = [...new Set(records.filter((r) => r.counts).map((r) => r.scenarioSetId))].sort();
  if (sets.length > 1) {
    fail(
      "BANK_INCOMPARABLE_SCENARIO_SET",
      `bank.${familyId}`,
      `counted trials were graded against ${sets.length} different scenario sets (${sets.join(", ")}); their cells are not comparable and must not be pooled into one bank`,
    );
  }
}
