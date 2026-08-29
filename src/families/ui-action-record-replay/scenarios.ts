// The declared space and the generator.
//
// Every mutation kind the hidden suite uses is in `SPACE.mutation`, which is the fairness contract:
// no replay failure depends on a change the author could not have anticipated. The tree is a pure
// function of the seed — no wall clock, no randomness the subject cannot see — so a scenario is
// reproducible from its id alone.

import { assertKnobCoverage, sampleSpace } from "../../foundry/sample.js";
import type { Scenario, ScenarioParams } from "./truth.js";
import type { ActionTrace, RecordedStep, Selector, UiNode } from "./types.js";

export const SPACE = {
  seed: [11, 23, 41],
  mutation: ["none", "attribute_renamed", "node_reordered", "node_wrapped", "text_changed", "node_removed"],
  mutationDepth: [0, 2, 4],
  confirmation: ["absent", "present", "suppressed"],
  asyncSettled: [true, false],
  replayCount: [1, 2],
} as const;

export function enumerateSpace(): readonly ScenarioParams[] {
  const out: ScenarioParams[] = [];
  for (const seed of SPACE.seed) {
    for (const mutation of SPACE.mutation) {
      for (const mutationDepth of SPACE.mutationDepth) {
        for (const confirmation of SPACE.confirmation) {
          for (const asyncSettled of SPACE.asyncSettled) {
            for (const replayCount of SPACE.replayCount) {
              out.push({ seed, mutation, mutationDepth, confirmation, asyncSettled, replayCount });
            }
          }
        }
      }
    }
  }
  return out;
}

/**
 * The measured subset: grouped by (mutation, depth), sampled by content hash within each group.
 *
 * It used to be a stride of two, which froze `replayCount` at 1 — that knob is innermost and binary,
 * so the idempotency mutant could never fail and reported as catching nothing. See
 * `foundry/sample.ts` for the general form of the mistake.
 */
export function selectMeasuredSet(space: readonly ScenarioParams[]): readonly ScenarioParams[] {
  const selected = sampleSpace(space, {
    keyOf: (p) =>
      `${p.mutation}|${p.mutationDepth}|${p.confirmation}|${p.asyncSettled}|${p.replayCount}|${p.seed}`,
    groupOf: (p) => `${p.mutation}/${p.mutationDepth}`,
    fraction: 1 / 2,
  });
  assertKnobCoverage(
    selected,
    SPACE,
    (p, knob) => (p as unknown as Record<string, unknown>)[knob],
    "ui-action-record-replay.space",
  );
  return selected;
}

const node = (
  id: string,
  role: string,
  attrs: Record<string, string>,
  text: string,
  children: UiNode[] = [],
): UiNode => ({ id, role, attrs, text, children });

/** A five-step checkout flow. Small enough to read, deep enough for `mutationDepth` to matter. */
function buildTree(seed: number, asyncRegion: boolean, confirmation: ScenarioParams["confirmation"]): UiNode {
  return node("root", "document", {}, "", [
    node("nav", "navigation", { "data-testid": "nav" }, "Home", []),
    node("form", "form", { "data-testid": "checkout" }, "", [
      node("qty", "textbox", { "data-testid": "qty", "data-state": "editable" }, `${seed % 5}`, []),
      node("addr", "textbox", { "data-testid": "addr", "data-state": "editable" }, "12 Example St", []),
      node(
        asyncRegion ? "async-total" : "total",
        "status",
        { "data-testid": asyncRegion ? "async-total" : "total", "data-state": "ready" },
        "42.00",
        [],
      ),
      node("review", "button", { "data-testid": "review", "data-state": "enabled" }, "Review", []),
      node(
        "pay",
        "button",
        {
          "data-testid": "pay",
          "data-state": "enabled",
          "data-effect": "payment",
          // Declared in the tree, so "this flow confirms" is readable rather than guessable. Absent
          // means there is no dialog in this flow; present-but-not-shown is `suppressed`, and the
          // difference between those two is the whole point of the knob.
          ...(confirmation === "absent" ? {} : { "data-opens-confirmation": "true" }),
        },
        "Pay now",
        [],
      ),
    ]),
  ]);
}

const STEP_TARGETS: readonly { testid: string; kind: RecordedStep["kind"]; irreversible: boolean }[] = [
  { testid: "qty", kind: "type", irreversible: false },
  { testid: "addr", kind: "type", irreversible: false },
  { testid: "total", kind: "click", irreversible: false },
  { testid: "review", kind: "click", irreversible: false },
  { testid: "pay", kind: "submit", irreversible: true },
];

