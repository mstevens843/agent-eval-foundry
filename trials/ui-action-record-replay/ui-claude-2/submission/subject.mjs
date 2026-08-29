/**
 * Deterministic UI action replayer.
 *
 * Design commitments, one per rule:
 *
 *  R1  Every target is resolved by calling `app.query(step.selector)` against the live tree at the
 *      moment the step is about to run. `step.recordedNodeId` is never read — not for clicking, not
 *      for reading attributes, not even as a fallback. A wrapped-and-remounted node has a new id and
 *      the recorded one is a stale address.
 *  R2  Preconditions are READ from the app (`app.attr`) and the observed value is what lands in the
 *      audit. The recorded expectation is only ever the thing the observation is compared against.
 *  R3  Postconditions are read back from the app after the action and recorded as observed. They are
 *      never asserted: the recording's expectation is not evidence about the live page.
 *  R4  A target that declares `data-opens-confirmation` (read live, not from the recording) must show
 *      a confirmation before its step completes. No dialog observed => the step does not complete.
 *  R5  An irreversible step that already completed for this trace against this application is not run
 *      again. The record lives in a ledger parked on a global symbol, so it survives a second
 *      `replay()` call and a second instantiation of this module.
 *  R6  `app.askModel` is never called. It is not referenced anywhere in this file.
 *  R7  Every audited step carries the node it resolved, the precondition value it observed, and a
 *      named reason whenever it did not run.
 *
 * Outcome discipline:
 *   unreplayable — the selector cannot identify a node any more (gone, or ambiguous). Waiting cannot
 *                  fix that; the trace has to be re-recorded. Detected in a side-effect-free
 *                  pre-flight pass so an unreplayable trace is REPORTED, not half-run.
 *   halted       — the page cannot proceed from this state right now: a region is still loading, a
 *                  precondition reads something else, a confirmation was not presented. Try later.
 *   completed    — the trace reached its end.
 */

// ---------------------------------------------------------------- named reasons

const HALT = {
  UNRESOLVED: "SELECTOR_UNRESOLVED",
  AMBIGUOUS: "SELECTOR_AMBIGUOUS",
  PENDING: "REGION_PENDING",
  PRECONDITION: "PRECONDITION_MISMATCH",
  NO_CONFIRMATION: "CONFIRMATION_NOT_PRESENTED",
  ALREADY_APPLIED: "ALREADY_APPLIED",
  NOT_RUN: "TRACE_UNREPLAYABLE",
  ACTION_FAILED: "ACTION_FAILED",
  ACTION_INCOMPLETE: "ACTION_INCOMPLETE",
  UNSUPPORTED_KIND: "UNSUPPORTED_ACTION_KIND",
  CONFIRMATION_NOT_REQUIRED: "CONFIRMATION_NOT_REQUIRED",
  INTERNAL_ERROR: "REPLAYER_ERROR",
};

/** Observed-value placeholders: the audit says what was seen, including "nothing". */
const ABSENT = "absent";
const EXISTS = "exists";

const ACTION_KINDS = new Set(["click", "type", "submit", "confirm"]);
const CONFIRMATION_ATTR = "data-opens-confirmation";

// ---------------------------------------------------------------- the effect ledger (R5)
//
// The harness does not remember which irreversible steps already fired, so this does.
//
// Scope matters. An effect is something caused IN ONE APPLICATION, so the ledger is keyed on the app
// instance first: two scenarios that happen to share a trace id can never poison each other, and a
// suite that replays the same trace against a fresh app still does the work. Keyed only by trace id,
// a "already paid" record would silently suppress a payment that was never made.
//
// The secondary, trace-keyed record exists for the one case app identity cannot see: a harness that
// hands the same underlying application over a freshly built facade object. That is only trusted when
// the live page still looks exactly as this trace left it and no longer looks like it did before the
// trace ran — i.e. there is positive evidence of a continuation rather than a fresh page.

const LEDGER_KEY = Symbol.for("ui-action-record-replay.effect-ledger.v1");

