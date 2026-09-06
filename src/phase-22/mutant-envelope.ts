// Phase 22 Lane 1 — the frozen mutant envelope for caa-revalidation.
//
// The gap Phase 22 responds to: Phase 21's pilot chose its targeted-scenario heuristic with the same
// nine mutants (src/families/caa-revalidation/mutants.ts) it then reported results against. Nothing in
// that pilot could have found the heuristic wanting, because every mutant it was evaluated on was also
// available while it was being built — the train/test split that would let "catches every mutant" mean
// something was never there. This module builds that split, once, and freezes it:
//
//   DEVELOPMENT bank — the original nine mutants, unchanged, re-exported from the family. These are
//   the ones Phase 21's selector was built and piloted against; they may be used for sanity checks
//   here but never reported as held-out evidence.
//
//   HELD-OUT bank — eight new mutants, added here for Phase 22, that nothing in this repository's
//   selector logic has ever been tuned against. All eight are identity-collapse variants (the same
//   CAA1 mechanism as the development bank's `first-name-reuse`), laid out on the one grid this family
//   turned out to admit non-redundant variation on: donor position (which stale name's identity is
//   reused: first, last, or middle) crossed with collapse width (how many OTHER stale names inherit it:
//   one, two, or all). `first-name-reuse` already occupies first-donor/all-width, so the held-out bank
//   is the other eight cells of that 3x3 grid — never a new defect class, so "did the effect
//   generalize" stays an honest question about the same mechanism, not a comparison across unrelated
//   bugs.
//
//   Two OTHER axes were tried and dropped, on direct empirical evidence rather than judgment: result-
//   order variants (rotate-by-one, swap-adjacent-pairs) and wider boundary-age offsets (stale-above-6,
//   stale-above-10). Every one of them produced a `mutantBehaviorHash` IDENTICAL to an existing
//   development-bank mutant (`reversed-order`, `boundary-inclusive`, or `boundary-lenient`) over the
//   full 192-scenario space — not similar, byte-identical failure patterns on every scenario. That is a
//   real property of this family, not a construction mistake: `caa_result_shape` only checks whether
//   the result order exactly matches the input order, so every non-identity permutation of a
//   domain-count->=2 list fails it the same way; and `AGE_PATTERNS` only realizes five discrete ages
//   (0, 8, 9, 24, 719), so any `staleAboveHours` in (0, 8) or (8, 9) reclassifies the exact same names
//   as the two boundary mutants already checked in. Shipping those as "new" held-out mutants would have
//   silently double-counted evidence the development bank already produced — exactly the inflated-
//   independence failure mode this phase exists to avoid. They are recorded as a deliberate exclusion
//   in data/phase-22-preregistration.json instead of shipped here.
//
// Also deliberately NOT built here: a "persistence" or "write-back contamination" variant. This family
// has no cache-mutation or write-back path at all — `OrderName.cachedCaa` is immutable for the life of
// a scenario, and `verify()` grades from the host's own query ledger, never from state a subject could
// have written. Inventing a mutant for a mechanism the substrate doesn't have would be exactly the
// fabrication this phase exists to avoid; that gap is recorded honestly alongside the other two.
//
// Every mutant, in both banks, must clear the same generic soundness bar (`assertEnvelopeSound`, also
// re-checked by scripts/verify-phase-22.mjs): over the full declared scenario space its failure rate is
// strictly between 0% and 100%, AND its behavioral fingerprint is not shared with any other mutant in
// the union of both banks. A mutant that never fails, always fails, or fails on exactly the same
// scenarios as one already present cannot discriminate a good scenario *selection* from a bad one — it
// agrees with itself, or with another mutant, everywhere.

import { createHash } from "node:crypto";
import {
  INTENDED_CHECK as DEV_INTENDED_CHECK,
  MUTANTS as DEV_MUTANTS,
} from "../families/caa-revalidation/mutants.js";
import { makeSubject } from "../families/caa-revalidation/reference.js";
import { runCell } from "../families/caa-revalidation/runner.js";
import { enumerateSpace } from "../families/caa-revalidation/scenarios.js";
import type { Scenario } from "../families/caa-revalidation/truth.js";
import { buildScenario } from "../families/caa-revalidation/truth.js";
import type { Subject } from "../families/caa-revalidation/types.js";
import { fail } from "../foundry/schema.js";

