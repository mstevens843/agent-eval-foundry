// Executing a campaign plan, and reconciling a plan against the trial directories on disk.
//
// Two operations, and the second is the one that keeps a campaign honest over time. Executing a plan
// is mechanical: for each runnable slot, run the trial, record the run id. Reconciling asks the
// harder question — does the plan still describe what happened? A slot marked RUN whose directory
// was deleted, a slot marked NOT_RUN whose directory exists, a campaign whose challenge hash no
// longer matches the family: all three are states where the plan and the evidence disagree, and all
// three are silent unless something looks.
//
// Reconciliation never edits the plan. It reports the disagreement and exits non-zero, because a
// tool that quietly rewrites its own pre-registration to match the outcome is not a pre-registration.

import { join } from "node:path";
import { type CampaignPlan, type CampaignSlot, assertCampaignChallenge } from "./campaign.js";
import { readFamilyTrials } from "./directory.js";
import { gateByChallengeHash, prepareChallenge, runAgentTrial } from "./run.js";
import type { TrialRecord } from "./types.js";

export interface SlotOutcome {
  readonly slot: CampaignSlot;
  readonly runId: string | null;
  readonly executed: boolean;
  readonly counted: boolean;
  /** What the provider said this slot cost. Null when it was skipped or the provider reports no price. */
  readonly costUsd: number | null;
  readonly detail: string;
}

export interface CampaignRunResult {
  readonly plan: CampaignPlan;
  readonly outcomes: readonly SlotOutcome[];
  readonly executed: number;
  readonly counted: number;
  readonly skipped: number;
  /**
   * Measured spend for the slots that ran; null when none reported a price. Null is the honest answer
   * for an all-Codex campaign, whose CLI reports tokens and no cost: a total assembled from a rate
   * literal is an estimate printed where a receipt belongs.
   */
  readonly costUsd: number | null;
}

export interface CampaignRunOptions {
  readonly root: string;
  readonly plan: CampaignPlan;
  /** Only run these slot ids. Empty means every runnable slot. */
  readonly only?: readonly string[];
  /** Run id prefix; the slot id is appended. */
  readonly runIdPrefix?: string;
  readonly inheritEnv?: boolean;
}

/**
 * Execute the runnable slots of a campaign.
 *
 * `external` slots are skipped rather than faked. That is the whole reason the state exists: a plan
 * that needs a Codex CLI this machine does not have produces three NOT_RUN slots and says so, which
 * is a different and more useful artifact than three slots quietly missing.
 */
export function runCampaign(options: CampaignRunOptions): CampaignRunResult {
  const { root, plan } = options;

  // Before anything runs: the plan's challenge hash must still describe the family. A campaign
  // executed against a drifted challenge produces trials that cannot count, and finding that out
  // after spending the budget is the expensive way to learn it.
  const prepared = prepareChallenge(root, plan.familyId);
  assertCampaignChallenge(plan, prepared.hash);

  const outcomes: SlotOutcome[] = [];
  for (const slot of plan.slots) {
    const selected =
      options.only === undefined || options.only.length === 0 || options.only.includes(slot.slotId);
    if (!selected) {
      outcomes.push({
        slot,
        runId: slot.runId,
        executed: false,
        counted: false,
        costUsd: null,
        detail: "not selected",
      });
      continue;
    }
    if (slot.runner === "external" || slot.command === null) {
      outcomes.push({
        slot,
        runId: null,
        executed: false,
        counted: false,
        costUsd: null,
        detail: "external runner: prepare the bundle and import the result; this machine cannot run it",
      });
      continue;
    }
    if (slot.state === "RUN" || slot.state === "IMPORTED") {
      outcomes.push({
        slot,
        runId: slot.runId,
        executed: false,
        counted: false,
        costUsd: null,
        detail: `already ${slot.state} as ${slot.runId}`,
      });
      continue;
    }

    const runId = `${options.runIdPrefix ?? plan.campaignId}-${slot.slotId.toLowerCase()}`;
    const result = runAgentTrial({
      root,
      familyId: plan.familyId,
      runId,
      provider: slot.runner === "shell" ? "shell" : slot.runner,
      model: slot.model,
      subjectId: slot.subjectId,
      effort: slot.effort,
      command: slot.command,
      timeoutMs: plan.timeoutMs,
      inheritEnv: options.inheritEnv ?? true,
      campaign: plan.campaignId,
    });
    outcomes.push({
      slot,
      runId,
      executed: true,
      counted: result.countability.counts,
      costUsd: result.record.costUsd,
      detail: result.countability.reason,
    });
  }

  const priced = outcomes.map((o) => o.costUsd).filter((c): c is number => c !== null);
  return {
    plan,
    outcomes,
    executed: outcomes.filter((o) => o.executed).length,
    counted: outcomes.filter((o) => o.counted).length,
    skipped: outcomes.filter((o) => !o.executed).length,
    costUsd: priced.length === 0 ? null : priced.reduce((sum, c) => sum + c, 0),
  };
}

