// Starter. Implement `replay` and export `subject`.
//
// Contract:
//   replay(trace, app) -> { traceId, outcome, steps, unreplayableReason, pendingEffects }
//
// The facade is documented in SPEC.md. Do not call app.askModel during replay.

const completed = new Set();

const blank = (step) => ({
  index: step.index,
  resolvedNodeId: null,
  resolvedVia: null,
  resolvedTick: null,
  preconditionObserved: null,
  entityObserved: null,
  postconditionObserved: null,
  confirmationNodeId: null,
  ran: false,
  haltReason: null,
});

export const subject = {
  id: "starter",
  label: "Starter stub — replace me",

  replay(trace, app) {
    const steps = [];
    const pendingEffects = [];

    for (const step of trace.steps) {
      if (step.irreversible && completed.has(step.index)) {
        steps.push({ ...blank(step), preconditionObserved: "already-completed" });
        continue;
      }

      const q = app.query(step.selector);
      if (q.node === null) {
        const region = app.regionState(step.anchor.region);
        steps.push({
          ...blank(step),
          resolvedTick: q.tick,
          haltReason: region.present ? "SELECTOR_UNRESOLVED" : "REGION_REMOVED",
        });
        return {
          traceId: trace.id,
          outcome: region.present ? "halted" : "unreplayable",
          steps,
          unreplayableReason: region.present ? null : "REGION_REMOVED",
          pendingEffects,
        };
      }

      const pre = app.attr(q.node.id, step.precondition.attr);
      steps.push({
        ...blank(step),
        resolvedNodeId: q.node.id,
        resolvedVia: "primary",
        resolvedTick: q.tick,
        preconditionObserved: pre,
        entityObserved: q.node.attrs["data-entity"] ?? null,
        haltReason: "NOT_IMPLEMENTED",
      });
      return { traceId: trace.id, outcome: "halted", steps, unreplayableReason: null, pendingEffects };
    }

    return { traceId: trace.id, outcome: "completed", steps, unreplayableReason: null, pendingEffects };
  },
};
