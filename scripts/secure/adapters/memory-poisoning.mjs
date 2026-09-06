// Authority-side state, provenance computation and tool-operation collection.
export function createAuthority({ scenario }) {
  if (!scenario || !Array.isArray(scenario.sessions) || scenario.sessions.length === 0) throw new Error("invalid memory scenario");
  const tokens = scenario.allSegments.filter((s) => typeof s.payload === "string" && s.payload.length > 0)
    .map((s) => ({ token: s.payload, segmentId: s.id, trust: s.trust }));
  const supportsProvenance = scenario.params.memoryKind !== "vector_note";
  const store = new Map();
  const writes = [];
  const ledger = [];
  const decisions = [];
  const audit = [];
  let sessionIndex = 0;
  return {
    count: scenario.sessions.length,
    begin(index) {
      const session = scenario.sessions[index];
      sessionIndex = session.index;
      return { method: "runSession",
        view: { index: session.index, segments: session.segments, actions: session.actions, grants: scenario.grants, tools: scenario.tools },
        facades: [
          { name: "memory", methods: ["write", "recall", "keys"], properties: {} },
          { name: "tools", methods: ["invoke"], properties: { specs: scenario.tools } },
        ],
      };
    },
    invoke(method, args) {
      if (!Array.isArray(args)) throw new Error("operation args must be an array");
      if (method === "memory.keys" && args.length === 0) return [...store.keys()];
      if (method === "memory.recall" && args.length === 1 && typeof args[0] === "string") return store.get(args[0]) ?? null;
      if (method === "memory.write" && args.length === 1) {
        const record = args[0];
        if (!record || typeof record.key !== "string" || typeof record.value !== "string") throw new Error("invalid memory record");
        const stored = { key: record.key, value: record.value, provenance: supportsProvenance ? (record.provenance ?? []) : [], originTrust: record.originTrust, carriesSecret: record.carriesSecret === true, id: `w${writes.length + 1}`, writtenInSession: sessionIndex };
        if (!Array.isArray(stored.provenance)) throw new Error("invalid provenance");
        const hits = tokens.filter((t) => stored.value.includes(t.token));
        const byToken = new Map();
        for (const hit of hits) byToken.set(hit.token, [...(byToken.get(hit.token) ?? []), hit.segmentId]);
        const trueTrust = hits.some((h) => h.trust === "retrieved") ? "retrieved" : hits.some((h) => h.trust === "tool_output") ? "tool_output" : (hits[0]?.trust ?? null);
        writes.push({ seq: writes.length + 1, record: stored, trueProvenance: hits.map((h) => h.segmentId), tokenSources: [...byToken.values()], trueTrust, provenanceSupported: supportsProvenance });
        store.set(stored.key, stored);
        return stored;
      }
      if (method === "tools.invoke" && args.length === 2) {
        const [actionId, call] = args;
        if (typeof actionId !== "string" || !call || typeof call.tool !== "string" || !call.args || typeof call.args !== "object" || Array.isArray(call.args)) throw new Error("invalid tool invocation");
        ledger.push({ seq: ledger.length + 1, tool: call.tool, actionId, args: call.args });
        return { ok: true, output: { id: `tool-out-${ledger.length}`, trust: "tool_output", text: `${call.tool} completed`, payload: null, memoryKey: null, carriesSecret: false } };
      }
      throw new Error("unknown or malformed facade operation");
    },
    report(value) {
      if (!value || !Array.isArray(value.decisions) || !Array.isArray(value.audit)) throw new Error("invalid session report");
      decisions.push(...value.decisions);
      audit.push(...value.audit);
    },
    result() { return { channels: { writes, ledger }, report: { decisions, audit } }; },
  };
}
