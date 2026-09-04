// The lifecycle of a piece of evidence, and the checks that stop it being quoted after it stops
// being true.
//
// A trial is not simply counted or uncounted. It has a history:
//
//   counted      graded, hash matches the family as it stands today
//   registered-variant
//                graded against a preregistered material variant that remains reproducible, but is
//                not evidence about the family's canonical package
//   superseded   graded, but the family was repaired afterwards — evidence about a task that is gone
//   refused      the provider declined; never an attempt, never a failure
//   infra        the provider could not authenticate, or the run hit a limit; no attempt reached the task
//   crashed      the attempt reached the task and the harness died carrying it
//   not-run      a declared slot nobody has executed
//
// `crashed` and `infra` were one bucket until a run of each landed side by side and the fold became
// obviously wrong. `mp-gemini-1` never authenticated: the provider refused the account before a single
// token of the task was sent, so there is nothing to look at and nothing to fix in this repository.
// `live-dom-2026-08-o1` got the whole package, ran, and exited non-zero with no artifact: something
// there is broken, and it is either the subject's code or ours. Those two facts point at different
// people and different next actions. Filed together they read as one number — "2 uncounted, infra" —
// which is exactly the summary that lets a harness bug sit unexamined for a month behind a word that
// sounds like somebody else's problem.
//
// Neither state counts, so the difficulty numbers do not move. What moves is what a reader is told.
//
// The distinction that costs money is `superseded`. Repairing an ambiguity that a real trial exposed
// invalidates the trials that exposed it, and the temptation at that moment is enormous: the numbers
// were good, the repair was small, and nobody would notice. The checks below exist because that
// temptation arrives exactly when the evidence is most expensive to re-collect.
//
// Every assertion here failed at least once during the phase that produced it.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fail } from "../foundry/schema.js";
import type { CampaignPlan } from "./campaign.js";
import type { TrialDirectory } from "./directory.js";
import { hashChallengeDir } from "./run.js";
import type { TrialRecord } from "./types.js";

export const EVIDENCE_STATES = [
  "counted",
  "registered-variant",
  "superseded",
  "refused",
  "infra",
  "crashed",
  "not-run",
] as const;
export type EvidenceState = (typeof EVIDENCE_STATES)[number];

/** A noncanonical challenge hash whose material delta was registered before its trial output. */
export interface ChallengeVariantRegistration {
  readonly variantId: string;
  readonly familyId: string;
  readonly challengeHash: string;
  readonly canonicalHash: string;
  readonly registrationPath: string;
  readonly registrationSha256: string;
}

/**
 * Where `ranAgainst` came from.
 *
 * `recorded` is the metadata saying so. `derived` is this module hashing the challenge the trial
 * preserved, because the metadata says nothing — which is a sound answer (the artifact beats a note
 * about the artifact) but a different one, and a reader who is told "counted" deserves to know which
 * of the two they are looking at. `unavailable` means neither exists, and nothing can be claimed.
 */
export const HASH_SOURCES = ["recorded", "derived", "unavailable"] as const;
export type HashSource = (typeof HASH_SOURCES)[number];

export interface EvidenceEntry {
  readonly runId: string;
  readonly familyId: string;
  readonly model: string | null;
  readonly state: EvidenceState;
  /** Hash the trial was run against, derived from its preserved challenge when metadata lacks it. */
  readonly ranAgainst: string | null;
  /**
   * Whether `ranAgainst` was read from metadata or recomputed from the preserved challenge.
   *
   * Optional only so that a hand-built ledger fixture — which has no provenance to state, because no
   * trial directory stands behind it — is not forced to invent one. Every entry `evidenceLedger`
   * produces sets it.
   */
  readonly hashSource?: HashSource;
  readonly currentHash: string;
  readonly variantId?: string;
  readonly variantRegistration?: string;
  readonly reason: string;
}

export interface EvidenceLedger {
  readonly familyId: string;
  readonly currentHash: string;
  readonly entries: readonly EvidenceEntry[];
  readonly counted: readonly string[];
  readonly superseded: readonly string[];
  /** Reproducible evidence for registered profiles that must not enter the canonical family bank. */
  readonly registeredVariants?: readonly string[];
  /**
   * Counted trials whose hash was recomputed from the preserved challenge rather than read from
   * metadata. They count, and the fact that they count is an inference — so it is listed rather than
   * left for a reader to discover by opening a metadata file and finding nothing there.
   *
   * Optional for the same reason as `hashSource`; always set by `evidenceLedger`.
   */
  readonly countedByDerivation?: readonly string[];
}

