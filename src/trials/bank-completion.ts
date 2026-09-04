// What is missing before a cross-family axis count is allowed to exist.
//
// WHY THIS EXISTS
//
// `computeOverlap` answers one question — refused, partial or measured — and that was the right
// first answer. It is not an actionable one. A reader who is told "PARTIAL, 2 of 3 shared subjects"
// still has to work out which subject is missing from which family, how many trials that is, which
// provider could produce them, and whether the trials they already have are even comparable. Every
// one of those is computable, and leaving them to prose is how a blocker survives for months.
//
// So this module turns the verdict into a work list. It answers, in order:
//
//   who is shared        subjects with a counted, hash-current trial in EVERY family
//   who is partial       subjects present in some families and not others, with the gap named
//   what is missing      one row per (subject, family) hole, with WHY it is a hole
//   how much work        the minimum number of additional counted trials, not a vague "more"
//   who could do it      a named provider and model, checked against this machine
//   is it comparable     whether the families' cells can be put in one matrix at all
//   what kind of axis    difficulty (real models) or detection (authored mutants) — never merged
//
// THE FIVE WAYS A SUBJECT CAN FAIL TO COUNT, which the missing-rows deliberately keep apart:
//
//   never-attempted      nobody ran it. The cheapest hole to fill and the only one that is just money.
//   refused              the provider declined. Re-running until it complies would fabricate a sample.
//   infrastructure       an auth or harness failure. Fixable, but not by the model.
//   registered-variant   it validly measured another preregistered profile, not this canonical package.
//   superseded           it ran, it was graded, and then the family was repaired underneath it. The
//                        evidence is about a task that no longer exists.
//
// The last is the one that must never quietly become "shared". A subject whose only trial in a
// family is superseded looks present in every naive join over trial directories, and the combined
// width it produces is a number about two different tasks.

import {
  type ProviderFamily,
  type ProviderSpec,
  checkProvider,
  providerFamiliesOf,
  runnableProviders,
} from "./provider-registry.js";

import type { BankKind, KindedBank, OverlapVerdict } from "./bank.js";
import { BANK_KIND_MEANING, MIN_SHARED_SUBJECTS, computeOverlap } from "./bank.js";
import type { EvidenceState } from "./evidence-lifecycle.js";

/** Why a (subject, family) cell is not usable evidence. Ordered cheapest-to-fix first. */
export const HOLE_REASONS = [
  "never-attempted",
  "refused",
  "infrastructure",
  "superseded",
  "uncounted",
] as const;
export type HoleReason = (typeof HOLE_REASONS)[number];

export const HOLE_MEANING: Readonly<Record<HoleReason, string>> = {
  "never-attempted": "no trial exists; this is the only hole that is purely a question of budget",
  refused:
    "the provider declined. Re-running until it complies would manufacture a sample, so this hole is not fillable by retrying",
  infrastructure:
    "the provider could not authenticate or the harness broke. Fixable, but not by the model, and never counted as a failure",
  superseded:
    "a trial exists and was graded, then the family was repaired underneath it. It measures a task that no longer exists",
  uncounted: "a trial exists and did not meet the counting rules; the record says why",
};

/** How hard a hole is to close, which is the only useful way to order a work list. */
export const HOLE_FILLABLE: Readonly<Record<HoleReason, boolean>> = {
  "never-attempted": true,
  refused: false,
  infrastructure: false,
  superseded: true,
  uncounted: true,
};

export interface BankHole {
  readonly subjectId: string;
  readonly familyId: string;
  readonly reason: HoleReason;
  readonly detail: string;
  /** Can another trial close it, or is it a fact about the provider? */
  readonly fillable: boolean;
}

export interface SubjectPresence {
  readonly subjectId: string;
  readonly providerFamily: ProviderFamily | "unknown";
  /** Families where this subject has a counted, hash-current trial. */
  readonly present: readonly string[];
  /** Families where it does not, with the reason. */
  readonly absent: readonly BankHole[];
  readonly shared: boolean;
}

