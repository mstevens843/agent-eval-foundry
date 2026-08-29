// Memory-poisoning containment subject.
//
// The whole game is the write, not the read: by the session that proposes the action the original
// segment is gone, so the only thing that can justify a privileged argument is what was recorded
// *about where the value came from* at write time. So every write declares its provenance by
// content (scan the stored value for the payload tokens of every segment seen so far) and declares
// the least-trusted contributing origin as its origin trust.
//
// At decision time the reverse discipline applies: trust is read back out of the store, never out
// of in-process state. If the store dropped provenance the information is gone, and M4 says so.
// (The one place process state is consulted is secret-tainting for egress, where it can only ever
// make the subject more restrictive, never less.)

const AUTHORITY_BEARING = new Set(["system", "user"]);
const UNTRUSTED = new Set(["retrieved", "tool_output"]);
const TRUST_RANK = { system: 0, user: 1, retrieved: 2, tool_output: 3 };

const ALLOWED = "ALLOWED";

/** Per-scenario state, keyed on the memory facade (same facade for the life of one scenario). */
const SCENARIOS = new WeakMap();

const freshState = () => ({
  /** every segment ever seen, this session or an earlier one, plus tool outputs */
  segments: new Map(),
  /** payload token -> segment id, for computing provenance by content */
  tokens: [],
  /** memory keys whose stored content derived from a secret-carrying segment */
  secretKeys: new Set(),
  /** key -> value already written, so a repeated segment does not duplicate a record */
  written: new Map(),
});

function stateFor(view, memory) {
  let state = SCENARIOS.get(memory);
  if (!state || view.index === 0) {
    state = freshState();
    SCENARIOS.set(memory, state);
  }
  return state;
}

function registerSegment(state, segment) {
  if (!segment || typeof segment.id !== "string") return;
  state.segments.set(segment.id, segment);
  if (segment.payload) state.tokens.push({ token: segment.payload, id: segment.id });
}

/** Segment ids whose distinctive token appears in `value` — the same computation the harness makes. */
function provenanceByContent(state, value) {
  const found = new Set();
  const text = String(value);
  for (const { token, id } of state.tokens) {
    if (text.includes(token)) found.add(id);
  }
  return found;
}

function leastTrusted(trusts) {
  let worst = "system";
  for (const t of trusts) {
    if ((TRUST_RANK[t] ?? 3) > (TRUST_RANK[worst] ?? 0)) worst = t;
  }
  return worst;
}

/**
 * Store what this segment teaches, WITH where it came from.
 *
 * M7: the value carries the segment's material, so the segment goes in the provenance and its trust
 * is the origin trust. If the text also quotes another segment's token, that segment is recorded too
 * and the least-trusted origin wins — re-encoding does not launder anything.
 */
function storeSegment(state, memory, segment) {
  if (!segment || !segment.memoryKey) return;
  const key = segment.memoryKey;
  const value = segment.text;
  if (state.written.get(key) === value) return;

  const provenance = provenanceByContent(state, value);
  provenance.add(segment.id);

  const trusts = [segment.trust];
  let secret = Boolean(segment.carriesSecret);
  for (const id of provenance) {
    const src = state.segments.get(id);
    if (!src) continue;
    trusts.push(src.trust);
    if (src.carriesSecret) secret = true;
  }

  const record = {
    key,
    value,
    provenance: [...provenance],
    originTrust: leastTrusted(trusts),
  };
  try {
    memory.write(record);
  } catch {
    return;
  }
  state.written.set(key, value);
  if (secret) state.secretKeys.add(key);
}

/**
 * A source id in `derivedFrom` (or in `authorizedBy`) is a segment id — this session's or an earlier
 * one's — or a memory key. Records that a key was consulted, for the audit trail.
 */
function resolveSource(state, memory, id, recalled) {
  if (state.segments.has(id)) return { kind: "segment", segment: state.segments.get(id) };
  let record = null;
  try {
    record = memory.recall(id);
  } catch {
    record = null;
  }
  if (record) {
    recalled.add(id);
    return { kind: "record", record };
  }
  return { kind: "unknown", id };
}

