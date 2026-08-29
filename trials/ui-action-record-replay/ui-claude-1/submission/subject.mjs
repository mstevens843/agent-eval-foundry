// Deterministic replayer for recorded UI action traces.
//
// Design, against the rules in SPEC.md:
//
//   R1  every selector is resolved with app.query() at replay time; `recordedNodeId` is never
//       used as an address, only ever compared against nothing at all.
//   R2  every precondition is read back through app.attr() immediately before its step runs,
//       and the OBSERVED value (not a verdict) is what the audit carries.
//   R3  postconditions are read back from the live node after the step, same way.
//   R4  a target that declares `data-opens-confirmation` only completes once a confirmation has
//       actually been observed and accepted. No dialog => the step does not complete.
//   R5  irreversible steps are recorded in a process-level ledger keyed by trace id, so a second
//       replay re-observes everything but re-fires nothing.
//   R6  app.askModel is never referenced.
//   R7  every audited step carries the node it resolved, what it observed, and a named reason
//       when it stopped.
//
// Outcome discipline:
//   * target gone / selector no longer identifies one node  -> `unreplayable` (re-record)
//   * region still loading, state not right yet, promised
//     confirmation never appeared                            -> `halted` (try later)
// A trace that cannot be replayed is detected by a read-only pre-flight pass over every step
// BEFORE anything is clicked, so it is reported as unreplayable rather than half-run.

const LEDGER_KEY = Symbol.for("ui-action-record-replay.subject.ledger.v1");

const HALT = {
  PENDING: "REGION_PENDING",
  UNRESOLVED: "SELECTOR_UNRESOLVED",
  AMBIGUOUS: "SELECTOR_AMBIGUOUS",
  PRECONDITION: "PRECONDITION_MISMATCH",
  CONFIRMATION_ABSENT: "CONFIRMATION_NOT_PRESENTED",
  CONFIRMATION_REFUSED: "CONFIRMATION_NOT_ACCEPTED",
  ACTION_FAILED: "ACTION_FAILED",
  UNSUPPORTED_KIND: "UNSUPPORTED_ACTION_KIND",
  NOT_ATTEMPTED: "NOT_ATTEMPTED",
};

const STATE_ATTR = "data-state";
const EFFECT_ATTR = "data-effect";
const CONFIRM_ATTR = "data-opens-confirmation";

// ------------------------------------------------------------------ irreversible-effect ledger
//
// The harness does not keep this for us (R5). It lives on globalThis so it survives a second
// import of this module inside the same process.

function ledgerStore() {
  let store = globalThis[LEDGER_KEY];
  if (!(store instanceof Map)) {
    store = new Map();
    try {
      globalThis[LEDGER_KEY] = store;
    } catch {
      /* frozen global: fall back to a per-call map, still correct for a single import */
    }
  }
  return store;
}

function ledgerFor(traceId) {
  const store = ledgerStore();
  let entry = store.get(traceId);
  if (!entry) {
    entry = { applied: new Map(), completed: false, runs: 0 };
    store.set(traceId, entry);
  }
  return entry;
}

// ------------------------------------------------------------------ facade, defensively wrapped
//
// A throwing facade must produce a named halt, never an exploded replay.

function safeQuery(app, selector) {
  try {
    const result = app.query(selector);
    if (!result || typeof result !== "object") return { node: null, matches: 0, pending: false };
    const node = result.node ?? null;
    const matches = typeof result.matches === "number" ? result.matches : node ? 1 : 0;
    return { node, matches, pending: result.pending === true };
  } catch {
    return { node: null, matches: 0, pending: false };
  }
}

function safeAttr(app, nodeId, name) {
  if (nodeId == null || !name) return null;
  try {
    const value = app.attr(nodeId, name);
    return value == null ? null : String(value);
  } catch {
    return null;
  }
}

function seesConfirmation(app) {
  try {
    return app.confirmationPresent() === true;
  } catch {
    return false;
  }
}

function takeConfirmation(app) {
  try {
    app.acceptConfirmation();
    return true;
  } catch {
    return false;
  }
}

function performAction(app, step, nodeId) {
  try {
    switch (step.kind) {
      case "type":
        app.type(nodeId, step.value == null ? "" : String(step.value));
        return "ok";
      case "click":
        app.click(nodeId);
        return "ok";
      case "submit":
        app.submit(nodeId);
        return "ok";
      case "confirm":
        return "ok"; // the confirmation itself is the action; handled by the caller
      default:
        return "unsupported";
    }
  } catch {
    return "failed";
  }
}

