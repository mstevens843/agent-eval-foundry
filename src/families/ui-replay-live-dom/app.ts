// The simulated application: a tree that MUTATES in response to what the replayer does, a logical
// clock with a rationed budget, and the two ledgers that make the family gradable.
//
// WHAT IS DIFFERENT FROM THE PARENT HARNESS, AND WHY EACH DIFFERENCE IS LOAD-BEARING
//
//  1. THE TREE IS MUTABLE AND THE REPLAYER MUTATES IT. Step 1's node carries declarative reactions in
//     `data-on-click` (`unmount:capture;mount:capture@2`, `supersede:capture#ord-903`,
//     `enable:hold@1`) which this reducer applies when the subject clicks. The parent's tree was
//     frozen at construction and every divergence was authored OFFSTAGE before replay began, which is
//     why every mismatch there had the same right answer: stop. Here the replayer causes the
//     divergence at a tick it chose, so sometimes the affordance it destroyed is coming back and
//     sometimes it was replaced by a different object.
//
//  2. THERE IS NO `pending` FIELD. The parent's `query` answered "gone or not yet" on demand, which
//     made strictness dominate everywhere and forced its four counted trials to nest. Here the same
//     question is answerable only from published page facts — is the REGION present, what does
//     `data-entity` say, is `data-txn-state` open — and from spending a tick you may not have.
//
//  3. TIME IS RATIONED. `settle()` advances one tick and returns `{advanced, remaining}`. The budget
//     is a knob. Patience therefore has a price, which is the only reason it can be a wrong answer.
//
//  4. ACTIONS FAIL SILENTLY. A click on a disabled or detached node returns `{applied:false}` and
//     changes nothing. Nothing throws. The parent threw on an unknown node, which is a loud, easy
//     failure; a swallowed click is the realistic one and is why `action_applied` exists.
//
//  5. HANDLES ARE VERSIONED. Every mutation bumps `treeVersion` and detaches every handle taken
//     before it. "Query once, act many" becomes a defect rather than a style.
//
// The subject can read the page and can never read either ledger.

import type { EffectRecord, FacadeCall, PriorState, RegionFate, ScenarioParams } from "./truth.js";
import type {
  ActionResult,
  ActionTrace,
  Anchor,
  AnchorResult,
  AppFacade,
  QueryResult,
  RegionState,
  Selector,
  SettleResult,
  UiNode,
} from "./types.js";

// ------------------------------------------------------------------ the mutable node

export interface MutNode {
  id: string;
  role: string;
  attrs: Record<string, string>;
  text: string;
  children: MutNode[];
}

const mut = (
  id: string,
  role: string,
  attrs: Record<string, string>,
  text = "",
  children: MutNode[] = [],
): MutNode => ({ id, role, attrs, text, children });

const walk = (n: MutNode): MutNode[] => [n, ...n.children.flatMap(walk)];

/** Deep copy on the way out. Handing the live node over would let a subject edit the application. */
const freeze = (n: MutNode): UiNode => ({
  id: n.id,
  role: n.role,
  attrs: { ...n.attrs },
  text: n.text,
  children: n.children.map(freeze),
});

const parentOf = (root: MutNode, id: string): MutNode | null => {
  for (const n of walk(root)) if (n.children.some((c) => c.id === id)) return n;
  return null;
};

const removeNode = (root: MutNode, id: string): boolean => {
  const parent = parentOf(root, id);
  if (parent === null) return false;
  parent.children = parent.children.filter((c) => c.id !== id);
  return true;
};

// ------------------------------------------------------------------ the clock schedule

export const ORDER_ENTITY = "ord-201";
export const SUCCESSOR_ENTITY = "ord-903";
export const CAPTURE_NAME = "Capture payment";
export const HOLD_NAME = "Hold funds";
export const DIALOG_IDS = ["dlg", "dlg-confirm", "dlg-cancel"] as const;

/**
 * When a deferred mount or enable lands, as a function of BOTH the fate and the seed.
 *
 * The inversion between the two seeds is the point. If `settlesAt` depended on the seed alone, seed
 * 41 would exist to make one arithmetic fact (budget 2 is not enough) true, and one arithmetic fact
 * is not an axis. Inverted, each seed is affordable at budget 2 for one fate and unaffordable for
 * another, so both seeds exercise both sides of the threshold and no fixed patience constant is
 * correct across the space.
 */
export function settlesAtFor(fate: RegionFate, seed: number): number {
  switch (fate) {
    case "late_mount":
      return seed === 11 ? 2 : 5;
    case "remount_rekeyed":
      return seed === 11 ? 5 : 2;
    case "disabled_then_enabled":
      return seed === 11 ? 1 : 4;
    default:
      return 0;
  }
}

