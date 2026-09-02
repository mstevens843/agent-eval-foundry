// Campaign plans: a trial run declared before it happens, so the result cannot be reinterpreted
// after it.
//
// WHY THE PLAN IS A FILE AND NOT A COMMAND LINE
//
// A campaign has a pre-registration problem. "Three trials of Opus and three of Codex, counting rules
// as follows" is a commitment; the same sentence written after seeing the outcome is a rationale. The
// source project's kill log survives scrutiny because the kill signal for each mechanism was written
// down before the run — and the one number in this repository I trust most is the containment
// family's, because `plans/prompt-injection-agent-trials.md` said "all six pass cleanly means
// already-solved, kill or harden" three weeks before three trials passed cleanly.
//
// So a plan carries: who runs, how many times, against which challenge hash, under what timeout, with
// what counting rules, what happens to refusals and infrastructure failures, and what the result would
// have to look like to kill the family. A slot with no result is `NOT_RUN`, which is a legitimate and
// visible state — not an absence to be filled in later with something plausible.
//
// The challenge hash is what makes a plan enforceable across machines. A campaign prepared here and
// run somewhere else produces trial directories whose hash either matches the family this repository
// holds, or does not, in which case they measured a different task and cannot count.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  type RuleCode,
  fail,
  isRecord,
  num,
  numNullable,
  oneOf,
  str,
  strArray,
  strNullable,
} from "../foundry/schema.js";
import { DIFFICULTY_EVIDENCE_CAUSES, type RootCause } from "./root-cause.js";
import { NEVER_COUNTS, type TrialStatus, cellFailed } from "./types.js";
import type { TrialRecord } from "./types.js";

export const SLOT_STATES = ["NOT_RUN", "RUN", "REFUSED", "FAILED_INFRA", "IMPORTED"] as const;
export type SlotState = (typeof SLOT_STATES)[number];

export const RUNNER_KINDS = ["shell", "claude-cli", "codex-cli", "gemini-cli", "docker", "external"] as const;
export type RunnerKind = (typeof RUNNER_KINDS)[number];

export interface CampaignSlot {
  readonly slotId: string;
  readonly model: string;
  readonly subjectId: string;
  readonly effort: string | null;
  /** How the slot is expected to be run. `external` means "not on this machine". */
  readonly runner: RunnerKind;
  /** Command template, `{instruction}` substituted. Null for `external`. */
  readonly command: readonly string[] | null;
  readonly state: SlotState;
  /** Run id of the trial directory this slot produced, once it has one. */
  readonly runId: string | null;
  readonly note: string;
}

export interface CountingRules {
  /** Statuses that can never count. Declared here and cross-checked against the code. */
  readonly neverCounts: readonly TrialStatus[];
  /** What happens when a provider refuses. */
  readonly onRefusal: string;
  readonly onInfraFailure: string;
  readonly onCrash: string;
  /** How many times a slot may be re-run after an infrastructure failure. */
  readonly retriesOnInfra: number;
  /** Whether a re-run after a REFUSAL is permitted. Almost always false — see the note. */
  readonly retryOnRefusal: boolean;
}

export interface CampaignPlan {
  readonly campaignId: string;
  readonly familyId: string;
  readonly hypothesis: string;
  /** What result would kill the family. Written before the run. */
  readonly killSignal: string;
  /** What result would confirm the evolution operator worked. */
  readonly confirmSignal: string;
  readonly challengeHash: string;
  readonly scenarioSetId: string;
  readonly scenariosExpected: number;
  readonly timeoutMs: number;
  readonly artifactPath: string;
  readonly isolation: "subprocess" | "container";
  readonly counting: CountingRules;
  readonly preservation: readonly string[];
  readonly budgetUsd: number;
  readonly slots: readonly CampaignSlot[];
}

const CAMPAIGN_CODES: readonly RuleCode[] = [
  "CAMPAIGN_NO_KILL_SIGNAL",
  "CAMPAIGN_COUNTING_CONTRADICTS_CODE",
  "CAMPAIGN_SLOT_WITHOUT_RUN",
  "CAMPAIGN_CHALLENGE_HASH_MISMATCH",
  "CAMPAIGN_RETRY_ON_REFUSAL",
];
export const CAMPAIGN_RULE_CODES = CAMPAIGN_CODES;