export { DEV_MUTANTS, DEV_INTENDED_CHECK };

const COLLAPSE_GRID: readonly {
  readonly donor: "first-stale" | "last-stale" | "middle-stale";
  readonly donorLabel: string;
  readonly width: 1 | 2 | "all";
}[] = [
  { donor: "first-stale", donorLabel: "FIRST", width: 1 },
  { donor: "first-stale", donorLabel: "FIRST", width: 2 },
  // first-stale/all is `first-name-reuse`, already in the development bank — deliberately excluded.
  { donor: "last-stale", donorLabel: "LAST", width: 1 },
  { donor: "last-stale", donorLabel: "LAST", width: 2 },
  { donor: "last-stale", donorLabel: "LAST", width: "all" },
  { donor: "middle-stale", donorLabel: "MIDDLE", width: 1 },
  { donor: "middle-stale", donorLabel: "MIDDLE", width: 2 },
  { donor: "middle-stale", donorLabel: "MIDDLE", width: "all" },
];

export const HELD_OUT_MUTANTS: readonly Subject[] = COLLAPSE_GRID.map(({ donor, donorLabel, width }) =>
  makeSubject(
    `collapse-${donor.replace("-stale", "")}-width-${width}`,
    `Reuse the ${donorLabel} stale name's identity for ${width === "all" ? "every other stale name" : `${width} other stale name(s)`}`,
    { bindQueryPerName: false, collapseDonor: donor, collapseWidth: width },
  ),
);

export const HELD_OUT_INTENDED_CHECK: Readonly<Record<string, string>> = Object.fromEntries(
  HELD_OUT_MUTANTS.map((subject) => [subject.id, "caa_per_name_binding"]),
);

/** The frozen scenario space both banks are graded against. Unrelated to which subset gets SELECTED. */
export const ALL_SCENARIOS: readonly Scenario[] = enumerateSpace().map(buildScenario);

/** Behavioral fingerprint: exactly what this subject is marked wrong on, over the full frozen space. */
export function mutantBehaviorHash(subject: Subject): string {
  const hash = createHash("sha256");
  const rows = ALL_SCENARIOS.map((scenario) => {
    const cell = runCell(scenario, subject);
    return `${scenario.id}|${[...new Set(cell.failures.map((f) => f.check))].sort().join(",")}`;
  }).sort();
  for (const row of rows) {
    hash.update(row);
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 32);
}

export interface EnvelopeManifestEntry {
  readonly id: string;
  readonly label: string;
  readonly intendedCheck: string;
  readonly behaviorHash: string;
  readonly failureRateOverFullSpace: number;
}

const manifestFor = (
  subjects: readonly Subject[],
  intendedCheck: Readonly<Record<string, string>>,
): readonly EnvelopeManifestEntry[] =>
  subjects.map((subject) => {
    const declared = intendedCheck[subject.id];
    if (declared === undefined) {
      fail("PHASE22_ENVELOPE_INVALID", `mutant.${subject.id}`, "has no declared intended check");
    }
    const failing = ALL_SCENARIOS.filter((s) => runCell(s, subject).failures.length > 0).length;
    return {
      id: subject.id,
      label: subject.label,
      intendedCheck: declared,
      behaviorHash: mutantBehaviorHash(subject),
      failureRateOverFullSpace: Number((failing / ALL_SCENARIOS.length).toFixed(4)),
    };
  });

export interface MutantEnvelope {
  readonly scenarioSpaceSize: number;
  readonly development: readonly EnvelopeManifestEntry[];
  readonly heldOut: readonly EnvelopeManifestEntry[];
  readonly bankHash: string;
}