const selectorFor = (testid: string): Selector => ({ kind: "testid", value: testid, qualifier: null });

const allNodes = (n: UiNode): readonly UiNode[] => n.children.flatMap((c) => [c, ...allNodes(c)]);

function buildTrace(id: string, asyncRegion: boolean, tree: UiNode): ActionTrace {
  const idFor = (testid: string): string => {
    const found = [tree, ...allNodes(tree)].find((n) => n.attrs["data-testid"] === testid);
    return found?.id ?? testid;
  };
  return {
    id,
    steps: STEP_TARGETS.map((t, index): RecordedStep => {
      const testid = t.testid === "total" && asyncRegion ? "async-total" : t.testid;
      return {
        index,
        kind: t.kind,
        selector: selectorFor(testid),
        recordedNodeId: idFor(testid),
        value: t.kind === "type" ? `${testid}-value` : null,
        precondition: {
          nodeExists: true,
          attr: "data-state",
          attrValue: t.kind === "type" ? "editable" : t.testid === "total" ? "ready" : "enabled",
        },
        postcondition: {
          effect: t.irreversible ? "payment" : null,
          attr: null,
          attrValue: null,
        },
        irreversible: t.irreversible,
      };
    }),
  };
}

/** Apply the declared mutation to the tree at the declared depth. */
function mutate(tree: UiNode, params: ScenarioParams): UiNode {
  const target = STEP_TARGETS[Math.min(params.mutationDepth, STEP_TARGETS.length - 1)];
  if (target === undefined || params.mutation === "none") return tree;
  const testid = target.testid === "total" && !params.asyncSettled ? "async-total" : target.testid;

  const transform = (n: UiNode): UiNode | null => {
    if (n.attrs["data-testid"] === testid) {
      switch (params.mutation) {
        case "attribute_renamed": {
          const { "data-testid": _dropped, ...rest } = n.attrs;
          return { ...n, attrs: { ...rest, "data-qa": testid } };
        }
        case "text_changed":
          return { ...n, text: `${n.text} (updated)` };
        case "node_wrapped":
          // The wrapped node is re-created, so it gets a NEW id. That is what a framework remount
          // does, and it is what makes replaying against a recorded node id stale rather than merely
          // inelegant. The selector still resolves; the stored id does not.
          return node(`${n.id}-wrapper`, "group", {}, "", [{ ...n, id: `${n.id}-remounted` }]);
        case "node_removed":
          return null;
        default:
          return n;
      }
    }
    const children = n.children.map(transform).filter((c): c is UiNode => c !== null);
    const reordered =
      params.mutation === "node_reordered" && children.some((c) => c.attrs["data-testid"] === testid)
        ? [...children].reverse()
        : children;
    return { ...n, children: reordered };
  };
  return transform(tree) ?? tree;
}

export function buildScenario(params: ScenarioParams): Scenario {
  const id = `ui-${params.mutation}-d${params.mutationDepth}-${params.confirmation}-${params.asyncSettled ? "settled" : "pending"}-r${params.replayCount}-${params.seed}`;
  const asyncRegion = !params.asyncSettled;
  const recordedTree = buildTree(params.seed, asyncRegion, params.confirmation);
  const liveTree = mutate(recordedTree, params);
  const trace = buildTrace(id, asyncRegion, recordedTree);

  // What a correct replayer achieves. `node_removed` is unreplayable by construction; an unsettled
  // async region halts; a suppressed confirmation on the irreversible step halts before the payment.
  // A trace whose selector can no longer find its target must be re-recorded, whether the node is
  // gone or merely renamed: both are `unreplayable`, and that is a different operational answer from
  // `halted`, which means the page is in the wrong state right now and may be right later.
  const unrecoverable = params.mutation === "node_removed" || params.mutation === "attribute_renamed";
  const asyncBlocks = !params.asyncSettled;
  const suppressedOnPay = params.confirmation === "suppressed";

  const expectedOutcome: Scenario["expectedOutcome"] = unrecoverable
    ? "unreplayable"
    : asyncBlocks || suppressedOnPay
      ? "halted"
      : "completed";

  return {
    id,
    params,
    recordedTree,
    liveTree,
    trace,
    expectedOutcome,
    expectedEffects: expectedOutcome === "completed" ? ["payment"] : [],
  };
}

export const generateScenarios = (params: readonly ScenarioParams[]): readonly Scenario[] =>
  params.map(buildScenario);