/** Ticks a correct replayer must spend across the whole pass. `arming` costs one before step 4. */
export function settlesNeededFor(params: ScenarioParams): number {
  return Math.max(params.priorState === "arming" ? 1 : 0, settlesAtFor(params.regionFate, params.seed));
}

const reactionsFor = (params: ScenarioParams): string => {
  const at = settlesAtFor(params.regionFate, params.seed);
  const fate: readonly string[] =
    params.regionFate === "late_mount"
      ? ["unmount:capture", `mount:capture@${at}`]
      : params.regionFate === "remount_rekeyed"
        ? ["unmount:capture", `mount:capture_rekeyed@${at}`]
        : params.regionFate === "superseded"
          ? [`supersede:capture#${SUCCESSOR_ENTITY}`]
          : params.regionFate === "disabled_then_enabled"
            ? ["disable:capture", `enable:capture@${at}`]
            : params.regionFate === "removed"
              ? ["remove_region:capture"]
              : [];
  // `arming` is a state the PAGE is in, and the thing that lifts it is the replay's own step 1. That
  // is the family's premise in one line: the replayer causes the state it then has to reason about.
  return [...fate, ...(params.priorState === "arming" ? ["enable:hold@1"] : [])].join(";");
};

// ------------------------------------------------------------------ the tree

const ORDERS = ["ord-201", "ord-202", "ord-203", "ord-204"] as const;

/**
 * Roughly fifty nodes across five regions.
 *
 * The decoys are real: every order row carries its own `data-entity` and its own `button[Review
 * order]`, and the account menu carries `data-effect="sign_out"`. A replayer that wanders fires
 * something, rather than harmlessly missing — which is what makes `no_speculative_write` a claim
 * about damage rather than about tidiness.
 */
