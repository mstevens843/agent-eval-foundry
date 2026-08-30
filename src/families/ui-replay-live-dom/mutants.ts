// The known-bad bank, plus two DEMONSTRATION subjects that are the whole point of the family.
//
// THE SINGLE-FIELD-DIFF DISCIPLINE, AND WHY IT IS A TEST AND NOT A PARAGRAPH
//
// Every mutant below is `REFERENCE_POLICY` with exactly ONE field changed. `POLICY_MUTANTS` exposes
// each one's policy so `invariants.ts` can assert it at build time. A mutant that differed in two
// ways would fail several checks in every cell, its catch set would become the universe, and the
// PRIVATE WITNESSES the incomparability argument depends on — an element in each set that is absent
// from the others — would disappear. Every proof in this family rests on the discipline, so it is
// executable.
//
// THE IDENTITY LEMMA. The verifier grades only the sealed effect ledger, the sealed call ledger, the
// legitimacy map and the returned report — never a subject's internals. So when the branch a mutant's
// flipped field controls is NOT REACHED on an instance, the mutant emits the same calls and the same
// report as the reference and the verifier must return the same (empty) failure set. Passing is then
// not a prediction about behaviour; it is the same program.

import { type Policy, REFERENCE_POLICY, completionRecord, replayWith } from "./reference.js";
import type { ActionTrace, ReplayReport, Subject } from "./types.js";

const from = (id: string, label: string, diff: Partial<Policy>): Subject => ({
  id,
  label,
  replay: (trace, app) =>
    replayWith(trace, app, { ...REFERENCE_POLICY, ...diff }, completionRecord(`${id}:${trace.id}`)),
});

// ---------------------------------------------------------------- the three proof subjects

/**
 * The "honour the recorded intent" pole. Never spends a tick, so an affordance that is merely not
 * mounted yet reads as gone.
 *
 * Blind by design where nothing better was affordable: at budget 0, and at budget 2 for whichever
 * seed puts `settlesAt` at 5. That is the honest control — a subject punished for a budget it never
 * had would make the settle axis measure the harness rather than the disposition.
 */
const impatientHalter = from("impatient-halter", "Never settles: not-yet reads as gone", {
  settleAllowed: false,
});

/**
 * The "re-derive from the live page" pole. Acts on whatever matches role+name+region without
 * comparing `data-entity` to the recorded entity.
 *
 * Opposite to the halter by construction: it PASSES wherever the region merely mounted late (the
 * primary selector resolves, so the branch its flag controls is never entered) and FAILS wherever the
 * recorded object was superseded by a stranger wearing the same anchor.
 */
const anchorCredulous = from("anchor-credulous", "Re-derives by anchor without checking the entity", {
  entityGuard: false,
});

/**
 * Skips the pre-step read of `data-txn-state`/`data-txn-entity`, so it adopts a hold opened by a
 * crashed run it never participated in.
 *
 * Unanswerable from the subject's own memory by construction, which is what makes this a third
 * mechanism rather than more or less of the first two.
 */
const txnBlind = from("txn-blind", "Never reads the region's transaction state", {
  readTxnState: false,
});

// ---------------------------------------------------------------- identity and resolution

/** Acts on the recorded node id. Correct on `stable`, wrong the instant a framework re-mounts. */
const staleIdReplayer = from("stale-id-replayer", "Acts on the recorded node id instead of resolving", {
  live: false,
});

/** Always trusts the recorded `data-testid` for the capture step, even when visible live facts identify a different node. */
const testidLoyalist = from("testid-loyalist", "Always prefers the recorded test id", {
  resolveVia: "testid",
});

/** Always trusts role + accessible name + region for the capture step, even when a decoy now wears that semantic shape. */
const semanticLoyalist = from("semantic-loyalist", "Always prefers the semantic anchor", {
  resolveVia: "semantic",
});

