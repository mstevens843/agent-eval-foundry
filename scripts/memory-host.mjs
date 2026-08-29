#!/usr/bin/env node
// The subprocess host for the memory-poisoning family. Runs ONE subject across ONE scenario's
// sessions, in a process the grader does not share.
//
// It rebuilds the facades in plain JavaScript rather than importing the family, for the same reason
// the containment host does: the child must not need the built package, and a subject that could
// import the family could read the verifier. The cost of that choice is drift — two implementations
// of the same facade semantics — and the cost is paid by `test/trials-routing.test.ts`, which runs
// the reference through this host and asserts the graded cells are identical to the in-process run.
// If the facades drift, that test fails.
//
// What the host computes for itself, and the subject cannot influence: the TRUE provenance of every
// memory write, by scanning the stored value for the payload tokens the scenario declares. That is
// the measurement `provenance_persisted` is built on, and it is why the write ledger leaves this
// process rather than the subject's account of it.
//
// Usage:  node scripts/memory-host.mjs <path-to-subject-module>   < {"scenario": ...}

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const fail = (message) => {
  process.stdout.write(JSON.stringify({ error: message }));
  process.exit(0); // exit 0: a failed subject is data, not a harness failure
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
if (typeof subject?.runSession !== "function") {
  fail("module exports no subject with a runSession(view, memory, tools) method");
}

const segments = scenario.allSegments ?? [];
const tokens = segments
  .filter((s) => typeof s.payload === "string" && s.payload.length > 0)
  .map((s) => ({ token: s.payload, segmentId: s.id, trust: s.trust }));

// A `vector_note` store keeps the text and nothing else. Enforced here, not left to the subject.
const supportsProvenance = scenario.params?.memoryKind !== "vector_note";

const store = new Map();
const writes = [];
const ledger = [];
let writeSeq = 0;
let toolSeq = 0;

const memoryFor = (sessionIndex) =>
  Object.freeze({
    write(record) {
      writeSeq += 1;
      const stored = {
        key: record.key,
        value: record.value,
        provenance: supportsProvenance ? (record.provenance ?? []) : [],
        originTrust: record.originTrust,
        id: `w${writeSeq}`,
        writtenInSession: sessionIndex,
      };
      const value = String(stored.value ?? "");
      const hits = tokens.filter((t) => value.includes(t.token));
      const byToken = new Map();
      for (const h of hits) byToken.set(h.token, [...(byToken.get(h.token) ?? []), h.segmentId]);
      const trueTrust = hits.some((h) => h.trust === "retrieved")
        ? "retrieved"
        : hits.some((h) => h.trust === "tool_output")
          ? "tool_output"
          : (hits[0]?.trust ?? null);
      writes.push({
        seq: writeSeq,
        record: stored,
        trueProvenance: hits.map((h) => h.segmentId),
        tokenSources: [...byToken.values()],
        trueTrust,
        provenanceSupported: supportsProvenance,
      });
      store.set(stored.key, stored);
      return stored;
    },
    recall(key) {
      return store.get(key) ?? null;
    },
    keys() {
      return [...store.keys()];
    },
  });

const tools = Object.freeze({
  specs: scenario.tools ?? [],
  invoke(actionId, call) {
    toolSeq += 1;
    ledger.push({ seq: toolSeq, tool: call.tool, actionId, args: call.args });
    return {
      ok: true,
      output: {
        id: `tool-out-${toolSeq}`,
        trust: "tool_output",
        text: `${call.tool} completed`,
        payload: null,
        memoryKey: null,
        carriesSecret: false,
      },
    };
  },
});

const decisions = [];
const audit = [];
try {
  for (const session of scenario.sessions ?? []) {
    const view = {
      index: session.index,
      segments: session.segments,
      actions: session.actions,
      grants: scenario.grants ?? [],
      tools: scenario.tools ?? [],
    };
    const report = subject.runSession(view, memoryFor(session.index), tools);
    for (const d of report?.decisions ?? []) decisions.push(d);
    for (const e of report?.audit ?? []) audit.push(e);
  }
} catch (err) {
  process.stdout.write(
    JSON.stringify({ writes, ledger, report: { decisions, audit }, error: `subject threw: ${err.message}` }),
  );
  process.exit(0);
}

process.stdout.write(JSON.stringify({ writes, ledger, report: { decisions, audit }, error: null }));
