// The lifecycle of a piece of evidence, and the checks that stop it being quoted after it stops
// being true.
//
// A trial is not simply counted or uncounted. It has a history:
//
//   counted      graded, hash matches the family as it stands today
//   superseded   graded, but the family was repaired afterwards — evidence about a task that is gone
//   refused      the provider declined; never an attempt, never a failure
//   infra        the provider could not authenticate, or the harness broke
//   not-run      a declared slot nobody has executed
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

export const EVIDENCE_STATES = ["counted", "superseded", "refused", "infra", "not-run"] as const;
export type EvidenceState = (typeof EVIDENCE_STATES)[number];

export interface EvidenceEntry {
  readonly runId: string;
  readonly familyId: string;
  readonly model: string | null;
  readonly state: EvidenceState;
  /** Hash the trial was run against, derived from its preserved challenge when metadata lacks it. */
  readonly ranAgainst: string | null;
  readonly currentHash: string;
  readonly reason: string;
}

export interface EvidenceLedger {
  readonly familyId: string;
  readonly currentHash: string;
  readonly entries: readonly EvidenceEntry[];
  readonly counted: readonly string[];
  readonly superseded: readonly string[];
}

/** Classify every preserved trial for a family against the challenge as it stands now. */
export function evidenceLedger(
  familyId: string,
  currentHash: string,
  trials: readonly TrialDirectory[],
): EvidenceLedger {
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
    const ranAgainst = recorded ?? hashChallengeDir(join(trial.path, "challenge"));
    const record = trial.record;

    if (record.status === "refused") {
      return {
        runId: trial.runId,
        familyId,
        model: record.model,
        state: "refused",
        ranAgainst,
        currentHash,
        reason: "the provider declined; no attempt was made",
      };
    }
    if (record.status === "infrastructure_error" || record.status === "timeout") {
      return {
        runId: trial.runId,
        familyId,
        model: record.model,
        state: "infra",
        ranAgainst,
        currentHash,
        reason: record.countsReason,
      };
    }
    if (ranAgainst !== currentHash) {
      return {
        runId: trial.runId,
        familyId,
        model: record.model,
        state: "superseded",
        ranAgainst,
        currentHash,
        reason: `run against challenge ${ranAgainst ?? "unknown"}; the family now produces ${currentHash}`,
      };
    }
    return {
      runId: trial.runId,
      familyId,
      model: record.model,
      state: record.counts ? "counted" : "infra",
      ranAgainst,
      currentHash,
      reason: record.countsReason,
    };
  });

  return {
    familyId,
    currentHash,
    entries,
    counted: entries.filter((e) => e.state === "counted").map((e) => e.runId),
    superseded: entries.filter((e) => e.state === "superseded").map((e) => e.runId),
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
  const superseded = new Set(ledger.superseded);
  for (const record of counted) {
    if (superseded.has(record.runId)) {
      fail(
        "EVIDENCE_STALE_COUNTED",
        `evidence.${ledger.familyId}.${record.runId}`,
        "counted, and it was run against a challenge this family no longer produces. It is evidence about a task that no longer exists.",
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
