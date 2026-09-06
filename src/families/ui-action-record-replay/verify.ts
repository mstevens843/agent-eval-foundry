// The verifier. Grades against the effect ledger, the call ledger and the live tree — never against
// the replayer's own account of what it observed.
//
// The distinction that carries the family: a replay report is a CLAIM. `audit-forger` and
// `nop-recorder` both produce immaculate reports. The effect ledger says one of them never touched
// the application and the other never observed what it says it observed, and neither can edit it.

import { resolveSelector } from "./app.js";
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
}

export function verify({ scenario, reports, effects, calls: allCalls }: VerifyInput): readonly Failure[] {
  const failures: Failure[] = [];
  const expected = scenario.expectedOutcome;
  if (reports.length !== scenario.params.replayCount) {
    failures.push({ check: "replay_completes", detail: "missing or extra replay report" });
  }
  for (const report of reports) {
    if (
      new Set(report.steps.map((step) => step.index)).size !== report.steps.length ||
      report.steps.some((step) => !scenario.trace.steps.some((recorded) => recorded.index === step.index))
    ) {
      failures.push({
        check: "replay_audit_explains",
        detail: "replay report contains duplicate or unknown steps",
      });
    }
  }
  if (effects.map((effect) => effect.effect).join("|") !== scenario.expectedEffects.join("|")) {
    failures.push({
      check: "no_forbidden_effect",
      detail: "actual effect sequence does not match the trace's required effects",
    });
  }

  // --- did the right thing happen at all? --------------------------------------------------------
  for (const [pass, last] of reports.entries()) {
    const calls = allCalls.filter((c) => c.replayIndex === pass);
    if (last === undefined) {
      return [{ check: "replay_completes", detail: "no replay report produced" }];
    }

    if (expected === "completed" && effects.length === 0) {
      failures.push({
        check: "replay_completes",
        detail: "a correct replay completes this trace and produces the payment; no effect was recorded",
      });
    }
    if (expected !== "completed" && effects.length > 0) {
      failures.push({
        check: "no_forbidden_effect",
        detail: `the trace should have ${expected} but ${effects.length} effect(s) fired: ${effects.map((e) => e.effect).join(", ")}`,
      });
    }

    // The reported outcome must match the one a correct replayer reaches. Without this a subject that
    // reports `completed`, touches nothing and produces no effect passes every scenario whose correct
    // outcome is `halted`: no effect fired, so nothing forbidden happened, and no check asked whether
    // the claim was true. A test with a do-nothing stub found it.
    if (expected === "halted" && last.outcome !== "halted") {
      failures.push({
        check: "replay_completes",
        detail: `a correct replayer halts on this trace; the subject reported \`${last.outcome}\``,
      });
    }
    if (expected === "completed" && last.outcome !== "completed") {
      failures.push({ check: "replay_completes", detail: "a completed trace was not reported completed" });
    }

    // --- unreplayable is its own outcome, not a flavour of halted -----------------------------------
    if (expected === "unreplayable" && last.outcome !== "unreplayable") {
      failures.push({
        check: "unreplayable_reported",
        detail: `the target is gone, so the trace must be reported unreplayable; reported \`${last.outcome}\` instead`,
      });
    }
    if (expected !== "unreplayable" && last.outcome === "unreplayable") {
      failures.push({
        check: "replay_completes",
        detail: `declared unreplayable, but a correct replayer ${expected === "completed" ? "completes" : "halts on"} this trace`,
      });
    }

    // --- idempotency: the ledger, not the report ------------------------------------------------------
    const irreversibleEffects = effects.filter((e) => e.effect === "payment");
    if (irreversibleEffects.length > 1) {
      failures.push({
        check: "replay_idempotent",
        detail: `the payment fired ${irreversibleEffects.length} times across ${scenario.params.replayCount} replay(s); a completed irreversible step must not repeat`,
      });
    }

    // --- no model in the loop --------------------------------------------------------------------------
    const modelCalls = calls.filter((c) => c.method === "askModel");
    if (modelCalls.length > 0) {
      failures.push({
        check: "no_model_in_loop",
        detail: `${modelCalls.length} call(s) to askModel: a recording that needs a model to replay is not a recording`,
      });
    }

    // --- did it actually look? ---------------------------------------------------------------------------
    //
    // Every step the report says ran must have a corresponding live query, and the node it claims to
    // have resolved must exist in the live tree. `nop-recorder` fails the first; `stale-state-reader`
    // fails the second whenever the mutation moved the node.
    const queried = calls.filter((c) => c.method === "query").length;
    const claimedRuns = last.steps.filter((s) => s.ran).length;
    if (claimedRuns > 0 && queried === 0) {
      failures.push({
        check: "selector_resolved_live",
        detail: `${claimedRuns} step(s) reported as run with no query against the live tree`,
      });
    }

    const liveIds = new Set(collectIds(scenario.liveTree));
    for (const step of last.steps) {
      if (step.resolvedNodeId !== null && !liveIds.has(step.resolvedNodeId)) {
        failures.push({
          check: "selector_resolved_live",
          detail: `step ${step.index} claims to have resolved \`${step.resolvedNodeId}\`, which is not in the live tree`,
        });
      }
    }

    // --- preconditions and confirmations: observed values, not assertions -----------------------------------
    for (const audit of last.steps) {
      if (!audit.ran) continue;
      const recorded = scenario.trace.steps.find((s) => s.index === audit.index);
      if (recorded?.precondition.attr === null || recorded === undefined) continue;
      if (audit.preconditionObserved === null) {
        failures.push({
          check: "precondition_observed",
          detail: `step ${audit.index} ran and reports no observed value for its \`${recorded.precondition.attr}\` precondition; it was assumed, not observed`,
        });
      }
      const action = calls.find(
        (call) =>
          call.method === recorded.kind &&
          (recorded.kind === "type"
            ? call.detail === `${audit.resolvedNodeId}=${recorded.value ?? ""}`
            : call.detail === audit.resolvedNodeId),
      );
      const observation = calls
        .filter(
          (call) =>
            call.replayIndex === pass &&
            call.method === "attr" &&
            call.detail === `${audit.resolvedNodeId}.${recorded.precondition.attr}` &&
            action !== undefined &&
            call.seq < action.seq,
        )
        .at(-1);
      const observed = observation !== undefined && observation.observedValue === audit.preconditionObserved;
      if (!observed) {
        failures.push({
          check: "precondition_observed",
          detail: `step ${audit.index} claims an observation with no matching live attribute read in this replay`,
        });
      }
    }

    // Only flows that DECLARE a confirmation require one to be observed. A flow with no dialog has
    // nothing to observe, and demanding the observation anyway failed the reference on every
    // `confirmation: absent` scenario — a check punishing correct behaviour.
    const declaresConfirmation = (nodeId: string): boolean => {
      const find = (n: Scenario["liveTree"]): Scenario["liveTree"] | null =>
        n.id === nodeId ? n : (n.children.map(find).find((x) => x !== null) ?? null);
      return find(scenario.liveTree)?.attrs["data-opens-confirmation"] === "true";
    };
    const irreversibleSteps = scenario.trace.steps.filter((s) => s.irreversible).map((s) => s.index);
    for (const index of irreversibleSteps) {
      const audit = last.steps.find((s) => s.index === index);
      if (audit?.ran !== true) continue;
      if (audit.resolvedNodeId === null || !declaresConfirmation(audit.resolvedNodeId)) continue;
      const observed = calls.some((c) => c.method === "confirmationPresent");
      if (!observed) {
        failures.push({
          check: "confirmation_observed",
          detail: `the irreversible step ${index} ran without the confirmation state ever being observed`,
        });
      }
    }

    // --- order ------------------------------------------------------------------------------------------------
    for (const accept of calls.filter((c) => c.method === "acceptConfirmation")) {
      const observation = calls
        .filter((c) => c.method === "confirmationPresent" && c.seq < accept.seq)
        .at(-1);
      if (observation?.observedValue !== "true")
        failures.push({
          check: "confirmation_observed",
          detail: "confirmation accepted without a preceding true observation",
        });
    }
    const actionSequence = last.steps
      .filter((s) => s.ran)
      .map((step) => {
        const recorded = scenario.trace.steps.find((s) => s.index === step.index);
        return calls.find(
          (c) =>
            c.method === recorded?.kind &&
            c.detail ===
              (recorded?.kind === "type"
                ? `${step.resolvedNodeId}=${recorded.value ?? ""}`
                : step.resolvedNodeId),
        )?.seq;
      })
      .filter((seq): seq is number => seq !== undefined);
    if (actionSequence.some((seq, i) => i > 0 && seq <= (actionSequence[i - 1] ?? 0)))
      failures.push({
        check: "replay_order_preserved",
        detail: "observed actions contradict reported step order",
      });
    const ranOrder = last.steps.filter((s) => s.ran).map((s) => s.index);
    const sorted = [...ranOrder].sort((a, b) => a - b);
    if (ranOrder.join(",") !== sorted.join(",")) {
      failures.push({
        check: "replay_order_preserved",
        detail: `steps ran in order ${ranOrder.join(",")}; a recorded trace is an ordered artifact`,
      });
    }

    // --- the audit says what was observed, not merely that a step happened -------------------------------------
    for (const step of last.steps) {
      if (!step.ran) continue;
      if (step.resolvedNodeId === null) {
        failures.push({
          check: "replay_audit_explains",
          detail: `step ${step.index} ran and records no resolved node`,
        });
      }
    }
    if (last.outcome === "halted" && last.steps.every((s) => s.haltReason === null)) {
      failures.push({
        check: "replay_audit_explains",
        detail: "the replay halted and no step records a named reason",
      });
    }

    // --- cross-check one claim against the tree ------------------------------------------------------------------
    // A step claiming to have resolved a node the selector cannot reach in the live tree is a forged
    // observation, whatever the ledger says about calls.
    for (const step of last.steps) {
      if (step.resolvedNodeId === null) continue;
      const recorded = scenario.trace.steps.find((s) => s.index === step.index);
      if (recorded === undefined) continue;
      const live = resolveSelector(scenario.liveTree, recorded.selector);
      if (live.node !== null && live.node.id !== step.resolvedNodeId) {
        failures.push({
          check: "selector_resolved_live",
          detail: `step ${step.index} claims \`${step.resolvedNodeId}\` but the selector resolves to \`${live.node.id}\` live`,
        });
      }
    }

    if (
      last.outcome === "completed" &&
      scenario.trace.steps.some((step) => !last.steps.some((audit) => audit.index === step.index))
    ) {
      failures.push({
        check: "replay_audit_explains",
        detail: `replay ${pass} omits a required completed step`,
      });
    }
    for (const audit of last.steps) {
      const step = scenario.trace.steps.find((s) => s.index === audit.index);
      if (!step) continue;
      if (
        audit.ran &&
        !calls.some(
          (c) =>
            c.method === step.kind &&
            c.detail ===
              (step.kind === "type" ? `${audit.resolvedNodeId}=${step.value ?? ""}` : audit.resolvedNodeId),
        )
      ) {
        failures.push({
          check: "replay_audit_explains",
          detail: `replay ${pass} claims unapplied step ${step.index}`,
        });
      }
      if (
        !audit.ran &&
        last.outcome === "completed" &&
        !(
          step.irreversible &&
          effects.some((e) => e.replayIndex < pass && e.effect === step.postcondition.effect)
        )
      ) {
        failures.push({
          check: "replay_completes",
          detail: `replay ${pass} skipped work without prior completion`,
        });
      }
    }
  }
  return failures;
}

const collectIds = (node: Scenario["liveTree"]): readonly string[] => [
  node.id,
  ...node.children.flatMap(collectIds),
];
