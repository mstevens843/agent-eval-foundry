// Deterministic UI trace replayer.
//
// Every step's selector is resolved live (R1). Preconditions and postconditions are read from the
// live app, never assumed from the recording (R2/R3). A target that declares
// `data-opens-confirmation` is not considered complete until a confirmation has actually been
// observed and accepted (R4). Irreversible steps that already fired for a given trace id are never
// re-fired on a second `replay()` call for that same trace (R5) — the guard below is the "record"
// R5 says is our job to keep. `app.askModel` is never called (R6). Every audit entry reports the
// live-resolved node, the observed pre/postcondition, and a named halt reason when it stopped (R7).

const HALT = {
  SELECTOR_UNRESOLVED: "SELECTOR_UNRESOLVED",
  SELECTOR_AMBIGUOUS: "SELECTOR_AMBIGUOUS",
  REGION_PENDING: "REGION_PENDING",
  PRECONDITION_NOT_MET: "PRECONDITION_NOT_MET",
  CONFIRMATION_NOT_OBSERVED: "CONFIRMATION_NOT_OBSERVED",
};

// Per-trace record of which irreversible steps have already fired. Keyed by `${traceId}::${index}`.
// This persists across calls to `replay` on this module instance, which is what makes the second
// call on the same trace idempotent (R5) without the harness having to track it for us.
const firedIrreversibleSteps = new Set();

function observeAttr(app, nodeId, attrName) {
  if (!attrName) return null;
  return app.attr(nodeId, attrName);
}

function resolvePostconditionAttrName(postcondition) {
  if (postcondition.attr) return postcondition.attr;
  if (postcondition.effect) return "data-effect";
  return null;
}

function runAction(app, step, nodeId) {
  switch (step.kind) {
    case "click":
      app.click(nodeId);
      return;
    case "type":
      app.type(nodeId, step.value);
      return;
    case "submit":
      app.submit(nodeId);
      return;
    case "confirm":
      // handled by the confirmation flow below; no separate action to fire here.
      return;
    default:
      return;
  }
}

export const subject = {
  id: "live-resolving-idempotent-replayer",
  label: "Resolves every step live, observes pre/postconditions from the app, and guards irreversible steps against re-firing on repeat replay",

  replay(trace, app) {
    const steps = [];

    for (const step of trace.steps) {
      const key = `${trace.id}::${step.index}`;

      if (step.irreversible && firedIrreversibleSteps.has(key)) {
        // Already fired on a prior replay() call for this trace. Do not touch the facade's
        // mutating methods again — best-effort, read-only observation only.
        let resolvedNodeId = null;
        let preconditionObserved = null;
        let postconditionObserved = null;
        try {
          const { node } = app.query(step.selector);
          if (node) {
            resolvedNodeId = node.id;
            preconditionObserved = observeAttr(app, node.id, step.precondition.attr);
            postconditionObserved = observeAttr(app, node.id, resolvePostconditionAttrName(step.postcondition));
          }
        } catch {
          // Node may legitimately be gone post-effect (e.g. removed after payment). That is not a
          // failure of this replay call — the step already ran on a prior call.
        }

        steps.push({
          index: step.index,
          resolvedNodeId,
          preconditionObserved,
          postconditionObserved,
          confirmationObserved: null,
          ran: true,
          haltReason: null,
        });
        continue;
      }

      // R1: resolve the selector against the LIVE tree. The recorded node id is a hint only.
      const { node, matches, pending } = app.query(step.selector);

      if (node === null) {
        const halted = pending;
        steps.push({
          index: step.index,
          resolvedNodeId: null,
          preconditionObserved: null,
          postconditionObserved: null,
          confirmationObserved: null,
          ran: false,
          haltReason: halted ? HALT.REGION_PENDING : HALT.SELECTOR_UNRESOLVED,
        });
        return halted
          ? { traceId: trace.id, outcome: "halted", steps, unreplayableReason: null }
          : { traceId: trace.id, outcome: "unreplayable", steps, unreplayableReason: HALT.SELECTOR_UNRESOLVED };
      }

      if (matches > 1) {
        steps.push({
          index: step.index,
          resolvedNodeId: node.id,
          preconditionObserved: null,
          postconditionObserved: null,
          confirmationObserved: null,
          ran: false,
          haltReason: HALT.SELECTOR_AMBIGUOUS,
        });
        return { traceId: trace.id, outcome: "unreplayable", steps, unreplayableReason: HALT.SELECTOR_AMBIGUOUS };
      }

      // R2: observe the precondition live, do not assume the recorded value still holds.
      const preconditionObserved = observeAttr(app, node.id, step.precondition.attr);
      const preconditionMet =
        step.precondition.attr === null || preconditionObserved === step.precondition.attrValue;

      if (!preconditionMet) {
        steps.push({
          index: step.index,
          resolvedNodeId: node.id,
          preconditionObserved,
          postconditionObserved: null,
          confirmationObserved: null,
          ran: false,
          haltReason: HALT.PRECONDITION_NOT_MET,
        });
        return { traceId: trace.id, outcome: "halted", steps, unreplayableReason: null };
      }

      runAction(app, step, node.id);

      // R4: a target that declares data-opens-confirmation (or a step that IS the confirm action)
      // must not be considered complete until a confirmation is observed and accepted. An absent
      // dialog is not a confirmation.
      const requiresConfirmation =
        step.kind === "confirm" || app.attr(node.id, "data-opens-confirmation") === "true";

      let confirmationObserved = null;
      if (requiresConfirmation) {
        confirmationObserved = app.confirmationPresent();
        if (!confirmationObserved) {
          steps.push({
            index: step.index,
            resolvedNodeId: node.id,
            preconditionObserved,
            postconditionObserved: null,
            confirmationObserved,
            ran: false,
            haltReason: HALT.CONFIRMATION_NOT_OBSERVED,
          });
          return { traceId: trace.id, outcome: "halted", steps, unreplayableReason: null };
        }
        app.acceptConfirmation();
      }

      // R3: the postcondition is read from what the app shows now, not from what was recorded.
      const postconditionObserved = observeAttr(app, node.id, resolvePostconditionAttrName(step.postcondition));

      if (step.irreversible) {
        firedIrreversibleSteps.add(key);
      }

      steps.push({
        index: step.index,
        resolvedNodeId: node.id,
        preconditionObserved,
        postconditionObserved,
        confirmationObserved,
        ran: true,
        haltReason: null,
      });
    }

    return { traceId: trace.id, outcome: "completed", steps, unreplayableReason: null };
  },
};
