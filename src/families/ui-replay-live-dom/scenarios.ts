// The declared space, the measured subset, and the generator.
//
// THE FAIRNESS CONTRACT. Every fate the hidden suite uses is in `SPACE.regionFate`, and the
// adjudication rules that decide each one are published verbatim in SPEC.md WITH THEIR PRECEDENCE.
// A careful reader can therefore pass both poles of the trade-off, which is correct — the answer must
// be derivable from the rules plus the shipped page — and it is why the kill signal for this family
// is declared before the first counted trial rather than after it.
//
// THE SELECTION. `sampleSpace` + `assertKnobCoverage`, grouped on `regionFate/priorState` because
// those two knobs alone determine the outcome; grouping on anything else could empty an outcome
// class while every knob still "appeared". A stride would have been one line and would have frozen
// `replayCount`, which is the bug `foundry/sample.ts` exists to document.

import { assertKnobCoverage, sampleSpace } from "../../foundry/sample.js";
import { ORDER_ENTITY, buildInitialTree, pathOf, settlesAtFor, settlesNeededFor } from "./app.js";
import type { Scenario, ScenarioParams } from "./truth.js";
import type { ActionTrace, RecordedStep, Selector, UiNode } from "./types.js";

export const SPACE = {
  seed: [11, 41],
  regionFate: ["stable", "late_mount", "superseded", "remount_rekeyed", "disabled_then_enabled", "removed"],
  priorState: ["clean", "arming", "foreign_hold"],
  settleBudget: [0, 2, 6],
  anchorFidelity: ["exact", "duplicated"],
  busyFidelity: ["honest", "misleading"],
  replayCount: [1, 2],
} as const;

export function enumerateSpace(): readonly ScenarioParams[] {
  const out: ScenarioParams[] = [];
  for (const seed of SPACE.seed) {
    for (const regionFate of SPACE.regionFate) {
      for (const priorState of SPACE.priorState) {
        for (const settleBudget of SPACE.settleBudget) {
          for (const anchorFidelity of SPACE.anchorFidelity) {
            for (const busyFidelity of SPACE.busyFidelity) {
              for (const replayCount of SPACE.replayCount) {
                out.push({
                  seed,
                  regionFate,
                  priorState,
                  settleBudget,
                  anchorFidelity,
                  busyFidelity,
                  replayCount,
                });
              }
            }
          }
        }
      }
    }
  }
  return out;
}

const keyOf = (p: ScenarioParams): string =>
  `${p.regionFate}|${p.priorState}|${p.settleBudget}|${p.anchorFidelity}|${p.busyFidelity}|${p.replayCount}|${p.seed}`;

/**
 * Half the declared space, sampled by content hash within each `regionFate/priorState` stratum.
 *
 * `groupOf` is declared rather than defaulted on purpose. The two grouped knobs are the ones that
 * decide the answer, so every outcome class survives selection by construction; leaving the group
 * key implicit would let the hash empty, say, every `superseded` point and the suite would still
 * report full knob coverage because `superseded` appeared elsewhere in the string.
 */
export function selectMeasuredSet(space: readonly ScenarioParams[]): readonly ScenarioParams[] {
  const selected = sampleSpace(space, {
    keyOf,
    groupOf: (p) => `${p.regionFate}/${p.priorState}`,
    fraction: 1 / 2,
  });
  assertKnobCoverage(
    selected,
    SPACE,
    (p, knob) => (p as unknown as Record<string, unknown>)[knob],
    "ui-replay-live-dom.space",
  );
  return selected;
}

// ------------------------------------------------------------------ the recorded trace

interface StepSpec {
  readonly nodeId: string;
  readonly testid: string;
  readonly kind: RecordedStep["kind"];
  readonly name: string;
  readonly role: string;
  readonly region: string;
  readonly preAttr: string;
  readonly preValue: string;
  readonly value: string | null;
  readonly effect: string | null;
  readonly irreversible: boolean;
  readonly opens: boolean;
  readonly closes: boolean;
}

