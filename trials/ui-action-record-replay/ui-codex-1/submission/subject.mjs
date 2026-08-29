const completedTraces = new Set();
const completedIrreversibleSteps = new Set();

function selectorKey(selector) {
  return `${selector.kind}:${selector.qualifier ?? ""}:${selector.value}`;
}

function traceKey(trace) {
  return `${trace.id}:${trace.steps.length}:${trace.steps
    .map((step) => `${step.index}:${step.kind}:${selectorKey(step.selector)}:${step.value ?? ""}`)
    .join("|")}`;
}

function stepKey(trace, step) {
  return `${traceKey(trace)}:${step.index}:${step.kind}:${selectorKey(step.selector)}`;
}

function emptyAudit(step) {
  return {
    index: step.index,
    resolvedNodeId: null,
    preconditionObserved: null,
    postconditionObserved: null,
    confirmationObserved: null,
    ran: false,
    haltReason: null,
  };
}

function finish(trace, outcome, steps, unreplayableReason = null) {
  return {
    traceId: trace.id,
    outcome,
    steps,
    unreplayableReason,
  };
}

function sameSelector(left, right) {
  return (
    left.kind === right.kind &&
    left.value === right.value &&
    (left.qualifier ?? null) === (right.qualifier ?? null)
  );
}

function rawResolve(selector, app) {
  const result = app.query(selector);

  if (result.pending) {
    return {
      ok: false,
      outcome: "halted",
      reason: "REGION_PENDING",
      unreplayableReason: null,
      node: null,
    };
  }

  if (result.matches > 1) {
    return {
      ok: false,
      outcome: "unreplayable",
      reason: "SELECTOR_AMBIGUOUS",
      unreplayableReason: "SELECTOR_AMBIGUOUS",
      node: result.node ?? null,
    };
  }

  if (result.matches !== 1 || result.node === null) {
    return {
      ok: false,
      outcome: "unreplayable",
      reason: "SELECTOR_UNRESOLVED",
      unreplayableReason: "SELECTOR_UNRESOLVED",
      node: null,
    };
  }

  return { ok: true, node: result.node };
}

function expectedTestId(step) {
  if (step.selector.kind === "testid") {
    return step.selector.value;
  }

  if (step.selector.kind === "attr" && step.selector.qualifier === "data-testid") {
    return step.selector.value;
  }

  return step.recordedNodeId;
}

function identityMatches(step, node, app) {
  if (node.id === step.recordedNodeId) {
    return true;
  }

  const testId = app.attr(node.id, "data-testid");
  const expected = expectedTestId(step);
  return testId !== null && expected !== null && testId === expected;
}

function repairSelectors(step) {
  const selectors = [];
  const expected = expectedTestId(step);

  if (expected !== null) {
    selectors.push({ kind: "testid", value: expected, qualifier: null });
  }

  if (step.postcondition.effect !== null) {
    selectors.push({ kind: "attr", value: step.postcondition.effect, qualifier: "data-effect" });
  }

  if (step.precondition.attr !== null && step.precondition.attrValue !== null) {
    selectors.push({
      kind: "attr",
      value: step.precondition.attrValue,
      qualifier: step.precondition.attr,
    });
  }

  return selectors.filter((selector, index) => {
    if (sameSelector(selector, step.selector)) {
      return false;
    }

    return selectors.findIndex((candidate) => sameSelector(candidate, selector)) === index;
  });
}

function repairTarget(step, app) {
  for (const selector of repairSelectors(step)) {
    const resolved = rawResolve(selector, app);
    if (!resolved.ok) {
      continue;
    }

    if (identityMatches(step, resolved.node, app)) {
      return resolved;
    }
  }

  return null;
}

function resolveLive(step, app) {
  const primary = rawResolve(step.selector, app);

  if (!primary.ok) {
    if (primary.outcome === "halted") {
      return primary;
    }

    return repairTarget(step, app) ?? primary;
  }

  if (step.selector.kind === "role_index" && !identityMatches(step, primary.node, app)) {
    return (
      repairTarget(step, app) ?? {
        ok: false,
        outcome: "unreplayable",
        reason: "TARGET_IDENTITY_MISMATCH",
        unreplayableReason: "TARGET_IDENTITY_MISMATCH",
        node: primary.node,
      }
    );
  }

  return primary;
}

function observePrecondition(step, node, app) {
  if (step.precondition.attr !== null) {
    return app.attr(node.id, step.precondition.attr);
  }

  return step.precondition.nodeExists ? "true" : "false";
}

function preconditionMatches(step, observed) {
  if (!step.precondition.nodeExists) {
    return false;
  }

  if (step.precondition.attr !== null) {
    return observed === step.precondition.attrValue;
  }

  return true;
}

