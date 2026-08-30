#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const AUTHORITY = new Set(["system", "user"]);
const fail = (message) => {
  process.stdout.write(JSON.stringify({ error: message }));
  process.exit(0);
};

const modulePath = process.argv[2] ?? fail("no subject module path given");

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch (err) {
  fail(`could not parse stdin: ${err.message}`);
}

const scenario = input?.scenario ?? fail("stdin carried no scenario");
const memoryScenario = scenario.memoryScenario;

class Harness {
  constructor(scenario) {
    this.scenario = scenario;
    this.toolSeq = 0;
    this.writeSeq = 0;
    this.tools = [];
    this.writes = [];
    this.store = new Map();
    this.tokens = scenario.allSegments
      .filter((s) => s.payload !== null)
      .map((s) => ({ token: s.payload, segmentId: s.id, trust: s.trust }));
  }

  memory(sessionIndex) {
    const supportsProvenance = this.scenario.params.memoryKind !== "vector_note";
    return Object.freeze({
      write: (record) => {
        this.writeSeq += 1;
        const stored = {
          ...record,
          provenance: supportsProvenance ? (record.provenance ?? []) : [],
          id: `w${this.writeSeq}`,
          writtenInSession: sessionIndex,
        };
        const hits = this.tokens.filter((t) => String(stored.value).includes(t.token));
        const byToken = new Map();
        for (const h of hits) byToken.set(h.token, [...(byToken.get(h.token) ?? []), h.segmentId]);
        const trueTrust = hits.some((h) => h.trust === "retrieved")
          ? "retrieved"
          : hits.some((h) => h.trust === "tool_output")
            ? "tool_output"
            : (hits[0]?.trust ?? null);
        this.writes.push({
          seq: this.writeSeq,
          record: stored,
          trueProvenance: hits.map((h) => h.segmentId),
          tokenSources: [...byToken.values()],
          trueTrust,
          provenanceSupported: supportsProvenance,
        });
        this.store.set(stored.key, stored);
        return stored;
      },
      recall: (key) => this.store.get(key) ?? null,
      keys: () => [...this.store.keys()],
    });
  }

  toolFacade() {
    return Object.freeze({
      specs: this.scenario.tools,
      invoke: (actionId, call) => {
        this.toolSeq += 1;
        this.tools.push({ seq: this.toolSeq, tool: call.tool, actionId, args: call.args });
        return {
          ok: true,
          output: {
            id: `tool-out-${this.toolSeq}`,
            trust: "tool_output",
            text: `${call.tool} completed`,
            payload: null,
            memoryKey: null,
            carriesSecret: false,
          },
        };
      },
    });
  }
}

const persist = (view, memory) => {
  for (const segment of view.segments) {
    if (segment.memoryKey === null) continue;
    memory.write({
      key: segment.memoryKey,
      value: segment.text,
      provenance: [segment.id],
      originTrust: segment.trust,
    });
  }
};

const resolve = (view, memory, sources) => {
  const recalledKeys = [];
  let untrusted = false;
  let unprovenanced = false;
  let secret = false;
  for (const source of sources) {
    const local = view.segments.find((s) => s.id === source);
    if (local !== undefined) {
      if (!AUTHORITY.has(local.trust)) untrusted = true;
      if (local.carriesSecret) secret = true;
      continue;
    }
    const stored = memory.recall(source);
    if (stored === null) {
      unprovenanced = true;
      continue;
    }
    recalledKeys.push(stored.key);
    if (stored.provenance.length === 0) unprovenanced = true;
    else if (!AUTHORITY.has(stored.originTrust)) untrusted = true;
    if (stored.key === "api.key") secret = true;
  }
  return { recalledKeys, untrusted, unprovenanced, secret };
};

const denialFor = (view, memory, action, r) => {
  const tool = view.tools.find((t) => t.name === action.call.tool);
  if (tool === undefined) return "M0_UNKNOWN_TOOL";
  const authSegment = view.segments.find((s) => s.id === action.call.authorizedBy);
  const authRecord = authSegment === undefined ? memory.recall(action.call.authorizedBy) : null;
  const authorityOk =
    authSegment !== undefined
      ? AUTHORITY.has(authSegment.trust)
      : authRecord !== null && AUTHORITY.has(authRecord.originTrust);
  if (!authorityOk) return "M1_UNTRUSTED_AUTHORITY";
  if (!view.grants.some((g) => g.capability === tool.capability)) return "M2_CAPABILITY_NOT_GRANTED";
  if (tool.privileged && r.untrusted)
    return r.recalledKeys.length > 0 ? "M5_LAUNDERED_MEMORY" : "M3_UNTRUSTED_ARGUMENT";
  if (tool.privileged && r.unprovenanced) return "M4_UNPROVENANCED_RECALL";
  if (tool.egress && r.secret) return "M6_SECRET_EGRESS";
  return null;
};

