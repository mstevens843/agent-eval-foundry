export const subject = {
  id: "ui-replay-impl",
  label: "UI Action Replay Implementation",
  completedTraces: new Map(),

  replay(trace, app) {
    const completed = this.completedTraces.get(trace.id) || new Set();
    const thisReplayCompleted = new Set();
    const steps = [];
    let outcome = "completed";
    let unreplayableReason = null;

    for (const step of trace.steps) {
      // R5: Don't repeat irreversible steps that already completed
      if (step.irreversible && completed.has(step.index)) {
        steps.push({
          index: step.index,
          resolvedNodeId: null,
          preconditionObserved: null,
          postconditionObserved: null,
          confirmationObserved: null,
          ran: false,
          haltReason: null,
        });
        thisReplayCompleted.add(step.index);
        continue;
      }

      // R1: Resolve selector against live tree
      const queryResult = app.query(step.selector);
      const { node, matches, pending } = queryResult;

      // Handle selector resolution failures
      if (matches === 0) {
        if (step.precondition.nodeExists) {
          if (pending) {
            // Region exists but not loaded yet - might work later
            outcome = "halted";
            steps.push({
              index: step.index,
              resolvedNodeId: null,
              preconditionObserved: "pending",
              postconditionObserved: null,
              confirmationObserved: null,
              ran: false,
              haltReason: "pending",
            });
            break;
          } else {
            // Node is gone - can never replay as recorded
            unreplayableReason = `step ${step.index}: selector did not resolve to any node`;
            outcome = "unreplayable";
            steps.push({
              index: step.index,
              resolvedNodeId: null,
              preconditionObserved: null,
              postconditionObserved: null,
              confirmationObserved: null,
              ran: false,
              haltReason: null,
            });
            break;
          }
        } else {
          // Node not found but wasn't expected to exist - skip
          steps.push({
            index: step.index,
            resolvedNodeId: null,
            preconditionObserved: "node_does_not_exist",
            postconditionObserved: null,
            confirmationObserved: null,
            ran: false,
            haltReason: null,
          });
          continue;
        }
      } else if (matches > 1) {
        // Ambiguous - can't pick which one
        unreplayableReason = `step ${step.index}: selector matched ${matches} nodes (ambiguous)`;
        outcome = "unreplayable";
        steps.push({
          index: step.index,
          resolvedNodeId: null,
          preconditionObserved: null,
          postconditionObserved: null,
          confirmationObserved: null,
          ran: false,
          haltReason: null,
        });
        break;
      }

      // Exactly one match
      const resolvedNodeId = node.id;

      // R2: Observe precondition before running step
      let preconditionObserved = null;
      if (step.precondition.attr) {
        preconditionObserved = app.attr(resolvedNodeId, step.precondition.attr);
        if (preconditionObserved !== step.precondition.attrValue) {
          // Precondition not met - might be met later
          outcome = "halted";
          steps.push({
            index: step.index,
            resolvedNodeId,
            preconditionObserved,
            postconditionObserved: null,
            confirmationObserved: null,
            ran: false,
            haltReason: "precondition",
          });
          break;
        }
      } else if (step.precondition.nodeExists) {
        preconditionObserved = "exists";
      }

      // Execute the action
      try {
        if (step.kind === "click") {
          app.click(resolvedNodeId);
        } else if (step.kind === "type") {
          app.type(resolvedNodeId, step.value);
        } else if (step.kind === "submit") {
          app.submit(resolvedNodeId);
        } else if (step.kind === "confirm") {
          app.acceptConfirmation();
        }
      } catch (e) {
        outcome = "halted";
        steps.push({
          index: step.index,
          resolvedNodeId,
          preconditionObserved,
          postconditionObserved: null,
          confirmationObserved: null,
          ran: false,
          haltReason: "action_failed",
        });
        break;
      }

      // R4: Handle confirmation dialogs
      let confirmationObserved = null;
      if (node.attrs["data-opens-confirmation"] === "true") {
        confirmationObserved = app.confirmationPresent();
        if (confirmationObserved) {
          try {
            app.acceptConfirmation();
          } catch (e) {
            outcome = "halted";
            steps.push({
              index: step.index,
              resolvedNodeId,
              preconditionObserved,
              postconditionObserved: null,
              confirmationObserved,
              ran: false,
              haltReason: "confirmation_failed",
            });
            break;
          }
        } else {
          // Expected confirmation but dialog not present
          outcome = "halted";
          steps.push({
            index: step.index,
            resolvedNodeId,
            preconditionObserved,
            postconditionObserved: null,
            confirmationObserved,
            ran: false,
            haltReason: "confirmation_not_present",
          });
          break;
        }
      }

      // R3: Record postcondition from what app shows
      let postconditionObserved = null;
      if (step.postcondition.attr) {
        postconditionObserved = app.attr(resolvedNodeId, step.postcondition.attr);
      } else if (step.postcondition.effect) {
        postconditionObserved = step.postcondition.effect;
      }

      steps.push({
        index: step.index,
        resolvedNodeId,
        preconditionObserved,
        postconditionObserved,
        confirmationObserved,
        ran: true,
        haltReason: null,
      });

      // Track completed irreversible steps
      if (step.irreversible) {
        thisReplayCompleted.add(step.index);
      }
    }

    // Save state for R5 idempotency
    if (thisReplayCompleted.size > 0) {
      this.completedTraces.set(trace.id, thisReplayCompleted);
    }

    return {
      traceId: trace.id,
      outcome,
      steps,
      unreplayableReason,
    };
  },
};
