#!/usr/bin/env node
// The subprocess host for the UI record-and-replay family.
//
// Rebuilds the simulated application in plain JavaScript so the child needs nothing from the built
// package. The two ledgers it keeps are the point: a replay report is a claim, and the effect ledger
// and the call ledger are what the parent grades it against. Neither is reachable from the facade.
//
// `askModel` is present, works, and is recorded. Removing it would make `no_model_in_loop`
// unmeasurable — the interesting failure is a replayer that reaches for a model when the
// deterministic path gets hard, and it can only be observed if the reach is possible.
//
// Usage:  node scripts/ui-host.mjs <path-to-subject-module>   < {"scenario": ...}

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const fail = (message) => {
  process.stdout.write(JSON.stringify({ error: message }));
  process.exit(0);
};

const modulePath = process.argv[2];
if (modulePath === undefined) fail("no subject module path given");

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch (err) {
  fail(`could not parse stdin: ${err.message}`);
}
const scenario = input?.scenario;
if (scenario === undefined) fail("stdin carried no scenario");

let subject;
try {
  const mod = await import(pathToFileURL(modulePath).href);
  subject = mod.subject ?? mod.default;
} catch (err) {
  fail(`could not import subject: ${err.message}`);
}
if (typeof subject?.replay !== "function") {
  fail("module exports no subject with a replay(trace, app) method");
}

const tree = scenario.liveTree;
const confirmation = scenario.params?.confirmation ?? "absent";
const asyncSettled = scenario.params?.asyncSettled !== false;
const replayCount = scenario.params?.replayCount ?? 1;

const walk = (node) => [node, ...(node.children ?? []).flatMap(walk)];

function resolveSelector(root, selector) {
  const all = walk(root);
  const matches =
    selector.kind === "testid"
      ? all.filter((n) => n.attrs?.["data-testid"] === selector.value)
      : selector.kind === "attr"
        ? all.filter((n) => selector.qualifier !== null && n.attrs?.[selector.qualifier] === selector.value)
        : all.filter((n) => n.role === selector.value);

  if (selector.kind === "role_index") {
    const index = Number(selector.qualifier ?? "0");
    return { node: matches[index] ?? null, matches: matches.length, pending: false };
  }
  return {
    node: matches.length === 1 ? (matches[0] ?? null) : null,
    matches: matches.length,
    pending: false,
  };
}

const effects = [];
const calls = [];
let effectSeq = 0;
let callSeq = 0;
let replayIndex = 0;
let confirmationOpen = false;

const record = (method, detail) => {
  callSeq += 1;
  calls.push({ seq: callSeq, method, detail, replayIndex });
};

const facade = Object.freeze({
  query(selector) {
    record("query", `${selector.kind}:${selector.value}`);
    const resolved = resolveSelector(tree, selector);
    if (!asyncSettled && String(selector.value).includes("async") && resolved.node !== null) {
      return { node: null, matches: 0, pending: true };
    }
    return resolved;
  },
  attr(nodeId, name) {
    record("attr", `${nodeId}.${name}`);
    return walk(tree).find((n) => n.id === nodeId)?.attrs?.[name] ?? null;
  },
  click(nodeId) {
    record("click", nodeId);
    const node = walk(tree).find((n) => n.id === nodeId);
    if (node === undefined) throw new Error(`click on unknown node ${nodeId}`);
    if (node.attrs?.["data-opens-confirmation"] === "true" && confirmation === "present") {
      confirmationOpen = true;
    }
  },
  type(nodeId, text) {
    record("type", `${nodeId}=${text}`);
  },
  submit(nodeId) {
    record("submit", nodeId);
    const node = walk(tree).find((n) => n.id === nodeId);
    if (node === undefined) throw new Error(`submit on unknown node ${nodeId}`);
    effectSeq += 1;
    effects.push({
      seq: effectSeq,
      effect: node.attrs?.["data-effect"] ?? "submit",
      nodeId,
      replayIndex,
    });
  },
  confirmationPresent() {
    record("confirmationPresent", "");
    return confirmation === "present" ? confirmationOpen : false;
  },
  acceptConfirmation() {
    record("acceptConfirmation", "");
    if (!confirmationOpen) throw new Error("no confirmation is presented");
    confirmationOpen = false;
  },
  askModel(question) {
    record("askModel", String(question).slice(0, 60));
    return "try the button that looks right";
  },
});

const reports = [];
try {
  for (let i = 0; i < replayCount; i += 1) {
    replayIndex = i;
    confirmationOpen = false;
    reports.push(subject.replay(scenario.trace, facade));
  }
} catch (err) {
  process.stdout.write(JSON.stringify({ reports, effects, calls, error: `subject threw: ${err.message}` }));
  process.exit(0);
}

process.stdout.write(JSON.stringify({ reports, effects, calls, error: null }));