function observePostcondition(step, node, app) {
  if (step.postcondition.attr !== null) {
    return app.attr(node.id, step.postcondition.attr);
  }

  if (step.postcondition.effect !== null) {
    return app.attr(node.id, "data-effect");
  }

  return null;
}

function postconditionMatches(step, observed) {
  if (step.postcondition.attr !== null) {
    return observed === step.postcondition.attrValue;
  }

  if (step.postcondition.effect !== null) {
    return observed === step.postcondition.effect;
  }

  return true;
}

function declaresConfirmation(app, node) {
  const value = app.attr(node.id, "data-opens-confirmation");
  return value !== null && value !== "false";
}

function runAction(step, node, app) {
  switch (step.kind) {
    case "click":
      app.click(node.id);
      return;
    case "type":
      app.type(node.id, step.value ?? "");
      return;
    case "submit":
      app.submit(node.id);
      return;
    case "confirm":
      app.acceptConfirmation();
      return;
    default:
      throw new Error(`Unsupported action kind: ${step.kind}`);
  }
}

function auditAlreadyCompleted(trace, app) {
  return trace.steps.map((step) => {
    const audit = emptyAudit(step);

    const resolved = resolveLive(step, app);
    if (resolved.ok) {
      audit.resolvedNodeId = resolved.node.id;
      audit.preconditionObserved = observePrecondition(step, resolved.node, app);
      audit.postconditionObserved = observePostcondition(step, resolved.node, app);

      if (step.kind === "confirm" || declaresConfirmation(app, resolved.node)) {
        audit.confirmationObserved = app.confirmationPresent();
      }
    } else if (resolved.node !== null) {
      audit.resolvedNodeId = resolved.node.id;
    }

    audit.haltReason = "TRACE_ALREADY_COMPLETED";
    return audit;
  });
}

export const subject = {
  id: "deterministic-live-replayer",
  label: "Deterministic live selector replay",

  replay(trace, app) {
    const key = traceKey(trace);

    if (completedTraces.has(key)) {
      return finish(trace, "completed", auditAlreadyCompleted(trace, app));
    }

    const steps = [];

    for (const step of trace.steps) {
      const audit = emptyAudit(step);
      const irreversibleKey = stepKey(trace, step);

      if (step.irreversible && completedIrreversibleSteps.has(irreversibleKey)) {
        audit.haltReason = "IRREVERSIBLE_ALREADY_REPLAYED";
        steps.push(audit);
        continue;
      }

      const resolved = resolveLive(step, app);
      if (!resolved.ok) {
        audit.resolvedNodeId = resolved.node?.id ?? null;
        audit.haltReason = resolved.reason;
        steps.push(audit);
        return finish(trace, resolved.outcome, steps, resolved.unreplayableReason);
      }

      const node = resolved.node;
      audit.resolvedNodeId = node.id;
      audit.preconditionObserved = observePrecondition(step, node, app);

      if (!preconditionMatches(step, audit.preconditionObserved)) {
        audit.haltReason = "PRECONDITION_MISMATCH";
        steps.push(audit);
        return finish(trace, "halted", steps);
      }

      const opensConfirmation = declaresConfirmation(app, node);

      if (step.kind === "confirm") {
        audit.confirmationObserved = app.confirmationPresent();
        if (!audit.confirmationObserved) {
          audit.haltReason = "CONFIRMATION_NOT_PRESENT";
          steps.push(audit);
          return finish(trace, "halted", steps);
        }
      }

      try {
        runAction(step, node, app);
        audit.ran = true;
      } catch {
        audit.haltReason = step.kind === "confirm" ? "CONFIRMATION_ACCEPT_FAILED" : "ACTION_FAILED";
        steps.push(audit);
        return finish(trace, "halted", steps);
      }

      if (opensConfirmation && step.kind !== "confirm") {
        audit.confirmationObserved = app.confirmationPresent();
        if (!audit.confirmationObserved) {
          audit.haltReason = "CONFIRMATION_NOT_PRESENT";
          steps.push(audit);
          return finish(trace, "halted", steps);
        }

        try {
          app.acceptConfirmation();
        } catch {
          audit.haltReason = "CONFIRMATION_ACCEPT_FAILED";
          steps.push(audit);
          return finish(trace, "halted", steps);
        }
      }

      if (step.irreversible) {
        completedIrreversibleSteps.add(irreversibleKey);
      }

      audit.postconditionObserved = observePostcondition(step, node, app);
      if (!postconditionMatches(step, audit.postconditionObserved)) {
        audit.haltReason = "POSTCONDITION_MISMATCH";
        steps.push(audit);
        return finish(trace, "halted", steps);
      }

      steps.push(audit);
    }

    completedTraces.add(key);
    return finish(trace, "completed", steps);
  },
};