function parseSlot(v: unknown, path: string): CampaignSlot {
  const o = isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");
  const command = o["command"];
  return {
    slotId: str(o["slotId"], `${path}.slotId`),
    model: str(o["model"], `${path}.model`),
    subjectId: str(o["subjectId"], `${path}.subjectId`),
    effort: strNullable(o["effort"], `${path}.effort`),
    runner: oneOf(o["runner"], `${path}.runner`, RUNNER_KINDS),
    command: command === null || command === undefined ? null : strArray(command, `${path}.command`),
    state: oneOf(o["state"], `${path}.state`, SLOT_STATES),
    runId: strNullable(o["runId"], `${path}.runId`),
    note: typeof o["note"] === "string" ? o["note"] : "",
  };
}

export function parseCampaignPlan(v: unknown, path = "campaign"): CampaignPlan {
  const o = isRecord(v) ? v : fail("E_SHAPE", path, "expected an object");
  const counting = isRecord(o["counting"])
    ? o["counting"]
    : fail("E_SHAPE", `${path}.counting`, "expected an object");

  const plan: CampaignPlan = {
    campaignId: str(o["campaignId"], `${path}.campaignId`),
    familyId: str(o["familyId"], `${path}.familyId`),
    hypothesis: str(o["hypothesis"], `${path}.hypothesis`),
    killSignal: str(o["killSignal"], `${path}.killSignal`),
    confirmSignal: str(o["confirmSignal"], `${path}.confirmSignal`),
    challengeHash: str(o["challengeHash"], `${path}.challengeHash`),
    scenarioSetId: str(o["scenarioSetId"], `${path}.scenarioSetId`),
    scenariosExpected: num(o["scenariosExpected"], `${path}.scenariosExpected`),
    timeoutMs: num(o["timeoutMs"], `${path}.timeoutMs`),
    artifactPath: str(o["artifactPath"], `${path}.artifactPath`),
    isolation: oneOf(o["isolation"], `${path}.isolation`, ["subprocess", "container"] as const),
    counting: {
      neverCounts: strArray(
        counting["neverCounts"],
        `${path}.counting.neverCounts`,
      ) as readonly TrialStatus[],
      onRefusal: str(counting["onRefusal"], `${path}.counting.onRefusal`),
      onInfraFailure: str(counting["onInfraFailure"], `${path}.counting.onInfraFailure`),
      onCrash: str(counting["onCrash"], `${path}.counting.onCrash`),
      retriesOnInfra: num(counting["retriesOnInfra"], `${path}.counting.retriesOnInfra`),
      retryOnRefusal: counting["retryOnRefusal"] === true,
    },
    preservation: strArray(o["preservation"], `${path}.preservation`),
    budgetUsd: num(o["budgetUsd"], `${path}.budgetUsd`),
    slots: Array.isArray(o["slots"])
      ? o["slots"].map((s, i) => parseSlot(s, `${path}.slots[${i}]`))
      : fail("E_SHAPE", `${path}.slots`, "expected an array"),
  };

  assertPlanHonest(plan);
  return plan;
}

/**
 * The checks that make a plan a pre-registration rather than a description.
 *
 * The counting-rules check is the one with teeth: the plan's `neverCounts` list must match the
 * code's, exactly. A plan that quietly omits `refused` from its never-count list would let a
 * campaign report a provider refusal as a model failure, which is precisely the reading the source
 * project had to correct in prose.
 */
export function assertPlanHonest(plan: CampaignPlan): void {
  const path = `campaign.${plan.campaignId}`;

  if (plan.killSignal.trim().length < 20 || plan.confirmSignal.trim().length < 20) {
    fail(
      "CAMPAIGN_NO_KILL_SIGNAL",
      path,
      "a campaign must say, before it runs, what result would kill the family and what would confirm it; a plan with no kill signal cannot produce a negative result",
    );
  }

  const declared = [...plan.counting.neverCounts].sort();
  const actual = [...NEVER_COUNTS].sort();
  if (declared.join(",") !== actual.join(",")) {
    fail(
      "CAMPAIGN_COUNTING_CONTRADICTS_CODE",
      `${path}.counting.neverCounts`,
      `declares [${declared.join(", ")}] but the counting rules in code are [${actual.join(", ")}]; a plan may not redefine what counts`,
    );
  }

  if (plan.counting.retryOnRefusal) {
    fail(
      "CAMPAIGN_RETRY_ON_REFUSAL",
      `${path}.counting.retryOnRefusal`,
      "re-running a slot after a provider refusal until it complies turns a refusal into a sampling artifact; record the refusal and leave it",
    );
  }

  for (const slot of plan.slots) {
    if ((slot.state === "RUN" || slot.state === "IMPORTED") && slot.runId === null) {
      fail(
        "CAMPAIGN_SLOT_WITHOUT_RUN",
        `${path}.slots.${slot.slotId}`,
        `state is ${slot.state} with no run id; a slot claiming a result must name the trial directory holding it`,
      );
    }
    if (slot.state === "NOT_RUN" && slot.runId !== null) {
      fail(
        "CAMPAIGN_SLOT_WITHOUT_RUN",
        `${path}.slots.${slot.slotId}`,
        "state is NOT_RUN and a run id is recorded; one of the two is wrong",
      );
    }
  }
}