/** Classify every preserved trial for a family against the challenge as it stands now. */
export function evidenceLedger(
  familyId: string,
  currentHash: string,
  trials: readonly TrialDirectory[],
  registeredVariants: readonly ChallengeVariantRegistration[] = [],
): EvidenceLedger {
  const variants = registeredVariants.filter((variant) => variant.familyId === familyId);
  for (const variant of variants) {
    if (variant.canonicalHash !== currentHash) {
      fail(
        "TRIAL_CHALLENGE_HASH_MISMATCH",
        `variant.${variant.variantId}`,
        `registration names canonical hash ${variant.canonicalHash}, but ${familyId} now produces ${currentHash}`,
      );
    }
  }
  const entries = trials.map((trial): EvidenceEntry => {
    const metaPath = join(trial.path, "metadata.json");
    let recorded: string | null = null;
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, "utf8")) as Record<string, unknown>;
        recorded = typeof meta["challengeHash"] === "string" ? meta["challengeHash"] : null;
      } catch {
        recorded = null;
      }
    }
    const derived = recorded ?? hashChallengeDir(join(trial.path, "challenge"));
    const hashSource: HashSource =
      recorded !== null ? "recorded" : derived !== null ? "derived" : "unavailable";
    const ranAgainst = derived;
    const record = trial.record;
    const base = { runId: trial.runId, familyId, model: record.model, ranAgainst, hashSource, currentHash };
    // Stated on every entry whose hash was inferred, whatever its state, so the inference travels with
    // the classification instead of being a property of this module that nobody downstream can see.
    const derivationNote =
      hashSource === "derived"
        ? " Hash derived from the preserved challenge directory; this trial's metadata records none."
        : "";

    if (record.status === "refused") {
      return { ...base, state: "refused", reason: "the provider declined; no attempt was made" };
    }
    if (record.status === "infrastructure_error" || record.status === "timeout") {
      return { ...base, state: "infra", reason: record.countsReason };
    }
    // A crash is its own fact. It is not an auth failure and not a rate limit: the subject was given
    // the task and something died carrying it, so unlike `infra` there is a transcript worth reading
    // and a bug worth locating. It stays uncounted by default — `types.ts` is explicit that promoting
    // a crash to a failure is a hand judgement — and a crash an importer HAS judged to be the
    // subject's own code (`counts: true`) falls through to the hash gate below, because at that point
    // it is a graded failure like any other and must not dodge supersession.
    if (record.status === "crashed" && !record.counts) {
      return { ...base, state: "crashed", reason: record.countsReason };
    }
    if (ranAgainst !== currentHash) {
      const variant = variants.find((candidate) => candidate.challengeHash === ranAgainst);
      if (variant !== undefined) {
        return {
          ...base,
          state: "registered-variant",
          variantId: variant.variantId,
          variantRegistration: `${variant.registrationPath}@${variant.registrationSha256}`,
          reason: `run against registered variant ${variant.variantId}; valid in that profile and excluded from canonical-family evidence.${derivationNote}`,
        };
      }
      return {
        ...base,
        state: "superseded",
        reason: `run against challenge ${ranAgainst ?? "unknown"}; the family now produces ${currentHash}.${derivationNote}`,
      };
    }
    return {
      ...base,
      state: record.counts ? "counted" : "infra",
      reason: `${record.countsReason}${derivationNote}`,
    };
  });

  const counted = entries.filter((e) => e.state === "counted");
  return {
    familyId,
    currentHash,
    entries,
    counted: counted.map((e) => e.runId),
    superseded: entries.filter((e) => e.state === "superseded").map((e) => e.runId),
    registeredVariants: entries.filter((e) => e.state === "registered-variant").map((e) => e.runId),
    countedByDerivation: counted.filter((e) => e.hashSource === "derived").map((e) => e.runId),
  };
}

/**
 * No superseded trial may appear in a counted set.
 *
 * The check that makes the repair discipline real. It takes the records that some other code decided
 * to count and compares them against the ledger, so a caller that forgot to gate is caught rather
 * than trusted.
 */
export function assertNoStaleCounted(ledger: EvidenceLedger, counted: readonly TrialRecord[]): void {
  const noncanonical = new Set([...ledger.superseded, ...(ledger.registeredVariants ?? [])]);
  for (const record of counted) {
    if (noncanonical.has(record.runId)) {
      fail(
        "EVIDENCE_STALE_COUNTED",
        `evidence.${ledger.familyId}.${record.runId}`,
        "counted in the canonical family bank, but it was run against a different challenge hash. Registered variants remain evidence for their own profile; superseded tasks remain historical evidence. Neither is evidence about the canonical package.",
      );
    }
  }
}

/**
 * A campaign whose challenge hash has drifted must be reissued before it is quoted.
 *
 * The failure this catches is subtler than a stale trial: the plan itself — its kill signal, its
 * counting rules, its budget — was written against a task that has since changed. Re-reading it as
 * though it described the current family is how a pre-registration quietly becomes a rationalisation.
 */
export function assertCampaignReissued(plan: CampaignPlan, currentHash: string): void {
  if (plan.challengeHash !== currentHash) {
    fail(
      "EVIDENCE_CAMPAIGN_NOT_REISSUED",
      `campaign.${plan.campaignId}`,
      `written against challenge ${plan.challengeHash}; the family now produces ${currentHash}. Reissue the plan with the new hash and re-run its slots — a pre-registration for a different task is not a pre-registration for this one.`,
    );
  }
}

/**
 * A report that omits superseded runs is hiding the cost of its own repairs.
 *
 * Cheap to violate by accident: filter the counted set, render it, and the invalidated trials simply
 * are not there. The spend was real and the repair came from those runs, so they are named.
 */
export function assertSupersededDisclosed(ledger: EvidenceLedger, reportText: string): void {
  for (const runId of ledger.superseded) {
    if (!reportText.includes(runId)) {
      fail(
        "EVIDENCE_SUPERSEDED_HIDDEN",
        `evidence.${ledger.familyId}.${runId}`,
        "superseded and not named anywhere in the report; invalidated trials are real spend and stay visible",
      );
    }
  }
}

/**
 * A family whose spec was repaired needs a postmortem naming what was ambiguous.
 *
 * Without it the repair is indistinguishable from a tweak, and the next family repeats the ambiguity.
 */
export function assertAmbiguityPostmortem(
  familyId: string,
  ledger: EvidenceLedger,
  postmortemExists: boolean,
): void {
  if (ledger.superseded.length > 0 && !postmortemExists) {
    fail(
      "EVIDENCE_AMBIGUITY_UNDOCUMENTED",
      `evidence.${familyId}`,
      `${ledger.superseded.length} trial(s) were invalidated by a change to this family and no ambiguity postmortem exists. A repair nobody wrote down teaches the next family nothing.`,
    );
  }
}
