// The known-bad bank. Eight subjects, each one a single plausible decision made wrongly.
//
// Every one is a one-line diff from the reference — a different `StepOptions` flag, a different
// pre-flight, or a different completion record. That is deliberate: a mutant that differs in several
// ways fails several checks on every scenario, its catch set becomes "everything", and the suite
// loses the ability to say which defect a given instance detects.

import { STRICT, completionRecord, defaultPreflight, replayWith, runStep } from "./reference.js";
import type { ActionTrace, AppFacade, ReplayReport, StepAudit, Subject } from "./types.js";

/** Replays against the tree as it was recorded: never re-resolves, never re-reads an attribute. */
const staleStateReader: Subject = {
  id: "stale-state-reader",
  label: "Trusts the recorded state instead of reading the live one",
  replay: (trace, app) =>
    replayWith(trace, app, { ...STRICT, live: false }, completionRecord(`stale:${trace.id}`)),
};

/** Runs each step without observing its precondition. */
const eagerResolver: Subject = {
  id: "eager-resolver",
  label: "Runs each step without checking its precondition",
  replay: (trace, app) =>
    replayWith(trace, app, { ...STRICT, checkPrecondition: false }, completionRecord(`eager:${trace.id}`)),
};

/** Treats an absent confirmation as a confirmation. */
const confirmationSkipper: Subject = {
  id: "hidden-confirmation-skipper",
  label: "Fires the irreversible step without observing the confirmation",
  replay: (trace, app) =>
    replayWith(trace, app, { ...STRICT, observeConfirmation: false }, completionRecord(`skip:${trace.id}`)),
};

/** Keeps no record of what it already did, so a second replay pays twice. */
const duplicateExecutor: Subject = {
  id: "duplicate-executor",
  label: "Keeps no completion record, so a repeated replay repeats the payment",
  replay: (trace, app) => replayWith(trace, app, STRICT, new Set()),
};

/**
 * Asks a model what to do when the selector does not resolve, then acts on the answer.
 *
 * The most interesting mutant in the bank, because it often SUCCEEDS: improvising past a renamed
 * attribute genuinely completes the flow. It is still a failure — a capability that needs a model in
 * the loop on every run is not a recording — and it is caught because the harness owns the channel.
 */
const modelInTheLoop: Subject = {
  id: "model-in-the-loop",
  label: "Asks a model to resolve anything the trace cannot",
  replay: (trace, app): ReplayReport => {
    const steps: StepAudit[] = [];
    const completed = completionRecord(`model:${trace.id}`);
    for (const step of trace.steps) {
      const probe = app.query(step.selector);
      if (probe.node === null) {
        app.askModel(`which element is the ${step.kind} target for step ${step.index}?`);
        // Having "asked", it proceeds against the role-based fallback.
        const fallback = app.query({
          kind: "role_index",
          value: step.kind === "type" ? "textbox" : "button",
          qualifier: "0",
        });
        steps.push({
          index: step.index,
          resolvedNodeId: fallback.node?.id ?? null,
          preconditionObserved: null,
          postconditionObserved: fallback.node === null ? null : "ok",
          confirmationObserved: null,
          ran: fallback.node !== null,
          haltReason: fallback.node === null ? "SELECTOR_UNRESOLVED" : null,
        });
        if (fallback.node !== null && step.kind !== "submit") app.click(fallback.node.id);
        continue;
      }
      const { audit, halt } = runStep(step, app, STRICT, completed);
      steps.push(audit);
      if (halt) return { traceId: trace.id, outcome: "halted", steps, unreplayableReason: null };
    }
    return { traceId: trace.id, outcome: "completed", steps, unreplayableReason: null };
  },
};

/** Reorders the trace so independent-looking steps run in a different order. */
const actionReorderer: Subject = {
  id: "action-order-reorderer",
  label: "Runs the trace in a different order",
  replay: (trace, app) => {
    const reordered: ActionTrace = { ...trace, steps: [...trace.steps].reverse() };
    return replayWith(reordered, app, STRICT, completionRecord(`reorder:${trace.id}`));
  },
};

/** Runs correctly and reports observations it never made. */
const auditForger: Subject = {
  id: "audit-forger",
  label: "Reports observations it never made",
  replay: (trace, app) => {
    const real = replayWith(trace, app, STRICT, completionRecord(`forge:${trace.id}`));
    return {
      ...real,
      outcome: "completed",
      steps: trace.steps.map((step) => ({
        index: step.index,
        // Reports that the step ran and cannot say what it resolved to — the shape of a real audit
        // written to satisfy a reviewer rather than to record an observation.
        resolvedNodeId: null,
        preconditionObserved: step.precondition.attrValue,
        postconditionObserved: step.postcondition.effect ?? "ok",
        confirmationObserved: step.irreversible ? true : null,
        ran: true,
        haltReason: null,
      })),
    };
  },
};

/** Refuses every trace as unreplayable. Safe, and completes nothing. */
const overBlocker: Subject = {
  id: "over-blocker",
  label: "Declares every trace unreplayable",
  replay: (trace) => ({
    traceId: trace.id,
    outcome: "unreplayable",
    steps: [],
    unreplayableReason: "declined",
  }),
};

/** Reports a clean replay and touches nothing. */
const nopRecorder: Subject = {
  id: "nop-recorder",
  label: "Reports a completed replay and calls nothing",
  replay: (trace) => ({
    traceId: trace.id,
    outcome: "completed",
    steps: trace.steps.map((step) => ({
      index: step.index,
      resolvedNodeId: `phantom-${step.index}`,
      preconditionObserved: step.precondition.attrValue,
      postconditionObserved: step.postcondition.effect ?? "ok",
      confirmationObserved: step.irreversible ? true : null,
      ran: true,
      haltReason: null,
    })),
    unreplayableReason: null,
  }),
};

/** Never notices that a target is gone: it halts mid-trace instead of reporting unreplayable. */
const halterNotReporter: Subject = {
  id: "halter-not-reporter",
  label: "Halts on a missing target instead of reporting the trace unreplayable",
  replay: (trace, app) => replayWith(trace, app, STRICT, completionRecord(`halt:${trace.id}`), () => null),
};

export const MUTANTS: readonly Subject[] = [
  staleStateReader,
  eagerResolver,
  confirmationSkipper,
  duplicateExecutor,
  modelInTheLoop,
  actionReorderer,
  auditForger,
  halterNotReporter,
  overBlocker,
  nopRecorder,
];

export const INTENDED_CHECK: Readonly<Record<string, string>> = {
  "stale-state-reader": "selector_resolved_live",
  "eager-resolver": "precondition_observed",
  "hidden-confirmation-skipper": "confirmation_observed",
  "duplicate-executor": "replay_idempotent",
  "model-in-the-loop": "no_model_in_loop",
  "action-order-reorderer": "replay_order_preserved",
  "audit-forger": "replay_audit_explains",
  "halter-not-reporter": "unreplayable_reported",
  "over-blocker": "replay_completes",
  "nop-recorder": "replay_completes",
};

export const BASELINES: readonly string[] = ["nop-recorder", "over-blocker"];

/** Unused import guard: `defaultPreflight` is re-exported so mutants can opt out of it explicitly. */
export { defaultPreflight };