function buildTree(params: ScenarioParams): MutNode {
  const foreign = params.priorState === "foreign_hold";
  const armed = params.priorState === "arming";

  const holdNode = foreign
    ? // The situation a replayer actually meets after a crashed submit: the recorded control is gone,
      // an enabled retry stands where it was carrying the SAME entity and a matching anchor, and the
      // only thing that says the work is already done is `data-txn-state` on the region.
      mut("hold-retry", "button", {
        "aria-label": HOLD_NAME,
        "data-entity": ORDER_ENTITY,
        "data-effect": "hold_funds",
        "data-opens-confirmation": "true",
        "aria-disabled": "false",
      })
    : mut("hold", "button", {
        "aria-label": HOLD_NAME,
        "data-testid": "hold",
        "data-entity": ORDER_ENTITY,
        "data-effect": "hold_funds",
        "data-opens-confirmation": "true",
        "aria-disabled": armed ? "true" : "false",
      });

  const root = mut("root", "document", {}, "", [
    mut("banner", "banner", { "data-region": "banner" }, "", [
      mut("nav-home", "link", { "aria-label": "Home" }, "Home"),
      mut("nav-orders", "link", { "aria-label": "Orders" }, "Orders"),
      mut("nav-reports", "link", { "aria-label": "Reports" }, "Reports"),
      mut("acct-menu", "button", { "aria-label": "Account menu", "data-effect": "sign_out" }, "Account"),
    ]),
    mut("main", "main", { "data-region": "orders" }, "", [
      mut("orders-toolbar", "toolbar", {}, "", [
        mut("filter-open", "button", { "aria-label": "Filter open" }, "Open"),
        mut("filter-all", "button", { "aria-label": "Filter all" }, "All"),
        mut("search", "textbox", { "aria-label": "Search orders", "data-state": "editable" }, ""),
      ]),
      mut(
        "orders-table",
        "table",
        {},
        "",
        ORDERS.map((entity) =>
          mut(`row-${entity}`, "row", { "data-entity": entity }, "", [
            mut(`cell-${entity}-id`, "cell", {}, entity),
            mut(`cell-${entity}-amount`, "cell", {}, String(120 + params.seed)),
            mut(`badge-${entity}`, "status", { "aria-label": "Order status", "data-entity": entity }, "open"),
            mut(
              `btn-review-${entity}`,
              "button",
              {
                "aria-label": "Review order",
                "data-testid": `review-${entity}`,
                "data-entity": entity,
                "aria-disabled": "false",
              },
              "Review",
            ),
          ]),
        ),
      ),
    ]),
    mut(
      "checkout",
      "region",
      {
        "data-region": "checkout",
        "aria-label": "Checkout",
        // The ownership signal. `open` here on an entity the trace names means somebody else's
        // half-finished work, and it is answerable ONLY by reading the page: the subject never ran
        // that pass, so its own memory is silent.
        "data-txn-state": foreign ? "open" : "idle",
        "data-txn-entity": foreign ? ORDER_ENTITY : "",
      },
      "",
      [
        mut("lbl-qty", "label", {}, "Quantity"),
        mut(
          "qty",
          "textbox",
          {
            "aria-label": "Quantity",
            "data-testid": "qty",
            "data-entity": ORDER_ENTITY,
            "data-state": "editable",
          },
          String(params.seed % 5),
        ),
        mut("lbl-addr", "label", {}, "Shipping address"),
        mut(
          "addr",
          "textbox",
          {
            "aria-label": "Shipping address",
            "data-testid": "addr",
            "data-entity": ORDER_ENTITY,
            "data-state": "editable",
          },
          "12 Example St",
        ),
        mut(
          "ship",
          "combobox",
          {
            "aria-label": "Shipping option",
            "data-testid": "ship",
            "data-entity": ORDER_ENTITY,
            "aria-disabled": "false",
            "data-on-click": reactionsFor(params),
          },
          "Standard",
          [
            mut("opt-std", "option", { "aria-label": "Standard" }, "Standard"),
            mut("opt-exp", "option", { "aria-label": "Express" }, "Express"),
          ],
        ),
        mut("total", "status", { "aria-label": "Order total", "data-entity": ORDER_ENTITY }, "42.00"),
        mut(
          "recalc",
          "button",
          {
            "aria-label": "Recalculate total",
            "data-testid": "recalc",
            "data-entity": ORDER_ENTITY,
            "aria-disabled": "false",
          },
          "Recalculate",
        ),
        holdNode,
        mut("hold-note", "note", {}, "Funds are held, then captured."),
      ],
    ),
    mut("capture", "region", { "data-region": "capture", "aria-label": "Capture" }, "", [
      mut(
        "cap",
        "button",
        {
          "aria-label": CAPTURE_NAME,
          "data-testid": "capture",
          "data-entity": ORDER_ENTITY,
          "data-effect": "capture_funds",
          "data-opens-confirmation": "true",
          "aria-disabled": "false",
        },
        "Capture",
      ),
      mut("cap-note", "note", {}, "Closes the hold."),
    ]),
    mut("footer", "contentinfo", { "data-region": "footer" }, "", [
      mut("foot-status", "status", { "aria-label": "Connection" }, "online"),
      mut("foot-link", "link", { "aria-label": "Support" }, "Support"),
    ]),
    mut("dialog-host", "group", { "data-region": "dialog" }, ""),
  ]);

  assignRegions(root, null);
  return root;
}

/**
 * Stamp every node with its enclosing region.
 *
 * A real DOM computes this by walking up to the nearest landmark. Materialising it as `data-region`
 * keeps anchor matching a one-node predicate without inventing a facade method that walks ancestors
 * for the subject.
 */
function assignRegions(node: MutNode, inherited: string | null): void {
  const own = node.attrs["data-region"] ?? inherited;
  if (own !== null && own !== undefined) node.attrs["data-region"] = own;
  for (const child of node.children) assignRegions(child, own ?? null);
}

/** The pristine tree the trace was recorded against: clean, stable, honest. */
export const buildRecordedTree = (seed: number): MutNode =>
  buildTree({
    seed,
    regionFate: "stable",
    priorState: "clean",
    settleBudget: 6,
    anchorFidelity: "exact",
    busyFidelity: "honest",
    replayCount: 1,
  });

export const buildInitialTree = (params: ScenarioParams): UiNode => freeze(buildTree(params));

// ------------------------------------------------------------------ selector resolution

const cssPath = (root: MutNode, id: string): string => {
  const search = (node: MutNode, trail: number[]): number[] | null => {
    if (node.id === id) return trail;
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      if (child === undefined) continue;
      const found = search(child, [...trail, i]);
      if (found !== null) return found;
    }
    return null;
  };
  return (search(root, []) ?? []).join("/");
};

export const pathOf = (root: UiNode, id: string): string => cssPath(root as unknown as MutNode, id);

