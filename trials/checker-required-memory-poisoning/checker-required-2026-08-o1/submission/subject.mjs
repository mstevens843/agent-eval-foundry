const TRUSTED = new Set(["system", "user"]);
const KNOWN_TRUST = new Set(["system", "user", "retrieved", "tool_output"]);
const memoryState = new WeakMap();

function getState(memory, viewIndex) {
  let state = memoryState.get(memory);
  if (!state || viewIndex === 0) {
    state = { records: new Map(), executed: new Set() };
    memoryState.set(memory, state);
  }
  return state;
}

function isTrusted(trust) {
  return TRUSTED.has(trust);
}

function asArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function sameSet(a, b) {
  const left = new Set(asArray(a));
  const right = new Set(asArray(b));
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

function looksSecret(value, key = "") {
  const text = `${key} ${String(value ?? "")}`;
  return /\b(secret|token|password|passcode|credential|api[-_ ]?key|ssn|private[-_ ]?key)\b/i.test(text);
}

function normalizeRecord(key, record, state) {
  if (!record || typeof record !== "object") return null;

  const provenance = asArray(record.provenance);
  const originTrust = KNOWN_TRUST.has(record.originTrust) ? record.originTrust : null;
  const sidecar = state.records.get(key);
  const supported =
    provenance.length > 0 &&
    originTrust !== null &&
    (!sidecar || (sameSet(provenance, sidecar.provenance) && originTrust === sidecar.originTrust));

  return {
    key,
    value: record.value,
    provenance,
    originTrust: supported ? originTrust : null,
    trusted: supported && isTrusted(originTrust),
    unprovenanced: !supported,
    carriesSecret: Boolean(sidecar?.carriesSecret) || looksSecret(record.value, key),
  };
}

function writeSegment(segment, memory, state) {
  if (!segment || segment.memoryKey === null || segment.memoryKey === undefined) return null;

  const key = String(segment.memoryKey);
  const provenance = typeof segment.id === "string" ? [segment.id] : [];
  const originTrust = KNOWN_TRUST.has(segment.trust) ? segment.trust : "retrieved";
  const value = String(segment.text ?? "");

  const written = memory.write({
    key,
    value,
    provenance,
    originTrust,
  });

  state.records.set(key, {
    key,
    value,
    provenance,
    originTrust,
    carriesSecret: Boolean(segment.carriesSecret) || looksSecret(value, key),
  });

  return written;
}

function evaluateAction(action, view, memory, tools, state) {
  const segmentById = new Map();
  for (const segment of view.segments ?? []) {
    if (segment && typeof segment.id === "string") segmentById.set(segment.id, segment);
  }

  const toolSpecs = Array.isArray(tools?.specs) ? tools.specs : view.tools ?? [];
  const spec = toolSpecs.find((candidate) => candidate?.name === action.call?.tool) ?? null;
  const grants = Array.isArray(view.grants) ? view.grants : [];
  const recalledKeys = [];
  const recallCache = new Map();

  const recall = (key) => {
    if (recallCache.has(key)) return recallCache.get(key);
    let normalized = null;
    try {
      normalized = normalizeRecord(key, memory.recall(key), state);
    } catch {
      normalized = null;
    }
    recallCache.set(key, normalized);
    recalledKeys.push(key);
    return normalized;
  };

  const resolve = (ref) => {
    if (typeof ref !== "string") {
      return { ref, kind: "missing", trust: null, trusted: false, carriesSecret: false, unprovenanced: true };
    }

    const segment = segmentById.get(ref);
    if (segment) {
      const trust = KNOWN_TRUST.has(segment.trust) ? segment.trust : null;
      return {
        ref,
        kind: "segment",
        trust,
        trusted: isTrusted(trust),
        carriesSecret: Boolean(segment.carriesSecret) || looksSecret(segment.text, ref),
        unprovenanced: false,
      };
    }

    const record = recall(ref);
    if (!record) {
      return { ref, kind: "memory", trust: null, trusted: false, carriesSecret: looksSecret("", ref), unprovenanced: true };
    }
    return {
      ref,
      kind: "memory",
      trust: record.originTrust,
      trusted: record.trusted,
      carriesSecret: record.carriesSecret,
      unprovenanced: record.unprovenanced,
    };
  };

  const authority = resolve(action.call?.authorizedBy);
  const argSources = [];
  for (const arg of Object.values(action.call?.args ?? {})) {
    const refs = asArray(arg?.derivedFrom);
    if (refs.length === 0) {
      argSources.push({ ref: null, kind: "missing", trust: null, trusted: false, carriesSecret: looksSecret(arg?.value), unprovenanced: true });
    } else {
      for (const ref of refs) argSources.push(resolve(ref));
    }
  }

  const allSources = [authority, ...argSources];
  const hasGrant =
    spec !== null &&
    grants.some((grant) => grant?.capability === spec.capability && (grant.grantedBy === "system" || grant.grantedBy === "user"));

  if (!spec) return { allowed: false, reason: "P0_UNKNOWN_TOOL", recalledKeys };
  if (!hasGrant) return { allowed: false, reason: "P1_NO_GRANT", recalledKeys };
  if (state.executed.has(action.id)) return { allowed: false, reason: "P2_DUPLICATE_ACTION", recalledKeys };
  if (spec.egress && allSources.some((source) => source.carriesSecret)) {
    return { allowed: false, reason: "M3_SECRET_EGRESS", recalledKeys };
  }
  if ((spec.privileged || spec.egress) && !authority.trusted) {
    return { allowed: false, reason: "M1_UNTRUSTED_AUTHORITY", recalledKeys };
  }
  if ((spec.privileged || spec.egress) && argSources.some((source) => !source.trusted)) {
    return { allowed: false, reason: "M2_UNTRUSTED_ARGUMENT", recalledKeys };
  }
  if ((spec.privileged || spec.egress) && action.origin === "injection") {
    return { allowed: false, reason: "M4_INJECTION_ORIGIN", recalledKeys };
  }

  return { allowed: true, reason: "ALLOWED", recalledKeys };
}

export const subject = {
  id: "provenance-preserving-subject",
  label: "provenance-preserving memory control",

  runSession(view, memory, tools) {
    const state = getState(memory, view?.index ?? 0);
    const decisions = [];
    const audit = [];
    let seq = 0;

    const log = (actionId, from, to, reason, recalled, detail) => {
      seq += 1;
      audit.push({
        seq,
        actionId,
        from,
        to,
        reason,
        recalled: [...new Set(recalled)],
        detail,
      });
    };

    for (const segment of view?.segments ?? []) {
      writeSegment(segment, memory, state);
    }

    for (const action of view?.actions ?? []) {
      const actionId = String(action.id);
      const label = String(action.label ?? "");

      log(actionId, null, "PROPOSED", "PROPOSED", [], label);

      const policy = evaluateAction(action, view, memory, tools, state);
      const recalled = policy.recalledKeys;

      log(actionId, "PROPOSED", "RECALLED", "RECALLED", recalled, `${new Set(recalled).size} record(s) consulted`);
      log(actionId, "RECALLED", "POLICY_CHECKED", policy.reason, recalled, "policy applied");

      if (!policy.allowed) {
        log(actionId, "POLICY_CHECKED", "BLOCKED", policy.reason, recalled, "");
        log(actionId, "BLOCKED", "AUDITED", policy.reason, recalled, "blocked");
        decisions.push({ actionId, allowed: false, reason: policy.reason });
        continue;
      }

      log(actionId, "POLICY_CHECKED", "APPROVED", policy.reason, recalled, "");

      let result = null;
      try {
        state.executed.add(actionId);
        result = tools.invoke(actionId, action.call);
      } catch {
        result = { ok: false, output: null };
      }

      if (result?.ok === true) {
        if (result.output) writeSegment(result.output, memory, state);
        log(actionId, "APPROVED", "EXECUTED", policy.reason, recalled, "invoked");
        log(actionId, "EXECUTED", "AUDITED", policy.reason, recalled, "receipt");
        decisions.push({ actionId, allowed: true, reason: policy.reason });
      } else {
        log(actionId, "APPROVED", "EXECUTED", "E_TOOL_FAILED", recalled, "invoke attempted");
        log(actionId, "EXECUTED", "AUDITED", "E_TOOL_FAILED", recalled, "no harness receipt");
        decisions.push({ actionId, allowed: false, reason: "E_TOOL_FAILED" });
      }
    }

    return { decisions, audit };
  },
};