/** A campaign whose challenge hash no longer matches the family measured a different task. */
export function assertCampaignChallenge(plan: CampaignPlan, currentHash: string): void {
  if (plan.challengeHash !== currentHash) {
    fail(
      "CAMPAIGN_CHALLENGE_HASH_MISMATCH",
      `campaign.${plan.campaignId}.challengeHash`,
      `plan was written against challenge ${plan.challengeHash}; the family now produces ${currentHash}. Every slot in this campaign was run against a different task.`,
    );
  }
}

export function loadCampaign(path: string): CampaignPlan {
  if (!existsSync(path)) throw new Error(`no campaign plan at ${path}`);
  return parseCampaignPlan(JSON.parse(readFileSync(path, "utf8")), `campaign:${path}`);
}

/** Every campaign plan checked into the repository, in id order. */
export function loadCampaigns(root: string): readonly CampaignPlan[] {
  const dir = join(root, "campaigns");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => loadCampaign(join(dir, f)));
}

// ---------------------------------------------------------------- the kill signal, evaluated
//
// `killSignal` was a string that nothing read. `assertPlanHonest` checked it was at least twenty
// characters long and no code anywhere asked whether it had fired — a pre-registered kill condition
// that only a person re-reading the plan could ever apply, which is decoration on a discipline
// claim. It is executable now.
//
// WHAT IS AND IS NOT EVALUATED
//
// The prose is not evaluated and cannot be: "failures concentrate only on unclear public rollout
// wording" is a judgement. What IS evaluated is the mechanical core that every checked-in kill
// signal in this repository states, in these words or near them:
//
//   1. every counted trial passes cleanly            -> already-solved; kill, harden or reallocate
//   2. the failures are not difficulty               -> HOLD/REPAIR rather than difficulty-evidenced
//                                                       ("harness errors", "package defect",
//                                                       "ambiguous public wording", "spec work")
//
// Clause 2 is exactly the root-cause record: a counted failure that nobody has attributed to
// capability, or that somebody has attributed to the spec, the harness, a leak or infrastructure,
// is not difficulty evidence and the plan said so before the run. So the verdict is computed from
// the counted trials of the campaign's OWN slots and their root causes, and the report prints the
// prose beside it so a reader can see what the machine did not evaluate.

export const KILL_SIGNAL_VERDICTS = [
  /** No counted trial in this campaign's slots. Neither signal can have fired. */
  "NOT_EVALUABLE",
  /** Clause 1: every counted trial passed everything. */
  "FIRED_ALREADY_SOLVED",
  /** Clause 2: counted failures exist and none is root-caused to capability. */
  "FIRED_NOT_DIFFICULTY",
  /** At least one counted trial failed with root cause `capability`. */
  "NOT_FIRED",
] as const;
export type KillSignalVerdict = (typeof KILL_SIGNAL_VERDICTS)[number];

/** One counted trial as the kill-signal evaluator needs to see it. */
export interface KillSignalTrial {
  readonly record: TrialRecord;
  readonly rootCause: RootCause;
}

export interface KillSignalEvaluation {
  readonly campaignId: string;
  readonly familyId: string;
  readonly killSignal: string;
  readonly verdict: KillSignalVerdict;
  readonly detail: string;
  readonly countedTrials: number;
  readonly cleanTrials: number;
  readonly failingTrials: number;
  readonly capabilityTrials: number;
  /** Failing trials whose root cause is not `capability`, with the cause that disqualified them. */
  readonly disqualified: readonly { readonly runId: string; readonly rootCause: RootCause }[];
}