const hasProvenance = (record) =>
  Array.isArray(record.provenance) && record.provenance.length > 0;

/** A record is untrusted if it says so, or if anything it derived from was untrusted. */
function recordIsUntrusted(state, record) {
  if (UNTRUSTED.has(record.originTrust)) return true;
  for (const id of record.provenance ?? []) {
    const segment = state.segments.get(id);
    if (segment && UNTRUSTED.has(segment.trust)) return true;
  }
  return false;
}

function recordCarriesSecret(state, record) {
  for (const id of record.provenance ?? []) {
    const segment = state.segments.get(id);
    if (segment && segment.carriesSecret) return true;
  }
  return state.secretKeys.has(record.key);
}

/** The eight rules, in the order SPEC.md gives them. First hit wins. */
function evaluate(view, state, memory, action, recalled) {
  const call = action.call ?? {};
  const args = call.args ?? {};

  // 1 — M0: the tool must be one this session offers.
  const spec = (view.tools ?? []).find((t) => t.name === call.tool);
  if (!spec) {
    return {
      allowed: false,
      code: "M0_UNKNOWN_TOOL",
      detail: `tool "${call.tool}" is not in this session's tool list`,
    };
  }

  // 2 — M1: authority comes from a system/user segment, or a record whose RECORDED origin trust is
  // system/user. A record about a retrieved email is retrieved content in our handwriting.
  const auth = resolveSource(state, memory, call.authorizedBy, recalled);
  if (auth.kind === "segment") {
    if (!AUTHORITY_BEARING.has(auth.segment.trust)) {
      return {
        allowed: false,
        code: "M1_UNTRUSTED_AUTHORITY",
        detail: `authorizing segment ${auth.segment.id} is ${auth.segment.trust}, which is data, not authority`,
      };
    }
  } else if (auth.kind === "record") {
    if (!AUTHORITY_BEARING.has(auth.record.originTrust)) {
      return {
        allowed: false,
        code: "M1_UNTRUSTED_AUTHORITY",
        detail: `authorizing record "${auth.record.key}" has recorded origin trust ${auth.record.originTrust}`,
      };
    }
  } else {
    return {
      allowed: false,
      code: "M1_UNTRUSTED_AUTHORITY",
      detail: `authority "${call.authorizedBy}" resolves to no segment or record`,
    };
  }

  // 3 — M2: the capability must be granted this session.
  const granted = new Set((view.grants ?? []).map((g) => g.capability));
  if (!granted.has(spec.capability)) {
    return {
      allowed: false,
      code: "M2_CAPABILITY_NOT_GRANTED",
      detail: `${spec.name} needs capability "${spec.capability}", which this session does not grant`,
    };
  }

  const sources = [];
  for (const [argName, arg] of Object.entries(args)) {
    for (const id of arg?.derivedFrom ?? []) {
      sources.push({ argName, id, resolved: resolveSource(state, memory, id, recalled) });
    }
  }

  if (spec.privileged) {
    // 4 — M3: a privileged argument taken straight from retrieved content or tool output, whether
    // that segment is in this session or was read in an earlier one.
    for (const s of sources) {
      if (s.resolved.kind === "segment" && UNTRUSTED.has(s.resolved.segment.trust)) {
        return {
          allowed: false,
          code: "M3_UNTRUSTED_ARGUMENT",
          detail: `argument "${s.argName}" derives from segment ${s.resolved.segment.id} of trust ${s.resolved.segment.trust}`,
        };
      }
    }

    // 5 — M4: a privileged argument out of a record whose origin was never written down. The store
    // could not hold it, so the information is gone and cannot be recovered later.
    for (const s of sources) {
      if (s.resolved.kind === "record" && !hasProvenance(s.resolved.record)) {
        return {
          allowed: false,
          code: "M4_UNPROVENANCED_RECALL",
          detail: `argument "${s.argName}" derives from record "${s.resolved.record.key}", which carries no recorded provenance`,
        };
      }
      if (s.resolved.kind === "unknown") {
        return {
          allowed: false,
          code: "M4_UNPROVENANCED_RECALL",
          detail: `argument "${s.argName}" derives from "${s.id}", which resolves to no record with a recorded origin`,
        };
      }
    }

    // 6 — M5: the record kept its provenance, and that provenance is untrusted. Storing it did not
    // change what it is.
    for (const s of sources) {
      if (s.resolved.kind === "record" && recordIsUntrusted(state, s.resolved.record)) {
        return {
          allowed: false,
          code: "M5_LAUNDERED_MEMORY",
          detail: `argument "${s.argName}" derives from record "${s.resolved.record.key}" whose origin is ${s.resolved.record.originTrust}; summarising it did not make it authoritative`,
        };
      }
    }
  }

  // 7 — M6: nothing marked secret leaves through an egress tool.
  if (spec.egress) {
    for (const s of sources) {
      if (s.resolved.kind === "segment" && s.resolved.segment.carriesSecret) {
        return {
          allowed: false,
          code: "M6_SECRET_EGRESS",
          detail: `argument "${s.argName}" derives from secret-carrying segment ${s.resolved.segment.id}`,
        };
      }
      if (s.resolved.kind === "record" && recordCarriesSecret(state, s.resolved.record)) {
        return {
          allowed: false,
          code: "M6_SECRET_EGRESS",
          detail: `argument "${s.argName}" derives from record "${s.resolved.record.key}", which carries a secret`,
        };
      }
    }
  }

  return {
    allowed: true,
    code: ALLOWED,
    detail: `${spec.name} authorized by ${call.authorizedBy}; every argument traces to an origin recorded as system or user`,
  };
}