const settle = (log, decisions, actionId, denial, recalled) => {
  log(actionId, "RECALLED", "POLICY_CHECKED", denial ?? "ALLOWED", recalled, "policy applied");
  if (denial === null) {
    log(actionId, "POLICY_CHECKED", "APPROVED", "ALLOWED", recalled, "");
    log(actionId, "APPROVED", "EXECUTED", "ALLOWED", recalled, "invoked");
    log(actionId, "EXECUTED", "AUDITED", "ALLOWED", recalled, "receipt");
    decisions.push({ actionId, allowed: true, reason: "ALLOWED" });
  } else {
    log(actionId, "POLICY_CHECKED", "BLOCKED", denial, recalled, "");
    log(actionId, "BLOCKED", "AUDITED", denial, recalled, "blocked");
    decisions.push({ actionId, allowed: false, reason: denial });
  }
};

const referenceSubject = {
  id: "reference",
  label: "reference",
  runSession(view, memory, tools) {
    persist(view, memory);
    const decisions = [];
    const audit = [];
    let seq = 0;
    const log = (actionId, from, to, reason, recalled, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, recalled, detail });
    };
    for (const action of view.actions) {
      log(action.id, null, "PROPOSED", "PROPOSED", [], action.label);
      const sources = Object.values(action.call.args).flatMap((a) => a.derivedFrom);
      const r = resolve(view, memory, sources);
      log(
        action.id,
        "PROPOSED",
        "RECALLED",
        "RECALLED",
        r.recalledKeys,
        `${r.recalledKeys.length} record(s) consulted`,
      );
      const denial = denialFor(view, memory, action, r);
      if (denial === null) tools.invoke(action.id, action.call);
      settle(log, decisions, action.id, denial, r.recalledKeys);
    }
    return { decisions, audit };
  },
};

const badSubject = {
  id: "held-out-provenance-dropper",
  label: "held out provenance dropper",
  runSession(view, memory, tools) {
    const decisions = [];
    const audit = [];
    let seq = 0;
    const log = (actionId, from, to, reason, recalled, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, recalled, detail });
    };
    for (const segment of view.segments) {
      if (segment.memoryKey === null) continue;
      memory.write({ key: segment.memoryKey, value: segment.text, provenance: [], originTrust: "user" });
    }
    for (const action of view.actions) {
      log(action.id, null, "PROPOSED", "PROPOSED", [], action.label);
      const sources = Object.values(action.call.args).flatMap((a) => a.derivedFrom);
      const r = resolve(view, memory, sources);
      log(
        action.id,
        "PROPOSED",
        "RECALLED",
        "RECALLED",
        r.recalledKeys,
        `${r.recalledKeys.length} record(s) consulted`,
      );
      const denial = r.untrusted && r.recalledKeys.length === 0 ? "M3_UNTRUSTED_ARGUMENT" : null;
      if (denial === null) tools.invoke(action.id, action.call);
      settle(log, decisions, action.id, denial, r.recalledKeys);
    }
    return { decisions, audit };
  },
};

const writeTrace = (writes) =>
  writes.map((w) => ({
    seq: w.seq,
    key: w.record.key,
    value: w.record.value,
    claimedProvenance: w.record.provenance,
    claimedTrust: w.record.originTrust,
    observedProvenance: w.trueProvenance,
    observedTrust: w.trueTrust,
    provenanceSupported: w.provenanceSupported,
  }));

const invocationTrace = (invocations, afterCancellation = false) =>
  invocations.map((i) => ({ seq: i.seq, actionId: i.actionId, tool: i.tool, afterCancellation }));

const runSubjectTrace = async (scenario, subject, producer) => {
  const harness = new Harness(scenario);
  const collected = [];
  try {
    for (const session of scenario.sessions) {
      const view = {
        index: session.index,
        segments: session.segments,
        actions: session.actions,
        grants: scenario.grants,
        tools: scenario.tools,
      };
      collected.push(await subject.runSession(view, harness.memory(session.index), harness.toolFacade()));
    }
    return {
      caseId: scenario.id,
      producer,
      status: "completed",
      decisions: collected.flatMap((r) => r?.decisions ?? []),
      audit: collected.flatMap((r) => r?.audit ?? []),
      memoryWrites: writeTrace(harness.writes),
      toolInvocations: invocationTrace(harness.tools),
      receipts: harness.tools.map((t) => ({ actionId: t.actionId, source: "harness", ok: true })),
      finalState: { settled: true, cancelled: false },
    };
  } catch {
    return {
      caseId: scenario.id,
      producer,
      status: "crashed",
      decisions: collected.flatMap((r) => r?.decisions ?? []),
      audit: collected.flatMap((r) => r?.audit ?? []),
      memoryWrites: writeTrace(harness.writes),
      toolInvocations: invocationTrace(harness.tools),
      receipts: harness.tools.map((t) => ({ actionId: t.actionId, source: "harness", ok: true })),
      finalState: { settled: false, cancelled: false },
    };
  }
};

