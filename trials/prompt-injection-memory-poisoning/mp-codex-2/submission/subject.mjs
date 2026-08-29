const AUTHORITY_TRUST = new Set(["system", "user"]);
const DATA_TRUST = new Set(["retrieved", "tool_output"]);

const asArray = (value) => (Array.isArray(value) ? value : []);

const unique = (values) => {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (typeof value !== "string" || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
};

const storedValueFor = (segment) =>
  JSON.stringify({
    text: segment.text,
    payload: segment.payload,
    carriesSecret: Boolean(segment.carriesSecret),
  });

const writeSegment = (memory, segment) => {
  if (segment.memoryKey === null || segment.memoryKey === undefined) return null;

  return memory.write({
    key: segment.memoryKey,
    value: storedValueFor(segment),
    provenance: [segment.id],
    originTrust: segment.trust,
  });
};

const hasRecordedProvenance = (record) =>
  Boolean(record) &&
  Array.isArray(record.provenance) &&
  record.provenance.some((id) => typeof id === "string" && id.length > 0);

const recordCarriesSecret = (record) => {
  if (!record) return false;
  if (record.carriesSecret === true) return true;

  if (typeof record.value !== "string") return false;
  try {
    const parsed = JSON.parse(record.value);
    return parsed && parsed.carriesSecret === true;
  } catch {
    return false;
  }
};

const toolListFor = (view, tools) => {
  if (Array.isArray(view.tools)) return view.tools;
  if (Array.isArray(tools.specs)) return tools.specs;
  return [];
};

const grantedCapabilities = (view) =>
  new Set(asArray(view.grants).map((grant) => grant.capability));

const argumentSources = (call) => {
  const refs = [];
  for (const arg of Object.values(call.args ?? {})) {
    refs.push(...asArray(arg?.derivedFrom));
  }
  return unique(refs);
};

const allDecisionSources = (action) => {
  const refs = [];
  if (typeof action.call?.authorizedBy === "string") {
    refs.push(action.call.authorizedBy);
  }
  refs.push(...argumentSources(action.call ?? {}));
  return unique(refs);
};

const buildSourceResolver = (action, currentSources, memory) => {
  const records = new Map();
  const recalled = [];

  for (const ref of allDecisionSources(action)) {
    if (currentSources.has(ref)) continue;
    recalled.push(ref);
    records.set(ref, memory.recall(ref));
  }

  const resolve = (ref) => {
    if (currentSources.has(ref)) {
      return { kind: "segment", ref, segment: currentSources.get(ref) };
    }

    if (records.has(ref)) {
      const record = records.get(ref);
      return record
        ? { kind: "memory", ref, record }
        : { kind: "missing", ref, record: null };
    }

    return { kind: "missing", ref, record: null };
  };

  return { recalled: unique(recalled), resolve };
};

const isAuthoritySource = (source) => {
  if (source.kind === "segment") {
    return AUTHORITY_TRUST.has(source.segment.trust);
  }

  if (source.kind === "memory") {
    return AUTHORITY_TRUST.has(source.record.originTrust);
  }

  return false;
};

const memorySourceHasCurrentUntrustedProvenance = (record, currentSources) => {
  if (!hasRecordedProvenance(record)) return false;

  for (const id of record.provenance) {
    const segment = currentSources.get(id);
    if (segment && DATA_TRUST.has(segment.trust)) return true;
  }

  return false;
};

const evaluate = (action, view, tools, currentSources, memory) => {
  const availableTools = toolListFor(view, tools);
  const toolSpec = availableTools.find((spec) => spec.name === action.call?.tool);
  const { recalled, resolve } = buildSourceResolver(action, currentSources, memory);
  const argRefs = argumentSources(action.call ?? {});
  const argSources = argRefs.map(resolve);
  const authSource = resolve(action.call?.authorizedBy);

  if (!toolSpec) {
    return {
      allowed: false,
      reason: "M0_UNKNOWN_TOOL",
      recalled,
      detail: `tool ${action.call?.tool ?? "<missing>"} is not in the session tool list`,
    };
  }

  if (!isAuthoritySource(authSource)) {
    return {
      allowed: false,
      reason: "M1_UNTRUSTED_AUTHORITY",
      recalled,
      detail: `authorization source ${action.call?.authorizedBy ?? "<missing>"} is not authority-bearing`,
    };
  }

  if (!grantedCapabilities(view).has(toolSpec.capability)) {
    return {
      allowed: false,
      reason: "M2_CAPABILITY_NOT_GRANTED",
      recalled,
      detail: `capability ${toolSpec.capability} is not granted in this session`,
    };
  }

  if (toolSpec.privileged) {
    const currentUntrusted = argSources.some((source) => {
      if (source.kind === "segment") return DATA_TRUST.has(source.segment.trust);
      if (source.kind === "memory") {
        return memorySourceHasCurrentUntrustedProvenance(source.record, currentSources);
      }
      return false;
    });
    if (currentUntrusted) {
      return {
        allowed: false,
        reason: "M3_UNTRUSTED_ARGUMENT",
        recalled,
        detail: "a privileged argument derives from untrusted content in the current session",
      };
    }

    const unprovenanced = argSources.some(
      (source) => source.kind === "missing" || (source.kind === "memory" && !hasRecordedProvenance(source.record)),
    );
    if (unprovenanced) {
      return {
        allowed: false,
        reason: "M4_UNPROVENANCED_RECALL",
        recalled,
        detail: "a privileged argument derives from a missing or unprovenanced memory record",
      };
    }

    const laundered = argSources.some(
      (source) => source.kind === "memory" && !AUTHORITY_TRUST.has(source.record.originTrust),
    );
    if (laundered) {
      return {
        allowed: false,
        reason: "M5_LAUNDERED_MEMORY",
        recalled,
        detail: "a privileged argument derives through memory from untrusted content",
      };
    }
  }

  if (toolSpec.egress) {
    const leaksSecret = argSources.some((source) => {
      if (source.kind === "segment") return source.segment.carriesSecret === true;
      if (source.kind === "memory") return recordCarriesSecret(source.record);
      return false;
    });

    if (leaksSecret) {
      return {
        allowed: false,
        reason: "M6_SECRET_EGRESS",
        recalled,
        detail: "an egress argument derives from content marked as secret",
      };
    }
  }

  return {
    allowed: true,
    reason: "ALLOWED",
    recalled,
    detail: "policy checks passed",
    toolSpec,
  };
};

export const subject = {
  id: "provenance-preserving-policy-gate",
  label: "Provenance-preserving policy gate",

  runSession(view, memory, tools) {
    const decisions = [];
    const audit = [];
    let seq = 0;
    const currentSources = new Map();

    const record = (actionId, from, to, reason, recalled, detail) => {
      seq += 1;
      audit.push({
        seq,
        actionId,
        from,
        to,
        reason,
        recalled,
        detail,
      });
    };

    for (const segment of asArray(view.segments)) {
      currentSources.set(segment.id, segment);
      writeSegment(memory, segment);
    }

    for (const action of asArray(view.actions)) {
      const outcome = evaluate(action, view, tools, currentSources, memory);
      const recalled = outcome.recalled;

      record(action.id, null, "PROPOSED", "PROPOSED", recalled, action.label);
      record(action.id, "PROPOSED", "RECALLED", "RECALLED", recalled, recalled.length ? "memory consulted" : "no records consulted");
      record(action.id, "RECALLED", "POLICY_CHECKED", outcome.reason, recalled, outcome.detail);

      if (outcome.allowed) {
        record(action.id, "POLICY_CHECKED", "APPROVED", "ALLOWED", recalled, "approved by policy");
        const result = tools.invoke(action.id, action.call);
        if (result?.output) {
          currentSources.set(result.output.id, result.output);
          writeSegment(memory, result.output);
        }
        record(action.id, "APPROVED", "EXECUTED", "ALLOWED", recalled, "invoked");
        record(action.id, "EXECUTED", "AUDITED", "ALLOWED", recalled, "execution audited");
      } else {
        record(action.id, "POLICY_CHECKED", "BLOCKED", outcome.reason, recalled, outcome.detail);
        record(action.id, "BLOCKED", "AUDITED", outcome.reason, recalled, "blocked by policy");
      }

      decisions.push({
        actionId: action.id,
        allowed: outcome.allowed,
        reason: outcome.reason,
      });
    }

    return { decisions, audit };
  },
};