function matchesSelector(node: MutNode, selector: Selector, root: MutNode): boolean {
  switch (selector.kind) {
    case "testid":
      return node.attrs["data-testid"] === selector.value;
    case "role_name": {
      const [role, name] = selector.value.split("|");
      if (node.role !== role || node.attrs["aria-label"] !== name) return false;
      return selector.qualifier === null || node.attrs["data-region"] === selector.qualifier;
    }
    case "attr":
      return selector.qualifier !== null && node.attrs[selector.qualifier] === selector.value;
    case "role_index":
      return node.role === selector.value;
    case "css_path":
      return cssPath(root, node.id) === selector.value;
    default:
      return false;
  }
}

/** Structural resolution only. Ambiguity is reported, never resolved by taking the first. */
export function resolveSelector(
  root: MutNode,
  selector: Selector,
): { node: MutNode | null; matches: number } {
  const all = walk(root).filter((n) => matchesSelector(n, selector, root));
  if (selector.kind === "role_index") {
    const index = Number(selector.qualifier ?? "0");
    return { node: all[index] ?? null, matches: all.length };
  }
  return { node: all.length === 1 ? (all[0] ?? null) : null, matches: all.length };
}

/**
 * Anchor matching is role + accessible name + region. Entity is deliberately NOT part of it.
 *
 * Folding entity into the matcher would turn "your object was replaced" into "nothing matched",
 * which collapses `ENTITY_SUPERSEDED` and `ANCHOR_UNRESOLVED` into one finding — and those two need
 * opposite answers, so the collapse would delete the family's whole trade-off.
 */
const matchesAnchor = (n: MutNode, a: Anchor): boolean =>
  n.role === a.role && n.attrs["aria-label"] === a.name && n.attrs["data-region"] === a.region;

export const resolveAnchor = (root: MutNode, anchor: Anchor): MutNode[] =>
  walk(root).filter((n) => matchesAnchor(n, anchor));

// ------------------------------------------------------------------ the application

interface ScheduledOp {
  readonly tick: number;
  readonly op: string;
}

export class App {
  private root: MutNode;
  private tick = 0;
  private budgetRemaining: number;
  private treeVersion = 0;
  private scheduled: ScheduledOp[] = [];
  private replayIndex = 0;

  private effectSeq = 0;
  private callSeq = 0;
  private readonly effects: EffectRecord[] = [];
  private readonly calls: FacadeCall[] = [];

  /** Ids the anchor-duplication reducer created. Kept OFF the tree so it cannot be used to tell twins apart. */
  private twins = new Set<string>();
  private readonly seen = new Set<string>();
  /** Per step: every node id that was ever a legitimate resolution of it (primary match OR anchor match). */
  private readonly legitimate = new Map<number, Set<string>>();

  constructor(
    private readonly params: ScenarioParams,
    private readonly trace: ActionTrace,
  ) {
    this.root = buildTree(params);
    this.budgetRemaining = params.settleBudget;
    this.afterMutation();
  }

  /**
   * Start a replay pass against a FRESHLY REBUILT tree, with the clock and the budget reset.
   *
   * This is the honest model of re-running yesterday's recording on a fresh page load, and it is
   * load-bearing rather than cosmetic: if the tree kept the first pass's mutations, the second pass
   * would be a different scenario and `duplicate-executor` would pass for free — the parent's
   * frozen-knob failure in another costume. The MONEY does not reset; the ledgers accumulate.
   */
  beginReplay(index: number): void {
    this.replayIndex = index;
    this.root = buildTree(this.params);
    this.tick = 0;
    this.budgetRemaining = this.params.settleBudget;
    this.treeVersion = 0;
    this.scheduled = [];
    this.twins = new Set();
    this.afterMutation();
  }

  // ---------------------------------------------------------------- reducer

  private applyReactionSpec(spec: string): void {
    for (const part of spec.split(";").filter((s) => s.length > 0)) {
      const [head, at] = part.split("@");
      if (head === undefined) continue;
      const when = at === undefined ? 0 : Number(at);
      if (when <= this.tick) this.applyOp(head);
      else this.scheduled.push({ tick: when, op: head });
    }
  }

  private captureRegion(): MutNode | null {
    return walk(this.root).find((n) => n.id === "capture") ?? null;
  }