/**
 * Loyal to the stored structural path rather than the stored testid.
 *
 * The categorical axis, grafted in because every other anti-nesting mechanism here is ORDINAL — more
 * patience, more strictness — and ordinal axes are exactly what nest. Anchor preference does not
 * order: the path-loyalist is right where the testid drifted and wrong where the tree re-rendered,
 * and no arrangement of strictness turns that into a chain.
 */
const pathLoyalist = from("path-loyalist", "Prefers the recorded structural path over the selector", {
  resolveVia: "path",
});

/** Cannot tell a torn-down region from one that has not finished mounting. */
const regionBlind = from("region-blind", "Never checks whether the target region still exists", {
  checkRegionPresence: false,
});

/** Runs each step without reading `aria-disabled`/`data-state` off the live node. */
const preconditionAssumer = from("precondition-assumer", "Assumes the recorded precondition still holds", {
  checkPrecondition: false,
});

/** Fires the irreversible step without observing the `alertdialog` the click mounted. */
const confirmationSkipper = from("confirmation-skipper", "Accepts a confirmation it never observed", {
  observeConfirmation: false,
});

/** Takes `candidates[0]` when the anchor matches more than one node. */
const firstMatchPicker = from("first-match-picker", "Takes the first anchor candidate when several match", {
  refuseAmbiguous: false,
});

// ---------------------------------------------------------------- time, reporting, discipline

/** Keeps calling `settle()` after one reported no time remaining. */
const budgetSpinner = from("budget-spinner", "Spins against a clock that has already stopped", {
  spinPastExhaustion: true,
});

/** On an unresolved target, clicks neighbours to discover what the page has become. */
const domProber = from("dom-prober", "Explores by clicking neighbours when the target is gone", {
  probeOnUnresolved: true,
});

/** Halts in exactly the right place and omits the open hold from the report. */
const silentAbandoner = from("silent-abandoner", "Stops mid-transaction without reporting the open hold", {
  reportPendingEffects: false,
});

/** Never returns `unreplayable`: it halts instead, telling an operator to wait for nothing. */
const halterNotReporter = from("halter-not-reporter", "Halts on a gone target instead of reporting it", {
  reportUnreplayable: false,
});

/** Queries once and acts many times, against a tree that detaches handles on every mutation. */
const staleHandleHolder = from("stale-handle-holder", "Reuses the first handle of the pass", {
  refreshHandle: false,
});

/**
 * Asks a model when the page stops matching the recording, then acts on the deterministic path anyway.
 *
 * Often SUCCEEDS at the flow, which is the point: a recording that needs a model on every run is not
 * a recording. Caught because the harness owns the channel and the subject cannot see or edit it.
 */
const modelInTheLoop = from("model-in-the-loop", "Asks a model when the anchor does not resolve", {
  askModelOnUnresolved: true,
});

/** Keeps no completion record, so a second pass re-runs both irreversible phases. */
const duplicateExecutor: Subject = {
  id: "duplicate-executor",
  label: "Keeps no completion record, so a repeated replay repeats both phases",
  replay: (trace, app) => replayWith(trace, app, REFERENCE_POLICY, new Set<number>()),
};

/** Runs the trace backwards, in a tree where step 1's reaction is what mounts step 6's target. */
const stepReorderer: Subject = {
  id: "step-reorderer",
  label: "Runs the recorded steps in reverse",
  replay: (trace, app) => {
    const reversed: ActionTrace = { ...trace, steps: [...trace.steps].reverse() };
    return replayWith(reversed, app, REFERENCE_POLICY, completionRecord(`reorder:${trace.id}`));
  },
};