/**
 * Every mutant, in both banks, must have real (non-vacuous, non-universal) failure variance over the
 * full space, and the two id sets must be strictly disjoint — a mutant that informed selector
 * construction can never also serve as its held-out evidence.
 */
export function assertEnvelopeSound(envelope: MutantEnvelope): void {
  const devIds = new Set(envelope.development.map((e) => e.id));
  const overlap = envelope.heldOut.filter((e) => devIds.has(e.id));
  if (overlap.length > 0) {
    fail(
      "PHASE22_ENVELOPE_INVALID",
      "envelope.heldOut",
      `${overlap.length} held-out mutant id(s) also appear in development: ${overlap.map((e) => e.id).join(",")}`,
    );
  }
  for (const entry of [...envelope.development, ...envelope.heldOut]) {
    if (entry.failureRateOverFullSpace <= 0 || entry.failureRateOverFullSpace >= 1) {
      fail(
        "PHASE22_ENVELOPE_INVALID",
        `envelope.${entry.id}`,
        `failure rate ${entry.failureRateOverFullSpace} is not strictly between 0 and 1 — measures nothing about scenario selection`,
      );
    }
  }
  // Fingerprint uniqueness is required of the HELD-OUT bank (internally, and against every development
  // entry) because that is the bank Phase 22 reports as new evidence. It is NOT required of the
  // development bank against itself: `no-query` and `fabricated-result` (both pre-existing, shipped
  // mutants — src/families/caa-revalidation/mutants.ts) turn out to share a fingerprint too, since this
  // family hardcodes every cached answer to ALLOW, making "report the cache" and "fabricate ALLOW"
  // observably identical. That is a real, pre-existing redundancy this phase did not introduce and is
  // not chartered to fix (mutants.ts is the shipped family sweep other gates depend on); it is recorded
  // in data/phase-22-preregistration.json rather than silently ignored or silently repaired here.
  const devHashes = new Map(envelope.development.map((e) => [e.behaviorHash, e.id]));
  const heldOutHashes = new Map<string, string[]>();
  for (const entry of envelope.heldOut) {
    const devCollision = devHashes.get(entry.behaviorHash);
    if (devCollision !== undefined) {
      fail(
        "PHASE22_ENVELOPE_INVALID",
        `envelope.heldOut.${entry.id}`,
        `shares behavioral fingerprint ${entry.behaviorHash} with development mutant "${devCollision}" — provides no new evidence`,
      );
    }
    heldOutHashes.set(entry.behaviorHash, [...(heldOutHashes.get(entry.behaviorHash) ?? []), entry.id]);
  }
  for (const [hash, ids] of heldOutHashes) {
    if (ids.length > 1) {
      fail(
        "PHASE22_ENVELOPE_INVALID",
        "envelope.heldOut",
        `mutants ${ids.join(", ")} share behavioral fingerprint ${hash} — they fail on exactly the same scenarios and would double-count as evidence`,
      );
    }
  }
}

export function buildMutantEnvelope(): MutantEnvelope {
  const development = manifestFor(DEV_MUTANTS, DEV_INTENDED_CHECK);
  const heldOut = manifestFor(HELD_OUT_MUTANTS, HELD_OUT_INTENDED_CHECK);
  const bankHash = createHash("sha256")
    .update(
      [...development, ...heldOut]
        .map((e) => `${e.id}|${e.behaviorHash}`)
        .sort()
        .join("\n"),
    )
    .digest("hex")
    .slice(0, 32);
  const envelope: MutantEnvelope = {
    scenarioSpaceSize: ALL_SCENARIOS.length,
    development,
    heldOut,
    bankHash,
  };
  assertEnvelopeSound(envelope);
  return envelope;
}

/** All subjects in the union of both banks, keyed by id, for callers that grade against "the envelope". */
export function envelopeSubjectById(): ReadonlyMap<string, Subject> {
  const map = new Map<string, Subject>();
  for (const subject of [...DEV_MUTANTS, ...HELD_OUT_MUTANTS]) map.set(subject.id, subject);
  return map;
}