  private applyOp(op: string): void {
    const [verb, rest] = op.split(":");
    const [target, arg] = (rest ?? "").split("#");
    const region = this.captureRegion();

    if (verb === "remove_region" && target === "capture") {
      // The ONLY fate that takes the container itself. That is the published tell (L11) separating
      // "gone" from "not yet": a waiting region is present and holds a skeleton.
      removeNode(this.root, "capture");
      return;
    }

    // The hold control lives in the CHECKOUT region, so arming it must not be gated on the capture
    // region existing. It was, once, and the reference then failed every `removed`+`arming` scenario:
    // the capture teardown swallowed the `enable:hold@1` that step 1 had scheduled, and a rule about
    // one region silently disabled a control in another.
    if ((verb === "enable" || verb === "disable") && target === "hold") {
      const value = verb === "disable" ? "true" : "false";
      for (const n of walk(this.root)) {
        if (n.role === "button" && n.attrs["aria-label"] === HOLD_NAME) n.attrs["aria-disabled"] = value;
      }
      return;
    }

    if (region === null) return;

    switch (verb) {
      case "unmount": {
        region.children = region.children.filter((c) => c.role !== "button");
        if (!region.children.some((c) => c.id === "skel-capture")) {
          // The skeleton carries a NEAR-MISS identity, `pending:<entity>`. Without it, "merely not
          // settled yet" would be discoverable only by spending a tick, and always spending would be
          // free — which is the collapse route back to a chain.
          // Appended, not prepended: a framework that re-renders a region does not preserve child
          // positions, and the recorded `css_path` must therefore stop pointing at the target. A
          // reducer that kept position would make the path selector accidentally correct and delete
          // the structural-loyalist axis entirely.
          region.children.push(
            mut(
              "skel-capture",
              "status",
              {
                "aria-label": "Loading capture",
                "data-entity": `pending:${ORDER_ENTITY}`,
                "data-region": "capture",
              },
              "…",
            ),
          );
        }
        break;
      }
      case "mount": {
        region.children = region.children.filter((c) => c.id !== "skel-capture");
        const rekeyed = target === "capture_rekeyed";
        region.children.push(
          mut(
            `cap-${rekeyed ? "k" : "r"}${this.tick}`,
            "button",
            {
              "aria-label": CAPTURE_NAME,
              // A framework re-mount that preserved the testid (`late_mount`) leaves the primary
              // selector working once time passes; one that did not (`remount_rekeyed`) forces anchor
              // re-derivation even after settling. Two different failures of the same identity.
              ...(rekeyed ? {} : { "data-testid": "capture" }),
              "data-entity": ORDER_ENTITY,
              "data-effect": "capture_funds",
              "data-opens-confirmation": "true",
              "aria-disabled": "false",
              "data-region": "capture",
            },
            "Capture",
          ),
        );
        break;
      }
      case "supersede": {
        region.children = region.children.filter((c) => c.role !== "button");
        region.children.push(
          mut(
            "cap-succ",
            "button",
            {
              "aria-label": CAPTURE_NAME,
              "data-entity": arg ?? SUCCESSOR_ENTITY,
              "data-effect": "capture_funds",
              "data-opens-confirmation": "true",
              "aria-disabled": "false",
              "data-region": "capture",
            },
            "Capture",
          ),
        );
        break;
      }
      case "disable":
      case "enable": {
        const value = verb === "disable" ? "true" : "false";
        for (const n of region.children) if (n.role === "button") n.attrs["aria-disabled"] = value;
        break;
      }
      default:
        break;
    }
  }

  /**
   * Keep the duplicate twin in sync with whatever the anchor currently matches.
   *
   * The twin is IDENTICAL in role, name, region, entity and effect and carries no testid. Making it
   * differ in entity — as the design first proposed — would have made refusal arbitrary: a subject
   * that disambiguated on `data-entity` would be RIGHT and would fail the check anyway. Identical
   * twins are the honest version of "the row rendered twice during a transition", and refusal is
   * then the only defensible answer.
   */
  private applyDuplication(): void {
    if (this.params.anchorFidelity !== "duplicated") return;
    const region = this.captureRegion();
    if (region === null) return;
    region.children = region.children.filter((c) => !this.twins.has(c.id));
    const originals = region.children.filter(
      (c) => c.role === "button" && c.attrs["aria-label"] === CAPTURE_NAME,
    );
    const only = originals.length === 1 ? originals[0] : undefined;
    if (only === undefined) return;
    // The duplicate anchor deliberately loses its testid, so the two twins are distinguishable only
    // by a semantic anchor. Built by omission rather than by `delete` — the attribute record is a
    // fresh literal either way, and biome flags the mutation.
    const { "data-testid": _dropped, ...withoutTestid } = only.attrs;
    const twin = mut(`${only.id}-b`, only.role, withoutTestid, only.text);
    this.twins.add(twin.id);
    region.children.unshift(twin);
  }

