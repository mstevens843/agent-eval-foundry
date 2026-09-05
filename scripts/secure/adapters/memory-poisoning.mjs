// Trusted cell-side adapter for prompt-injection-memory-poisoning.
//
// Ports memory-host.mjs's facade logic unchanged in substance: the true provenance of a write is
// still computed here (scanning the stored value for the scenario's payload tokens), the subject
// still never sees the `writes`/`ledger` arrays, and `sessionIndex` is still a host-owned variable a
// session cannot set. What moved is WHERE this code runs: it is now the cell's trusted wrapper around
// the submission, not code sharing an unprotected process with a grading parent's stdout write.
//
// Every fact this adapter would have pushed onto a local array, it instead reports through `emit`
// with a `channel` tag ("writes" or "ledger") so the authority process — which never imports the
// submission and only trusts signed frames — can rebuild the exact arrays memVerify expects.

export async function runCell({ subject, payload, emit }) {
  const scenario = payload?.scenario;
  if (scenario === undefined || scenario === null || typeof scenario !== "object") {
    throw new Error("stdin carried no scenario");
  }
  if (typeof subject.runSession !== "function") {
    throw new Error("module exports no subject with a runSession(view, memory, tools) method");
  }

  const segments = scenario.allSegments ?? [];
  const tokens = segments
    .filter((s) => typeof s.payload === "string" && s.payload.length > 0)
    .map((s) => ({ token: s.payload, segmentId: s.id, trust: s.trust }));

  const supportsProvenance = scenario.params?.memoryKind !== "vector_note";

  const store = new Map();
  let writeSeq = 0;
  let toolSeq = 0;
  let sessionIndex = 0;

  const memory = Object.freeze({
    write(record) {
      writeSeq += 1;
      const stored = {
        key: record.key,
        value: record.value,
        provenance: supportsProvenance ? (record.provenance ?? []) : [],
        originTrust: record.originTrust,
        carriesSecret: record.carriesSecret === true,
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
      emit("call", {
        channel: "writes",
        entry: {
          seq: writeSeq,
          record: stored,
          trueProvenance: hits.map((h) => h.segmentId),
          tokenSources: [...byToken.values()],
          trueTrust,
          provenanceSupported: supportsProvenance,
        },
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
      emit("call", {
        channel: "ledger",
        entry: { seq: toolSeq, tool: call.tool, actionId, args: call.args },
      });
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
  for (const session of scenario.sessions ?? []) {
    const view = {
      index: session.index,
      segments: session.segments,
      actions: session.actions,
      grants: scenario.grants ?? [],
      tools: scenario.tools ?? [],
    };
    sessionIndex = session.index;
    const report = await subject.runSession(view, memory, tools);
    for (const d of report?.decisions ?? []) decisions.push(d);
    for (const e of report?.audit ?? []) audit.push(e);
  }
  emit("report", { decisions, audit });
}