export interface Reconciliation {
  readonly plan: CampaignPlan;
  readonly challengeCurrent: string;
  readonly challengeMatches: boolean;
  /** Slots whose recorded state disagrees with the directories on disk. */
  readonly disagreements: readonly string[];
  /** Trial directories for this family that no slot claims. */
  readonly orphanRuns: readonly string[];
  /** Counted records that measured the CURRENT challenge. */
  readonly countedRecords: readonly TrialRecord[];
  /** Preserved trials that measured an earlier challenge. Evidence, but not for this task. */
  readonly supersededRuns: readonly string[];
}

/** Compare a plan against the trial directories, without changing either. */
export function reconcile(root: string, plan: CampaignPlan): Reconciliation {
  const prepared = prepareChallenge(root, plan.familyId);
  const dirs = readFamilyTrials(join(root, "trials"), plan.familyId);
  const byRunId = new Map(dirs.map((d) => [d.runId, d]));
  const claimed = new Set(plan.slots.map((s) => s.runId).filter((r): r is string => r !== null));

  const disagreements: string[] = [];
  for (const slot of plan.slots) {
    const trial = slot.runId === null ? undefined : byRunId.get(slot.runId);
    if (slot.runId !== null && trial === undefined) {
      disagreements.push(
        `slot ${slot.slotId} claims run \`${slot.runId}\`, which has no trial directory — the evidence for this slot is gone`,
      );
    }
    if (trial !== undefined && trial.record.isolation !== plan.isolation) {
      disagreements.push(
        `slot ${slot.slotId} requires ${plan.isolation} isolation but run \`${trial.runId}\` records ${trial.record.isolation}`,
      );
    }
    if (slot.state === "NOT_RUN" && slot.runId === null) {
      // Look for a directory that obviously belongs to this slot but is unrecorded.
      const guess = `${plan.campaignId}-${slot.slotId.toLowerCase()}`;
      if (byRunId.has(guess)) {
        disagreements.push(
          `slot ${slot.slotId} is marked NOT_RUN but trial directory \`${guess}\` exists; the plan is behind the evidence`,
        );
      }
    }
  }

  // A record only counts for THIS campaign if it measured this challenge. Counting every directory
  // reported six counted trials for a campaign with three, because the three superseded by a spec
  // repair were still on disk — preserved deliberately, and not evidence for the current task.
  const gated = gateByChallengeHash(
    root,
    plan.familyId,
    dirs.map((d) => ({ runId: d.runId, metadataPath: join(d.path, "metadata.json"), dir: d.path })),
  );
  const stale = new Set(gated.gates.filter((g) => !g.matches).map((g) => g.runId));

  return {
    plan,
    challengeCurrent: prepared.hash,
    challengeMatches: prepared.hash === plan.challengeHash,
    disagreements,
    orphanRuns: dirs.map((d) => d.runId).filter((id) => !claimed.has(id) && !stale.has(id)),
    countedRecords: dirs.filter((d) => d.record.counts && !stale.has(d.runId)).map((d) => d.record),
    supersededRuns: [...stale].sort(),
  };
}
