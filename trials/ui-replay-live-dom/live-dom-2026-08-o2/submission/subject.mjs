const traceStates = new Map();

const VIA_ORDER = ["primary", "anchor", "path"];

function stateFor(traceId) {
  let state = traceStates.get(traceId);
  if (!state) {
    state = { completed: new Set(), pendingEffects: new Set() };
    traceStates.set(traceId, state);
  }
  return state;
}

function stepKey(step) {
  return `${step.index}:${step.postcondition?.effect ?? ""}`;
}

function blank(step) {
  return {
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
  };
}

function nodeAttr(node, name) {
  return Object.prototype.hasOwnProperty.call(node.attrs ?? {}, name) ? node.attrs[name] : null;
}

function accessibleName(node) {
  return nodeAttr(node, "aria-label") ?? node.text ?? "";
}

function normalizedEffect(value) {
  return value == null || value === "" ? null : value;
}

function expectedEffect(step) {
  return normalizedEffect(step.postcondition?.effect ?? null);
}

function anchorFactsMatch(node, step) {
  return (
    node.role === step.anchor.role &&
    accessibleName(node) === step.anchor.name &&
    nodeAttr(node, "data-region") === step.anchor.region
  );
}

function effectMatches(node, step) {
  return normalizedEffect(nodeAttr(node, "data-effect")) === expectedEffect(step);
}

function entityMatches(node, step) {
  return nodeAttr(node, "data-entity") === step.anchor.entity;
}

function preconditionMatches(node, step) {
  return nodeAttr(node, step.precondition.attr) === step.precondition.attrValue;
}

function identityMatches(node, step) {
  return anchorFactsMatch(node, step) && entityMatches(node, step) && effectMatches(node, step);
}

function addCandidate(candidates, node, via, queryResult) {
  if (!node) return;

  let candidate = candidates.get(node.id);
  if (!candidate) {
    candidate = {
      node,
      vias: new Set(),
      ticks: new Map(),
      versions: new Map(),
    };
    candidates.set(node.id, candidate);
  }

  candidate.vias.add(via);
  candidate.ticks.set(via, queryResult.tick ?? null);
  candidate.versions.set(via, queryResult.treeVersion ?? null);
}

function preferredVia(candidate) {
  for (const via of VIA_ORDER) {
    if (candidate.vias.has(via)) return via;
  }
  return null;
}

function candidateTick(candidate) {
  const via = preferredVia(candidate);
  return via == null ? null : candidate.ticks.get(via) ?? null;
}

function candidateVersion(candidate) {
  const via = preferredVia(candidate);
  return via == null ? undefined : candidate.versions.get(via) ?? undefined;
}

function makeAttrSelector(name, value) {
  return { kind: "attr", value, qualifier: name };
}

function resolveOnce(step, app) {
  const primary = app.query(step.selector);
  const path = app.query(step.path);
  const anchor = app.queryAnchor(step.anchor);
  const candidates = new Map();

  if (primary.node && primary.matches === 1) addCandidate(candidates, primary.node, "primary", primary);
  if (path.node && path.matches === 1) addCandidate(candidates, path.node, "path", path);

  for (const node of anchor.nodes ?? []) {
    addCandidate(candidates, node, "anchor", anchor);
  }

  const entries = [...candidates.values()];
  const identity = entries.filter((candidate) => identityMatches(candidate.node, step));
  const ready = identity.filter((candidate) => preconditionMatches(candidate.node, step));
  const anchorLike = entries.filter((candidate) => anchorFactsMatch(candidate.node, step));
  const sameEntityWrongEffect = entries.filter(
    (candidate) =>
      anchorFactsMatch(candidate.node, step) &&
      entityMatches(candidate.node, step) &&
      !effectMatches(candidate.node, step),
  );
  const entityMismatch = anchorLike.filter(
    (candidate) => effectMatches(candidate.node, step) && !entityMatches(candidate.node, step),
  );
  return {
    primary,
    path,
    anchor,
    entries,
    identity,
    ready,
    sameEntityWrongEffect,
    entityMismatch,
    tick: anchor.tick ?? path.tick ?? primary.tick ?? null,
  };
}

function observePendingSkeleton(app, step) {
  const pending = app.query(makeAttrSelector("data-entity", `pending:${step.anchor.entity}`));
  const present =
    pending.matches > 0 &&
    (!pending.node || nodeAttr(pending.node, "data-region") === step.anchor.region);

  return {
    present,
    entityObserved: present ? `pending:${step.anchor.entity}` : null,
    tick: pending.tick ?? null,
  };
}

function selectedAuditBase(step, candidate) {
  return {
    ...blank(step),
    resolvedNodeId: candidate.node.id,
    resolvedVia: preferredVia(candidate),
    resolvedTick: candidateTick(candidate),
  };
}

function pendingList(state, extraEffect = null) {
  const values = new Set(state.pendingEffects);
  if (extraEffect) values.add(extraEffect);
  return [...values];
}

