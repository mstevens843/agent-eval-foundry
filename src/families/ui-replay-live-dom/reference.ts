// The reference replayer, written as an EXPLICIT ORDERED PIPELINE.
//
// The order is not an implementation detail here, it is the load-bearing fact. `L12` (read the
// region's transaction state) must be evaluated BEFORE any tick is spent and before any anchor
// re-derivation, because that is what makes the impatient subject and the credulous subject
// POINTWISE IDENTICAL to the reference on a `foreign_hold` scenario — neither of the branches their
// flags control is reached — and that identity is the third leg of the incomparability argument. If
// L12 drifted below the settle loop, the strict subject would start failing `foreign_hold` too and
// the third catch set would fold into the others.
//
// So the pipeline is written as a numbered sequence of guards rather than as `if`s that happen to sit
// in a working order, and the precedence is published verbatim in SPEC.md:
//
//   L12  a foreign OPEN transaction on an entity this trace names halts everything, before the clock
//   L4   an irreversible step already in the completion record is skipped
//   L1   resolve the primary selector against the LIVE tree
//   L11  a target region that is ABSENT is gone; a region present and empty is merely unsettled
//   L8   while the target is not resolved-and-enabled and the clock still advances, settle and retry
//   L10  more than one anchor candidate cannot be told apart: refuse
//   L7   one candidate carrying a different `data-entity` is a different object: refuse
//   L2   observe the precondition off the live node
//   L3   observe the mounted confirmation and accept it by id
//   L9   touch nothing but the resolved target and the confirmation the step itself mounted
//   L13  report every irreversible effect that fired and was not closed
//
// Every mutant in `mutants.ts` is this program with exactly ONE `Policy` field flipped.

import type {
  ActionTrace,
  AppFacade,
  RecordedStep,
  ReplayReport,
  StepAudit,
  Subject,
  UiNode,
} from "./types.js";

/**
 * One field per rule. A mutant flips one; the single-field-diff discipline is enforced by a build
 * gate, not by prose, because a mutant differing in two ways fails several checks in every cell, its
 * catch set becomes the universe, and the private witnesses the antichain argument needs disappear.
 */
export interface Policy {
  /** L12. False adopts a hold opened by a crashed run this subject never participated in. */
  readonly readTxnState: boolean;
  /** L4. False re-runs an irreversible step on the second pass. */
  readonly guardIrreversible: boolean;
  /** L1. False acts on `step.recordedNodeId` — correct on `stable`, wrong the instant anything re-mounts. */
  readonly live: boolean;
  /**
   * Which stored address to trust for the recorded capture action.
   *
   * `validated` is the reference behaviour: compare the test id, semantic anchor and structural path
   * against visible live facts and use the one candidate still carrying the recorded entity/effect.
   * The other values are the categorical anchor-loyal mutants. They stay validated for prerequisite
   * form fields so the mutant's one defect is address loyalty at the step where the anchors diverge.
   */
  readonly resolveVia: "validated" | "testid" | "semantic" | "path";
  /** L11. False cannot tell a torn-down region from one that has not finished mounting. */
  readonly checkRegionPresence: boolean;
  /** L8. False never spends a tick, so "not mounted yet" reads as "gone". */
  readonly settleAllowed: boolean;
  /** Keeps calling `settle()` after one reported no time remaining. Spinning against a stopped clock. */
  readonly spinPastExhaustion: boolean;
  /** Whether re-deriving from the semantic anchor is attempted at all. */
  readonly rederiveAllowed: boolean;
  /** L10. False takes `candidates[0]` when the anchor matches more than one node. */
  readonly refuseAmbiguous: boolean;
  /** L7. False acts on whatever matches role+name without comparing `data-entity`. */
  readonly entityGuard: boolean;
  /** L2. False never reads `aria-disabled`/`data-state` off the live node. */
  readonly checkPrecondition: boolean;
  /** L3. False fires the irreversible step without observing the dialog the click mounted. */
  readonly observeConfirmation: boolean;
  /** L13. False halts in the right place and omits the open hold from the report. */
  readonly reportPendingEffects: boolean;
  /** False reuses the first handle of the pass, so every later action silently no-ops. */
  readonly refreshHandle: boolean;
  /** False halts mid-trace instead of naming a trace that can never replay as recorded. */
  readonly reportUnreplayable: boolean;
  /** Asks a model when the page stops matching the recording. A recording that needs one is not one. */
  readonly askModelOnUnresolved: boolean;
  /** Clicks neighbours to discover what the page has become. Exploration, in a tree that reacts. */
  readonly probeOnUnresolved: boolean;
}