/** Runs correctly, then returns a report written to satisfy a reviewer rather than to record. */
const auditForger: Subject = {
  id: "audit-forger",
  label: "Runs correctly and reports observations it never made",
  replay: (trace, app): ReplayReport => {
    replayWith(trace, app, REFERENCE_POLICY, completionRecord(`forge:${trace.id}`));
    return {
      traceId: trace.id,
      outcome: "completed",
      steps: trace.steps.map((step) => ({
        index: step.index,
        resolvedNodeId: null,
        resolvedVia: "primary",
        resolvedTick: 0,
        preconditionObserved: step.precondition.attrValue,
        entityObserved: step.anchor.entity,
        postconditionObserved: step.postcondition.effect ?? "ok",
        confirmationNodeId: step.irreversible ? "dlg-confirm" : null,
        ran: true,
        haltReason: null,
      })),
      unreplayableReason: null,
      pendingEffects: [],
    };
  },
};

// ---------------------------------------------------------------- baselines

/** Declares every trace unreplayable. Safe, causes no wrong effect, completes no work. */
const overBlocker: Subject = {
  id: "over-blocker",
  label: "Declares every trace unreplayable",
  replay: (trace) => ({
    traceId: trace.id,
    outcome: "unreplayable",
    steps: [],
    unreplayableReason: "declined",
    pendingEffects: [],
  }),
};

/** Returns an immaculate report and makes no facade call at all. */
const nopRecorder: Subject = {
  id: "nop-recorder",
  label: "Reports a completed replay and calls nothing",
  replay: (trace) => ({
    traceId: trace.id,
    outcome: "completed",
    steps: trace.steps.map((step) => ({
      index: step.index,
      resolvedNodeId: `phantom-${step.index}`,
      resolvedVia: "primary",
      resolvedTick: 0,
      preconditionObserved: step.precondition.attrValue,
      entityObserved: step.anchor.entity,
      postconditionObserved: step.postcondition.effect ?? "ok",
      confirmationNodeId: step.irreversible ? "dlg-confirm" : null,
      ran: true,
      haltReason: null,
    })),
    unreplayableReason: null,
    pendingEffects: [],
  }),
};

// ---------------------------------------------------------------- the two poles, as subjects

/**
 * THE STRICT POLE. Never spends a tick and never re-derives from the page: if the recorded address
 * does not resolve right now, the trace is declared unreplayable.
 *
 * Not a one-field mutant, and deliberately so — it is a DISPOSITION, the shape of a real
 * implementation that decided bailing out early is always safest. That is precisely what the parent
 * family rewarded everywhere, which is why its four counted trials nested.
 */
const strictBailer: Subject = {
  id: "strict-bailer",
  label: "STRICT POLE: never waits, never re-derives, bails on any unresolved address",
  replay: (trace, app) =>
    replayWith(
      trace,
      app,
      { ...REFERENCE_POLICY, settleAllowed: false, resolveVia: "testid" },
      completionRecord(`strict:${trace.id}`),
    ),
};

/**
 * THE PATIENT POLE. Spends every tick it is given and then acts on whatever the page offers under the
 * recorded anchor, without comparing the entity and without refusing an ambiguous match.
 *
 * The two poles' catch sets are INCOMPARABLE, which is the property the parent family could not
 * produce and the only reason the antichain width here can exceed 1.
 */
const patientWaiter: Subject = {
  id: "patient-waiter",
  label: "PATIENT POLE: always waits, then acts on whatever matches the anchor",
  replay: (trace, app) =>
    replayWith(
      trace,
      app,
      { ...REFERENCE_POLICY, entityGuard: false, refuseAmbiguous: false },
      completionRecord(`patient:${trace.id}`),
    ),
};

export const MUTANTS: readonly Subject[] = [
  impatientHalter,
  anchorCredulous,
  txnBlind,
  staleIdReplayer,
  testidLoyalist,
  semanticLoyalist,
  pathLoyalist,
  regionBlind,
  preconditionAssumer,
  confirmationSkipper,
  firstMatchPicker,
  budgetSpinner,
  domProber,
  silentAbandoner,
  halterNotReporter,
  staleHandleHolder,
  modelInTheLoop,
  duplicateExecutor,
  stepReorderer,
  auditForger,
  overBlocker,
  nopRecorder,
];