function ledgers() {
  let store = globalThis[LEDGER_KEY];
  if (!store || !(store.byApp instanceof WeakMap) || !(store.byTrace instanceof Map)) {
    store = { byApp: new WeakMap(), byTrace: new Map() };
    globalThis[LEDGER_KEY] = store;
  }
  return store;
}

function traceKey(trace) {
  const id = trace && typeof trace.id === "string" ? trace.id : "<anonymous-trace>";
  const steps = trace && Array.isArray(trace.steps) ? trace.steps : [];
  const shape = steps
    .map((s, i) => {
      const sel = s && s.selector ? s.selector : {};
      return [
        typeof s?.index === "number" ? s.index : i,
        s?.kind ?? "?",
        sel.kind ?? "?",
        sel.value ?? "?",
        sel.qualifier ?? "",
        s?.irreversible ? "1" : "0",
      ].join(":");
    })
    .join("|");
  return `${id}#${shape}`;
}

/**
 * What the page looks like to this trace, right now. Read-only: `query` and `attr` only.
 *
 * Used to tell "the same application, handed to me again" from "a fresh application that happens to
 * be replaying the same recording".
 */
function fingerprint(trace, app) {
  const steps = trace && Array.isArray(trace.steps) ? trace.steps : [];
  const parts = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const found = safeQuery(app, step?.selector);
    const nodeId = nodeIdOf(found.node);
    const preAttr =
      step?.precondition && typeof step.precondition.attr === "string" ? step.precondition.attr : null;
    parts.push(
      [
        i,
        nodeId ?? "-",
        found.matches,
        found.pending ? "p" : "s",
        preAttr ? (safeAttr(app, nodeId, preAttr) ?? "-") : "-",
        safeAttr(app, nodeId, "data-state") ?? "-",
      ].join(":"),
    );
  }
  parts.push(`dialog:${confirmationPresent(app) ? "1" : "0"}`);
  return parts.join("|");
}

function cloneRecords(records) {
  const copy = new Map();
  for (const [k, v] of records) copy.set(k, { attempted: v.attempted, completed: v.completed });
  return copy;
}

/** The per-(app, trace) record of irreversible steps, resumed from a re-wrapped facade when provable. */
function ledgerFor(trace, app) {
  const store = ledgers();
  const key = traceKey(trace);

  let perApp = store.byApp.get(app);
  if (!perApp) {
    perApp = new Map();
    try {
      store.byApp.set(app, perApp);
    } catch {
      // A non-object facade cannot key a WeakMap; the trace-keyed record still carries the run.
    }
  }

  let entry = perApp.get(key);
  if (entry) return entry;

  const before = fingerprint(trace, app);
  const previous = store.byTrace.get(key);
  const isContinuation =
    previous !== undefined &&
    typeof previous.after === "string" &&
    before === previous.after &&
    before !== previous.before;

  entry = {
    key,
    records: isContinuation ? cloneRecords(previous.records) : new Map(),
    before: isContinuation ? previous.before : before,
  };
  perApp.set(key, entry);
  return entry;
}

/** Publish the run so a re-wrapped facade for the same application can pick it up. */
function commitLedger(trace, app, entry) {
  const store = ledgers();
  store.byTrace.set(entry.key, {
    before: entry.before,
    after: fingerprint(trace, app),
    records: cloneRecords(entry.records),
  });
}

function effectState(records, stepKey) {
  const state = records.get(stepKey);
  return state ? state : { attempted: false, completed: false };
}

// ---------------------------------------------------------------- facade access, defensively

function safeQuery(app, selector) {
  try {
    const result = app.query(selector);
    if (!result || typeof result !== "object") return { node: null, matches: 0, pending: false };
    const node = result.node ?? null;
    const matches =
      typeof result.matches === "number" && Number.isFinite(result.matches)
        ? result.matches
        : node
          ? 1
          : 0;
    return { node, matches, pending: result.pending === true };
  } catch {
    return { node: null, matches: 0, pending: false };
  }
}

