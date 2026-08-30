#!/usr/bin/env node

// src/trials/live-dom-host-entry.ts
import { readFileSync } from "fs";
import { pathToFileURL } from "url";

// src/families/ui-replay-live-dom/app.ts
var mut = (id, role, attrs, text = "", children = []) => ({ id, role, attrs, text, children });
var walk = (n) => [n, ...n.children.flatMap(walk)];
var freeze = (n) => ({
  id: n.id,
  role: n.role,
  attrs: { ...n.attrs },
  text: n.text,
  children: n.children.map(freeze)
});
var parentOf = (root, id) => {
  for (const n of walk(root)) if (n.children.some((c) => c.id === id)) return n;
  return null;
};
var removeNode = (root, id) => {
  const parent = parentOf(root, id);
  if (parent === null) return false;
  parent.children = parent.children.filter((c) => c.id !== id);
  return true;
};
var ORDER_ENTITY = "ord-201";
var SUCCESSOR_ENTITY = "ord-903";
var CAPTURE_NAME = "Capture payment";
var HOLD_NAME = "Hold funds";
var DIALOG_IDS = ["dlg", "dlg-confirm", "dlg-cancel"];
function settlesAtFor(fate, seed) {
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
var conflictApplies = (params) => params.anchorConflict !== "none" && (params.regionFate === "stable" || params.regionFate === "late_mount" || params.regionFate === "remount_rekeyed" || params.regionFate === "disabled_then_enabled");
var reactionsFor = (params) => {
  const at = settlesAtFor(params.regionFate, params.seed);
  const fate = params.regionFate === "late_mount" ? ["unmount:capture", `mount:capture@${at}`] : params.regionFate === "remount_rekeyed" ? ["unmount:capture", `mount:capture_rekeyed@${at}`] : params.regionFate === "superseded" ? [`supersede:capture#${SUCCESSOR_ENTITY}`] : params.regionFate === "disabled_then_enabled" ? ["disable:capture", `enable:capture@${at}`] : params.regionFate === "removed" ? ["remove_region:capture"] : [];
  const conflictAt = params.regionFate === "late_mount" || params.regionFate === "remount_rekeyed" ? at : 0;
  const conflict = conflictApplies(params) ? [`anchor_conflict:${params.anchorConflict}@${conflictAt}`] : [];
  const ordered = params.regionFate === "disabled_then_enabled" ? [...conflict, ...fate] : [...fate, ...conflict];
  return [...ordered, ...params.priorState === "arming" ? ["enable:hold@1"] : []].join(";");
};
var ORDERS = ["ord-201", "ord-202", "ord-203", "ord-204"];
function buildTree(params) {
  const foreign = params.priorState === "foreign_hold";
  const armed = params.priorState === "arming";
  const holdNode = foreign ? (
    // The situation a replayer actually meets after a crashed submit: the recorded control is gone,
    // an enabled retry stands where it was carrying the SAME entity and a matching anchor, and the
    // only thing that says the work is already done is `data-txn-state` on the region.
    mut("hold-retry", "button", {
      "aria-label": HOLD_NAME,
      "data-entity": ORDER_ENTITY,
      "data-effect": "hold_funds",
      "data-opens-confirmation": "true",
      "aria-disabled": "false"
    })
  ) : mut("hold", "button", {
    "aria-label": HOLD_NAME,
    "data-testid": "hold",
    "data-entity": ORDER_ENTITY,
    "data-effect": "hold_funds",
    "data-opens-confirmation": "true",
    "aria-disabled": armed ? "true" : "false"
  });
  const root = mut("root", "document", {}, "", [
    mut("banner", "banner", { "data-region": "banner" }, "", [
      mut("nav-home", "link", { "aria-label": "Home" }, "Home"),
      mut("nav-orders", "link", { "aria-label": "Orders" }, "Orders"),
      mut("nav-reports", "link", { "aria-label": "Reports" }, "Reports"),
      mut("acct-menu", "button", { "aria-label": "Account menu", "data-effect": "sign_out" }, "Account")
    ]),
    mut("main", "main", { "data-region": "orders" }, "", [
      mut("orders-toolbar", "toolbar", {}, "", [
        mut("filter-open", "button", { "aria-label": "Filter open" }, "Open"),
        mut("filter-all", "button", { "aria-label": "Filter all" }, "All"),
        mut("search", "textbox", { "aria-label": "Search orders", "data-state": "editable" }, "")
      ]),
      mut(
        "orders-table",
        "table",
        {},
        "",
        ORDERS.map(
          (entity) => mut(`row-${entity}`, "row", { "data-entity": entity }, "", [
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
                "aria-disabled": "false"
              },
              "Review"
            )
          ])
        )
      )
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
        "data-txn-entity": foreign ? ORDER_ENTITY : ""
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
            "data-state": "editable"
          },
          String(params.seed % 5)
        ),
        mut("lbl-addr", "label", {}, "Shipping address"),
        mut(
          "addr",
          "textbox",
          {
            "aria-label": "Shipping address",
            "data-testid": "addr",
            "data-entity": ORDER_ENTITY,
            "data-state": "editable"
          },
          "12 Example St"
        ),
        mut(
          "ship",
          "combobox",
          {
            "aria-label": "Shipping option",
            "data-testid": "ship",
            "data-entity": ORDER_ENTITY,
            "aria-disabled": "false",
            "data-on-click": reactionsFor(params)
          },
          "Standard",
          [
            mut("opt-std", "option", { "aria-label": "Standard" }, "Standard"),
            mut("opt-exp", "option", { "aria-label": "Express" }, "Express")
          ]
        ),
        mut("total", "status", { "aria-label": "Order total", "data-entity": ORDER_ENTITY }, "42.00"),
        mut(
          "recalc",
          "button",
          {
            "aria-label": "Recalculate total",
            "data-testid": "recalc",
            "data-entity": ORDER_ENTITY,
            "aria-disabled": "false"
          },
          "Recalculate"
        ),
        holdNode,
        mut("hold-note", "note", {}, "Funds are held, then captured.")
      ]
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
          "aria-disabled": "false"
        },
        "Capture"
      ),
      mut("cap-note", "note", {}, "Closes the hold.")
    ]),
    mut("footer", "contentinfo", { "data-region": "footer" }, "", [
      mut("foot-status", "status", { "aria-label": "Connection" }, "online"),
      mut("foot-link", "link", { "aria-label": "Support" }, "Support")
    ]),
    mut("dialog-host", "group", { "data-region": "dialog" }, "")
  ]);
  assignRegions(root, null);
  return root;
}
function assignRegions(node, inherited) {
  const own = node.attrs["data-region"] ?? inherited;
  if (own !== null && own !== void 0) node.attrs["data-region"] = own;
  for (const child of node.children) assignRegions(child, own ?? null);
}
var cssPath = (root, id) => {
  const search = (node, trail) => {
    if (node.id === id) return trail;
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      if (child === void 0) continue;
      const found = search(child, [...trail, i]);
      if (found !== null) return found;
    }
    return null;
  };
  return (search(root, []) ?? []).join("/");
};
function matchesSelector(node, selector, root) {
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
function resolveSelector(root, selector) {
  const all = walk(root).filter((n) => matchesSelector(n, selector, root));
  if (selector.kind === "role_index") {
    const index = Number(selector.qualifier ?? "0");
    return { node: all[index] ?? null, matches: all.length };
  }
  return { node: all.length === 1 ? all[0] ?? null : null, matches: all.length };
}
var matchesAnchor = (n, a) => n.role === a.role && n.attrs["aria-label"] === a.name && n.attrs["data-region"] === a.region;
var resolveAnchor = (root, anchor) => walk(root).filter((n) => matchesAnchor(n, anchor));
var App = class {
  constructor(params, trace) {
    this.params = params;
    this.trace = trace;
    this.root = buildTree(params);
    this.budgetRemaining = params.settleBudget;
    this.afterMutation();
  }
  params;
  trace;
  root;
  tick = 0;
  budgetRemaining;
  treeVersion = 0;
  scheduled = [];
  replayIndex = 0;
  effectSeq = 0;
  callSeq = 0;
  effects = [];
  calls = [];
  /** Ids the anchor-duplication reducer created. Kept OFF the tree so it cannot be used to tell twins apart. */
  twins = /* @__PURE__ */ new Set();
  seen = /* @__PURE__ */ new Set();
  /** Per step: every node id that was ever a legitimate resolution of it (primary match OR anchor match). */
  legitimate = /* @__PURE__ */ new Map();
  /**
   * Start a replay pass against a FRESHLY REBUILT tree, with the clock and the budget reset.
   *
   * This is the honest model of re-running yesterday's recording on a fresh page load, and it is
   * load-bearing rather than cosmetic: if the tree kept the first pass's mutations, the second pass
   * would be a different scenario and `duplicate-executor` would pass for free — the parent's
   * frozen-knob failure in another costume. The MONEY does not reset; the ledgers accumulate.
   */
  beginReplay(index) {
    this.replayIndex = index;
    this.root = buildTree(this.params);
    this.tick = 0;
    this.budgetRemaining = this.params.settleBudget;
    this.treeVersion = 0;
    this.scheduled = [];
    this.twins = /* @__PURE__ */ new Set();
    this.afterMutation();
  }
  // ---------------------------------------------------------------- reducer
  applyReactionSpec(spec) {
    for (const part of spec.split(";").filter((s) => s.length > 0)) {
      const [head, at] = part.split("@");
      if (head === void 0) continue;
      const when = at === void 0 ? 0 : Number(at);
      if (when <= this.tick) this.applyOp(head);
      else this.scheduled.push({ tick: when, op: head });
    }
  }
  captureRegion() {
    return walk(this.root).find((n) => n.id === "capture") ?? null;
  }
  applyOp(op) {
    const [verb, rest] = op.split(":");
    const [target, arg] = (rest ?? "").split("#");
    const region = this.captureRegion();
    if (verb === "anchor_conflict") {
      this.applyAnchorConflict(target);
      return;
    }
    if (verb === "remove_region" && target === "capture") {
      removeNode(this.root, "capture");
      return;
    }
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
          region.children.push(
            mut(
              "skel-capture",
              "status",
              {
                "aria-label": "Loading capture",
                "data-entity": `pending:${ORDER_ENTITY}`,
                "data-region": "capture"
              },
              "\u2026"
            )
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
              ...rekeyed ? {} : { "data-testid": "capture" },
              "data-entity": ORDER_ENTITY,
              "data-effect": "capture_funds",
              "data-opens-confirmation": "true",
              "aria-disabled": "false",
              "data-region": "capture"
            },
            "Capture"
          )
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
              "data-region": "capture"
            },
            "Capture"
          )
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
   * Categorical anchor conflicts for the capture step.
   *
   * Three recorded addresses all resolve, and they resolve to DIFFERENT nodes:
   *
   *   test id        -> `cap-testid`
   *   semantic anchor -> `cap-semantic`
   *   structural path -> `cap-path`
   *
   * The correct node is not hidden. It is the one whose visible facts still satisfy the recorded
   * target: same entity, same irreversible effect, and the live precondition. A replayer loyal to
   * one address kind is therefore right in one scenario class and wrong in the other two.
   */
  applyAnchorConflict(kind) {
    if (kind === "none") return;
    const region = this.captureRegion();
    if (region === null) return;
    const attrsFor = (addr) => {
      const correct = kind === "testid_wins" && addr === "testid" || kind === "semantic_wins" && addr === "semantic" || kind === "path_wins" && addr === "path";
      return {
        "aria-label": addr === "semantic" ? CAPTURE_NAME : addr === "testid" ? "Capture saved method" : "Submit payment",
        ...addr === "testid" ? { "data-testid": "capture" } : {},
        "data-entity": correct ? ORDER_ENTITY : SUCCESSOR_ENTITY,
        "data-effect": correct ? "capture_funds" : "preview_capture",
        "data-opens-confirmation": "true",
        "aria-disabled": "false",
        "data-region": "capture"
      };
    };
    region.children = [
      mut("cap-path", "button", attrsFor("path"), "Submit"),
      mut("cap-testid", "button", attrsFor("testid"), "Capture"),
      mut("cap-semantic", "button", attrsFor("semantic"), "Capture"),
      mut("cap-note", "note", {}, "Closes the hold.")
    ];
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
  applyDuplication() {
    if (this.params.anchorFidelity !== "duplicated" || this.params.anchorConflict !== "none") return;
    const region = this.captureRegion();
    if (region === null) return;
    region.children = region.children.filter((c) => !this.twins.has(c.id));
    const originals = region.children.filter(
      (c) => c.role === "button" && c.attrs["aria-label"] === CAPTURE_NAME
    );
    const only = originals.length === 1 ? originals[0] : void 0;
    if (only === void 0) return;
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
  refreshBusy() {
    const pending = this.scheduled.length > 0;
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
    if (region === null && checkout !== void 0) checkout.attrs["aria-busy"] = "true";
  }
  afterMutation() {
    this.treeVersion += 1;
    this.applyDuplication();
    assignRegions(this.root, null);
    this.refreshBusy();
    for (const n of walk(this.root)) this.seen.add(n.id);
    for (const step of this.trace.steps) {
      const set = this.legitimate.get(step.index) ?? /* @__PURE__ */ new Set();
      for (const n of walk(this.root)) {
        if (matchesSelector(n, step.selector, this.root) || matchesSelector(n, step.path, this.root) || matchesAnchor(n, step.anchor)) {
          set.add(n.id);
        }
      }
      this.legitimate.set(step.index, set);
    }
  }
  // ---------------------------------------------------------------- ledgers
  record(method, detail, permitted = null) {
    this.callSeq += 1;
    this.calls.push({
      seq: this.callSeq,
      method,
      detail,
      replayIndex: this.replayIndex,
      tick: this.tick,
      permitted
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
  permittedWrite(nodeId) {
    if (DIALOG_IDS.includes(nodeId)) return true;
    if (this.trace.steps.some((s) => s.recordedNodeId === nodeId)) return true;
    for (const set of this.legitimate.values()) if (set.has(nodeId)) return true;
    return false;
  }
  find(id) {
    return walk(this.root).find((n) => n.id === id);
  }
  guardWrite(nodeId, handleVersion) {
    if (handleVersion !== void 0 && handleVersion < this.treeVersion) {
      return { applied: false, reason: "STALE_HANDLE", treeVersion: this.treeVersion };
    }
    const node = this.find(nodeId);
    if (node === void 0) return { applied: false, reason: "DETACHED", treeVersion: this.treeVersion };
    if (node.attrs["aria-disabled"] === "true") {
      return { applied: false, reason: "TARGET_DISABLED", treeVersion: this.treeVersion };
    }
    return null;
  }
  fireEffect(target) {
    const effect = target.attrs["data-effect"];
    if (effect === void 0) return;
    const entity = target.attrs["data-entity"] ?? "";
    this.effectSeq += 1;
    this.effects.push({
      seq: this.effectSeq,
      effect,
      nodeId: target.id,
      entity,
      replayIndex: this.replayIndex,
      tick: this.tick
    });
    const checkout = this.find("checkout");
    if (checkout === void 0) return;
    if (effect === "hold_funds") {
      checkout.attrs["data-txn-state"] = "open";
      checkout.attrs["data-txn-entity"] = entity;
    } else if (effect === "capture_funds" || effect === "release_funds") {
      checkout.attrs["data-txn-state"] = "idle";
      checkout.attrs["data-txn-entity"] = "";
    }
  }
  // ---------------------------------------------------------------- facade
  facade() {
    return Object.freeze({
      query: (selector) => {
        const all = walk(this.root).filter((n) => matchesSelector(n, selector, this.root));
        const resolved = resolveSelector(this.root, selector);
        this.record(
          "query",
          `${selector.kind}:${selector.value}@${selector.qualifier ?? "-"} -> ${all.map((n) => n.id).join("+") || "none"}`
        );
        return {
          node: resolved.node === null ? null : freeze(resolved.node),
          matches: resolved.matches,
          tick: this.tick,
          treeVersion: this.treeVersion
        };
      },
      queryAnchor: (anchor) => {
        const nodes = resolveAnchor(this.root, anchor);
        this.record(
          "queryAnchor",
          `${anchor.role}|${anchor.name}|${anchor.region} -> ${nodes.map((n) => n.id).join("+") || "none"}`
        );
        return {
          nodes: nodes.map(freeze),
          matches: nodes.length,
          tick: this.tick,
          treeVersion: this.treeVersion
        };
      },
      attr: (nodeId, name) => {
        this.record("attr", `${nodeId}.${name}`);
        return this.find(nodeId)?.attrs[name] ?? null;
      },
      regionState: (region) => {
        const node = walk(this.root).find(
          (n) => n.attrs["data-region"] === region && n.attrs["aria-label"] !== void 0 && n.role !== "button"
        );
        const container = node ?? walk(this.root).find((n) => n.attrs["data-region"] === region);
        this.record("regionState", region);
        if (container === void 0) return { present: false, txnState: null, txnEntity: null };
        return {
          present: true,
          txnState: container.attrs["data-txn-state"] ?? "idle",
          txnEntity: container.attrs["data-txn-entity"] ?? ""
        };
      },
      settle: () => {
        if (this.budgetRemaining <= 0) {
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
      click: (nodeId, handleVersion) => {
        const permitted = this.permittedWrite(nodeId);
        const blocked = this.guardWrite(nodeId, handleVersion);
        if (blocked !== null) {
          this.record("click", `${nodeId} -> ${blocked.reason ?? "blocked"}`, permitted);
          return blocked;
        }
        const node = this.find(nodeId);
        if (node === void 0) {
          this.record("click", `${nodeId} -> DETACHED`, permitted);
          return { applied: false, reason: "DETACHED", treeVersion: this.treeVersion };
        }
        const spec = node.attrs["data-on-click"];
        if (node.attrs["data-effect"] !== void 0 && node.attrs["data-opens-confirmation"] !== "true") {
          this.fireEffect(node);
        }
        if (spec !== void 0 && spec.length > 0) this.applyReactionSpec(spec);
        this.afterMutation();
        this.record("click", `${nodeId} -> applied`, permitted);
        return { applied: true, reason: null, treeVersion: this.treeVersion };
      },
      type: (nodeId, text, handleVersion) => {
        const permitted = this.permittedWrite(nodeId);
        const blocked = this.guardWrite(nodeId, handleVersion);
        if (blocked !== null) {
          this.record("type", `${nodeId}=${text} -> ${blocked.reason ?? "blocked"}`, permitted);
          return blocked;
        }
        const node = this.find(nodeId);
        if (node === void 0) {
          this.record("type", `${nodeId}=${text} -> DETACHED`, permitted);
          return { applied: false, reason: "DETACHED", treeVersion: this.treeVersion };
        }
        node.text = text;
        this.afterMutation();
        this.record("type", `${nodeId}=${text} -> applied`, permitted);
        return { applied: true, reason: null, treeVersion: this.treeVersion };
      },
      submit: (nodeId, handleVersion) => {
        const permitted = this.permittedWrite(nodeId);
        const blocked = this.guardWrite(nodeId, handleVersion);
        if (blocked !== null) {
          this.record("submit", `${nodeId} -> ${blocked.reason ?? "blocked"}`, permitted);
          return blocked;
        }
        const node = this.find(nodeId);
        if (node === void 0) {
          this.record("submit", `${nodeId} -> DETACHED`, permitted);
          return { applied: false, reason: "DETACHED", treeVersion: this.treeVersion };
        }
        if (node.attrs["data-opens-confirmation"] === "true") {
          const host = this.find("dialog-host");
          if (host !== void 0 && !host.children.some((c) => c.id === "dlg")) {
            host.children.push(
              mut(
                "dlg",
                "alertdialog",
                {
                  "aria-modal": "true",
                  "aria-label": `Confirm ${node.attrs["data-effect"] ?? "action"}`,
                  "data-region": "dialog",
                  "data-for": node.id
                },
                "",
                [
                  mut(
                    "dlg-confirm",
                    "button",
                    { "aria-label": "Confirm", "aria-disabled": "false" },
                    "Confirm"
                  ),
                  mut("dlg-cancel", "button", { "aria-label": "Cancel", "aria-disabled": "false" }, "Cancel")
                ]
              )
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
      acceptConfirmation: (nodeId, handleVersion) => {
        const permitted = this.permittedWrite(nodeId);
        const blocked = this.guardWrite(nodeId, handleVersion);
        if (blocked !== null) {
          this.record("acceptConfirmation", `${nodeId} -> ${blocked.reason ?? "blocked"}`, permitted);
          return blocked;
        }
        const dialog = walk(this.root).find(
          (n) => n.role === "alertdialog" && n.children.some((c) => c.id === nodeId)
        );
        if (dialog === void 0) {
          this.record("acceptConfirmation", `${nodeId} -> NOT_A_CONFIRMATION`, permitted);
          return { applied: false, reason: "NOT_A_CONFIRMATION", treeVersion: this.treeVersion };
        }
        const targetId = dialog.attrs["data-for"] ?? "";
        const target = this.find(targetId);
        removeNode(this.root, dialog.id);
        if (target === void 0) {
          this.afterMutation();
          this.record("acceptConfirmation", `${nodeId} -> DETACHED`, permitted);
          return { applied: false, reason: "DETACHED", treeVersion: this.treeVersion };
        }
        this.fireEffect(target);
        this.afterMutation();
        this.record("acceptConfirmation", `${nodeId} -> applied`, permitted);
        return { applied: true, reason: null, treeVersion: this.treeVersion };
      },
      askModel: (question) => {
        this.record("askModel", question.slice(0, 60));
        return "click whichever capture button is showing";
      }
    });
  }
  // ---------------------------------------------------------------- sealed, unreachable from the facade
  sealedEffects() {
    return [...this.effects];
  }
  sealedCalls() {
    return [...this.calls];
  }
  /** Every id that ever existed, across every tick of every pass. */
  sealedSeenIds() {
    return this.seen;
  }
  /** Per step, every id that was ever a legitimate resolution of it. Grades `selector_resolved_live`. */
  sealedLegitimate() {
    return this.legitimate;
  }
};

// src/trials/live-dom-host-entry.ts
var fail = (message) => {
  process.stdout.write(JSON.stringify({ error: message }));
  process.exit(0);
};
var modulePath = process.argv[2] ?? fail("no subject module path given");
var input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch (err) {
  fail(`could not parse stdin: ${err.message}`);
}
var scenario = input?.scenario ?? fail("stdin carried no scenario");
var subject;
try {
  const mod = await import(pathToFileURL(modulePath).href);
  subject = mod.subject ?? mod.default;
} catch (err) {
  fail(`could not import subject: ${err.message}`);
}
var hasReplay = (candidate) => typeof candidate?.replay === "function";
if (!hasReplay(subject)) {
  fail("module exports no subject with a replay(trace, app) method");
}
var runnableSubject = subject;
var app = new App(scenario.params, scenario.trace);
var reports = [];
try {
  for (let i = 0; i < scenario.params.replayCount; i += 1) {
    app.beginReplay(i);
    reports.push(runnableSubject.replay(scenario.trace, app.facade()));
  }
} catch (err) {
  process.stdout.write(
    JSON.stringify({
      reports,
      effects: app.sealedEffects(),
      calls: app.sealedCalls(),
      legitimate: Object.fromEntries(
        [...app.sealedLegitimate()].map(([step, ids]) => [String(step), [...ids].sort()])
      ),
      error: `subject threw: ${err.message}`
    })
  );
  process.exit(0);
}
process.stdout.write(
  JSON.stringify({
    reports,
    effects: app.sealedEffects(),
    calls: app.sealedCalls(),
    legitimate: Object.fromEntries(
      [...app.sealedLegitimate()].map(([step, ids]) => [String(step), [...ids].sort()])
    ),
    error: null
  })
);