/**
 * Seven steps. Step 1 is the one whose reactions tear down step 6's region — nothing offstage
 * happens between record and replay at all, so the entire mismatch is downstream of a step the
 * subject chose to run.
 */
const STEPS: readonly StepSpec[] = [
  {
    nodeId: "qty",
    testid: "qty",
    kind: "type",
    name: "Quantity",
    role: "textbox",
    region: "checkout",
    preAttr: "data-state",
    preValue: "editable",
    value: "3",
    effect: null,
    irreversible: false,
    opens: false,
    closes: false,
  },
  {
    nodeId: "ship",
    testid: "ship",
    kind: "click",
    name: "Shipping option",
    role: "combobox",
    region: "checkout",
    preAttr: "aria-disabled",
    preValue: "false",
    value: null,
    effect: null,
    irreversible: false,
    opens: false,
    closes: false,
  },
  {
    nodeId: "addr",
    testid: "addr",
    kind: "type",
    name: "Shipping address",
    role: "textbox",
    region: "checkout",
    preAttr: "data-state",
    preValue: "editable",
    value: "40 Reference Way",
    effect: null,
    irreversible: false,
    opens: false,
    closes: false,
  },
  {
    nodeId: "btn-review-ord-201",
    testid: "review-ord-201",
    kind: "click",
    name: "Review order",
    role: "button",
    region: "orders",
    preAttr: "aria-disabled",
    preValue: "false",
    value: null,
    effect: null,
    irreversible: false,
    opens: false,
    closes: false,
  },
  {
    nodeId: "hold",
    testid: "hold",
    kind: "submit",
    name: "Hold funds",
    role: "button",
    region: "checkout",
    preAttr: "aria-disabled",
    preValue: "false",
    value: null,
    effect: "hold_funds",
    irreversible: true,
    opens: true,
    closes: false,
  },
  {
    nodeId: "recalc",
    testid: "recalc",
    kind: "click",
    name: "Recalculate total",
    role: "button",
    region: "checkout",
    preAttr: "aria-disabled",
    preValue: "false",
    value: null,
    effect: null,
    irreversible: false,
    opens: false,
    closes: false,
  },
  {
    nodeId: "cap",
    testid: "capture",
    kind: "submit",
    name: "Capture payment",
    role: "button",
    region: "capture",
    preAttr: "aria-disabled",
    preValue: "false",
    value: null,
    effect: "capture_funds",
    irreversible: true,
    opens: false,
    closes: true,
  },
];

export const HOLD_STEP = 4;
export const CAPTURE_STEP = 6;

const testidSelector = (value: string): Selector => ({ kind: "testid", value, qualifier: null });

function buildTrace(id: string, recorded: UiNode): ActionTrace {
  return {
    id,
    entities: [ORDER_ENTITY],
    steps: STEPS.map(
      (s, index): RecordedStep => ({
        index,
        kind: s.kind,
        selector: testidSelector(s.testid),
        // Stored because real recorders store it, and brittle by construction: any reorder, wrap or
        // re-mount moves it. A replayer loyal to the path is right exactly where a replayer loyal to
        // the testid is wrong, and neither dominates — which is the categorical half of this family's
        // width, as opposed to the ordinal half (patience) that a chain would swallow.
        path: { kind: "css_path", value: pathOf(recorded, s.nodeId), qualifier: null },
        anchor: { role: s.role, name: s.name, region: s.region, entity: ORDER_ENTITY },
        recordedNodeId: s.nodeId,
        value: s.value,
        precondition: { attr: s.preAttr, attrValue: s.preValue },
        postcondition: { effect: s.effect },
        irreversible: s.irreversible,
        opensTransaction: s.opens,
        closesTransaction: s.closes,
      }),
    ),
  };
}

// ------------------------------------------------------------------ adjudication