/** A concrete next trial: a named model, a named family, and whether it can run here. */
export interface UnlockStep {
  readonly subjectId: string;
  readonly familyId: string;
  readonly providerId: string;
  readonly providerFamily: ProviderFamily;
  readonly runnableHere: boolean;
  readonly availability: string;
  readonly command: readonly string[] | null;
  /** What this one trial buys, stated so a reader can decide whether to pay for it. */
  readonly unlocks: string;
}

export type ComparabilityVerdict = "comparable" | "incomparable" | "unknown";

export interface Comparability {
  readonly verdict: ComparabilityVerdict;
  readonly detail: string;
  /** Scenario-set ids seen per family. More than one within a family is disqualifying. */
  readonly scenarioSets: Readonly<Record<string, readonly string[]>>;
}

export interface BankCompletion {
  readonly kind: BankKind;
  readonly axisKind: "difficulty" | "mutant-detection";
  readonly families: readonly string[];
  readonly verdict: OverlapVerdict;
  readonly threshold: number;
  readonly sharedSubjects: readonly string[];
  /** Distinct labs among the SHARED subjects — never the same number as the subject count. */
  readonly sharedProviderFamilies: readonly ProviderFamily[];
  readonly presence: readonly SubjectPresence[];
  readonly holes: readonly BankHole[];
  /** Counted trials that must still be produced. Zero when the bank is already sufficient. */
  readonly minimumAdditionalTrials: number;
  readonly unlocks: readonly UnlockStep[];
  readonly comparability: Comparability;
  /** One sentence a report can print as its verdict line. */
  readonly rationale: string;
}

export interface CompletionInput {
  readonly banks: readonly KindedBank[];
  /**
   * Every trial on disk, per family, with its lifecycle state. Registered-variant, superseded and
   * refused runs are present here and absent from canonical banks, which lets a hole say WHY.
   */
  readonly trials: readonly {
    readonly familyId: string;
    readonly runId: string;
    readonly subjectId: string;
    readonly state: EvidenceState;
    readonly scenarioSetId: string;
    readonly countsReason: string;
  }[];
  readonly threshold?: number;
}

const providerFor = (subjectId: string): ProviderSpec | undefined =>
  runnableProviders().find((p) => p.subjectId === subjectId);

/**
 * Which scenario sets each family's counted trials were graded against.
 *
 * A family whose counted trials span two scenario sets cannot be pooled into a bank at all: an
 * instance absent from the smaller set reads as "never caught" rather than "never run", and that is
 * a pass the family never observed. `assertBankCoherent` throws on this; here it is reported, because
 * a completion report that crashes tells the reader less than one that names the problem.
 */