/**
 * Evaluate a plan's pre-registered kill signal against the counted trials its slots produced.
 *
 * `trials` is the caller's job to scope: this function does not read the filesystem, so a campaign
 * is judged on the population the caller says belongs to it rather than on every directory that
 * happens to share the family.
 */
export function evaluateKillSignal(
  plan: CampaignPlan,
  trials: readonly KillSignalTrial[],
): KillSignalEvaluation {
  const claimed = new Set(plan.slots.map((s) => s.runId).filter((r): r is string => r !== null));
  const counted = trials.filter(
    (t) =>
      claimed.has(t.record.runId) &&
      t.record.subjectType === "agent" &&
      t.record.counts &&
      !NEVER_COUNTS.has(t.record.status),
  );
  const failing = counted.filter((t) => t.record.cells.some(cellFailed));
  const capability = failing.filter((t) => DIFFICULTY_EVIDENCE_CAUSES.has(t.rootCause));
  const disqualified = failing
    .filter((t) => !DIFFICULTY_EVIDENCE_CAUSES.has(t.rootCause))
    .map((t) => ({ runId: t.record.runId, rootCause: t.rootCause }))
    .sort((a, b) => a.runId.localeCompare(b.runId));

  const base = {
    campaignId: plan.campaignId,
    familyId: plan.familyId,
    killSignal: plan.killSignal,
    countedTrials: counted.length,
    cleanTrials: counted.length - failing.length,
    failingTrials: failing.length,
    capabilityTrials: capability.length,
    disqualified,
  };

  if (counted.length === 0) {
    return {
      ...base,
      verdict: "NOT_EVALUABLE",
      detail:
        "no counted trial belongs to this campaign's slots; the pre-registration stands and neither signal has fired",
    };
  }
  if (capability.length > 0) {
    return {
      ...base,
      verdict: "NOT_FIRED",
      detail: `${capability.length} of ${counted.length} counted trial(s) failed with root cause \`capability\`; the family survives its own kill condition on the mechanical clauses`,
    };
  }
  if (failing.length === 0) {
    return {
      ...base,
      verdict: "FIRED_ALREADY_SOLVED",
      detail: `all ${counted.length} counted trial(s) passed every graded scenario — the already-solved clause of the kill signal`,
    };
  }
  return {
    ...base,
    verdict: "FIRED_NOT_DIFFICULTY",
    detail: `${failing.length} counted trial(s) failed and none is root-caused to \`capability\` (${disqualified.map((d) => `${d.runId}: ${d.rootCause}`).join(", ")}) — the not-difficulty clause of the kill signal`,
  };
}

export interface CampaignProgress {
  readonly plan: CampaignPlan;
  readonly total: number;
  readonly run: number;
  readonly notRun: number;
  readonly refused: number;
  readonly infra: number;
  /** Slots whose trial directory exists and counts. */
  readonly counted: number;
}

export function progressOf(plan: CampaignPlan, countedRunIds: readonly string[]): CampaignProgress {
  const by = (state: SlotState): number => plan.slots.filter((s) => s.state === state).length;
  return {
    plan,
    total: plan.slots.length,
    run: by("RUN") + by("IMPORTED"),
    notRun: by("NOT_RUN"),
    refused: by("REFUSED"),
    infra: by("FAILED_INFRA"),
    counted: plan.slots.filter((s) => s.runId !== null && countedRunIds.includes(s.runId)).length,
  };
}

/**
 * The campaign subcommands, and the guard that stops a typo reading as success.
 *
 * `trials campaign statsu` used to fall through to the plan listing, which prints a tidy summary and
 * exits zero. A wrong command that produces confident-looking output is worse than one that fails:
 * the reader concludes the thing they asked for happened.
 */
export const CAMPAIGN_SUBCOMMANDS = ["prepare", "import", "status", "providers", "run", "reconcile"] as const;

export function assertCampaignSubcommand(sub: string | undefined): void {
  if (sub === undefined || sub === "" || sub.startsWith("--")) return;
  if (!(CAMPAIGN_SUBCOMMANDS as readonly string[]).includes(sub)) {
    throw new Error(
      `"${sub}" is not a campaign subcommand; valid ones are ${CAMPAIGN_SUBCOMMANDS.join(", ")}`,
    );
  }
}