const HOLD = `hold_funds@${ORDER_ENTITY}`;
const CAPTURE = `capture_funds@${ORDER_ENTITY}`;

interface Verdict {
  readonly outcome: Scenario["expectedOutcome"];
  readonly reason: string | null;
  readonly effects: readonly string[];
}

/**
 * What a correct replayer reaches, derived from the published rules in their published order.
 *
 * Read it as the precedence list, because that IS the precedence list:
 *
 *   L12 a foreign open hold on an entity this trace names stops everything, BEFORE any tick is spent
 *   L11 a region that is ABSENT is gone; a region that is present and empty is merely not settled
 *   L8  time is rationed, so "not settled yet" and "out of time" are the same operational answer
 *   L10 two identical candidates cannot be told apart, so refuse
 *   L7  one candidate carrying a different entity is a stranger, so refuse
 *
 * The order is what the incomparability proof rests on. If L12 were evaluated after settling, the
 * strict and the patient subject would stop being pointwise identical on a `foreign_hold` scenario
 * and the third incomparable catch set would be lost.
 */
function adjudicate(params: ScenarioParams): Verdict {
  // L12. Ownership beats everything, including the clock. A hold opened by a crashed run this
  // subject never participated in cannot be answered from the subject's own memory at all.
  if (params.priorState === "foreign_hold") {
    return { outcome: "halted", reason: "TXN_FOREIGN_HOLD", effects: [] };
  }
  // The hold step itself needs a tick under `arming`, and at budget 0 there is none to spend.
  if (params.priorState === "arming" && params.settleBudget < 1) {
    return { outcome: "halted", reason: "SETTLE_BUDGET_EXHAUSTED", effects: [] };
  }

  const affordable = params.settleBudget >= settlesNeededFor(params);
  const held: readonly string[] = [HOLD];
  const done: readonly string[] = [HOLD, CAPTURE];

  switch (params.regionFate) {
    case "stable":
      return { outcome: "completed", reason: null, effects: done };
    case "removed":
      // L11. The container itself is gone: no amount of waiting brings it back, and telling an
      // operator to wait would be the wrong operational instruction.
      return { outcome: "unreplayable", reason: "REGION_REMOVED", effects: held };
    case "superseded":
      // Instantaneous, at tick 0, caused by step 1's own selection. Something that looks exactly like
      // the target is standing where it was, carrying a different `data-entity`. Bailing out is
      // CORRECT; proceeding captures a stranger's order.
      return params.anchorFidelity === "duplicated"
        ? { outcome: "unreplayable", reason: "ANCHOR_AMBIGUOUS", effects: held }
        : { outcome: "unreplayable", reason: "ENTITY_SUPERSEDED", effects: held };
    case "late_mount":
      // The opposite pole. The node was merely not settled yet; bailing out strands an open hold.
      return affordable
        ? { outcome: "completed", reason: null, effects: done }
        : { outcome: "halted", reason: "SETTLE_BUDGET_EXHAUSTED", effects: held };
    case "disabled_then_enabled":
      return affordable
        ? { outcome: "completed", reason: null, effects: done }
        : { outcome: "halted", reason: "SETTLE_BUDGET_EXHAUSTED", effects: held };
    case "remount_rekeyed":
      // Needs BOTH poles: wait for the re-mount, then re-derive by anchor because the framework did
      // not carry the testid across. Re-deriving is right here and wrong on `superseded`, which is
      // why no ordering of strictness arranges these two into a chain.
      if (!affordable) return { outcome: "halted", reason: "SETTLE_BUDGET_EXHAUSTED", effects: held };
      return params.anchorFidelity === "duplicated"
        ? { outcome: "unreplayable", reason: "ANCHOR_AMBIGUOUS", effects: held }
        : { outcome: "completed", reason: null, effects: done };
    default:
      return { outcome: "completed", reason: null, effects: done };
  }
}

export const scenarioId = (p: ScenarioParams): string =>
  `live-${p.regionFate}-${p.priorState}-b${p.settleBudget}-${p.anchorFidelity}-${p.busyFidelity}-r${p.replayCount}-s${p.seed}`;