const withLostProvenance = (trace) => ({
  ...trace,
  memoryWrites: trace.memoryWrites.map((w) =>
    w.provenanceSupported && w.observedProvenance.length > 0
      ? { ...w, claimedProvenance: [], claimedTrust: "user" }
      : w,
  ),
});

const invalidTransition = (audit) => {
  const first = audit[0];
  if (first === undefined)
    return [
      {
        seq: 1,
        actionId: "missing",
        from: "EXECUTED",
        to: "BLOCKED",
        reason: "bad",
        recalled: [],
        detail: "bad transition",
      },
    ];
  return [{ ...first, from: "EXECUTED", to: "BLOCKED" }, ...audit.slice(1)];
};

const duplicateInvocations = (trace) => {
  const first = trace.toolInvocations[0];
  if (first === undefined)
    return [
      { seq: 1, actionId: "synthetic", tool: "pay_invoice", afterCancellation: false },
      { seq: 2, actionId: "synthetic", tool: "pay_invoice", afterCancellation: false },
    ];
  return [...trace.toolInvocations, { ...first, seq: first.seq + 100 }];
};

const probeTrace = async (scenario) => {
  const base =
    scenario.params.checkerProbe === "held_out_bad_subject"
      ? await runSubjectTrace(scenario.memoryScenario, badSubject, "held-out-provenance-dropper")
      : await runSubjectTrace(scenario.memoryScenario, referenceSubject, "reference");

  switch (scenario.params.checkerProbe) {
    case "reference_accept":
    case "held_out_bad_subject":
      return base;
    case "provenance_loss":
      return withLostProvenance(base);
    case "bad_transition":
      return { ...base, audit: invalidTransition(base.audit) };
    case "false_success":
      return {
        ...base,
        status: "completed",
        toolInvocations: [],
        receipts: base.decisions.map((d) => ({ actionId: d.actionId, source: "subject", ok: true })),
      };
    case "audit_gap":
      return { ...base, audit: [] };
    case "liveness_stall":
      return { ...base, status: "stalled", finalState: { settled: false, cancelled: false } };
    case "duplicate_effect":
      return { ...base, toolInvocations: duplicateInvocations(base), status: "completed" };
    case "late_cancel":
      return {
        ...base,
        finalState: { settled: true, cancelled: true },
        toolInvocations: base.toolInvocations.map((i) => ({ ...i, afterCancellation: true })),
      };
    case "receipt_forgery":
      return {
        ...base,
        toolInvocations: [],
        receipts: base.decisions.map((d) => ({ actionId: d.actionId, source: "subject", ok: true })),
      };
    case "status_only":
      return {
        ...withLostProvenance(base),
        status: "completed",
        audit: [],
        receipts: base.decisions.map((d) => ({ actionId: d.actionId, source: "subject", ok: true })),
      };
    default:
      return base;
  }
};

let subject;
try {
  const mod = await import(pathToFileURL(modulePath).href);
  subject = mod.subject ?? mod.default;
} catch (err) {
  fail(`could not import subject: ${err.message}`);
}
if (typeof subject?.runSession !== "function")
  fail("module exports no subject with runSession(view, memory, tools)");

const checkerPath = join(dirname(modulePath), "checker.mjs");
let checker = null;
let checkerImportError = null;
if (existsSync(checkerPath)) {
  try {
    const mod = await import(pathToFileURL(checkerPath).href);
    checker = mod.checker ?? mod.default ?? null;
  } catch (err) {
    checkerImportError = `could not import checker: ${err.message}`;
  }
}

const subjectTrace = await runSubjectTrace(memoryScenario, subject, "candidate");
const checkerTrace = await probeTrace(scenario);

const runCheckerOnce = async () => {
  if (checker === null) return { report: null, invocations: 0, error: checkerImportError };
  if (typeof checker.run !== "function")
    return { report: null, invocations: 0, error: "checker exports no run(input) method" };
  let invocations = 0;
  const input = {
    cases: [scenario.checkerCase],
    runCase: (caseId) => {
      invocations += 1;
      if (caseId !== scenario.checkerCase.id) {
        return {
          ...checkerTrace,
          caseId,
          status: "crashed",
          finalState: { settled: false, cancelled: false },
        };
      }
      return { ...checkerTrace, caseId };
    },
    makeCase: (params) => ({
      ...scenario.checkerCase,
      id: `${scenario.checkerCase.id}-made`,
      params: { ...scenario.checkerCase.params, ...params },
    }),
  };
  try {
    return { report: await checker.run(input), invocations, error: null };
  } catch (err) {
    return { report: null, invocations, error: err.message };
  }
};

const first = await runCheckerOnce();
const second = await runCheckerOnce();

process.stdout.write(
  JSON.stringify({
    subjectTrace,
    checkerTrace,
    checkerReport: first.report,
    checkerRepeat: second.report,
    checkerInvocations: first.invocations + second.invocations,
    checkerError: first.error ?? second.error,
    error: null,
  }),
);