function safeAttr(app, nodeId, name) {
  if (nodeId === null || nodeId === undefined || !name) return null;
  try {
    const value = app.attr(nodeId, name);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

function confirmationPresent(app) {
  try {
    return app.confirmationPresent() === true;
  } catch {
    return false;
  }
}

function acceptConfirmation(app) {
  try {
    app.acceptConfirmation();
    return true;
  } catch {
    return false;
  }
}

function nodeIdOf(node) {
  return node && typeof node.id === "string" ? node.id : null;
}

function declaresConfirmation(app, nodeId) {
  const raw = safeAttr(app, nodeId, CONFIRMATION_ATTR);
  if (raw === null) return false;
  const value = raw.trim().toLowerCase();
  return value !== "" && value !== "false" && value !== "0" && value !== "no";
}

// ---------------------------------------------------------------- observation (R2 / R3)

function observePrecondition(app, nodeId, step) {
  const pre = step && step.precondition ? step.precondition : null;
  const name = pre && typeof pre.attr === "string" && pre.attr.length > 0 ? pre.attr : null;
  if (!name) {
    // Nothing but existence is required, and existence is what was observed to get here.
    return { observed: EXISTS, satisfied: true };
  }
  const raw = safeAttr(app, nodeId, name);
  const observed = raw === null ? ABSENT : raw;
  const expected = pre.attrValue;
  const satisfied =
    expected === null || expected === undefined ? raw !== null : raw === expected;
  return { observed, satisfied };
}

function observePostcondition(app, nodeId, step) {
  if (nodeId === null) return null;
  const post = step && step.postcondition ? step.postcondition : null;
  if (post && typeof post.attr === "string" && post.attr.length > 0) {
    const raw = safeAttr(app, nodeId, post.attr);
    return raw === null ? ABSENT : raw;
  }
  if (post && typeof post.effect === "string" && post.effect.length > 0) {
    const effect = safeAttr(app, nodeId, "data-effect");
    if (effect !== null) return effect;
  }
  const fallbackAttr =
    step && step.precondition && typeof step.precondition.attr === "string" && step.precondition.attr
      ? step.precondition.attr
      : "data-state";
  const raw = safeAttr(app, nodeId, fallbackAttr);
  return raw === null ? ABSENT : raw;
}

// ---------------------------------------------------------------- audit helpers

function audit(fields) {
  return {
    index: fields.index,
    resolvedNodeId: fields.resolvedNodeId ?? null,
    preconditionObserved: fields.preconditionObserved ?? null,
    postconditionObserved: fields.postconditionObserved ?? null,
    confirmationObserved:
      fields.confirmationObserved === undefined ? null : fields.confirmationObserved,
    ran: fields.ran === true,
    haltReason: fields.haltReason ?? null,
  };
}

function stepIndex(step, position) {
  return typeof step?.index === "number" ? step.index : position;
}

function report(traceId, outcome, steps, unreplayableReason) {
  return { traceId, outcome, steps, unreplayableReason: unreplayableReason ?? null };
}

// ---------------------------------------------------------------- pre-flight refusal
//
// Resolution is side-effect free, so the whole trace can be resolved before a single action runs. A
// target that is gone (or no longer uniquely identified) makes the trace unreplayable no matter how
// long you wait — finding that out after typing half a checkout form is the "half-run" failure the
// outcome vocabulary exists to prevent.
//
// Deliberately narrow: only a definitive resolution failure refuses. `pending` is "not yet", which is
// a halt to be discovered in order, and `confirm` steps address a dialog that legitimately does not
// exist until an earlier step opens it.

function preflightRefusal(steps, app) {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step || typeof step !== "object") return { at: i, reason: HALT.UNSUPPORTED_KIND };
    if (!ACTION_KINDS.has(step.kind)) return { at: i, reason: HALT.UNSUPPORTED_KIND };
    if (step.kind === "confirm") continue;
    const found = safeQuery(app, step.selector);
    if (found.pending) continue;
    if (found.matches > 1) return { at: i, reason: HALT.AMBIGUOUS };
    if (nodeIdOf(found.node) === null) return { at: i, reason: HALT.UNRESOLVED };
  }
  return null;
}