// ------------------------------------------------------------------ observation helpers

function resolvedId(query) {
  // More than one match means the selector no longer identifies one node. Picking the first is a
  // guess, so nothing is resolved.
  if (query.matches > 1) return null;
  return query.node && query.node.id != null ? query.node.id : null;
}

/** Read the precondition back off the live node. Returns the observed value, never a verdict. */
function observePrecondition(app, step, nodeId) {
  if (nodeId == null) return null;
  const attr = step.precondition && step.precondition.attr ? step.precondition.attr : null;
  return safeAttr(app, nodeId, attr || STATE_ATTR);
}

function preconditionSatisfied(step, observed) {
  const pre = step.precondition || {};
  if (!pre.attr) return true; // nothing declared beyond existence, which the caller checked
  if (pre.attrValue == null) return observed !== null; // the attribute must merely be carried
  return observed === pre.attrValue;
}

/** Read the postcondition back off the live node after the step (R3). */
function observePostcondition(app, step, nodeId) {
  if (nodeId == null) return null;
  const post = step.postcondition || {};
  if (post.attr) return safeAttr(app, nodeId, post.attr);
  if (post.effect) return safeAttr(app, nodeId, EFFECT_ATTR) ?? safeAttr(app, nodeId, STATE_ATTR);
  return safeAttr(app, nodeId, STATE_ATTR);
}

function declaresConfirmation(app, nodeId) {
  const declared = safeAttr(app, nodeId, CONFIRM_ATTR);
  return declared !== null && declared !== "" && declared !== "false";
}

function makeAudit(index, fields) {
  return {
    index,
    resolvedNodeId: fields.resolvedNodeId ?? null,
    preconditionObserved: fields.preconditionObserved ?? null,
    postconditionObserved: fields.postconditionObserved ?? null,
    confirmationObserved: fields.confirmationObserved ?? null,
    ran: fields.ran === true,
    haltReason: fields.haltReason ?? null,
  };
}

function report(traceId, outcome, steps, unreplayableReason = null) {
  return { traceId, outcome, steps, unreplayableReason };
}

/**
 * A `confirm` step targets a dialog that only exists once an earlier step opened it, and a step
 * that records `nodeExists: false` never expected its target to be there. Neither can be judged
 * by a pre-flight pass over the resting page.
 */
function preflightApplies(step) {
  if (step.kind === "confirm") return false;
  if (step.precondition && step.precondition.nodeExists === false) return false;
  return true;
}

// ------------------------------------------------------------------ pre-flight
//
// Read-only. Resolves every step's selector against the live tree before a single action fires, so
// "this trace can never replay as recorded" is reported as such instead of discovered half way
// through. `pending` is explicitly NOT fatal here: not-yet is not gone.

function preflight(app, steps, ledger) {
  const seen = [];
  for (const step of steps) {
    if (!preflightApplies(step) || ledger.applied.has(step.index)) {
      seen.push({ index: step.index, resolvedNodeId: null, preconditionObserved: null });
      continue;
    }
    const query = safeQuery(app, step.selector);
    if (query.matches > 1) {
      return { step, reason: HALT.AMBIGUOUS, seen };
    }
    if (query.node === null) {
      if (query.pending) {
        // The region exists and has not settled. That is a "not yet", decided at run time.
        seen.push({ index: step.index, resolvedNodeId: null, preconditionObserved: null });
        continue;
      }
      return { step, reason: HALT.UNRESOLVED, seen };
    }
    const nodeId = resolvedId(query);
    seen.push({
      index: step.index,
      resolvedNodeId: nodeId,
      preconditionObserved: observePrecondition(app, step, nodeId),
    });
  }
  return null;
}

function unreplayableReport(traceId, failure) {
  const steps = [];
  for (const observed of failure.seen) {
    steps.push(
      makeAudit(observed.index, {
        resolvedNodeId: observed.resolvedNodeId,
        preconditionObserved: observed.preconditionObserved,
        ran: false,
        haltReason: HALT.NOT_ATTEMPTED,
      }),
    );
  }
  steps.push(
    makeAudit(failure.step.index, { resolvedNodeId: null, ran: false, haltReason: failure.reason }),
  );
  return report(traceId, "unreplayable", steps, failure.reason);
}

// ------------------------------------------------------------------ second replay of a completed trace
//
// Everything is resolved and observed live again — the audit is a fresh reading of the page, not a
// cached one — but no action that already happened is repeated, and the trace is not re-judged
// against preconditions it has already moved past.

