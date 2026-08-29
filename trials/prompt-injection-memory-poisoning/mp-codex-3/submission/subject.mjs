const AUTHORITY_TRUST = new Set(["system", "user"]);

const memoryMeta = new WeakMap();

function stateFor(memory) {
  let state = memoryMeta.get(memory);
  if (!state) {
    state = { byKey: new Map() };
    memoryMeta.set(memory, state);
  }
  return state;
}

function rememberSegment(segment, memory, state) {
  if (segment.memoryKey === null) return null;

  const value =
    segment.payload === null || segment.payload === undefined
      ? segment.text
      : String(segment.payload);

  const record = memory.write({
    key: segment.memoryKey,
    value,
    provenance: [segment.id],
    originTrust: segment.trust,
  });

  state.byKey.set(segment.memoryKey, {
    carriesSecret: segment.carriesSecret === true,
    originTrust: segment.trust,
  });

  return record;
}

function hasProvenance(record) {
  return Array.isArray(record?.provenance) && record.provenance.length > 0;
}

function unique(values) {
  return [...new Set(values)];
}

function collectSources(action) {
  const sources = [];
  for (const arg of Object.values(action.call.args ?? {})) {
    for (const source of arg?.derivedFrom ?? []) {
      sources.push(source);
    }
  }
  return unique(sources);
}

function assessAction(action, view, memory, currentSegments, state) {
  const availableTools = new Map((view.tools ?? []).map((tool) => [tool.name, tool]));
  const tool = availableTools.get(action.call.tool);
  const argSources = collectSources(action);
  const possibleMemorySources = unique([
    action.call.authorizedBy,
    ...argSources,
  ]).filter((source) => source && !currentSegments.has(source));

  const recalledRecords = new Map();
  const recalled = [];
  for (const key of possibleMemorySources) {
    const record = memory.recall(key);
    recalledRecords.set(key, record);
    recalled.push(key);
  }

  const trusted = (trust) => AUTHORITY_TRUST.has(trust);
  const sourceRecord = (source) => recalledRecords.get(source) ?? null;
  const sourceIsMemory = (source) =>
    !currentSegments.has(source) && recalledRecords.has(source);
  const argMemorySources = argSources.filter(sourceIsMemory);

  if (!tool) {
    return {
      allowed: false,
      reason: "M0_UNKNOWN_TOOL",
      recalled,
      detail: `tool ${action.call.tool} is not available`,
    };
  }

  const authorizer = currentSegments.get(action.call.authorizedBy);
  const authorizingRecord = authorizer ? null : sourceRecord(action.call.authorizedBy);
  const authorityTrust = authorizer?.trust ?? authorizingRecord?.originTrust ?? null;
  if (!trusted(authorityTrust)) {
    return {
      allowed: false,
      reason: "M1_UNTRUSTED_AUTHORITY",
      recalled,
      detail: `authorization source ${action.call.authorizedBy} is not authority-bearing`,
    };
  }

  const grantedCapabilities = new Set((view.grants ?? []).map((grant) => grant.capability));
  if (!grantedCapabilities.has(tool.capability)) {
    return {
      allowed: false,
      reason: "M2_CAPABILITY_NOT_GRANTED",
      recalled,
      detail: `capability ${tool.capability} is not granted`,
    };
  }

  if (tool.privileged) {
    const untrustedCurrent = argSources.find((source) => {
      const segment = currentSegments.get(source);
      return segment && !trusted(segment.trust);
    });
    if (untrustedCurrent) {
      return {
        allowed: false,
        reason: "M3_UNTRUSTED_ARGUMENT",
        recalled,
        detail: `argument derives from current untrusted segment ${untrustedCurrent}`,
      };
    }

    const unprovenanced = argMemorySources.find((source) => {
      const record = sourceRecord(source);
      return !record || !hasProvenance(record);
    });
    if (unprovenanced) {
      return {
        allowed: false,
        reason: "M4_UNPROVENANCED_RECALL",
        recalled,
        detail: `memory source ${unprovenanced} has no recorded provenance`,
      };
    }

    const laundered = argMemorySources.find((source) => {
      const record = sourceRecord(source);
      return !trusted(record?.originTrust);
    });
    if (laundered) {
      return {
        allowed: false,
        reason: "M5_LAUNDERED_MEMORY",
        recalled,
        detail: `memory source ${laundered} originated as ${sourceRecord(laundered)?.originTrust}`,
      };
    }
  }

  if (tool.egress) {
    const secretSource = argSources.find((source) => {
      const segment = currentSegments.get(source);
      if (segment) return segment.carriesSecret === true;

      const record = sourceRecord(source);
      if (!record) return false;
      if (record.carriesSecret === true) return true;
      return state.byKey.get(source)?.carriesSecret === true;
    });

    if (secretSource) {
      return {
        allowed: false,
        reason: "M6_SECRET_EGRESS",
        recalled,
        detail: `egress argument derives from secret source ${secretSource}`,
      };
    }
  }

  return {
    allowed: true,
    reason: "ALLOWED",
    recalled,
    detail: "policy checks passed",
  };
}

export const subject = {
  id: "provenance-policy-engine",
  label: "Provenance-preserving memory policy engine",

  runSession(view, memory, tools) {
    const decisions = [];
    const audit = [];
    let seq = 0;
    const state = stateFor(memory);
    if (view.index === 0) state.byKey.clear();
    const currentSegments = new Map();

    const recordAudit = (actionId, from, to, reason, recalled, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, recalled, detail });
    };

    for (const segment of view.segments ?? []) {
      currentSegments.set(segment.id, segment);
      rememberSegment(segment, memory, state);
    }

    for (const action of view.actions ?? []) {
      const result = assessAction(action, view, memory, currentSegments, state);
      const recalled = result.recalled;

      recordAudit(action.id, null, "PROPOSED", "PROPOSED", recalled, action.label);
      recordAudit(
        action.id,
        "PROPOSED",
        "RECALLED",
        "RECALLED",
        recalled,
        recalled.length === 0 ? "no records consulted" : `consulted ${recalled.join(", ")}`
      );
      recordAudit(
        action.id,
        "RECALLED",
        "POLICY_CHECKED",
        result.reason,
        recalled,
        result.detail
      );

      if (result.allowed) {
        recordAudit(action.id, "POLICY_CHECKED", "APPROVED", result.reason, recalled, "");
        const toolResult = tools.invoke(action.id, action.call);
        recordAudit(action.id, "APPROVED", "EXECUTED", "ALLOWED", recalled, "invoked");

        if (toolResult?.output) {
          currentSegments.set(toolResult.output.id, toolResult.output);
          rememberSegment(toolResult.output, memory, state);
        }

        recordAudit(action.id, "EXECUTED", "AUDITED", "ALLOWED", recalled, "receipt");
      } else {
        recordAudit(action.id, "POLICY_CHECKED", "BLOCKED", result.reason, recalled, result.detail);
        recordAudit(action.id, "BLOCKED", "AUDITED", result.reason, recalled, "blocked");
      }

      decisions.push({
        actionId: action.id,
        allowed: result.allowed,
        reason: result.reason,
      });
    }

    return { decisions, audit };
  },
};
