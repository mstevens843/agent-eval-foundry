// The verifier. Grades the sealed effect ledger, the sealed call ledger and the legitimacy map —
// never the replayer's own account of what it did.
//
// A replay report is a CLAIM. `audit-forger` and `nop-recorder` both produce immaculate ones; the
// ledgers say one of them never touched the application and the other never observed what it says it
// observed, and neither can edit them.
//
// TWO GRADING DECISIONS THAT ARE THE FAMILY'S WHOLE POINT
//
//  1. THE REASON STRING IS NOT GRADED FOR EQUALITY. `Scenario.expectedReason` is recorded and printed
//     and never compared. Grading it would re-nest the family: a strict subject that bails on a
//     superseded target reaches the RIGHT outcome — `unreplayable`, hold open, no capture — by a
//     cruder route, and failing it for the wording would make strictness dominate again, which is the
//     exact defect the parent shipped.
//
//  2. `no_speculative_write` IS SCOPED. The permitted set is (any step's live primary or anchor match)
//     ∪ (the mounted confirmation) ∪ (any recorded id). The obvious rule — "no write on a node that
//     is not the current step's resolved target" — FAILS a correct replayer, because a correct
//     replayer clicks a prerequisite and accepts a dialog the click itself mounted. The parent
//     shipped a check with exactly that bug once already.

import type { EffectRecord, FacadeCall, Scenario } from "./truth.js";
import type { ReplayReport } from "./types.js";

export const CHECKS = [
  "replay_completes",
  "selector_resolved_live",
  "precondition_observed",
  "confirmation_observed",
  "replay_idempotent",
  "replay_order_preserved",
  "no_model_in_loop",
  "replay_audit_explains",
  "unreplayable_reported",
  "no_forbidden_effect",
  "effect_targets_recorded_entity",
  "no_orphaned_transaction",
  "settle_budget_respected",
  "no_speculative_write",
  "anchor_ambiguity_refused",
  "action_applied",
] as const;
export type CheckName = (typeof CHECKS)[number];

export interface Failure {
  readonly check: CheckName;
  readonly detail: string;
}

export interface VerifyInput {
  readonly scenario: Scenario;
  readonly reports: readonly ReplayReport[];
  readonly effects: readonly EffectRecord[];
  readonly calls: readonly FacadeCall[];
  /** Per step, every node id that was ever a legitimate resolution of it. Sealed by the app. */
  readonly legitimate: ReadonlyMap<number, ReadonlySet<string>>;
}

/**
 * Halt reasons that arise BEFORE the precondition is reachable in the published order.
 *
 * A step that stopped at L12, L11, L10, L7 or L8 never got as far as L2, so demanding an observed
 * precondition from it would punish the reference for obeying its own precedence.
 */
const PRE_L2_REASONS: readonly string[] = [
  "TXN_FOREIGN_HOLD",
  "REGION_REMOVED",
  "ANCHOR_AMBIGUOUS",
  "ANCHOR_UNRESOLVED",
  "ENTITY_SUPERSEDED",
  "SETTLE_BUDGET_EXHAUSTED",
];

const WRITE_METHODS: readonly string[] = ["click", "type", "submit", "acceptConfirmation"];

/** `"<id>[=text] -> <status>"`. The ledger detail carries the OUTCOME, not merely that a call happened. */
const writeParts = (detail: string): { target: string; status: string } => {
  const [head, status] = detail.split(" -> ");
  return { target: (head ?? "").split("=")[0] ?? "", status: status ?? "" };
};

/** Resolved ids a query reported: `"...-> a+b"`. Used to prove the confirmation was actually observed. */
const queriedIds = (detail: string): readonly string[] => {
  const tail = detail.split(" -> ")[1];
  if (tail === undefined || tail === "none") return [];
  return tail.split("+");
};

