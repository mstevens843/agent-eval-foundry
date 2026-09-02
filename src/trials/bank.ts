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
        checks_declared: null,
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
    // A kinded bank carries normalized (and, for mutants, namespaced) subject ids. Falling back to
    // the raw matrix ids would undo both.
    const ids =
      "subjects" in b && Array.isArray((b as { subjects?: unknown }).subjects)
        ? (b as unknown as { subjects: readonly string[] }).subjects
        : subjectIds(b.matrix);
    for (const id of new Set(ids)) counts.set(id, (counts.get(id) ?? 0) + 1);
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

// ---------------------------------------------------------------- bank kinds

/**
 * What a bank is made of, and therefore what its axis count is a statement about.
 *
 * This distinction was prose in the reports and is now a type, because prose does not stop anyone
 * adding the numbers. An axis count over MUTANTS says how many distinct defects the verifier can
 * detect — it is bounded by how many the author wrote. An axis count over AGENTS says how many
 * distinct ways real implementations fail. They answer different questions, and a combined figure
 * across the two is not a bigger measurement, it is a category error.
 */
export const BANK_KINDS = ["agent", "mutant", "imported"] as const;
export type BankKind = (typeof BANK_KINDS)[number];

export const BANK_KIND_MEANING: Readonly<Record<BankKind, string>> = {
  agent: "real submissions from models attempting the task — a statement about DIFFICULTY",
  mutant: "known-bad implementations written alongside the verifier — a statement about DETECTION",
  imported: "trial records normalized from another harness — difficulty, at that harness's fidelity",
};

/**
 * Normalize a subject id so the same model is one subject across families and harnesses.
 *
 * Without this, `anthropic/claude-opus-5` from a locally-run trial and `claude-opus-5` from an
 * imported Harbor run are two subjects, the shared bank looks empty, and the cross-family verdict is
 * `refused` for a reason that is entirely clerical.
 */
export function normalizeSubjectId(raw: string): string {
  const stripped = raw.trim().toLowerCase();
  const withoutVendor = stripped.includes("/") ? (stripped.split("/").pop() ?? stripped) : stripped;
  // Effort suffixes are kept: `gpt-5.6-sol@xhigh` and `gpt-5.6-sol@low` are genuinely different
  // subjects, and merging them would hide the one variable most likely to explain a difference.
  return withoutVendor.replace(/\s+/g, "-");
}

export interface KindedBank extends FamilyBank {
  readonly kind: BankKind;
  /** Subjects, normalized. The identity used for every overlap computation. */
  readonly subjects: readonly string[];
}

/**
 * Tag a bank with its kind and normalize its subject identities.
 *
 * Mutant subjects are namespaced by family and model subjects are not, and the asymmetry is the
 * point. `claude-opus-5` attempting two families IS one subject — that is what makes a shared bank
 * possible. `over-blocker` in two families is two different implementations that happen to share a
 * name, and treating them as one subject reported two disjoint mutant banks as overlapping, which a
 * test caught by asking for a refusal and getting `partial`.
 */
export const kindedBank = (bank: FamilyBank, kind: BankKind): KindedBank => ({
  ...bank,
  kind,
  subjects: [
    ...new Set(
      bank.matrix.subjects.map((s) =>
        kind === "mutant" ? `${bank.familyId}::${s.id}` : normalizeSubjectId(s.id),
      ),
    ),
  ].sort(),
});

/**
 * Two banks may only be compared when they are made of the same kind of thing.
 *
 * The check that stops the most attractive wrong number in the repository: three families, twelve
 * measured axes, one headline. Two of those counts are detection and one is difficulty.
 */
export function assertComparableKinds(banks: readonly KindedBank[]): void {
  const kinds = [...new Set(banks.map((b) => b.kind))].sort();
  if (kinds.length > 1) {
    fail(
      "BANK_KIND_MISMATCH",
      "bank.kinds",
      `banks of different kinds cannot be compared or combined: ${banks
        .map((b) => `${b.familyId} is \`${b.kind}\``)
        .join(", ")}. ${kinds.map((k) => `\`${k}\` means ${BANK_KIND_MEANING[k]}`).join("; ")}.`,
    );
  }
}

export interface CrossFamilyClaim {
  readonly kind: BankKind;
  readonly families: readonly string[];
  readonly overlap: BankOverlap;
  /** The claim this evidence licenses, in one sentence. */
  readonly licensed: string;
  /** What would have to be true to license the next stronger claim. */
  readonly toStrengthen: readonly string[];
}

/**
 * What the current banks license, per kind.
 *
 * Grouped by kind first and overlap second, because the kind decides which question is being asked
 * and the overlap decides whether it can be answered.
 */
export function crossFamilyClaims(banks: readonly KindedBank[]): readonly CrossFamilyClaim[] {
  const byKind = new Map<BankKind, KindedBank[]>();
  for (const bank of banks) byKind.set(bank.kind, [...(byKind.get(bank.kind) ?? []), bank]);

  const claims: CrossFamilyClaim[] = [];
  for (const kind of [...byKind.keys()].sort()) {
    const group = byKind.get(kind) ?? [];
    if (group.length < 2) {
      claims.push({
        kind,
        families: group.map((b) => b.familyId),
        overlap: computeOverlap(group),
        licensed:
          group.length === 0
            ? "nothing: no bank of this kind exists"
            : `nothing cross-family: only one \`${kind}\` bank exists, so there is nothing to compare it with`,
        toStrengthen: [
          `Build or trial a second family whose bank is \`${kind}\`.`,
          kind === "agent"
            ? "For an agent bank that means counted trials, not mutants."
            : "For a mutant bank that means a second family with a written mutant set.",
        ],
      });
      continue;
    }
    const overlap = computeOverlap(group);
    claims.push({
      kind,
      families: group.map((b) => b.familyId),
      overlap,
      licensed:
        overlap.verdict === "refused"
          ? "nothing: the banks share no subject, so co-failure across families is unobservable and the union's width is the sum by construction"
          : overlap.verdict === "partial"
            ? `a qualitative comparison over ${overlap.sharedSubjects.length} shared subject(s); no combined axis count, because the width is bounded by the shared bank size`
            : `a combined axis count over the ${overlap.sharedSubjects.length} shared subjects`,
      toStrengthen:
        overlap.verdict === "measured"
          ? ["Nothing: the claim is available. Widen the bank to narrow the confidence interval."]
          : [
              `Run the same subjects against every \`${kind}\` family until ${overlap.threshold} share all of them.`,
              `Currently shared: ${overlap.sharedSubjects.join(", ") || "none"}.`,
            ],
    });
  }
  return claims;
}