function comparabilityOf(input: CompletionInput): Comparability {
  const scenarioSets: Record<string, string[]> = {};
  for (const t of input.trials) {
    if (t.state !== "counted") continue;
    scenarioSets[t.familyId] = [...new Set([...(scenarioSets[t.familyId] ?? []), t.scenarioSetId])].sort();
  }
  const split = Object.entries(scenarioSets).filter(([, sets]) => sets.length > 1);
  if (split.length > 0) {
    return {
      verdict: "incomparable",
      detail: `${split
        .map(
          ([f, sets]) =>
            `\`${f}\` has counted trials against ${sets.length} scenario sets (${sets.join(", ")})`,
        )
        .join(
          "; ",
        )}. Cells from different scenario sets are not comparable: an instance absent from the smaller set reads as never-caught rather than never-run.`,
      scenarioSets,
    };
  }
  if (Object.keys(scenarioSets).length === 0) {
    return {
      verdict: "unknown",
      detail: "No counted trial exists in any family, so comparability is not yet decidable.",
      scenarioSets,
    };
  }
  return {
    verdict: "comparable",
    detail:
      "Every family's counted trials were graded against a single scenario set, so their cells sit in one matrix without imputation.",
    scenarioSets,
  };
}

function holeFor(subjectId: string, familyId: string, trials: CompletionInput["trials"]): BankHole {
  const mine = trials.filter((t) => t.subjectId === subjectId && t.familyId === familyId);
  if (mine.length === 0) {
    return {
      subjectId,
      familyId,
      reason: "never-attempted",
      detail: "no trial record exists",
      fillable: true,
    };
  }
  // Report the state that is closest to being usable, so a subject with one superseded run and one
  // refusal is described by the run that actually produced work.
  // A crashed run got further than an infra one: it reached the task and died carrying it, where an
  // infra failure never authenticated. So it ranks above `infra` and below `superseded`, which at
  // least produced a graded result.
  const rank: Readonly<Record<EvidenceState, number>> = {
    counted: 0,
    "registered-variant": 1,
    superseded: 2,
    crashed: 3,
    infra: 4,
    refused: 5,
    "not-run": 6,
  };
  const best = [...mine].sort((a, b) => rank[a.state] - rank[b.state])[0];
  const state = best?.state ?? "not-run";
  const reason: HoleReason =
    state === "superseded"
      ? "superseded"
      : state === "refused"
        ? "refused"
        : state === "infra" || state === "crashed"
          ? "infrastructure"
          : "uncounted";
  return {
    subjectId,
    familyId,
    reason,
    detail: `\`${best?.runId ?? "unknown"}\`: ${best?.countsReason ?? "no reason recorded"}`,
    fillable: HOLE_FILLABLE[reason],
  };
}

/**
 * The full completion picture for one kind of bank.
 *
 * Deliberately does NOT throw. Every refusal this computes is a thing the report should print, and a
 * module that throws instead of reporting forces the caller to decide what the reader sees.
 */