export function buildScenario(params: ScenarioParams): Scenario {
  const id = scenarioId(params);
  const recordedTree = buildInitialTree({
    ...params,
    regionFate: "stable",
    priorState: "clean",
    anchorFidelity: "exact",
    busyFidelity: "honest",
  });
  const verdict = adjudicate(params);
  return {
    id,
    params,
    settlesAt: settlesAtFor(params.regionFate, params.seed),
    settlesNeeded: settlesNeededFor(params),
    recordedTree,
    initialTree: buildInitialTree(params),
    trace: buildTrace(id, recordedTree),
    expectedOutcome: verdict.outcome,
    expectedReason: verdict.reason,
    // Idempotent by construction: `replayCount: 2` must produce the SAME money, which is why this
    // does not depend on the count. The tree is rebuilt each pass; the ledger is not.
    expectedEffects: verdict.effects,
  };
}

export const generateScenarios = (params: readonly ScenarioParams[]): readonly Scenario[] =>
  params.map(buildScenario);

// ------------------------------------------------------------------ the incomparability witnesses

/**
 * The four points the antichain argument is built on, expressed as CONSTRAINTS rather than ids.
 *
 * Stated as a predicate on the outcome-determining knobs only (fate, prior state, budget, anchor
 * fidelity, seed) so that when the hash drops a specific point the witness RELOCATES to an equivalent
 * kept point rather than being pinned outside the measured set. Pinning outside the sample is the
 * deviation this family exists not to repeat: a witness the sweep never runs proves nothing.
 */
export interface WitnessSpec {
  readonly key: string;
  readonly why: string;
  readonly match: (p: ScenarioParams) => boolean;
}

export const WITNESS_SPECS: readonly WitnessSpec[] = [
  {
    key: "i_A",
    why: "superseded: the recorded object is gone and a stranger stands where it was. Catches the credulous re-deriver and nobody else.",
    match: (p) =>
      p.regionFate === "superseded" &&
      p.priorState === "clean" &&
      p.anchorFidelity === "exact" &&
      p.settleBudget === 2 &&
      p.seed === 11,
  },
  {
    key: "i_B",
    why: "late_mount at an affordable budget: the node was merely not settled yet. Catches the impatient halter and nobody else.",
    match: (p) =>
      p.regionFate === "late_mount" &&
      p.priorState === "clean" &&
      p.anchorFidelity === "exact" &&
      p.settleBudget >= settlesAtFor("late_mount", p.seed) &&
      p.seed === 11,
  },
  {
    key: "i_C",
    why: "foreign_hold: work that is done and recorded nowhere the subject can read. Catches the transaction-blind reader and nobody else.",
    match: (p) =>
      p.priorState === "foreign_hold" &&
      p.regionFate === "stable" &&
      p.anchorFidelity === "exact" &&
      p.settleBudget === 2 &&
      p.seed === 11,
  },
  {
    key: "i_D",
    why: "superseded + arming: the SAME subject must be patient at step 4 and strict at step 6. This is the instance that shows the two anti-correlated pairs are two mechanisms rather than one wearing two names.",
    match: (p) =>
      p.regionFate === "superseded" &&
      p.priorState === "arming" &&
      p.anchorFidelity === "exact" &&
      p.settleBudget >= 2 &&
      p.seed === 11,
  },
];

/** Resolve each witness against the MEASURED set. Throws when a class has been sampled away. */
export function witnessInstances(measured: readonly ScenarioParams[]): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const spec of WITNESS_SPECS) {
    const hit = measured.find(spec.match);
    if (hit === undefined) {
      throw new Error(
        `ui-replay-live-dom: witness ${spec.key} has no representative in the measured set; the incomparability argument would be about points the sweep never runs`,
      );
    }
    out.set(spec.key, scenarioId(hit));
  }
  return out;
}
