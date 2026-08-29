// The reference replayer, and the shared step logic every mutant is a one-line diff from.
//
// It is boring on purpose. Resolve live, observe the precondition, run, observe the postcondition,
// record what was observed. The interesting part is what it refuses to do: it never asks the model,
// it never proceeds on an unresolved selector, and it never treats an absent confirmation as a given
// one. Each of those refusals is a mutant.

import type { ActionTrace, AppFacade, RecordedStep, ReplayReport, StepAudit, Subject } from "./types.js";

export interface StepOptions {
  /** Resolve against the live tree. False is the stale-state bug. */
  readonly live: boolean;
  /** Observe the precondition. False is the eager-resolver bug. */
  readonly checkPrecondition: boolean;
  /** Observe the confirmation. False is the confirmation-skipper bug. */
  readonly observeConfirmation: boolean;
  /** Skip an irreversible step already completed. False is the duplicate-execution bug. */
  readonly guardIrreversible: boolean;
}

export const STRICT: StepOptions = {
  live: true,
  checkPrecondition: true,
  observeConfirmation: true,
  guardIrreversible: true,
};

/**
 * Run one recorded step. Returns the audit entry and whether the trace may continue.
 *
 * `completed` is the set of irreversible step indices already done in an earlier replay of the same
 * trace. It is the subject's own state, not the harness's — a replayer that keeps no such record
 * repeats the payment, which is the point of `replayCount: 2`.
 */
export function runStep(
  step: RecordedStep,
  app: AppFacade,
  options: StepOptions,
  completed: Set<number>,
): { readonly audit: StepAudit; readonly halt: boolean } {
  if (options.guardIrreversible && step.irreversible && completed.has(step.index)) {
    return {
      audit: {
        index: step.index,
        resolvedNodeId: null,
        preconditionObserved: "already-completed",
        postconditionObserved: null,
        confirmationObserved: null,
        ran: false,
        haltReason: null,
      },
      halt: false,
    };
  }

  // The one difference that makes `stale-state-reader` a mutant: it uses the recorded node id, which
  // the recording legitimately stored, instead of resolving the selector against the live tree.
  const result = options.live
    ? app.query(step.selector)
    : { node: { id: step.recordedNodeId } as { id: string }, matches: 1, pending: false };
  const node = result.node;
  if (node === null) {
    return {
      audit: {
        index: step.index,
        resolvedNodeId: null,
        preconditionObserved: null,
        postconditionObserved: null,
        confirmationObserved: null,
        ran: false,
        haltReason: result.pending
          ? "REGION_PENDING"
          : result.matches > 1
            ? "SELECTOR_AMBIGUOUS"
            : "SELECTOR_UNRESOLVED",
      },
      halt: true,
    };
  }

  let observed: string | null = null;
  if (options.checkPrecondition && step.precondition.attr !== null) {
    observed = options.live
      ? app.attr(node.id, step.precondition.attr)
      : (step.precondition.attrValue ?? null);
    if (observed !== step.precondition.attrValue) {
      return {
        audit: {
          index: step.index,
          resolvedNodeId: node.id,
          preconditionObserved: observed,
          postconditionObserved: null,
          confirmationObserved: null,
          ran: false,
          haltReason: "PRECONDITION_FAILED",
        },
        halt: true,
      };
    }
  }

  // The irreversible step needs its confirmation OBSERVED, not assumed. A suppressed dialog reads as
  // "not present", and proceeding anyway is how a replayer pays twice for a flow it never confirmed.
  let confirmationObserved: boolean | null = null;
  const declaresConfirmation = app.attr(node.id, "data-opens-confirmation") === "true";
  if (step.irreversible && declaresConfirmation && options.observeConfirmation) {
    app.click(node.id);
    confirmationObserved = app.confirmationPresent();
    if (!confirmationObserved) {
      return {
        audit: {
          index: step.index,
          resolvedNodeId: node.id,
          preconditionObserved: observed,
          postconditionObserved: null,
          confirmationObserved,
          ran: false,
          haltReason: "CONFIRMATION_ABSENT",
        },
        halt: true,
      };
    }
    app.acceptConfirmation();
  }

  if (step.kind === "type") app.type(node.id, step.value ?? "");
  else if (step.kind === "submit") app.submit(node.id);
  else app.click(node.id);

  if (step.irreversible) completed.add(step.index);

  return {
    audit: {
      index: step.index,
      resolvedNodeId: node.id,
      preconditionObserved: observed,
      postconditionObserved: step.postcondition.effect ?? "ok",
      confirmationObserved,
      ran: true,
      haltReason: null,
    },
    halt: false,
  };
}

/** The generic replay loop. Mutants pass different `StepOptions` or a different pre-flight. */
export function replayWith(
  trace: ActionTrace,
  app: AppFacade,
  options: StepOptions,
  completed: Set<number>,
  preflight: (trace: ActionTrace, app: AppFacade) => string | null = defaultPreflight,
): ReplayReport {
  const unreplayable = preflight(trace, app);
  if (unreplayable !== null) {
    return { traceId: trace.id, outcome: "unreplayable", steps: [], unreplayableReason: unreplayable };
  }

  const steps: StepAudit[] = [];
  for (const step of trace.steps) {
    const { audit, halt } = runStep(step, app, options, completed);
    steps.push(audit);
    if (halt) return { traceId: trace.id, outcome: "halted", steps, unreplayableReason: null };
  }
  return { traceId: trace.id, outcome: "completed", steps, unreplayableReason: null };
}

/**
 * Decide up front whether the trace can replay at all.
 *
 * A trace whose target is gone is unreplayable, and reporting that is a different — and correct —
 * outcome from halting at it. The distinction matters operationally: halted means try again later,
 * unreplayable means re-record.
 */
export function defaultPreflight(trace: ActionTrace, app: AppFacade): string | null {
  for (const step of trace.steps) {
    const { node, matches, pending } = app.query(step.selector);
    // `pending` is "not yet", not "gone". Reporting a loading page as unreplayable would tell an
    // operator to re-record a trace that is perfectly good.
    if (node === null && matches === 0 && !pending) {
      return `step ${step.index} targets a node that no longer exists`;
    }
  }
  return null;
}

/**
 * Per-trace completion state, kept by the SUBJECT rather than by the harness.
 *
 * This is the design decision `replay_idempotent` tests. A replayer that keeps no durable record of
 * which irreversible steps it has already run will run them again on the second replay, and the
 * effect ledger will show two payments. Keeping the record is the whole job; the harness deliberately
 * offers no help with it.
 */
const completedByTrace = new Map<string, Set<number>>();

export const completionRecord = (traceId: string): Set<number> => {
  const existing = completedByTrace.get(traceId);
  if (existing !== undefined) return existing;
  const fresh = new Set<number>();
  completedByTrace.set(traceId, fresh);
  return fresh;
};

/** Clear all completion state. Called by the runner between subjects so they cannot see each other. */
export const resetCompletionRecords = (): void => completedByTrace.clear();

export const reference: Subject = {
  id: "reference",
  label: "Resolves live, observes preconditions and confirmations, guards irreversible steps",
  replay: (trace, app) => replayWith(trace, app, STRICT, completionRecord(trace.id)),
};