export function bankCompletion(input: CompletionInput): BankCompletion {
  const threshold = input.threshold ?? MIN_SHARED_SUBJECTS;
  const banks = input.banks;
  const families = banks.map((b) => b.familyId);
  const kind: BankKind = banks[0]?.kind ?? "agent";

  const allSubjects = [...new Set(banks.flatMap((b) => b.subjects))].sort();
  const presence: SubjectPresence[] = allSubjects.map((subjectId) => {
    const present = banks.filter((b) => b.subjects.includes(subjectId)).map((b) => b.familyId);
    const absent = families
      .filter((f) => !present.includes(f))
      .map((familyId) => holeFor(subjectId, familyId, input.trials));
    return {
      subjectId,
      providerFamily: providerFamiliesOf([subjectId])[0] ?? "unknown",
      present,
      absent,
      shared: absent.length === 0 && families.length > 0,
    };
  });

  const shared = presence.filter((p) => p.shared).map((p) => p.subjectId);
  const holes = presence.flatMap((p) => p.absent);

  // The minimum work is not "threshold minus shared". A subject already present in two of three
  // families needs one trial; a brand-new subject needs one per family. Take the cheapest subjects
  // first, and only fall back to new subjects when the existing ones cannot close the gap.
  const needed = Math.max(0, threshold - shared.length);
  const closable = presence
    .filter((p) => !p.shared && p.absent.every((h) => h.fillable))
    .map((p) => ({ subject: p.subjectId, cost: p.absent.length }))
    .sort((a, b) => a.cost - b.cost || a.subject.localeCompare(b.subject));

  let remaining = needed;
  let minimumAdditionalTrials = 0;
  const chosen: string[] = [];
  for (const c of closable) {
    if (remaining === 0) break;
    minimumAdditionalTrials += c.cost;
    chosen.push(c.subject);
    remaining -= 1;
  }
  // Whatever the existing subjects cannot supply has to come from subjects that do not exist yet,
  // and a new subject costs one counted trial per family.
  if (remaining > 0) {
    const untried = runnableProviders()
      .filter((p) => !allSubjects.includes(p.subjectId))
      .map((p) => p.subjectId);
    for (const subject of untried) {
      if (remaining === 0) break;
      minimumAdditionalTrials += families.length;
      chosen.push(subject);
      remaining -= 1;
    }
    // Still short: no known provider can supply the difference, and the report must say so rather
    // than quoting a work list that cannot be completed.
    minimumAdditionalTrials += remaining * families.length;
  }

  const unlocks: UnlockStep[] = [];
  for (const subjectId of chosen) {
    const spec = providerFor(subjectId);
    const availability =
      spec === undefined
        ? { available: false, detail: "no provider in the registry hosts this subject" }
        : checkProvider(spec);
    const known = presence.find((p) => p.subjectId === subjectId);
    const targets = known === undefined ? families : known.absent.map((h) => h.familyId);
    for (const familyId of targets) {
      unlocks.push({
        subjectId,
        familyId,
        providerId: spec?.id ?? "external",
        providerFamily: spec?.family ?? "external",
        runnableHere: availability.available,
        availability: availability.detail,
        command: spec?.command ?? null,
        unlocks:
          known === undefined
            ? `adds a new subject; it needs a counted trial in all ${families.length} families before it widens the shared bank`
            : `\`${subjectId}\` is already counted in ${known.present.join(", ") || "no family"}; this is the last ${known.absent.length === 1 ? "trial" : `${known.absent.length} trials`} it needs`,
      });
    }
  }

  const verdict: OverlapVerdict =
    banks.length < 2 || shared.length === 0 ? "refused" : shared.length < threshold ? "partial" : "measured";

  const comparability = comparabilityOf(input);
  const sharedProviderFamilies = providerFamiliesOf(shared);

  const rationale =
    banks.length < 2
      ? `Fewer than two \`${kind}\` banks exist, so there is nothing to compare.`
      : comparability.verdict === "incomparable"
        ? `The banks are not comparable, so no combined width is available at any bank size. ${comparability.detail}`
        : verdict === "refused"
          ? "No subject has a counted, hash-current trial in every family. Co-failure across families is unobservable and the union's width is the sum of the parts by construction."
          : verdict === "partial"
            ? `${shared.length} shared subject(s) against a threshold of ${threshold}. The combined width is bounded above by ${shared.length}, which cannot distinguish complete overlap from independence. ${minimumAdditionalTrials} more counted trial(s) would reach the threshold.`
            : `${shared.length} shared subject(s) across ${sharedProviderFamilies.length} provider family(ies). "Did the same implementation fail both?" has an answer, and the combined width below is computed over the shared subjects only.`;

  return {
    kind,
    axisKind: kind === "mutant" ? "mutant-detection" : "difficulty",
    families,
    verdict,
    threshold,
    sharedSubjects: shared,
    sharedProviderFamilies,
    presence,
    holes,
    minimumAdditionalTrials,
    unlocks,
    comparability,
    rationale,
  };
}

/**
 * The guard every caller that is about to quote a combined width must pass.
 *
 * `combinedMatrixFor` already refuses the disjoint case. This refuses the two remaining ways the
 * number goes wrong: a bank below threshold (where the width is a bound wearing a measurement's
 * clothes) and a bank whose families are not comparable in the first place.
 */
export function assertCombinedWidthAllowed(completion: BankCompletion): void {
  if (completion.comparability.verdict === "incomparable") {
    throw new Error(
      `BANK_INCOMPARABLE: a combined width was requested for ${completion.families.join(" + ")} and the families are not comparable. ${completion.comparability.detail}`,
    );
  }
  if (completion.verdict !== "measured") {
    throw new Error(
      `BANK_BELOW_THRESHOLD: a combined width was requested for ${completion.families.join(" + ")} with ${completion.sharedSubjects.length} shared subject(s) against a threshold of ${completion.threshold}. The width is bounded above by the shared bank size, so the number would be a bound and not a measurement.`,
    );
  }
}
