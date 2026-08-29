// Control layer for the memory-poisoning family.
//
// The whole task turns on one habit: every value that leaves a session goes into the store WITH the
// segment it came from and the trust of that segment. Sessions later, the record is all that is left,
// so a decision is only as good as the provenance that was written down at the time.
//
//   runSession(view, memory, tools) -> { decisions, audit }

const AUTHORITY_BEARING = new Set(["system", "user"]);
const UNTRUSTED_TRUST = new Set(["retrieved", "tool_output"]);
const KNOWN_TRUST = new Set(["system", "user", "retrieved", "tool_output"]);

// ---------------------------------------------------------------- cross-session bookkeeping
//
// Scoped to the memory facade, because the facade is what is shared across one scenario's sessions.
// This holds ONLY what the store cannot: the secret flag of the segments behind a key, and the
// segments seen in earlier sessions. It deliberately never reconstructs provenance the store
// dropped — a value whose origin was not written down is gone, and M4 says so.

const stateByMemory = new WeakMap();
let lastState = null;

const freshState = () => ({
  segmentsById: new Map(), // every segment seen so far, by id
  segmentToKey: new Map(), // segment id -> the key it was stored under
  keyToMeta: new Map(), // memory key -> { originTrust, carriesSecret, segmentIds }
});

function stateFor(view, memory) {
  const scoped = memory && typeof memory === "object";
  if (view && view.index === 0) {
    const created = freshState();
    if (scoped) stateByMemory.set(memory, created);
    lastState = created;
    return created;
  }
  let state = scoped ? stateByMemory.get(memory) : null;
  if (!state) {
    state = lastState || freshState();
    if (scoped) stateByMemory.set(memory, state);
    lastState = state;
  }
  return state;
}

// ---------------------------------------------------------------- writing, with provenance

/**
 * Store one segment under the key the scenario published for it.
 *
 * The value is the segment's distinctive payload, so what is stored is exactly the material that
 * derives from this segment and nothing else. `provenance` names that segment and `originTrust`
 * carries its trust — M7 in full. If the store is a `vector_note` it will drop the provenance
 * anyway; that loss is recorded so later sessions treat the record as unprovenanced rather than
 * quietly repairing it from this side table.
 */
function writeSegment(state, memory, segment) {
  if (!segment || !segment.memoryKey) return null;
  state.segmentsById.set(segment.id, segment);

  const value = segment.payload == null ? String(segment.text ?? "") : String(segment.payload);
  let written = null;
  try {
    written = memory.write({
      key: segment.memoryKey,
      value,
      provenance: [segment.id],
      originTrust: segment.trust,
    });
  } catch {
    return null;
  }

  state.segmentToKey.set(segment.id, segment.memoryKey);
  state.keyToMeta.set(segment.memoryKey, {
    originTrust: segment.trust,
    carriesSecret: !!segment.carriesSecret,
    segmentIds: [segment.id],
    provenanceKept: !!(written && Array.isArray(written.provenance) && written.provenance.length > 0),
  });
  return written;
}

// ---------------------------------------------------------------- reading a record honestly

const hasProvenance = (record) =>
  !!record && Array.isArray(record.provenance) && record.provenance.length > 0;

/** A record is untrusted if its own recorded origin is data, or if any origin it names was. */
function recordIsUntrusted(state, record) {
  if (!record) return true;
  const trust = record.originTrust;
  if (!KNOWN_TRUST.has(trust)) return true;
  if (UNTRUSTED_TRUST.has(trust)) return true;
  for (const origin of record.provenance || []) {
    const seg = state.segmentsById.get(origin);
    if (seg && UNTRUSTED_TRUST.has(seg.trust)) return true; // transitive: laundering changes nothing
    const meta = state.keyToMeta.get(origin);
    if (meta && UNTRUSTED_TRUST.has(meta.originTrust)) return true;
  }
  return false;
}

function recordCarriesSecret(state, key, record) {
  const meta = state.keyToMeta.get(key);
  if (meta && meta.carriesSecret) return true;
  for (const origin of (record && record.provenance) || []) {
    const seg = state.segmentsById.get(origin);
    if (seg && seg.carriesSecret) return true;
  }
  return false;
}

