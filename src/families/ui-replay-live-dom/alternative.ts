import type { StepAudit, Subject, UiNode } from "./types.js";
const completions = new Map<string, Set<number>>();
/** Independent candidate-set interpreter. Always reads semantic, path and primary addresses;
 * uses a per-trace journal and re-resolves after every settling tick. No reference call. */
export const alternative: Subject = {
  id: "alternative",
  label: "Candidate-set replay interpreter",
  replay(trace, app) {
    const done = completions.get(trace.id) ?? new Set<number>();
    completions.set(trace.id, done);
    const steps: StepAudit[] = [];
    const pending = () => {
      const open = trace.steps.find((s) => s.opensTransaction);
      const close = trace.steps.find((s) => s.closesTransaction);
      return open && done.has(open.index) && (!close || !done.has(close.index))
        ? [open.postcondition.effect ?? "hold_funds"]
        : [];
    };
    const stop = (audit: StepAudit, reason: string, permanent: boolean) => {
      steps.push({ ...audit, haltReason: reason });
      return {
        traceId: trace.id,
        outcome: permanent ? ("unreplayable" as const) : ("halted" as const),
        steps,
        unreplayableReason: permanent ? reason : null,
        pendingEffects: pending(),
      };
    };
    for (const step of trace.steps) {
      let audit: StepAudit = {
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
      if (step.opensTransaction) {
        const region = app.regionState(step.anchor.region);
        if (region.txnState === "open" && region.txnEntity && trace.entities.includes(region.txnEntity))
          return stop(audit, "TXN_FOREIGN_HOLD", false);
      }
      if (step.irreversible && done.has(step.index)) {
        steps.push(audit);
        continue;
      }
      let chosen: { node: UiNode; version: number; tick: number; via: string } | undefined;
      while (!chosen) {
        const anchor = app.queryAnchor(step.anchor);
        const path = app.query(step.path);
        const primary = app.query(step.selector);
        const candidates = new Map<string, { node: UiNode; version: number; tick: number; via: string }>();
        for (const [nodes, version, tick, via] of [
          [anchor.nodes, anchor.treeVersion, anchor.tick, "anchor"],
          [path.node ? [path.node] : [], path.treeVersion, path.tick, "path"],
          [primary.node ? [primary.node] : [], primary.treeVersion, primary.tick, "primary"],
        ] as const) {
          for (const node of nodes) candidates.set(node.id, { node, version, tick, via });
        }
        const eligible = [...candidates.values()].filter(
          ({ node }) =>
            node.attrs["data-entity"] === step.anchor.entity &&
            (step.postcondition.effect === null || node.attrs["data-effect"] === step.postcondition.effect),
        );
        if (eligible.length > 1 && eligible.some(({ node }) => node.attrs["aria-disabled"] !== "true"))
          return stop(audit, "ANCHOR_AMBIGUOUS", true);
        const ready = eligible.find(({ node }) => node.attrs["aria-disabled"] !== "true");
        if (ready) {
          chosen = ready;
          break;
        }
        if (
          !eligible.length &&
          [...candidates.values()].some(({ node }) => {
            const entity = node.attrs["data-entity"];
            return (
              entity &&
              !entity.startsWith("pending:") &&
              (entity !== step.anchor.entity ||
                (step.postcondition.effect !== null &&
                  node.attrs["data-effect"] !== step.postcondition.effect))
            );
          })
        )
          return stop(audit, "ENTITY_SUPERSEDED", true);
        if (!eligible.length && !app.regionState(step.anchor.region).present)
          return stop(audit, "REGION_REMOVED", true);
        if (!app.settle().advanced) return stop(audit, "SETTLE_BUDGET_EXHAUSTED", false);
      }
      const { node, version, tick, via } = chosen;
      const observed = app.attr(node.id, step.precondition.attr);
      audit = {
        ...audit,
        resolvedNodeId: node.id,
        resolvedVia: via,
        resolvedTick: tick,
        entityObserved: node.attrs["data-entity"] ?? null,
        preconditionObserved: observed,
      };
      if (observed !== step.precondition.attrValue) return stop(audit, "precondition did not hold", false);
      let result =
        step.kind === "type"
          ? app.type(node.id, step.value ?? "", version)
          : step.kind === "click"
            ? app.click(node.id, version)
            : app.submit(node.id, version);
      if (result.reason === "CONFIRMATION_REQUIRED") {
        const dialog = app.query({
          kind: "role_name",
          value: `alertdialog|Confirm ${step.postcondition.effect ?? "action"}`,
          qualifier: "dialog",
        });
        const button = dialog.node?.children.find((n) => n.attrs["aria-label"] === "Confirm");
        if (!button) return stop(audit, "confirmation unavailable", false);
        result = app.acceptConfirmation(button.id, dialog.treeVersion);
        audit = { ...audit, confirmationNodeId: button.id };
      }
      if (!result.applied) return stop(audit, "action did not apply", false);
      if (step.irreversible) done.add(step.index);
      steps.push({ ...audit, ran: true, postconditionObserved: step.postcondition.effect ?? "ok" });
    }
    return {
      traceId: trace.id,
      outcome: "completed",
      steps,
      unreplayableReason: null,
      pendingEffects: pending(),
    };
  },
};