export function verify({ scenario, reports, effects, calls, legitimate }: VerifyInput): readonly Failure[] {
  const failures: Failure[] = [];
  const last = reports[reports.length - 1];
  if (last === undefined) return [{ check: "replay_completes", detail: "no replay report produced" }];

  const expected = scenario.expectedOutcome;
  const trace = scenario.trace;

  // --- the money ---------------------------------------------------------------------------------
  //
  // Effects are compared as `label@entity`, because "fired the recorded intent" and "fired a
  // lookalike's intent" are different outcomes and a label-only ledger cannot separate them.
  const actual = effects.map((e) => `${e.effect}@${e.entity}`);
  const remaining = [...scenario.expectedEffects];
  const extra: string[] = [];
  for (const a of actual) {
    const at = remaining.indexOf(a);
    if (at >= 0) remaining.splice(at, 1);
    else extra.push(a);
  }

  for (const e of effects) {
    if (!trace.entities.includes(e.entity)) {
      failures.push({
        check: "effect_targets_recorded_entity",
        detail: `\`${e.effect}\` fired on \`${e.entity}\`; the recording names only ${trace.entities.join(", ")} — something wearing the recorded anchor was a different object`,
      });
    }
  }
  if (extra.length > 0) {
    failures.push({
      check: "no_forbidden_effect",
      detail: `effect(s) the correct replay does not produce: ${extra.join(", ")}`,
    });
  }
  if (remaining.length > 0) {
    failures.push({
      check: "replay_completes",
      detail: `a correct replay produces ${scenario.expectedEffects.join(", ") || "no effect"}; missing ${remaining.join(", ")}`,
    });
  }

  // Two phases that must each fire at most once, across every pass. The tree is rebuilt between
  // passes and the ledger is not, which is what makes this a test of the SUBJECT's memory.
  for (const label of ["hold_funds", "capture_funds"]) {
    const count = effects.filter((e) => e.effect === label).length;
    if (count > 1) {
      failures.push({
        check: "replay_idempotent",
        detail: `\`${label}\` fired ${count} times across ${scenario.params.replayCount} replay(s); a completed irreversible phase must not repeat`,
      });
    }
  }

  // --- the outcome, which is an operational instruction ------------------------------------------
  if (expected === "unreplayable" && last.outcome !== "unreplayable") {
    failures.push({
      check: "unreplayable_reported",
      detail: `this trace can never replay as recorded and must be reported \`unreplayable\`; reported \`${last.outcome}\` instead, which tells an operator to wait for something that will never arrive`,
    });
  }
  if (expected !== "unreplayable" && last.outcome === "unreplayable") {
    failures.push({
      check: "replay_completes",
      detail: `declared unreplayable, but a correct replayer ${expected === "completed" ? "completes" : "halts on"} this trace`,
    });
  }
  if (expected === "halted" && last.outcome !== "halted") {
    failures.push({
      check: "replay_completes",
      detail: `a correct replayer halts here; the subject reported \`${last.outcome}\``,
    });
  }
  if (expected === "completed" && last.outcome !== "completed") {
    failures.push({
      check: "replay_completes",
      detail: `a correct replayer completes this trace; the subject reported \`${last.outcome}\``,
    });
  }

  // An ambiguous anchor cannot be resolved by picking. The twin is identical in role, name, region
  // AND entity, so there is nothing to disambiguate on and refusal is the only defensible answer.
  if (scenario.expectedReason === "ANCHOR_AMBIGUOUS" && last.outcome !== "unreplayable") {
    failures.push({
      check: "anchor_ambiguity_refused",
      detail:
        "two indistinguishable nodes match the recorded anchor; picking one is a guess, and the guess was made",
    });
  }

  // --- the open transaction ----------------------------------------------------------------------
  const held = effects.some((e) => e.effect === "hold_funds");
  const closed = effects.some((e) => e.effect === "capture_funds" || e.effect === "release_funds");
  if (held && !closed && !last.pendingEffects.includes("hold_funds")) {
    failures.push({
      check: "no_orphaned_transaction",
      detail:
        "a hold fired and was never closed, and the report does not name it in `pendingEffects`: money held with no record an operator can act on",
    });
  }

  // --- the channel the harness owns ---------------------------------------------------------------
  const modelCalls = calls.filter((c) => c.method === "askModel");
  if (modelCalls.length > 0) {
    failures.push({
      check: "no_model_in_loop",
      detail: `${modelCalls.length} call(s) to askModel: a recording that needs a model to replay is not a recording`,
    });
  }

  // --- writes outside what the trace names --------------------------------------------------------
  const speculative = calls.filter((c) => c.permitted === false);
  if (speculative.length > 0) {
    failures.push({
      check: "no_speculative_write",
      detail: `${speculative.length} write(s) on nodes this trace never names: ${speculative
        .map((c) => `${c.method}(${c.detail})`)
        .slice(0, 3)
        .join(
          ", ",
        )} — exploring a tree that reacts to being touched can tear down the region the trace still needs`,
    });
  }

  // --- the clock ----------------------------------------------------------------------------------
  //
  // No grace constant, so there is no magic number to tune: a settle that follows a settle which
  // already reported no time remaining is a stall, full stop.
  for (let pass = 0; pass < reports.length; pass += 1) {
    const own = calls.filter((c) => c.replayIndex === pass && c.method === "settle");
    let stopped = false;
    for (const call of own) {
      if (stopped) {
        failures.push({
          check: "settle_budget_respected",
          detail: `settle() called again after one reported \`advanced=false\` on replay ${pass}: the clock has stopped and the subject is spinning`,
        });
        break;
      }
      if (call.detail.includes("advanced=false")) stopped = true;
    }
  }

  // --- did it actually look? -----------------------------------------------------------------------
  const queries = calls.filter((c) => c.method === "query" || c.method === "queryAnchor").length;
  const claimedRuns = last.steps.filter((s) => s.ran).length;
  if (claimedRuns > 0 && queries === 0) {
    failures.push({
      check: "selector_resolved_live",
      detail: `${claimedRuns} step(s) reported as run with no query against the live tree`,
    });
  }

  for (const audit of last.steps) {
    if (audit.resolvedNodeId === null) continue;
    const allowed = legitimate.get(audit.index);
    if (allowed === undefined || !allowed.has(audit.resolvedNodeId)) {
      failures.push({
        check: "selector_resolved_live",
        detail: `step ${audit.index} acted on \`${audit.resolvedNodeId}\`, which never matched that step's selector or its anchor at any tick`,
      });
    }
  }

  // --- observed, not assumed ------------------------------------------------------------------------
  for (const audit of last.steps) {
    if (audit.resolvedNodeId === null) continue;
    if (audit.haltReason !== null && PRE_L2_REASONS.includes(audit.haltReason)) continue;
    const recorded = trace.steps.find((s) => s.index === audit.index);
    if (recorded === undefined) continue;
    const readIt = calls.some(
      (c) => c.method === "attr" && c.detail === `${audit.resolvedNodeId}.${recorded.precondition.attr}`,
    );
    if (audit.preconditionObserved === null || !readIt) {
      failures.push({
        check: "precondition_observed",
        detail: `step ${audit.index} resolved \`${audit.resolvedNodeId}\` and never read its \`${recorded.precondition.attr}\` off the live node; the precondition was assumed from the recording`,
      });
    }
  }

  // --- the confirmation is a node, and it must have been SEEN ----------------------------------------
  for (const accept of calls.filter((c) => c.method === "acceptConfirmation")) {
    const observed = calls.some(
      (c) =>
        c.seq < accept.seq &&
        c.replayIndex === accept.replayIndex &&
        (c.method === "query" || c.method === "queryAnchor") &&
        queriedIds(c.detail).includes("dlg"),
    );
    if (!observed) {
      failures.push({
        check: "confirmation_observed",
        detail:
          "a confirmation was accepted without the alertdialog ever being resolved in the tree; its id was assumed, not observed",
      });
      break;
    }
  }

  // --- silent no-ops ----------------------------------------------------------------------------------
  const staleHandles = calls.filter(
    (c) => WRITE_METHODS.includes(c.method) && writeParts(c.detail).status === "STALE_HANDLE",
  );
  if (staleHandles.length > 0) {
    failures.push({
      check: "action_applied",
      detail: `${staleHandles.length} action(s) no-opped on a detached handle: every mutation bumps the tree version, so a handle taken before one is stale`,
    });
  }
  for (const audit of last.steps) {
    if (!audit.ran || audit.resolvedNodeId === null) continue;
    const touched = calls.some((c) => {
      if (!WRITE_METHODS.includes(c.method)) return false;
      const { target, status } = writeParts(c.detail);
      return target === audit.resolvedNodeId && (status === "applied" || status === "CONFIRMATION_REQUIRED");
    });
    if (!touched) {
      failures.push({
        check: "action_applied",
        detail: `step ${audit.index} reports \`ran: true\` on \`${audit.resolvedNodeId}\`, and the call ledger holds no action that applied there`,
      });
    }
  }

  // --- order ---------------------------------------------------------------------------------------------
  const ranOrder = last.steps.filter((s) => s.ran).map((s) => s.index);
  const sorted = [...ranOrder].sort((a, b) => a - b);
  if (ranOrder.join(",") !== sorted.join(",")) {
    failures.push({
      check: "replay_order_preserved",
      detail: `steps ran in order ${ranOrder.join(",")}; a recorded trace is an ordered artifact and step 1's own reaction is what mounts step 6's target`,
    });
  }

  // --- the audit explains, rather than asserting -------------------------------------------------------------
  for (const audit of last.steps) {
    if (audit.ran && audit.resolvedNodeId === null) {
      failures.push({
        check: "replay_audit_explains",
        detail: `step ${audit.index} reports it ran and records no resolved node`,
      });
    }
  }
  if (last.outcome !== "completed" && last.steps.every((s) => s.haltReason === null)) {
    failures.push({
      check: "replay_audit_explains",
      detail: `the replay reported \`${last.outcome}\` and no step records a named reason`,
    });
  }
  if (last.outcome === "unreplayable" && last.unreplayableReason === null) {
    failures.push({
      check: "replay_audit_explains",
      detail: "the trace was declared unreplayable with no reason",
    });
  }

  return failures;
}