// ---------------------------------------------------------------- the subject

export const subject = {
  id: "provenance-first-control-layer",
  label: "Provenance-first control layer for cross-session memory",

  runSession(view, memory, tools) {
    const state = stateFor(view, memory);
    const decisions = [];
    const audit = [];
    let seq = 0;
    const emit = (actionId, from, to, reason, recalled, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, recalled: recalled.slice(), detail });
    };

    const segments = (view && view.segments) || [];
    const current = new Map();
    for (const segment of segments) {
      current.set(segment.id, segment);
      state.segmentsById.set(segment.id, segment);
    }

    // Record what this session teaches, with where it came from, before anything acts on it.
    for (const segment of segments) writeSegment(state, memory, segment);

    const sessionTools =
      view && Array.isArray(view.tools) && view.tools.length ? view.tools : (tools && tools.specs) || [];
    const specs = new Map(sessionTools.map((spec) => [spec.name, spec]));
    const grants = new Set(((view && view.grants) || []).map((grant) => grant.capability));

    for (const action of (view && view.actions) || []) {
      const call = action.call || {};
      const consulted = [];
      const noteKey = (key) => {
        if (!consulted.includes(key)) consulted.push(key);
      };

      const heldKeys = new Set(typeof memory.keys === "function" ? memory.keys() : []);
      const readRecord = (key) => {
        const record = typeof memory.recall === "function" ? memory.recall(key) : null;
        if (record) noteKey(key);
        return record;
      };

      /**
       * A source is either a segment of THIS session or something that arrived through the store.
       * Keeping those apart is what makes M3 and M5 disjoint.
       */
      const resolve = (ref) => {
        if (ref == null) return { kind: "unknown", ref };
        if (current.has(ref)) return { kind: "segment", ref, segment: current.get(ref) };
        if (heldKeys.has(ref)) {
          const record = readRecord(ref);
          return record ? { kind: "record", ref, key: ref, record } : { kind: "unknown", ref };
        }
        const past = state.segmentsById.get(ref);
        if (past) {
          const key = state.segmentToKey.get(ref);
          const record = key ? readRecord(key) : null;
          if (record) return { kind: "record", ref, key, record };
          return { kind: "stale_segment", ref, segment: past };
        }
        const record = readRecord(ref); // a record the store held before we wrote anything
        return record ? { kind: "record", ref, key: ref, record } : { kind: "unknown", ref };
      };

      emit(action.id, null, "PROPOSED", "PROPOSED", [], action.label || call.tool || action.id);

      const authority = resolve(call.authorizedBy);
      const sources = [];
      const args = call.args || {};
      for (const argName of Object.keys(args)) {
        const arg = args[argName] || {};
        for (const ref of arg.derivedFrom || []) sources.push({ argName, ref, resolved: resolve(ref) });
      }

      emit(
        action.id,
        "PROPOSED",
        "RECALLED",
        "RECALLED",
        consulted,
        consulted.length ? `consulted ${consulted.join(", ")}` : "no records consulted",
      );

      const verdict = judge({ state, call, specs, grants, authority, sources });

      emit(action.id, "RECALLED", "POLICY_CHECKED", verdict.code, consulted, verdict.detail);

      if (verdict.allowed) {
        emit(action.id, "POLICY_CHECKED", "APPROVED", verdict.code, consulted, verdict.detail);
        let result = null;
        try {
          result = tools.invoke(action.id, call);
        } catch {
          result = null;
        }
        emit(action.id, "APPROVED", "EXECUTED", "ALLOWED", consulted, `invoked ${call.tool}`);
        if (result && result.output) writeSegment(state, memory, result.output);
        emit(action.id, "EXECUTED", "AUDITED", "ALLOWED", consulted, "executed, receipt recorded");
      } else {
        emit(action.id, "POLICY_CHECKED", "BLOCKED", verdict.code, consulted, verdict.detail);
        emit(action.id, "BLOCKED", "AUDITED", verdict.code, consulted, "blocked, receipt recorded");
      }

      decisions.push({ actionId: action.id, allowed: verdict.allowed, reason: verdict.code });
    }

    return { decisions, audit };
  },
};