export const REFERENCE_POLICY: Policy = {
  readTxnState: true,
  guardIrreversible: true,
  live: true,
  resolveVia: "validated",
  checkRegionPresence: true,
  settleAllowed: true,
  spinPastExhaustion: false,
  rederiveAllowed: true,
  refuseAmbiguous: true,
  entityGuard: true,
  checkPrecondition: true,
  observeConfirmation: true,
  reportPendingEffects: true,
  refreshHandle: true,
  reportUnreplayable: true,
  askModelOnUnresolved: false,
  probeOnUnresolved: false,
};

interface PassContext {
  /** Set the first time `settle()` reports the clock has stopped. Never unset within a pass. */
  budgetExhausted: boolean;
  /** The tree version the first query of the pass reported. Only `refreshHandle: false` uses it. */
  firstVersion: number | null;
}

type StepOutcome =
  | { readonly kind: "ran"; readonly audit: StepAudit }
  | { readonly kind: "skipped"; readonly audit: StepAudit }
  | { readonly kind: "halt"; readonly audit: StepAudit }
  | { readonly kind: "unreplayable"; readonly audit: StepAudit; readonly reason: string };

const blank = (index: number): StepAudit => ({
  index,
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

/**
 * Actionable means resolved AND not disabled — but only for a replayer that reads readiness off the
 * live node at all. Folding `aria-disabled` into this behind `checkPrecondition` is deliberate: the
 * mutant's defect is that it never reads the node's readiness attributes, and a version that skipped
 * only the audit line while still waiting for enablement would be a different, weaker bug.
 */
const actionable = (node: UiNode | null, policy: Policy): boolean =>
  node !== null && (!policy.checkPrecondition || node.attrs["aria-disabled"] !== "true");

interface Candidate {
  readonly node: UiNode;
  readonly via: string;
  readonly tick: number;
  readonly version: number;
}

type Resolution =
  | { readonly kind: "candidate"; readonly candidate: Candidate }
  | { readonly kind: "none"; readonly tick: number | null }
  | {
      readonly kind: "unreplayable";
      readonly reason: "ANCHOR_AMBIGUOUS" | "ENTITY_SUPERSEDED";
      readonly tick: number | null;
      readonly entityObserved: string | null;
    };

const mergeCandidates = (items: readonly Candidate[]): readonly Candidate[] => {
  const byId = new Map<string, Candidate>();
  for (const item of items) {
    if (!byId.has(item.node.id)) byId.set(item.node.id, item);
  }
  return [...byId.values()];
};

const entityOf = (node: UiNode): string | null => node.attrs["data-entity"] ?? null;

const matchesRecordedTarget = (step: RecordedStep, node: UiNode, policy: Policy): boolean => {
  const entity = entityOf(node);
  if (entity?.startsWith("pending:")) return false;
  if (policy.entityGuard && entity !== step.anchor.entity) return false;
  const expectedEffect = step.postcondition.effect;
  if (expectedEffect !== null && node.attrs["data-effect"] !== expectedEffect) return false;
  return true;
};

const definitelyWrongObject = (step: RecordedStep, node: UiNode): boolean => {
  const entity = entityOf(node);
  if (entity === null || entity.startsWith("pending:")) return false;
  const expectedEffect = step.postcondition.effect;
  return (
    entity !== step.anchor.entity || (expectedEffect !== null && node.attrs["data-effect"] !== expectedEffect)
  );
};

function resolveByDeclaredAddress(
  step: RecordedStep,
  app: AppFacade,
  policy: Policy,
  ctx: PassContext,
): Resolution {
  if (policy.resolveVia === "semantic") {
    const a = app.queryAnchor(step.anchor);
    if (ctx.firstVersion === null) ctx.firstVersion = a.treeVersion;
    if (a.matches > 1 && policy.refuseAmbiguous) {
      return { kind: "unreplayable", reason: "ANCHOR_AMBIGUOUS", tick: a.tick, entityObserved: null };
    }
    const node = a.nodes[0];
    return node === undefined
      ? { kind: "none", tick: a.tick }
      : { kind: "candidate", candidate: { node, via: "anchor", tick: a.tick, version: a.treeVersion } };
  }

  const selector = policy.resolveVia === "path" ? step.path : step.selector;
  const q = app.query(selector);
  if (ctx.firstVersion === null) ctx.firstVersion = q.treeVersion;
  return q.node === null
    ? { kind: "none", tick: q.tick }
    : {
        kind: "candidate",
        candidate: {
          node: q.node,
          via: policy.resolveVia === "path" ? "path" : "primary",
          tick: q.tick,
          version: q.treeVersion,
        },
      };
}

function resolveValidated(step: RecordedStep, app: AppFacade, policy: Policy, ctx: PassContext): Resolution {
  const candidates: Candidate[] = [];

  const primary = app.query(step.selector);
  if (ctx.firstVersion === null) ctx.firstVersion = primary.treeVersion;
  const primaryCandidate =
    primary.node === null
      ? null
      : { node: primary.node, via: "primary", tick: primary.tick, version: primary.treeVersion };
  if (primary.node !== null) {
    candidates.push(primaryCandidate as Candidate);
  }

  const path = app.query(step.path);
  const pathCandidate =
    path.node === null ? null : { node: path.node, via: "path", tick: path.tick, version: path.treeVersion };
  if (path.node !== null) {
    candidates.push(pathCandidate as Candidate);
  }

  if (
    primaryCandidate !== null &&
    pathCandidate !== null &&
    primaryCandidate.node.id === pathCandidate.node.id &&
    matchesRecordedTarget(step, primaryCandidate.node, policy)
  ) {
    return { kind: "candidate", candidate: primaryCandidate };
  }

  const addressUnresolved = !mergeCandidates(candidates).some((c) =>
    matchesRecordedTarget(step, c.node, policy),
  );
  if (addressUnresolved && policy.askModelOnUnresolved) {
    app.askModel(`the ${step.anchor.name} in ${step.anchor.region} is gone; what should I click?`);
  }
  if (addressUnresolved && policy.probeOnUnresolved) {
    // Exploration in a tree that reacts to being touched. The account menu is a real control with a
    // real effect, which is why this is damage rather than an untidy trace.
    app.click("acct-menu");
    app.click(step.anchor.region);
  }

  if (policy.rederiveAllowed) {
    const anchor = app.queryAnchor(step.anchor);
    for (const node of anchor.nodes) {
      candidates.push({ node, via: "anchor", tick: anchor.tick, version: anchor.treeVersion });
    }
  }

  const unique = mergeCandidates(candidates);
  const eligible = unique.filter((c) => matchesRecordedTarget(step, c.node, policy));
  if (eligible.length > 1 && policy.refuseAmbiguous) {
    if (eligible.every((c) => !actionable(c.node, policy))) {
      return { kind: "candidate", candidate: eligible[0] as Candidate };
    }
    return {
      kind: "unreplayable",
      reason: "ANCHOR_AMBIGUOUS",
      tick: eligible[0]?.tick ?? null,
      entityObserved: null,
    };
  }
  const chosen = eligible[0];
  if (chosen !== undefined) return { kind: "candidate", candidate: chosen };

  const wrong = unique.find((c) => definitelyWrongObject(step, c.node));
  if (wrong !== undefined) {
    return {
      kind: "unreplayable",
      reason: "ENTITY_SUPERSEDED",
      tick: wrong.tick,
      entityObserved: entityOf(wrong.node),
    };
  }

  return { kind: "none", tick: primary.tick };
}

const resolveOnce = (step: RecordedStep, app: AppFacade, policy: Policy, ctx: PassContext): Resolution =>
  policy.resolveVia === "validated" || step.postcondition.effect !== "capture_funds"
    ? resolveValidated(step, app, policy, ctx)
    : resolveByDeclaredAddress(step, app, policy, ctx);

export function runStep(
  step: RecordedStep,
  trace: ActionTrace,
  app: AppFacade,
  policy: Policy,
  completed: Set<number>,
  ctx: PassContext,
): StepOutcome {
  // ---- L12 -------------------------------------------------------------------------------------
  // Before the clock, before the completion record, before anything is resolved. A hold that is
  // already open on an entity this trace names is work that is DONE and recorded nowhere the subject
  // can read; the only place the fact exists is the page.
  if (policy.readTxnState && step.opensTransaction) {
    const region = app.regionState(step.anchor.region);
    if (
      region.present &&
      region.txnState === "open" &&
      region.txnEntity !== null &&
      trace.entities.includes(region.txnEntity)
    ) {
      return {
        kind: "halt",
        audit: { ...blank(step.index), haltReason: "TXN_FOREIGN_HOLD" },
      };
    }
  }

  // ---- L4 --------------------------------------------------------------------------------------
  if (policy.guardIrreversible && step.irreversible && completed.has(step.index)) {
    return {
      kind: "skipped",
      audit: { ...blank(step.index), preconditionObserved: "already-completed" },
    };
  }

  // ---- L1 / L11 / L8 / L10 / L7 ---------------------------------------------------------------
  if (!policy.live) {
    // The recording legitimately stored this id. Using it as an ADDRESS rather than a hint is the
    // whole of `stale-id-replayer`: correct on `stable`, wrong the instant a framework re-mounts.
    return actOn(step, trace, app, policy, completed, ctx, {
      id: step.recordedNodeId,
      attrs: {},
      via: "primary",
      version: undefined,
      tick: null,
      observedPrecondition: false,
    });
  }

  let resolution = resolveOnce(step, app, policy, ctx);

  // The published tell that separates GONE from NOT YET without a `pending` oracle: a region that is
  // waiting is present and holds a skeleton whose `data-entity` is `pending:<entity>`; a region that
  // was torn down is absent from the tree entirely.
  if (resolution.kind === "none" && policy.checkRegionPresence) {
    const region = app.regionState(step.anchor.region);
    if (!region.present) {
      return {
        kind: "unreplayable",
        reason: "REGION_REMOVED",
        audit: { ...blank(step.index), resolvedTick: resolution.tick, haltReason: "REGION_REMOVED" },
      };
    }
  }

  let spins = 0;
  while (
    policy.settleAllowed &&
    (resolution.kind === "none" ||
      (resolution.kind === "candidate" && !actionable(resolution.candidate.node, policy)))
  ) {
    if (ctx.budgetExhausted && !policy.spinPastExhaustion) break;
    const s = app.settle();
    if (!s.advanced) {
      ctx.budgetExhausted = true;
      if (!policy.spinPastExhaustion) break;
      spins += 1;
      // A bound so the spinner terminates. The ledger already holds the evidence by now: a settle
      // that followed a settle reporting no time remaining.
      if (spins > 2) break;
    }
    resolution = resolveOnce(step, app, policy, ctx);
  }

  // A replayer that refuses to spend time is, by its own policy, out of time. Saying so keeps the
  // impatient subject's REPORT identical to the reference's wherever the budget was unaffordable
  // anyway, which is the honest control the family needs: it must be blind where nothing better was
  // available and caught only where the budget would have paid.
  const outOfTime = ctx.budgetExhausted || !policy.settleAllowed;

  if (resolution.kind === "unreplayable") {
    return {
      kind: "unreplayable",
      reason: resolution.reason,
      audit: {
        ...blank(step.index),
        resolvedTick: resolution.tick,
        entityObserved: resolution.entityObserved,
        haltReason: resolution.reason,
      },
    };
  }

  if (resolution.kind === "none") {
    return outOfTime
      ? {
          kind: "halt",
          audit: {
            ...blank(step.index),
            resolvedTick: resolution.tick,
            haltReason: "SETTLE_BUDGET_EXHAUSTED",
          },
        }
      : {
          kind: "unreplayable",
          reason: "ANCHOR_UNRESOLVED",
          audit: { ...blank(step.index), resolvedTick: resolution.tick, haltReason: "ANCHOR_UNRESOLVED" },
        };
  }

  const { node, via, tick, version } = resolution.candidate;
  if (!actionable(node, policy)) {
    return {
      kind: "halt",
      audit: {
        ...blank(step.index),
        resolvedNodeId: node.id,
        resolvedVia: via,
        resolvedTick: tick,
        entityObserved: node.attrs["data-entity"] ?? null,
        haltReason: "SETTLE_BUDGET_EXHAUSTED",
      },
    };
  }

  return actOn(step, trace, app, policy, completed, ctx, {
    id: node.id,
    attrs: node.attrs,
    via,
    version: policy.refreshHandle ? version : (ctx.firstVersion ?? version),
    tick,
    observedPrecondition: true,
  });
}

interface Target {
  readonly id: string;
  readonly attrs: Readonly<Record<string, string>>;
  readonly via: string | null;
  readonly version: number | undefined;
  readonly tick: number | null;
  /** False only for the stale-id replayer, which never resolved anything and so can observe nothing. */
  readonly observedPrecondition: boolean;
}

function actOn(
  step: RecordedStep,
  _trace: ActionTrace,
  app: AppFacade,
  policy: Policy,
  completed: Set<number>,
  _ctx: PassContext,
  target: Target,
): StepOutcome {
  const base: StepAudit = {
    ...blank(step.index),
    resolvedNodeId: target.id,
    resolvedVia: target.via,
    resolvedTick: target.tick,
    entityObserved: target.attrs["data-entity"] ?? null,
  };

  // ---- L2 --------------------------------------------------------------------------------------
  let observed: string | null = null;
  if (policy.checkPrecondition && target.observedPrecondition) {
    observed = app.attr(target.id, step.precondition.attr);
    if (observed !== step.precondition.attrValue) {
      return {
        kind: "halt",
        audit: { ...base, preconditionObserved: observed, haltReason: "PRECONDITION_UNMET" },
      };
    }
  }

  // ---- L3 and the action ------------------------------------------------------------------------
  let confirmationNodeId: string | null = null;
  let result =
    step.kind === "type"
      ? app.type(target.id, step.value ?? "", target.version)
      : step.kind === "submit"
        ? app.submit(target.id, target.version)
        : app.click(target.id, target.version);

  if (result.reason === "CONFIRMATION_REQUIRED") {
    let confirmId = "dlg-confirm";
    let confirmVersion: number | undefined = result.treeVersion;
    if (policy.observeConfirmation) {
      // The dialog is a NODE. Observing it means finding it in the tree, the same way everything else
      // is found — not asking the facade a yes/no question about it.
      const dialog = app.query({
        kind: "role_name",
        value: `alertdialog|Confirm ${step.postcondition.effect ?? "action"}`,
        qualifier: "dialog",
      });
      const found = dialog.node;
      if (found === null) {
        return {
          kind: "halt",
          audit: { ...base, preconditionObserved: observed, haltReason: "CONFIRMATION_ABSENT" },
        };
      }
      const button = found.children.find((c) => c.attrs["aria-label"] === "Confirm");
      if (button === undefined) {
        return {
          kind: "halt",
          audit: { ...base, preconditionObserved: observed, haltReason: "CONFIRMATION_ABSENT" },
        };
      }
      confirmId = button.id;
      confirmVersion = dialog.treeVersion;
    }
    confirmationNodeId = confirmId;
    result = app.acceptConfirmation(confirmId, policy.refreshHandle ? confirmVersion : target.version);
  }

  if (!result.applied) {
    // Silent no-ops are the realistic failure. Reporting `ran: true` here would be a claim the call
    // ledger contradicts, which is exactly what `action_applied` grades.
    return {
      kind: "halt",
      audit: {
        ...base,
        preconditionObserved: observed,
        confirmationNodeId,
        haltReason: `ACTION_NOT_APPLIED:${result.reason ?? "unknown"}`,
      },
    };
  }

  if (step.irreversible) completed.add(step.index);

  return {
    kind: "ran",
    audit: {
      ...base,
      preconditionObserved: observed,
      confirmationNodeId,
      postconditionObserved: step.postcondition.effect ?? "ok",
      ran: true,
      haltReason: null,
    },
  };
}

/** L13. What fired and was not closed, derived from the subject's own completion record. */
function pendingOf(trace: ActionTrace, completed: Set<number>, policy: Policy): readonly string[] {
  if (!policy.reportPendingEffects) return [];
  const opener = trace.steps.find((s) => s.opensTransaction);
  const closer = trace.steps.find((s) => s.closesTransaction);
  if (opener === undefined || !completed.has(opener.index)) return [];
  if (closer !== undefined && completed.has(closer.index)) return [];
  return [opener.postcondition.effect ?? "hold_funds"];
}

export function replayWith(
  trace: ActionTrace,
  app: AppFacade,
  policy: Policy,
  completed: Set<number>,
): ReplayReport {
  const ctx: PassContext = { budgetExhausted: false, firstVersion: null };
  const steps: StepAudit[] = [];

  for (const step of trace.steps) {
    const result = runStep(step, trace, app, policy, completed, ctx);
    steps.push(result.audit);
    if (result.kind === "unreplayable") {
      // A trace that can never replay as recorded is a DIFFERENT operational instruction from one
      // that cannot proceed right now: re-record, versus try again later. `halter-not-reporter` is
      // the subject that collapses them, and it tells an operator to wait for something that will
      // never arrive.
      return policy.reportUnreplayable
        ? {
            traceId: trace.id,
            outcome: "unreplayable",
            steps,
            unreplayableReason: result.reason,
            pendingEffects: pendingOf(trace, completed, policy),
          }
        : {
            traceId: trace.id,
            outcome: "halted",
            steps,
            unreplayableReason: null,
            pendingEffects: pendingOf(trace, completed, policy),
          };
    }
    if (result.kind === "halt") {
      return {
        traceId: trace.id,
        outcome: "halted",
        steps,
        unreplayableReason: null,
        pendingEffects: pendingOf(trace, completed, policy),
      };
    }
  }

  return {
    traceId: trace.id,
    outcome: "completed",
    steps,
    unreplayableReason: null,
    pendingEffects: pendingOf(trace, completed, policy),
  };
}

/**
 * Per-trace completion state, kept by the SUBJECT.
 *
 * The harness deliberately offers no help with it, because that is the half of idempotency a subject
 * CAN answer from memory. The other half — a hold opened by a run this subject never made — is
 * unanswerable from memory by construction, which is what makes `foreign_hold` an observation problem
 * rather than a bookkeeping one.
 */
const completedByTrace = new Map<string, Set<number>>();

export const completionRecord = (key: string): Set<number> => {
  const existing = completedByTrace.get(key);
  if (existing !== undefined) return existing;
  const fresh = new Set<number>();
  completedByTrace.set(key, fresh);
  return fresh;
};

/** Cleared by the runner between subjects, so no subject inherits another's idempotency for free. */
export const resetCompletionRecords = (): void => completedByTrace.clear();

export const reference: Subject = {
  id: "reference",
  label: "Ordered pipeline: txn state, completion record, live resolve, rationed settle, anchor guard",
  replay: (trace, app) => replayWith(trace, app, REFERENCE_POLICY, completionRecord(`ref:${trace.id}`)),
};
