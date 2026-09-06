import type { StepAudit, Subject } from "./types.js";
const finished = new Map<string, Set<number>>();
/** Independent two-pass replay plan with reverse preflight and freshly resolved execution. */
export const alternative: Subject = {
  id: "alternative",
  label: "Preflight plan and completion journal",
  replay(trace, app) {
    const done = finished.get(trace.id) ?? new Set<number>();
    finished.set(trace.id, done);
    for (const step of [...trace.steps].reverse()) {
      const q = app.query(step.selector);
      if (!q.node && q.matches === 0 && !q.pending)
        return {
          traceId: trace.id,
          outcome: "unreplayable",
          steps: [],
          unreplayableReason: "recorded address is absent",
        };
    }
    const steps: StepAudit[] = [];
    for (const step of trace.steps) {
      let audit: StepAudit = {
        index: step.index,
        resolvedNodeId: null,
        preconditionObserved: null,
        postconditionObserved: null,
        confirmationObserved: null,
        ran: false,
        haltReason: null,
      };
      if (step.irreversible && done.has(step.index)) {
        steps.push(audit);
        continue;
      }
      const q = app.query(step.selector);
      if (!q.node) {
        steps.push({ ...audit, haltReason: "live target not presently usable" });
        return { traceId: trace.id, steps, outcome: "halted", unreplayableReason: null };
      }
      audit = { ...audit, resolvedNodeId: q.node.id };
      const observed = step.precondition.attr === null ? null : app.attr(q.node.id, step.precondition.attr);
      audit = { ...audit, preconditionObserved: observed };
      if (step.precondition.attr !== null && observed !== step.precondition.attrValue) {
        steps.push({ ...audit, haltReason: "live precondition differs" });
        return { traceId: trace.id, steps, outcome: "halted", unreplayableReason: null };
      }
      if (step.irreversible && app.attr(q.node.id, "data-opens-confirmation") === "true") {
        app.click(q.node.id);
        const present = app.confirmationPresent();
        audit = { ...audit, confirmationObserved: present };
        if (!present) {
          steps.push({ ...audit, haltReason: "confirmation unavailable" });
          return { traceId: trace.id, steps, outcome: "halted", unreplayableReason: null };
        }
        app.acceptConfirmation();
      }
      if (step.kind === "type") app.type(q.node.id, step.value ?? "");
      else if (step.kind === "submit") app.submit(q.node.id);
      else app.click(q.node.id);
      if (step.irreversible) done.add(step.index);
      steps.push({ ...audit, ran: true, postconditionObserved: step.postcondition.effect ?? "ok" });
    }
    return { traceId: trace.id, outcome: "completed", steps, unreplayableReason: null };
  },
};