function report(trace, outcome, steps, unreplayableReason, pendingEffects) {
  return {
    traceId: trace.id,
    outcome,
    steps,
    unreplayableReason,
    pendingEffects,
  };
}

function observeCandidateForStop(step, app, candidate, haltReason) {
  const entityObserved = app.attr(candidate.node.id, "data-entity");
  const effectObserved = normalizedEffect(app.attr(candidate.node.id, "data-effect"));
  let preconditionObserved = null;

  if (entityObserved === step.anchor.entity && effectObserved === expectedEffect(step)) {
    preconditionObserved = app.attr(candidate.node.id, step.precondition.attr);
  }

  return {
    ...selectedAuditBase(step, candidate),
    preconditionObserved,
    entityObserved,
    postconditionObserved: effectObserved,
    ran: false,
    haltReason,
  };
}

function findFirst(node, predicate, found = []) {
  if (predicate(node)) found.push(node);
  for (const child of node.children ?? []) findFirst(child, predicate, found);
  return found;
}

function findConfirmation(app) {
  const selectors = [
    { kind: "role_index", value: "alertdialog", qualifier: "0" },
    { kind: "role_index", value: "0", qualifier: "alertdialog" },
  ];

  for (const selector of selectors) {
    const result = app.query(selector);
    if (!result.node || result.node.role !== "alertdialog") continue;

    const confirmButtons = findFirst(result.node, (node) => {
      if (node.role !== "button") return false;
      const name = accessibleName(node);
      return /\bconfirm\b/i.test(name) || /\bconfirm\b/i.test(node.text ?? "");
    });

    const buttons = confirmButtons.length
      ? confirmButtons
      : findFirst(result.node, (node) => node.role === "button");

    if (buttons.length === 1) {
      return {
        dialogNodeId: result.node.id,
        buttonNodeId: buttons[0].id,
        treeVersion: result.treeVersion,
        tick: result.tick,
      };
    }
  }

  return null;
}

function recordCompleted(state, step) {
  if (!step.irreversible) return;

  state.completed.add(stepKey(step));

  const effect = expectedEffect(step);
  if (step.closesTransaction) {
    state.pendingEffects.clear();
  } else if (step.opensTransaction && effect) {
    state.pendingEffects.add(effect);
  }
}

function chooseResolution(step, app) {
  let lastResolution = null;

  while (true) {
    const resolution = resolveOnce(step, app);
    lastResolution = resolution;

    if (resolution.ready.length === 1) {
      return { kind: "selected", candidate: resolution.ready[0], resolution };
    }

    if (resolution.ready.length > 1) {
      return { kind: "unreplayable", reason: "AMBIGUOUS_TARGET", resolution };
    }

    if (resolution.identity.length > 1) {
      const settled = app.settle();
      if (settled.advanced) continue;
      return { kind: "unreplayable", reason: "AMBIGUOUS_TARGET", resolution };
    }

    if (resolution.identity.length === 1) {
      const settled = app.settle();
      if (settled.advanced) continue;
      return {
        kind: "halted",
        reason: "PRECONDITION_UNMET",
        resolution,
        candidate: resolution.identity[0],
      };
    }

    if (resolution.entityMismatch.length > 0) {
      return {
        kind: "unreplayable",
        reason: "ENTITY_MISMATCH",
        resolution,
        candidate: resolution.entityMismatch[0],
      };
    }

    if (resolution.sameEntityWrongEffect.length > 0) {
      return {
        kind: "unreplayable",
        reason: "EFFECT_MISMATCH",
        resolution,
        candidate: resolution.sameEntityWrongEffect[0],
      };
    }

    const region = app.regionState(step.anchor.region);
    if (!region.present) {
      return { kind: "unreplayable", reason: "REGION_REMOVED", resolution, region };
    }

    const pending = observePendingSkeleton(app, step);
    if (pending.present) {
      const settled = app.settle();
      if (settled.advanced) continue;

      return {
        kind: "halted",
        reason: "SETTLE_EXHAUSTED",
        resolution: lastResolution,
        pendingEntity: pending.entityObserved,
        pendingTick: pending.tick,
      };
    }

    if (primaryOrPathAmbiguous(resolution)) {
      return { kind: "unreplayable", reason: "AMBIGUOUS_TARGET", resolution };
    }

    if (!pending.present) {
      return { kind: "unreplayable", reason: "TARGET_UNRESOLVED", resolution, region };
    }
  }
}

function primaryOrPathAmbiguous(resolution) {
  return (
    (resolution.primary.matches > 1 && !resolution.primary.node) ||
    (resolution.path.matches > 1 && !resolution.path.node)
  );
}

function auditForResolutionStop(step, app, choice) {
  if (choice.candidate) {
    return observeCandidateForStop(step, app, choice.candidate, choice.reason);
  }

  const audit = {
    ...blank(step),
    resolvedTick: choice.pendingTick ?? choice.resolution?.tick ?? null,
    haltReason: choice.reason,
  };

  if (choice.pendingEntity) {
    audit.entityObserved = choice.pendingEntity;
  }

  return audit;
}

