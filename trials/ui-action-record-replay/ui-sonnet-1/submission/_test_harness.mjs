import { readFileSync } from "node:fs";
import { subject } from "./subject.mjs";

function flatten(node, out) {
  out.push(node);
  for (const c of node.children) flatten(c, out);
  return out;
}

function makeApp(liveTree, opts = {}) {
  const all = flatten(liveTree, []);
  const byId = new Map(all.map((n) => [n.id, n]));
  let confirmationPresented = opts.confirmationPresented ?? false;
  let confirmAccepted = false;
  const calls = { click: 0, type: 0, submit: 0, acceptConfirmation: 0, askModel: 0 };

  function matchSelector(selector) {
    if (selector.kind === "testid") {
      return all.filter((n) => n.attrs["data-testid"] === selector.value);
    }
    if (selector.kind === "role_index") {
      const withRole = all.filter((n) => n.role === selector.value);
      const idx = Number(selector.qualifier);
      return withRole[idx] ? [withRole[idx]] : [];
    }
    if (selector.kind === "attr") {
      return all.filter((n) => n.attrs[selector.qualifier] === selector.value);
    }
    return [];
  }

  return {
    query(selector) {
      const found = matchSelector(selector);
      return {
        node: found.length === 1 ? found[0] : found[0] ?? null,
        matches: found.length,
        pending: opts.pending ?? false,
      };
    },
    attr(nodeId, name) {
      const n = byId.get(nodeId);
      if (!n) return null;
      return Object.prototype.hasOwnProperty.call(n.attrs, name) ? n.attrs[name] : null;
    },
    click(nodeId) {
      calls.click++;
      if (byId.get(nodeId)?.attrs["data-opens-confirmation"] === "true") confirmationPresented = true;
    },
    type(nodeId, text) {
      calls.type++;
    },
    submit(nodeId) {
      calls.submit++;
      if (byId.get(nodeId)?.attrs["data-opens-confirmation"] === "true") confirmationPresented = true;
    },
    confirmationPresent() {
      return confirmationPresented;
    },
    acceptConfirmation() {
      if (!confirmationPresented) throw new Error("no confirmation presented");
      calls.acceptConfirmation++;
      confirmAccepted = true;
      confirmationPresented = false;
    },
    askModel() {
      calls.askModel++;
      throw new Error("askModel must never be called");
    },
    _calls: calls,
  };
}

const files = [
  "../challenge/examples/example-1-none.json",
  "../challenge/examples/example-2-node_wrapped.json",
  "../challenge/examples/example-3-node_removed.json",
];

for (const f of files) {
  const data = JSON.parse(readFileSync(new URL(f, import.meta.url), "utf8"));
  console.log("\n===", f, "===");
  console.log("note:", data.note, "replayCount:", data.replayCount);

  let report;
  const app = makeApp(data.liveTree);
  for (let i = 0; i < data.replayCount; i++) {
    report = subject.replay(data.trace, app);
  }
  console.log("outcome:", report.outcome, "unreplayableReason:", report.unreplayableReason);
  console.log("calls:", app._calls);
  console.log("steps:", JSON.stringify(report.steps, null, 2));
}