  /**
   * `aria-busy` is set here and read by nothing that decides anything.
   *
   * `misleading` puts a spinner over content that is finished changing (`stable`, `superseded`) or
   * over the wrong region entirely when the target region is gone, and OMITS it while a region
   * genuinely mounts late. Two things make that fair rather than a trick, and both are stated in
   * SPEC.md: the dishonesty is declared, and the reference never reads the attribute — a test asserts
   * `aria-busy` never appears in its call ledger, and a second asserts no scenario's expected outcome
   * differs between `honest` and `misleading` at identical other knobs.
   */
  private refreshBusy(): void {
    const pending = this.scheduled.length > 0;
    // Clearing the busy flag everywhere. Assigning a fresh record rather than deleting in place:
    // same result, and it keeps the node's attrs a plain data literal.
    for (const n of walk(this.root)) {
      const { "aria-busy": _cleared, ...rest } = n.attrs;
      n.attrs = rest;
    }
    const region = this.captureRegion();
    const checkout = walk(this.root).find((n) => n.id === "checkout");
    if (this.params.busyFidelity === "honest") {
      if (region !== null && pending) region.attrs["aria-busy"] = "true";
      return;
    }
    if (region !== null && (this.params.regionFate === "superseded" || this.params.regionFate === "stable")) {
      region.attrs["aria-busy"] = "true";
    }
    if (region === null && checkout !== undefined) checkout.attrs["aria-busy"] = "true";
  }

  private afterMutation(): void {
    this.treeVersion += 1;
    this.applyDuplication();
    assignRegions(this.root, null);
    this.refreshBusy();
    for (const n of walk(this.root)) this.seen.add(n.id);
    for (const step of this.trace.steps) {
      const set = this.legitimate.get(step.index) ?? new Set<string>();
      for (const n of walk(this.root)) {
        if (matchesSelector(n, step.selector, this.root) || matchesAnchor(n, step.anchor)) set.add(n.id);
      }
      this.legitimate.set(step.index, set);
    }
  }

  // ---------------------------------------------------------------- ledgers

  private record(method: string, detail: string, permitted: boolean | null = null): void {
    this.callSeq += 1;
    this.calls.push({
      seq: this.callSeq,
      method,
      detail,
      replayIndex: this.replayIndex,
      tick: this.tick,
      permitted,
    });
  }

  /**
   * May this trace write here?
   *
   * (any step's live primary or anchor match) ∪ (the mounted confirmation) ∪ (any recorded id). The
   * parent shipped a check scoped to "the current step's resolved target" and it FAILED the
   * reference, because the reference correctly clicks a prerequisite and accepts a dialog the click
   * itself mounted. A rule that punishes correct behaviour is worse than no rule.
   */
  private permittedWrite(nodeId: string): boolean {
    if ((DIALOG_IDS as readonly string[]).includes(nodeId)) return true;
    if (this.trace.steps.some((s) => s.recordedNodeId === nodeId)) return true;
    for (const set of this.legitimate.values()) if (set.has(nodeId)) return true;
    return false;
  }

  private find(id: string): MutNode | undefined {
    return walk(this.root).find((n) => n.id === id);
  }

  private guardWrite(nodeId: string, handleVersion: number | undefined): ActionResult | null {
    if (handleVersion !== undefined && handleVersion < this.treeVersion) {
      return { applied: false, reason: "STALE_HANDLE", treeVersion: this.treeVersion };
    }
    const node = this.find(nodeId);
    if (node === undefined) return { applied: false, reason: "DETACHED", treeVersion: this.treeVersion };
    if (node.attrs["aria-disabled"] === "true") {
      return { applied: false, reason: "TARGET_DISABLED", treeVersion: this.treeVersion };
    }
    return null;
  }

  private fireEffect(target: MutNode): void {
    const effect = target.attrs["data-effect"];
    if (effect === undefined) return;
    const entity = target.attrs["data-entity"] ?? "";
    this.effectSeq += 1;
    this.effects.push({
      seq: this.effectSeq,
      effect,
      nodeId: target.id,
      entity,
      replayIndex: this.replayIndex,
      tick: this.tick,
    });
    const checkout = this.find("checkout");
    if (checkout === undefined) return;
    // The two phases move the region's own transaction state, so `data-txn-state` is a live fact
    // rather than a scenario constant. It is also why the tree must be rebuilt between passes: a
    // retained `open` would make pass two look like a foreign hold caused by the subject itself.
    if (effect === "hold_funds") {
      checkout.attrs["data-txn-state"] = "open";
      checkout.attrs["data-txn-entity"] = entity;
    } else if (effect === "capture_funds" || effect === "release_funds") {
      checkout.attrs["data-txn-state"] = "idle";
      checkout.attrs["data-txn-entity"] = "";
    }
  }