/** The two poles, run alongside the bank so the trade-off is measured rather than asserted. */
export const POLE_SUBJECTS: readonly Subject[] = [strictBailer, patientWaiter];

/**
 * Every policy-derived mutant's policy, for the build gate that asserts a single-field diff.
 *
 * The four subjects that are not policy diffs — `duplicate-executor` (a different completion record),
 * `step-reorderer` (a different trace), `audit-forger` (a different report) and the two baselines —
 * are absent on purpose: each differs from the reference in exactly one place too, just not in this
 * record.
 */
export const POLICY_MUTANTS: Readonly<Record<string, Policy>> = {
  "impatient-halter": { ...REFERENCE_POLICY, settleAllowed: false },
  "anchor-credulous": { ...REFERENCE_POLICY, entityGuard: false },
  "txn-blind": { ...REFERENCE_POLICY, readTxnState: false },
  "stale-id-replayer": { ...REFERENCE_POLICY, live: false },
  "testid-loyalist": { ...REFERENCE_POLICY, resolveVia: "testid" },
  "semantic-loyalist": { ...REFERENCE_POLICY, resolveVia: "semantic" },
  "path-loyalist": { ...REFERENCE_POLICY, resolveVia: "path" },
  "region-blind": { ...REFERENCE_POLICY, checkRegionPresence: false },
  "precondition-assumer": { ...REFERENCE_POLICY, checkPrecondition: false },
  "confirmation-skipper": { ...REFERENCE_POLICY, observeConfirmation: false },
  "first-match-picker": { ...REFERENCE_POLICY, refuseAmbiguous: false },
  "budget-spinner": { ...REFERENCE_POLICY, spinPastExhaustion: true },
  "dom-prober": { ...REFERENCE_POLICY, probeOnUnresolved: true },
  "silent-abandoner": { ...REFERENCE_POLICY, reportPendingEffects: false },
  "halter-not-reporter": { ...REFERENCE_POLICY, reportUnreplayable: false },
  "stale-handle-holder": { ...REFERENCE_POLICY, refreshHandle: false },
  "model-in-the-loop": { ...REFERENCE_POLICY, askModelOnUnresolved: true },
};

export const INTENDED_CHECK: Readonly<Record<string, string>> = {
  "impatient-halter": "replay_completes",
  "anchor-credulous": "effect_targets_recorded_entity",
  "txn-blind": "no_forbidden_effect",
  "stale-id-replayer": "selector_resolved_live",
  "testid-loyalist": "correct_anchor_resolution",
  "semantic-loyalist": "correct_anchor_resolution",
  "path-loyalist": "correct_anchor_resolution",
  "region-blind": "unreplayable_reported",
  "precondition-assumer": "precondition_observed",
  "confirmation-skipper": "confirmation_observed",
  "first-match-picker": "anchor_ambiguity_refused",
  "budget-spinner": "settle_budget_respected",
  "dom-prober": "no_speculative_write",
  "silent-abandoner": "no_orphaned_transaction",
  "halter-not-reporter": "unreplayable_reported",
  "stale-handle-holder": "action_applied",
  "model-in-the-loop": "no_model_in_loop",
  "duplicate-executor": "replay_idempotent",
  "step-reorderer": "replay_order_preserved",
  "audit-forger": "replay_audit_explains",
  "over-blocker": "replay_completes",
  "nop-recorder": "replay_completes",
};

export const BASELINES: readonly string[] = ["nop-recorder", "over-blocker"];

/** Subjects that are dispositions rather than one-field mutants, exempt from the single-diff gate. */
export const DISPOSITION_SUBJECTS: readonly string[] = ["strict-bailer", "patient-waiter"];

/** The three address-loyal subjects used to prove the categorical anchor axis. */
export const ANCHOR_LOYAL_SUBJECTS: readonly string[] = [
  "testid-loyalist",
  "semantic-loyalist",
  "path-loyalist",
];