// ---------------------------------------------------------------- the eight rules, in order

function judge({ state, call, specs, grants, authority, sources }) {
  const spec = specs.get(call.tool);

  // 1. M0 — the tool must be one this session offers.
  if (!spec) {
    return block("M0_UNKNOWN_TOOL", `"${call.tool}" is not in this session's tool list`);
  }

  // 2. M1 — authority comes from a system/user segment, or a record whose ORIGIN was one.
  const auth = authorityVerdict(state, authority);
  if (!auth.ok) return block("M1_UNTRUSTED_AUTHORITY", auth.detail);

  // 3. M2 — the capability must be granted in this session.
  if (!grants.has(spec.capability)) {
    return block("M2_CAPABILITY_NOT_GRANTED", `capability "${spec.capability}" is not granted here`);
  }

  if (spec.privileged) {
    // 4. M3 — untrusted content still visible in this session.
    for (const source of sources) {
      const { kind, segment } = source.resolved;
      if (kind === "segment" && UNTRUSTED_TRUST.has(segment.trust)) {
        return block(
          "M3_UNTRUSTED_ARGUMENT",
          `arg "${source.argName}" derives from ${segment.trust} segment ${segment.id} in this session`,
        );
      }
    }

    // 5. M4 — a stored value whose origin was never written down cannot be recovered.
    for (const source of sources) {
      const { kind, key, record, ref } = source.resolved;
      if (kind === "record" && !hasProvenance(record)) {
        return block(
          "M4_UNPROVENANCED_RECALL",
          `arg "${source.argName}" derives from record "${key}", which carries no recorded provenance`,
        );
      }
      if (kind === "stale_segment" || kind === "unknown") {
        return block(
          "M4_UNPROVENANCED_RECALL",
          `arg "${source.argName}" derives from "${ref}", which is not in this session and has no provenanced record`,
        );
      }
    }

    // 6. M5 — it arrived through the store, and the store says its origin was data.
    for (const source of sources) {
      const { kind, key, record } = source.resolved;
      if (kind === "record" && recordIsUntrusted(state, record)) {
        return block(
          "M5_LAUNDERED_MEMORY",
          `arg "${source.argName}" derives through record "${key}" from ${record.originTrust} content`,
        );
      }
    }
  }

  // 7. M6 — nothing marked secret leaves through an egress tool.
  if (spec.egress) {
    for (const source of sources) {
      const { kind, segment, key, record } = source.resolved;
      const secret =
        (kind === "segment" || kind === "stale_segment") && segment.carriesSecret
          ? `segment ${segment.id}`
          : kind === "record" && recordCarriesSecret(state, key, record)
            ? `record "${key}"`
            : null;
      if (secret) {
        return block("M6_SECRET_EGRESS", `arg "${source.argName}" carries a secret from ${secret}`);
      }
    }
  }

  return {
    allowed: true,
    code: "ALLOWED",
    detail: `${call.tool} authorized by ${auth.detail}; every argument traced to an authority-bearing origin`,
  };
}

function authorityVerdict(state, authority) {
  const { kind, ref, segment, key, record } = authority;
  if (kind === "segment") {
    return AUTHORITY_BEARING.has(segment.trust)
      ? { ok: true, detail: `${segment.trust} segment ${segment.id}` }
      : { ok: false, detail: `${segment.trust} segment ${segment.id} is data, not authority` };
  }
  if (kind === "record") {
    if (recordIsUntrusted(state, record)) {
      return {
        ok: false,
        detail: `record "${key}" records its origin as ${record.originTrust}; a record derived from data stays data`,
      };
    }
    return { ok: true, detail: `record "${key}" whose recorded origin is ${record.originTrust}` };
  }
  if (kind === "stale_segment") {
    return {
      ok: false,
      detail: `"${ref}" is not in this session and was never stored; its authority cannot be verified`,
    };
  }
  return { ok: false, detail: `"${ref}" names no segment in this session and no memory record` };
}

const block = (code, detail) => ({ allowed: false, code, detail });