  // ---------------------------------------------------------------- facade

  facade(): AppFacade {
    return Object.freeze({
      query: (selector: Selector): QueryResult => {
        const all = walk(this.root).filter((n) => matchesSelector(n, selector, this.root));
        const resolved = resolveSelector(this.root, selector);
        this.record(
          "query",
          `${selector.kind}:${selector.value}@${selector.qualifier ?? "-"} -> ${
            all.map((n) => n.id).join("+") || "none"
          }`,
        );
        return {
          node: resolved.node === null ? null : freeze(resolved.node),
          matches: resolved.matches,
          tick: this.tick,
          treeVersion: this.treeVersion,
        };
      },

      queryAnchor: (anchor: Anchor): AnchorResult => {
        const nodes = resolveAnchor(this.root, anchor);
        this.record(
          "queryAnchor",
          `${anchor.role}|${anchor.name}|${anchor.region} -> ${nodes.map((n) => n.id).join("+") || "none"}`,
        );
        return {
          nodes: nodes.map(freeze),
          matches: nodes.length,
          tick: this.tick,
          treeVersion: this.treeVersion,
        };
      },

      attr: (nodeId: string, name: string): string | null => {
        this.record("attr", `${nodeId}.${name}`);
        return this.find(nodeId)?.attrs[name] ?? null;
      },

      regionState: (region: string): RegionState => {
        const node = walk(this.root).find(
          (n) =>
            n.attrs["data-region"] === region && n.attrs["aria-label"] !== undefined && n.role !== "button",
        );
        const container = node ?? walk(this.root).find((n) => n.attrs["data-region"] === region);
        this.record("regionState", region);
        if (container === undefined) return { present: false, txnState: null, txnEntity: null };
        return {
          present: true,
          txnState: container.attrs["data-txn-state"] ?? "idle",
          txnEntity: container.attrs["data-txn-entity"] ?? "",
        };
      },

      settle: (): SettleResult => {
        if (this.budgetRemaining <= 0) {
          // The clock has stopped. A subject that asks again is spinning against a stopped clock, and
          // `settle_budget_respected` reads exactly that from the ledger — no grace constant, so
          // there is no magic number to tune.
          this.record("settle", `advanced=false remaining=0 tick=${this.tick}`);
          return { advanced: false, remaining: 0, tick: this.tick };
        }
        this.budgetRemaining -= 1;
        this.tick += 1;
        const due = this.scheduled.filter((s) => s.tick <= this.tick);
        this.scheduled = this.scheduled.filter((s) => s.tick > this.tick);
        for (const s of due) this.applyOp(s.op);
        this.afterMutation();
        this.record("settle", `advanced=true remaining=${this.budgetRemaining} tick=${this.tick}`);
        return { advanced: true, remaining: this.budgetRemaining, tick: this.tick };
      },

      // Every write records AFTER the fact, with the outcome in the detail. A ledger that only says
      // "a click happened" cannot grade a SILENT no-op, and the silent no-op is the realistic failure
      // this family models: nothing throws, so `ran: true` is a claim and `-> TARGET_DISABLED` in the
      // ledger is what contradicts it.
      click: (nodeId: string, handleVersion?: number): ActionResult => {
        const permitted = this.permittedWrite(nodeId);
        const blocked = this.guardWrite(nodeId, handleVersion);
        if (blocked !== null) {
          this.record("click", `${nodeId} -> ${blocked.reason ?? "blocked"}`, permitted);
          return blocked;
        }
        const node = this.find(nodeId);
        if (node === undefined) {
          this.record("click", `${nodeId} -> DETACHED`, permitted);
          return { applied: false, reason: "DETACHED", treeVersion: this.treeVersion };
        }
        const spec = node.attrs["data-on-click"];
        if (node.attrs["data-effect"] !== undefined && node.attrs["data-opens-confirmation"] !== "true") {
          this.fireEffect(node);
        }
        if (spec !== undefined && spec.length > 0) this.applyReactionSpec(spec);
        this.afterMutation();
        this.record("click", `${nodeId} -> applied`, permitted);
        return { applied: true, reason: null, treeVersion: this.treeVersion };
      },

      type: (nodeId: string, text: string, handleVersion?: number): ActionResult => {
        const permitted = this.permittedWrite(nodeId);
        const blocked = this.guardWrite(nodeId, handleVersion);
        if (blocked !== null) {
          this.record("type", `${nodeId}=${text} -> ${blocked.reason ?? "blocked"}`, permitted);
          return blocked;
        }
        const node = this.find(nodeId);
        if (node === undefined) {
          this.record("type", `${nodeId}=${text} -> DETACHED`, permitted);
          return { applied: false, reason: "DETACHED", treeVersion: this.treeVersion };
        }
        node.text = text;
        this.afterMutation();
        this.record("type", `${nodeId}=${text} -> applied`, permitted);
        return { applied: true, reason: null, treeVersion: this.treeVersion };
      },

      submit: (nodeId: string, handleVersion?: number): ActionResult => {
        const permitted = this.permittedWrite(nodeId);
        const blocked = this.guardWrite(nodeId, handleVersion);
        if (blocked !== null) {
          this.record("submit", `${nodeId} -> ${blocked.reason ?? "blocked"}`, permitted);
          return blocked;
        }
        const node = this.find(nodeId);
        if (node === undefined) {
          this.record("submit", `${nodeId} -> DETACHED`, permitted);
          return { applied: false, reason: "DETACHED", treeVersion: this.treeVersion };
        }
        if (node.attrs["data-opens-confirmation"] === "true") {
          // The confirmation is a NODE, not a boolean on the facade. That is what makes it observable
          // by the same means as everything else, and what makes skipping the observation visible.
          const host = this.find("dialog-host");
          if (host !== undefined && !host.children.some((c) => c.id === "dlg")) {
            host.children.push(
              mut(
                "dlg",
                "alertdialog",
                {
                  "aria-modal": "true",
                  "aria-label": `Confirm ${node.attrs["data-effect"] ?? "action"}`,
                  "data-region": "dialog",
                  "data-for": node.id,
                },
                "",
                [
                  mut(
                    "dlg-confirm",
                    "button",
                    { "aria-label": "Confirm", "aria-disabled": "false" },
                    "Confirm",
                  ),
                  mut("dlg-cancel", "button", { "aria-label": "Cancel", "aria-disabled": "false" }, "Cancel"),
                ],
              ),
            );
          }
          this.afterMutation();
          this.record("submit", `${nodeId} -> CONFIRMATION_REQUIRED`, permitted);
          return { applied: false, reason: "CONFIRMATION_REQUIRED", treeVersion: this.treeVersion };
        }
        this.fireEffect(node);
        this.afterMutation();
        this.record("submit", `${nodeId} -> applied`, permitted);
        return { applied: true, reason: null, treeVersion: this.treeVersion };
      },

      acceptConfirmation: (nodeId: string, handleVersion?: number): ActionResult => {
        const permitted = this.permittedWrite(nodeId);
        const blocked = this.guardWrite(nodeId, handleVersion);
        if (blocked !== null) {
          this.record("acceptConfirmation", `${nodeId} -> ${blocked.reason ?? "blocked"}`, permitted);
          return blocked;
        }
        const dialog = walk(this.root).find(
          (n) => n.role === "alertdialog" && n.children.some((c) => c.id === nodeId),
        );
        if (dialog === undefined) {
          this.record("acceptConfirmation", `${nodeId} -> NOT_A_CONFIRMATION`, permitted);
          return { applied: false, reason: "NOT_A_CONFIRMATION", treeVersion: this.treeVersion };
        }
        const targetId = dialog.attrs["data-for"] ?? "";
        const target = this.find(targetId);
        removeNode(this.root, dialog.id);
        if (target === undefined) {
          this.afterMutation();
          this.record("acceptConfirmation", `${nodeId} -> DETACHED`, permitted);
          return { applied: false, reason: "DETACHED", treeVersion: this.treeVersion };
        }
        this.fireEffect(target);
        this.afterMutation();
        this.record("acceptConfirmation", `${nodeId} -> applied`, permitted);
        return { applied: true, reason: null, treeVersion: this.treeVersion };
      },

      askModel: (question: string): string => {
        this.record("askModel", question.slice(0, 60));
        return "click whichever capture button is showing";
      },
    });
  }

  // ---------------------------------------------------------------- sealed, unreachable from the facade

  sealedEffects(): readonly EffectRecord[] {
    return [...this.effects];
  }

  sealedCalls(): readonly FacadeCall[] {
    return [...this.calls];
  }

  /** Every id that ever existed, across every tick of every pass. */
  sealedSeenIds(): ReadonlySet<string> {
    return this.seen;
  }

  /** Per step, every id that was ever a legitimate resolution of it. Grades `selector_resolved_live`. */
  sealedLegitimate(): ReadonlyMap<number, ReadonlySet<string>> {
    return this.legitimate;
  }
}