function removeClosedEffects(state, trace, step) {
  if (!step.closesTransaction) return;

  for (const prior of trace.steps) {
    if (prior.opensTransaction && prior.postcondition?.effect) {
      state.pendingEffects.delete(prior.postcondition.effect);
    }
  }
}

function applyStep(step, trace, app, state, steps) {
  const choice = chooseResolution(step, app);

  if (choice.kind !== "selected") {
    const audit = auditForResolutionStop(step, app, choice);
    steps.push(audit);
    const pending = pendingList(state);
    return report(trace, choice.kind, steps, choice.kind === "unreplayable" ? choice.reason : null, pending);
  }

  const candidate = choice.candidate;
  const audit = selectedAuditBase(step, candidate);
  const nodeId = candidate.node.id;
  const handleVersion = candidateVersion(candidate);

  const entityObserved = app.attr(nodeId, "data-entity");
  const effectObserved = normalizedEffect(app.attr(nodeId, "data-effect"));

  audit.entityObserved = entityObserved;
  audit.postconditionObserved = effectObserved;

  if (entityObserved !== step.anchor.entity) {
    audit.haltReason = "ENTITY_MISMATCH";
    steps.push(audit);
    return report(trace, "unreplayable", steps, "ENTITY_MISMATCH", pendingList(state));
  }

  if (effectObserved !== expectedEffect(step)) {
    audit.haltReason = "EFFECT_MISMATCH";
    steps.push(audit);
    return report(trace, "unreplayable", steps, "EFFECT_MISMATCH", pendingList(state));
  }

  const preconditionObserved = app.attr(nodeId, step.precondition.attr);
  audit.preconditionObserved = preconditionObserved;

  if (preconditionObserved !== step.precondition.attrValue) {
    audit.haltReason = "PRECONDITION_UNMET";
    steps.push(audit);
    return report(trace, "halted", steps, null, pendingList(state));
  }

  let actionResult;
  if (step.kind === "click") {
    actionResult = app.click(nodeId, handleVersion);
  } else if (step.kind === "type") {
    actionResult = app.type(nodeId, step.value ?? "", handleVersion);
  } else {
    actionResult = app.submit(nodeId, handleVersion);
  }

  if (step.kind === "submit" && (nodeAttr(candidate.node, "data-opens-confirmation") === "true" || actionResult.reason === "CONFIRMATION_REQUIRED")) {
    const confirmation = findConfirmation(app);
    if (!confirmation) {
      audit.haltReason = "CONFIRMATION_MISSING";
      steps.push(audit);
      return report(trace, "halted", steps, null, pendingList(state));
    }

    const confirmationResult = app.acceptConfirmation(confirmation.buttonNodeId, confirmation.treeVersion);
    audit.confirmationNodeId = confirmation.buttonNodeId;

    if (!confirmationResult.applied) {
      audit.haltReason = confirmationResult.reason ?? "CONFIRMATION_NOT_APPLIED";
      steps.push(audit);
      return report(trace, "halted", steps, null, pendingList(state));
    }

    audit.ran = true;
    steps.push(audit);
    removeClosedEffects(state, trace, step);
    recordCompleted(state, step);
    return null;
  }

  if (!actionResult.applied) {
    audit.haltReason = actionResult.reason ?? "ACTION_NOT_APPLIED";
    steps.push(audit);
    return report(trace, "halted", steps, null, pendingList(state));
  }

  audit.ran = true;
  steps.push(audit);
  removeClosedEffects(state, trace, step);
  recordCompleted(state, step);
  return null;
}

export const subject = {
  id: "live-dom-deterministic-replayer",
  label: "Deterministic live DOM replay with entity guards",

  replay(trace, app) {
    const state = stateFor(trace.id);
    const steps = [];

    for (const step of trace.steps) {
      let transactionState = null;

      if (step.opensTransaction) {
        transactionState = app.regionState(step.anchor.region);
      }

      if (step.irreversible && state.completed.has(stepKey(step))) {
        steps.push({
          ...blank(step),
          postconditionObserved: expectedEffect(step) ? `already-completed:${expectedEffect(step)}` : "already-completed",
          ran: false,
          haltReason: null,
        });
        continue;
      }

      if (
        step.opensTransaction &&
        transactionState?.txnState === "open" &&
        trace.entities.includes(transactionState.txnEntity)
      ) {
        const pendingEffect = expectedEffect(step);
        steps.push({
          ...blank(step),
          entityObserved: transactionState.txnEntity,
          postconditionObserved: pendingEffect,
          haltReason: "FOREIGN_TRANSACTION_OPEN",
        });
        return report(trace, "halted", steps, null, pendingList(state, pendingEffect));
      }

      const result = applyStep(step, trace, app, state, steps);
      if (result) return result;
    }

    return report(trace, "completed", steps, null, pendingList(state));
  },
};
