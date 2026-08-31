// Starter. Implement `replay` and export `subject`.
//
//   replay(trace, app) -> { traceId, outcome, steps, unreplayableReason }
//
// step audit: { index, resolvedNodeId, preconditionObserved, postconditionObserved,
//               confirmationObserved, ran, haltReason }

export const subject = {
  id: "starter",
  label: "Starter stub — replace me",

  replay(trace, app) {
    const steps = [];

    for (const step of trace.steps) {
      // TODO: resolve the selector LIVE. step.recordedNodeId is a hint and may be stale.
      const { node, matches, pending } = app.query(step.selector);

      if (node === null) {
        steps.push({
          index: step.index,
          resolvedNodeId: null,
          preconditionObserved: null,
          postconditionObserved: null,
          confirmationObserved: null,
          ran: false,
          haltReason: pending ? "REGION_PENDING" : "SELECTOR_UNRESOLVED",
        });
        return { traceId: trace.id, outcome: "halted", steps, unreplayableReason: null };
      }

      // TODO: observe the precondition, handle confirmations, guard irreversible steps.
      steps.push({
        index: step.index,
        resolvedNodeId: node.id,
        preconditionObserved: null,
        postconditionObserved: null,
        confirmationObserved: null,
        ran: false,
        haltReason: "NOT_IMPLEMENTED",
      });
      return { traceId: trace.id, outcome: "halted", steps, unreplayableReason: null };
    }

    return { traceId: trace.id, outcome: "completed", steps, unreplayableReason: null };
  },
};