function replayCompleted(trace, app, ledger) {
  const steps = [];
  for (const step of trace.steps) {
    const query = safeQuery(app, step.selector);
    const nodeId = resolvedId(query);
    const preconditionObserved = observePrecondition(app, step, nodeId);
    const prior = ledger.applied.get(step.index);

    const repeatable =
      !step.irreversible &&
      step.kind !== "confirm" &&
      nodeId !== null &&
      !query.pending &&
      preconditionSatisfied(step, preconditionObserved) &&
      !declaresConfirmation(app, nodeId);

    if (repeatable) performAction(app, step, nodeId);

    steps.push(
      makeAudit(step.index, {
        resolvedNodeId: nodeId,
        preconditionObserved,
        postconditionObserved: observePostcondition(app, step, nodeId),
        confirmationObserved: prior ? prior.confirmationObserved : null,
        ran: true,
        haltReason: null,
      }),
    );
  }
  return report(trace.id, "completed", steps, null);
}

// ------------------------------------------------------------------ one step

/**
 * Runs one step against the live page. Returns `{ audit, stop }`, where `stop` carries the outcome
 * when the trace cannot go any further.
 */
function runStep(step, app, ledger, nextStep) {
  const query = safeQuery(app, step.selector);
  const isConfirmStep = step.kind === "confirm";
  const alreadyApplied = ledger.applied.has(step.index);
  const expectsAbsence = step.precondition && step.precondition.nodeExists === false;
  const nodeId = resolvedId(query);

  // ---- resolution (R1)
  if (nodeId === null && !isConfirmStep && !alreadyApplied && !expectsAbsence) {
    if (query.matches > 1) {
      return {
        audit: makeAudit(step.index, { ran: false, haltReason: HALT.AMBIGUOUS }),
        stop: { outcome: "unreplayable", reason: HALT.AMBIGUOUS },
      };
    }
    if (query.pending) {
      return {
        audit: makeAudit(step.index, { ran: false, haltReason: HALT.PENDING }),
        stop: { outcome: "halted", reason: null },
      };
    }
    return {
      audit: makeAudit(step.index, { ran: false, haltReason: HALT.UNRESOLVED }),
      stop: { outcome: "unreplayable", reason: HALT.UNRESOLVED },
    };
  }

  // ---- precondition, observed rather than assumed (R2)
  const preconditionObserved = observePrecondition(app, step, nodeId);

  // A step already applied by an earlier replay is satisfied; the page has legitimately moved on
  // from the state that was recorded for it (R5).
  if (alreadyApplied) {
    const prior = ledger.applied.get(step.index);
    return {
      audit: makeAudit(step.index, {
        resolvedNodeId: nodeId,
        preconditionObserved,
        postconditionObserved: observePostcondition(app, step, nodeId),
        confirmationObserved: prior ? prior.confirmationObserved : null,
        ran: true,
        haltReason: null,
      }),
      stop: null,
    };
  }

  if (query.pending) {
    return {
      audit: makeAudit(step.index, {
        resolvedNodeId: nodeId,
        preconditionObserved,
        ran: false,
        haltReason: HALT.PENDING,
      }),
      stop: { outcome: "halted", reason: null },
    };
  }

  // A step recorded against an absent node: the recording says there is nothing to act on, so the
  // observation is the whole step. A node that is present when absence was recorded is a state this
  // trace cannot proceed from right now.
  if (expectsAbsence && !isConfirmStep) {
    if (nodeId === null) {
      return {
        audit: makeAudit(step.index, {
          resolvedNodeId: null,
          preconditionObserved,
          ran: true,
          haltReason: null,
        }),
        stop: null,
      };
    }
    return {
      audit: makeAudit(step.index, {
        resolvedNodeId: nodeId,
        preconditionObserved,
        ran: false,
        haltReason: HALT.PRECONDITION,
      }),
      stop: { outcome: "halted", reason: null },
    };
  }

  if (!isConfirmStep && !preconditionSatisfied(step, preconditionObserved)) {
    return {
      audit: makeAudit(step.index, {
        resolvedNodeId: nodeId,
        preconditionObserved,
        ran: false,
        haltReason: HALT.PRECONDITION,
      }),
      stop: { outcome: "halted", reason: null },
    };
  }

  // ---- action, with the confirmation the target promises (R4)
  const needsConfirmation = isConfirmStep || declaresConfirmation(app, nodeId);
  let confirmationObserved = null;

  const halt = (reason, extra = {}) => ({
    audit: makeAudit(step.index, {
      resolvedNodeId: nodeId,
      preconditionObserved,
      confirmationObserved,
      ran: false,
      haltReason: reason,
      ...extra,
    }),
    stop: { outcome: "halted", reason: null },
  });

  if (isConfirmStep) {
    confirmationObserved = seesConfirmation(app);
    if (!confirmationObserved) return halt(HALT.CONFIRMATION_ABSENT);
    if (!takeConfirmation(app)) {
      confirmationObserved = false;
      return halt(HALT.CONFIRMATION_REFUSED);
    }
  } else if (needsConfirmation) {
    // When the recording itself carries the acceptance as the next step, the dialog is observed here
    // and left standing for that step to accept.
    const deferAccept = nextStep != null && nextStep.kind === "confirm";
    if (deferAccept) {
      const acted = performAction(app, step, nodeId);
      if (acted === "unsupported") return halt(HALT.UNSUPPORTED_KIND);
      if (acted === "failed") return halt(HALT.ACTION_FAILED);
      confirmationObserved = seesConfirmation(app);
      if (!confirmationObserved) return halt(HALT.CONFIRMATION_ABSENT);
    } else if (seesConfirmation(app)) {
      // Observe first: a dialog already standing open is accepted before acting, so no application
      // model can be talked into firing an unconfirmed effect.
      if (!takeConfirmation(app)) {
        confirmationObserved = false;
        return halt(HALT.CONFIRMATION_REFUSED);
      }
      confirmationObserved = true;
      const acted = performAction(app, step, nodeId);
      if (acted === "unsupported") return halt(HALT.UNSUPPORTED_KIND);
      if (acted === "failed") return halt(HALT.ACTION_FAILED);
      if (seesConfirmation(app)) takeConfirmation(app);
    } else {
      const acted = performAction(app, step, nodeId);
      if (acted === "unsupported") return halt(HALT.UNSUPPORTED_KIND);
      if (acted === "failed") return halt(HALT.ACTION_FAILED);
      // An absent dialog is not a confirmation: the step does not complete.
      confirmationObserved = seesConfirmation(app);
      if (!confirmationObserved) return halt(HALT.CONFIRMATION_ABSENT);
      if (!takeConfirmation(app)) {
        confirmationObserved = false;
        return halt(HALT.CONFIRMATION_REFUSED);
      }
    }
  } else {
    const acted = performAction(app, step, nodeId);
    if (acted === "unsupported") return halt(HALT.UNSUPPORTED_KIND);
    if (acted === "failed") return halt(HALT.ACTION_FAILED);
    if (step.irreversible && seesConfirmation(app)) {
      // Undeclared, but presented: accepting what is actually on screen is still the observed path.
      confirmationObserved = takeConfirmation(app);
    }
  }

  // ---- postcondition, read off the application (R3)
  const postconditionObserved = observePostcondition(app, step, nodeId);

  if (step.irreversible) {
    ledger.applied.set(step.index, {
      resolvedNodeId: nodeId,
      confirmationObserved,
      postconditionObserved,
    });
  }

  return {
    audit: makeAudit(step.index, {
      resolvedNodeId: nodeId,
      preconditionObserved,
      postconditionObserved,
      confirmationObserved,
      ran: true,
      haltReason: null,
    }),
    stop: null,
  };
}

// ------------------------------------------------------------------ subject

export const subject = {
  id: "observed-replay",
  label: "Live-resolved, observation-audited, effect-ledgered replayer",

  replay(trace, app) {
    const traceId = trace && trace.id != null ? trace.id : "unknown-trace";
    const recorded = trace && Array.isArray(trace.steps) ? trace.steps : [];
    const ledger = ledgerFor(traceId);
    ledger.runs += 1;

    if (recorded.length === 0) return report(traceId, "completed", [], null);

    // A trace that already ran to completion is re-observed, never re-fired (R5).
    if (ledger.completed) return replayCompleted(trace, app, ledger);

    // Nothing has been touched yet: decide replayability before acting, so a dead trace is reported
    // rather than half-run.
    const failure = preflight(app, recorded, ledger);
    if (failure) return unreplayableReport(traceId, failure);

    const steps = [];
    for (let i = 0; i < recorded.length; i += 1) {
      const step = recorded[i];
      const { audit, stop } = runStep(step, app, ledger, recorded[i + 1]);
      steps.push(audit);
      if (stop) {
        return report(traceId, stop.outcome, steps, stop.reason);
      }
    }

    ledger.completed = true;
    return report(traceId, "completed", steps, null);
  },
};

export default subject;
