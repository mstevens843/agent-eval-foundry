const AUTHORITY_TRUST = new Set(["system", "user"]);
const UNTRUSTED_TRUST = new Set(["retrieved", "tool_output"]);

const secretByMemoryKey = new Map();

const isAuthorityTrust = (trust) => AUTHORITY_TRUST.has(trust);

const hasRecordedProvenance = (record) =>
  Boolean(record && Array.isArray(record.provenance) && record.provenance.length > 0);

const rememberSegment = (segment, memory) => {
  if (!segment || segment.memoryKey === null || segment.memoryKey === undefined) return null;

  const storedValue =
    segment.payload === null || segment.payload === undefined ? segment.text ?? "" : segment.payload;

  const record = memory.write({
    key: segment.memoryKey,
    value: String(storedValue),
    provenance: [segment.id],
    originTrust: segment.trust,
  });

  secretByMemoryKey.set(segment.memoryKey, Boolean(segment.carriesSecret));
  return record;
};

const collectArgSources = (call) => {
  const sources = [];
  for (const arg of Object.values(call?.args ?? {})) {
    for (const source of arg?.derivedFrom ?? []) {
      sources.push(source);
    }
  }
  return sources;
};

const unique = (items) => {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (item === null || item === undefined || seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
};

const recordCarriesSecret = (key, record) =>
  secretByMemoryKey.get(key) === true || record?.carriesSecret === true;

export const subject = {
  id: "provenance-policy-engine",
  label: "Provenance-preserving policy engine",

  runSession(view, memory, tools) {
    if (view.index === 0) {
      secretByMemoryKey.clear();
    }

    const decisions = [];
    const audit = [];
    let seq = 0;

    const segmentsById = new Map();
    for (const segment of view.segments ?? []) {
      segmentsById.set(segment.id, segment);
      rememberSegment(segment, memory);
    }

    const toolSpecs = view.tools ?? tools.specs ?? [];
    const toolsByName = new Map(toolSpecs.map((spec) => [spec.name, spec]));
    const grantedCapabilities = new Set(
      (view.grants ?? [])
        .filter((grant) => isAuthorityTrust(grant.grantedBy))
        .map((grant) => grant.capability),
    );

    const addAudit = (actionId, from, to, reason, recalled, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, recalled, detail });
    };

    const evaluate = (action) => {
      const call = action.call;
      const argSources = collectArgSources(call);
      const sourceNames = unique([call?.authorizedBy, ...argSources]);
      const recalled = [];
      const recordsByKey = new Map();

      const recall = (key) => {
        if (recordsByKey.has(key)) return recordsByKey.get(key);
        const record = memory.recall(key);
        recordsByKey.set(key, record);
        recalled.push(key);
        return record;
      };

      for (const source of sourceNames) {
        if (!segmentsById.has(source)) {
          recall(source);
        }
      }

      const toolSpec = toolsByName.get(call?.tool);
      if (!toolSpec) {
        return {
          allowed: false,
          reason: "M0_UNKNOWN_TOOL",
          recalled,
          detail: `tool ${String(call?.tool)} is not in this session`,
        };
      }

      const authSource = call?.authorizedBy;
      const authSegment = segmentsById.get(authSource);
      const authRecord = authSegment ? null : recordsByKey.get(authSource);
      const authorized = authSegment
        ? isAuthorityTrust(authSegment.trust)
        : isAuthorityTrust(authRecord?.originTrust);

      if (!authorized) {
        return {
          allowed: false,
          reason: "M1_UNTRUSTED_AUTHORITY",
          recalled,
          detail: `authorization source ${String(authSource)} is not authority-bearing`,
        };
      }

      if (!grantedCapabilities.has(toolSpec.capability)) {
        return {
          allowed: false,
          reason: "M2_CAPABILITY_NOT_GRANTED",
          recalled,
          detail: `capability ${toolSpec.capability} is not granted`,
        };
      }

      if (toolSpec.privileged) {
        for (const source of argSources) {
          const segment = segmentsById.get(source);
          if (segment && UNTRUSTED_TRUST.has(segment.trust)) {
            return {
              allowed: false,
              reason: "M3_UNTRUSTED_ARGUMENT",
              recalled,
              detail: `argument source ${source} is current untrusted content`,
            };
          }
        }

        for (const source of argSources) {
          if (segmentsById.has(source)) continue;
          const record = recordsByKey.get(source);
          if (!hasRecordedProvenance(record)) {
            return {
              allowed: false,
              reason: "M4_UNPROVENANCED_RECALL",
              recalled,
              detail: `argument source ${source} has no recorded provenance`,
            };
          }
        }

        for (const source of argSources) {
          if (segmentsById.has(source)) continue;
          const record = recordsByKey.get(source);
          if (!isAuthorityTrust(record?.originTrust)) {
            return {
              allowed: false,
              reason: "M5_LAUNDERED_MEMORY",
              recalled,
              detail: `argument source ${source} came from ${String(record?.originTrust)}`,
            };
          }
        }
      }

      if (toolSpec.egress) {
        for (const source of argSources) {
          const segment = segmentsById.get(source);
          if (segment) {
            if (segment.carriesSecret) {
              return {
                allowed: false,
                reason: "M6_SECRET_EGRESS",
                recalled,
                detail: `egress argument source ${source} carries a secret`,
              };
            }
            continue;
          }

          const record = recordsByKey.get(source);
          if (recordCarriesSecret(source, record)) {
            return {
              allowed: false,
              reason: "M6_SECRET_EGRESS",
              recalled,
              detail: `egress argument source ${source} carries a secret`,
            };
          }
        }
      }

      return {
        allowed: true,
        reason: "ALLOWED",
        recalled,
        detail: `policy permits ${call.tool}`,
      };
    };

    for (const action of view.actions ?? []) {
      const result = evaluate(action);
      const recalled = result.recalled;

      addAudit(action.id, null, "PROPOSED", "PROPOSED", recalled, action.label);
      addAudit(
        action.id,
        "PROPOSED",
        "RECALLED",
        "RECALLED",
        recalled,
        recalled.length === 0 ? "no memory records consulted" : `consulted ${recalled.join(", ")}`,
      );
      addAudit(action.id, "RECALLED", "POLICY_CHECKED", result.reason, recalled, result.detail);

      if (result.allowed) {
        addAudit(action.id, "POLICY_CHECKED", "APPROVED", "ALLOWED", recalled, result.detail);
        const toolResult = tools.invoke(action.id, action.call);
        if (toolResult?.output) {
          segmentsById.set(toolResult.output.id, toolResult.output);
          rememberSegment(toolResult.output, memory);
        }
        addAudit(action.id, "APPROVED", "EXECUTED", "ALLOWED", recalled, `invoked ${action.call.tool}`);
        addAudit(action.id, "EXECUTED", "AUDITED", "ALLOWED", recalled, "execution recorded");
      } else {
        addAudit(action.id, "POLICY_CHECKED", "BLOCKED", result.reason, recalled, result.detail);
        addAudit(action.id, "BLOCKED", "AUDITED", result.reason, recalled, "blocked by policy");
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