function refusalAudit(steps, app, at, reason) {
  const audited = [];
  for (let i = 0; i <= at && i < steps.length; i++) {
    const step = steps[i];
    const index = stepIndex(step, i);
    if (i === at) {
      const found = step && typeof step === "object" ? safeQuery(app, step.selector) : null;
      const resolvedNodeId = found ? nodeIdOf(found.node) : null;
      audited.push(
        audit({
          index,
          resolvedNodeId,
          preconditionObserved:
            resolvedNodeId === null ? null : observePrecondition(app, resolvedNodeId, step).observed,
          ran: false,
          haltReason: reason,
        }),
      );
      continue;
    }
    const found = safeQuery(app, step.selector);
    const resolvedNodeId = nodeIdOf(found.node);
    audited.push(
      audit({
        index,
        resolvedNodeId,
        preconditionObserved:
          resolvedNodeId === null ? null : observePrecondition(app, resolvedNodeId, step).observed,
        ran: false,
        // Not run, and the reason is the trace as a whole, not this step.
        haltReason: HALT.NOT_RUN,
      }),
    );
  }
  return audited;
}

// ---------------------------------------------------------------- performing one action

function performAction(app, step, nodeId) {
  try {
    if (step.kind === "click") {
      app.click(nodeId);
      return true;
    }
    if (step.kind === "type") {
      app.type(nodeId, typeof step.value === "string" ? step.value : "");
      return true;
    }
    if (step.kind === "submit") {
      app.submit(nodeId);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- replay

function runReplay(trace, app, steps) {
  const entry = ledgerFor(trace, app);
  try {
    return replaySteps(trace, app, steps, entry.records);
  } finally {
    commitLedger(trace, app, entry);
  }
}

function replaySteps(trace, app, steps, applied) {
  const traceId = trace && typeof trace.id === "string" ? trace.id : "<anonymous-trace>";
  const recorded = trace && Array.isArray(trace.steps) ? trace.steps : [];

  if (recorded.length === 0) return report(traceId, "completed", steps, null);

  const refusal = preflightRefusal(recorded, app);
  if (refusal) {
    for (const entry of refusalAudit(recorded, app, refusal.at, refusal.reason)) steps.push(entry);
    return report(traceId, "unreplayable", steps, refusal.reason);
  }

  // True only when the immediately preceding step observed and accepted a confirmation.
  let confirmationAcceptedByPreviousStep = false;
  let previousStepDeclaredConfirmation = false;
  // True when the immediately preceding step was skipped because it had already been applied.
  let previousStepAlreadyApplied = false;

  for (let i = 0; i < recorded.length; i++) {
    const step = recorded[i];
    const index = stepIndex(step, i);
    const key = index;
    const priorEffect = step.irreversible ? effectState(applied, key) : null;

    // ---- R5: an irreversible step that already completed is observed, reported, and not repeated.
    if (priorEffect && priorEffect.completed) {
      const found = safeQuery(app, step.selector);
      const resolvedNodeId = nodeIdOf(found.node);
      steps.push(
        audit({
          index,
          resolvedNodeId,
          preconditionObserved:
            resolvedNodeId === null ? null : observePrecondition(app, resolvedNodeId, step).observed,
          postconditionObserved: observePostcondition(app, resolvedNodeId, step),
          confirmationObserved: null,
          ran: false,
          haltReason: HALT.ALREADY_APPLIED,
        }),
      );
      confirmationAcceptedByPreviousStep = false;
      previousStepDeclaredConfirmation = false;
      previousStepAlreadyApplied = true;
      continue;
    }

    // ---- R1: resolve live, every time.
    const found = safeQuery(app, step.selector);
    const resolvedNodeId = nodeIdOf(found.node);
    const isConfirmStep = step.kind === "confirm";

    if (!isConfirmStep) {
      if (found.matches > 1) {
        const reason = found.pending ? HALT.PENDING : HALT.AMBIGUOUS;
        steps.push(audit({ index, resolvedNodeId: null, ran: false, haltReason: reason }));
        return found.pending
          ? report(traceId, "halted", steps, null)
          : report(traceId, "unreplayable", steps, reason);
      }
      if (resolvedNodeId === null) {
        const reason = found.pending ? HALT.PENDING : HALT.UNRESOLVED;
        steps.push(audit({ index, resolvedNodeId: null, ran: false, haltReason: reason }));
        return found.pending
          ? report(traceId, "halted", steps, null)
          : report(traceId, "unreplayable", steps, reason);
      }
    }

    // ---- R2: observe the precondition; the observed value goes into the audit either way.
    let preconditionObserved = null;
    if (resolvedNodeId !== null) {
      const pre = observePrecondition(app, resolvedNodeId, step);
      preconditionObserved = pre.observed;
      if (!pre.satisfied) {
        steps.push(
          audit({
            index,
            resolvedNodeId,
            preconditionObserved,
            ran: false,
            haltReason: HALT.PRECONDITION,
          }),
        );
        return report(traceId, "halted", steps, null);
      }
    }

    // ---- a recorded `confirm` step: the accept is the action.
    if (isConfirmStep) {
      const ownDeclaration = resolvedNodeId !== null && declaresConfirmation(app, resolvedNodeId);
      const present = confirmationPresent(app);
      if (present) {
        const accepted = acceptConfirmation(app);
        steps.push(
          audit({
            index,
            resolvedNodeId,
            preconditionObserved,
            postconditionObserved: observePostcondition(app, resolvedNodeId, step),
            confirmationObserved: true,
            ran: accepted,
            haltReason: accepted ? null : HALT.NO_CONFIRMATION,
          }),
        );
        if (!accepted) return report(traceId, "halted", steps, null);
        confirmationAcceptedByPreviousStep = true;
        previousStepDeclaredConfirmation = false;
        previousStepAlreadyApplied = false;
        continue;
      }
      if (confirmationAcceptedByPreviousStep) {
        // The dialog this step exists to accept was observed and accepted a moment ago.
        steps.push(
          audit({
            index,
            resolvedNodeId,
            preconditionObserved,
            postconditionObserved: observePostcondition(app, resolvedNodeId, step),
            confirmationObserved: true,
            ran: true,
            haltReason: null,
          }),
        );
        confirmationAcceptedByPreviousStep = false;
        previousStepAlreadyApplied = false;
        continue;
      }
      if (previousStepAlreadyApplied) {
        // The action this confirmation belongs to was applied by an earlier replay, and its dialog
        // was accepted then. Re-opening it is not available and not wanted.
        steps.push(
          audit({
            index,
            resolvedNodeId,
            preconditionObserved,
            postconditionObserved: observePostcondition(app, resolvedNodeId, step),
            confirmationObserved: null,
            ran: false,
            haltReason: HALT.ALREADY_APPLIED,
          }),
        );
        previousStepAlreadyApplied = true;
        continue;
      }
      if (!previousStepDeclaredConfirmation && !ownDeclaration) {
        // Nothing live asks for a confirmation any more; there is none to observe and none required.
        steps.push(
          audit({
            index,
            resolvedNodeId,
            preconditionObserved,
            postconditionObserved: observePostcondition(app, resolvedNodeId, step),
            confirmationObserved: false,
            ran: false,
            haltReason: HALT.CONFIRMATION_NOT_REQUIRED,
          }),
        );
        previousStepDeclaredConfirmation = false;
        previousStepAlreadyApplied = false;
        continue;
      }
      // R4: an absent dialog is not a confirmation.
      steps.push(
        audit({
          index,
          resolvedNodeId,
          preconditionObserved,
          confirmationObserved: false,
          ran: false,
          haltReason: HALT.NO_CONFIRMATION,
        }),
      );
      return report(traceId, "halted", steps, null);
    }

    // ---- the action itself.
    const attemptedBefore = priorEffect !== null && priorEffect.attempted;
    const requiresConfirmation = declaresConfirmation(app, resolvedNodeId);

    if (attemptedBefore && !requiresConfirmation) {
      // A previous replay performed this irreversible action and never completed it. Re-running it
      // would be the double-fire this ledger exists to prevent.
      steps.push(
        audit({
          index,
          resolvedNodeId,
          preconditionObserved,
          postconditionObserved: observePostcondition(app, resolvedNodeId, step),
          ran: false,
          haltReason: HALT.ACTION_INCOMPLETE,
        }),
      );
      return report(traceId, "halted", steps, null);
    }

    if (!attemptedBefore) {
      if (step.irreversible) applied.set(key, { attempted: true, completed: false });
      const performed = performAction(app, step, resolvedNodeId);
      if (!performed) {
        steps.push(
          audit({
            index,
            resolvedNodeId,
            preconditionObserved,
            postconditionObserved: observePostcondition(app, resolvedNodeId, step),
            ran: false,
            haltReason: HALT.ACTION_FAILED,
          }),
        );
        return report(traceId, "halted", steps, null);
      }
    }

    // ---- R4: a declared confirmation must be observed, and accepted, before the step completes.
    let confirmationObserved = null;
    if (requiresConfirmation) {
      const present = confirmationPresent(app);
      confirmationObserved = present;
      if (!present) {
        steps.push(
          audit({
            index,
            resolvedNodeId,
            preconditionObserved,
            postconditionObserved: observePostcondition(app, resolvedNodeId, step),
            confirmationObserved: false,
            ran: false,
            haltReason: HALT.NO_CONFIRMATION,
          }),
        );
        return report(traceId, "halted", steps, null);
      }
      const nextIsConfirmStep = recorded[i + 1] && recorded[i + 1].kind === "confirm";
      if (!nextIsConfirmStep) {
        const accepted = acceptConfirmation(app);
        if (!accepted) {
          steps.push(
            audit({
              index,
              resolvedNodeId,
              preconditionObserved,
              postconditionObserved: observePostcondition(app, resolvedNodeId, step),
              confirmationObserved: false,
              ran: false,
              haltReason: HALT.NO_CONFIRMATION,
            }),
          );
          return report(traceId, "halted", steps, null);
        }
        confirmationAcceptedByPreviousStep = true;
      } else {
        confirmationAcceptedByPreviousStep = false;
      }
    } else {
      confirmationAcceptedByPreviousStep = false;
    }
    previousStepDeclaredConfirmation = requiresConfirmation;
    previousStepAlreadyApplied = false;

    if (step.irreversible) applied.set(key, { attempted: true, completed: true });

    // ---- R3: read the postcondition back off the page. Recorded, never asserted.
    steps.push(
      audit({
        index,
        resolvedNodeId,
        preconditionObserved,
        postconditionObserved: observePostcondition(app, resolvedNodeId, step),
        confirmationObserved,
        ran: true,
        haltReason: null,
      }),
    );
  }

  return report(traceId, "completed", steps, null);
}

export const subject = {
  id: "live-resolving-idempotent-replayer",
  label: "Resolves live, observes preconditions, confirms before irreversible effects, replays once",

  replay(trace, app) {
    const steps = [];
    const traceId = trace && typeof trace.id === "string" ? trace.id : "<anonymous-trace>";
    try {
      return runReplay(trace, app, steps);
    } catch {
      // Never let an implementation fault masquerade as a completed flow.
      steps.push(
        audit({
          index: steps.length,
          resolvedNodeId: null,
          ran: false,
          haltReason: HALT.INTERNAL_ERROR,
        }),
      );
      return report(traceId, "halted", steps, null);
    }
  },
};