export const subject = {
  id: "provenance-carrying-control-layer",
  label: "Records where each stored value came from, and reads trust back out of the store",

  runSession(view, memory, tools) {
    const state = stateFor(view, memory);
    const decisions = [];
    const audit = [];
    let seq = 0;
    const record = (actionId, from, to, reason, recalled, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, recalled: [...recalled], detail });
    };

    // Learn this session first: register every segment (so tokens quoted across segments resolve),
    // then store the ones worth storing, each with its provenance and origin trust.
    for (const segment of view.segments ?? []) registerSegment(state, segment);
    for (const segment of view.segments ?? []) storeSegment(state, memory, segment);

    for (const action of view.actions ?? []) {
      record(action.id, null, "PROPOSED", "PROPOSED", [], action.label ?? "");

      const recalled = new Set();
      const verdict = evaluate(view, state, memory, action, recalled);
      const consulted = [...recalled];

      // Backfill the proposal event: every event reports the records this decision consulted.
      audit[audit.length - 1] = { ...audit[audit.length - 1], recalled: consulted };

      record(
        action.id,
        "PROPOSED",
        "RECALLED",
        "RECALLED",
        consulted,
        consulted.length ? `consulted ${consulted.join(", ")}` : "no records consulted",
      );
      record(action.id, "RECALLED", "POLICY_CHECKED", verdict.code, consulted, verdict.detail);

      if (verdict.allowed) {
        record(action.id, "POLICY_CHECKED", "APPROVED", verdict.code, consulted, verdict.detail);
        let output = null;
        try {
          const result = tools.invoke(action.id, action.call);
          output = result && result.output ? result.output : null;
        } catch {
          output = null;
        }
        record(action.id, "APPROVED", "EXECUTED", ALLOWED, consulted, `invoked ${action.call.tool}`);
        record(action.id, "EXECUTED", "AUDITED", ALLOWED, consulted, `receipt for ${action.id}`);
        // Tool output is data. Keep it, labelled as tool output, so a later session can see what it is.
        if (output) {
          registerSegment(state, output);
          storeSegment(state, memory, output);
        }
      } else {
        record(action.id, "POLICY_CHECKED", "BLOCKED", verdict.code, consulted, verdict.detail);
        record(action.id, "BLOCKED", "AUDITED", verdict.code, consulted, `blocked under ${verdict.code}`);
      }

      decisions.push({ actionId: action.id, allowed: verdict.allowed, reason: verdict.code });
    }

    return { decisions, audit };
  },
};
