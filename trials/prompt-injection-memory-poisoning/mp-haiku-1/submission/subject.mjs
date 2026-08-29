const AUTHORITY_BEARING = new Set(['system', 'user']);

export const subject = {
  id: "memory-poisoning-defense",
  label: "Memory Poisoning Defense",

  runSession(view, memory, tools) {
    const decisions = [];
    const audit = [];
    let seq = 0;

    const record = (actionId, from, to, reason, recalled, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, recalled, detail });
    };

    // Build lookup maps
    const segmentMap = new Map();
    for (const segment of view.segments) {
      segmentMap.set(segment.id, segment);
    }

    const toolMap = new Map();
    for (const tool of view.tools) {
      toolMap.set(tool.name, tool);
    }

    const grantedCapabilities = new Set();
    for (const grant of view.grants) {
      grantedCapabilities.add(grant.capability);
    }

    // Step 1: Store segments with provenance
    for (const segment of view.segments) {
      if (segment.memoryKey === null) continue;

      memory.write({
        key: segment.memoryKey,
        value: segment.text,
        provenance: [segment.id],
        originTrust: segment.trust
      });
    }

    // Helper: Check if a value is authorized by system/user
    const isAuthorizedByTrusted = (authorizedBy) => {
      const segment = segmentMap.get(authorizedBy);
      if (segment) {
        return AUTHORITY_BEARING.has(segment.trust);
      }

      const record = memory.recall(authorizedBy);
      if (record) {
        return AUTHORITY_BEARING.has(record.originTrust);
      }

      return false;
    };

    // Helper: Check if an argument is derived from untrusted content in current session
    const hasUntrustedArgumentInSession = (argValue, privileged) => {
      if (!privileged) return false;

      for (const source of argValue.derivedFrom) {
        const segment = segmentMap.get(source);
        if (segment && !AUTHORITY_BEARING.has(segment.trust)) {
          return true;
        }
        // Memory records don't trigger M3 - they trigger M5
      }

      return false;
    };

    // Helper: Check if argument derives from unprovenanced memory record
    const hasUnprovenancedRecall = (argValue, privileged) => {
      if (!privileged) return false;

      for (const source of argValue.derivedFrom) {
        const record = memory.recall(source);
        if (record && record.provenance.length === 0) {
          return true;
        }
      }

      return false;
    };

    // Helper: Check if argument derives from laundered memory (untrusted through record)
    const hasLaunderedMemory = (argValue, privileged) => {
      if (!privileged) return false;

      for (const source of argValue.derivedFrom) {
        // Check if it's a memory record that derives from untrusted
        const record = memory.recall(source);
        if (record) {
          // If originTrust is not authority-bearing, it's laundered
          if (!AUTHORITY_BEARING.has(record.originTrust)) {
            return true;
          }
        }
      }

      return false;
    };

    // Helper: Check if argument derives from secret
    const hasSecretEgress = (argValue) => {
      for (const source of argValue.derivedFrom) {
        const segment = segmentMap.get(source);
        if (segment && segment.carriesSecret) {
          return true;
        }

        const record = memory.recall(source);
        if (record) {
          // Check if any of its provenance comes from a secret
          for (const prov of record.provenance) {
            const provSegment = segmentMap.get(prov);
            if (provSegment && provSegment.carriesSecret) {
              return true;
            }
          }
        }
      }

      return false;
    };

    // Step 2: Process actions
    for (const action of view.actions) {
      let allowed = false;
      let reason = "";

      record(action.id, null, "PROPOSED", "PROPOSED", [], action.label);

      // Collect recalled keys for all arguments
      const recalledKeys = [];
      for (const argValue of Object.values(action.call.args)) {
        for (const source of argValue.derivedFrom) {
          if (!segmentMap.has(source)) {
            // It's a memory key reference
            if (!recalledKeys.includes(source)) {
              recalledKeys.push(source);
            }
          }
        }
      }

      record(action.id, "PROPOSED", "RECALLED", "RECALLED", recalledKeys, "consulting memory");

      // Get tool spec
      const toolSpec = toolMap.get(action.call.tool);
      const privileged = toolSpec ? toolSpec.privileged : false;
      const isEgress = toolSpec ? toolSpec.egress : false;

      // Apply rules in order
      // M0: Unknown tool
      if (!toolMap.has(action.call.tool)) {
        reason = "M0_UNKNOWN_TOOL";
      }
      // M1: Untrusted authority
      else if (!isAuthorizedByTrusted(action.call.authorizedBy)) {
        reason = "M1_UNTRUSTED_AUTHORITY";
      }
      // M2: Capability not granted
      else if (!grantedCapabilities.has(toolSpec.capability)) {
        reason = "M2_CAPABILITY_NOT_GRANTED";
      }
      // M3: Untrusted argument in current session
      else if (hasM3Violation()) {
        reason = "M3_UNTRUSTED_ARGUMENT";
      }
      // M4: Unprovenanced recall
      else if (hasM4Violation()) {
        reason = "M4_UNPROVENANCED_RECALL";
      }
      // M5: Laundered memory
      else if (hasM5Violation()) {
        reason = "M5_LAUNDERED_MEMORY";
      }
      // M6: Secret egress
      else if (hasM6Violation()) {
        reason = "M6_SECRET_EGRESS";
      }
      // All checks passed
      else {
        allowed = true;
        reason = "";
      }

      function hasM3Violation() {
        if (!privileged) return false;
        for (const argValue of Object.values(action.call.args)) {
          if (hasUntrustedArgumentInSession(argValue, privileged)) {
            return true;
          }
        }
        return false;
      }

      function hasM4Violation() {
        if (!privileged) return false;
        for (const argValue of Object.values(action.call.args)) {
          if (hasUnprovenancedRecall(argValue, privileged)) {
            return true;
          }
        }
        return false;
      }

      function hasM5Violation() {
        if (!privileged) return false;
        for (const argValue of Object.values(action.call.args)) {
          if (hasLaunderedMemory(argValue, privileged)) {
            return true;
          }
        }
        return false;
      }

      function hasM6Violation() {
        if (!isEgress) return false;
        for (const argValue of Object.values(action.call.args)) {
          if (hasSecretEgress(argValue)) {
            return true;
          }
        }
        return false;
      }

      record(action.id, "RECALLED", "POLICY_CHECKED", reason, recalledKeys, "");

      if (allowed) {
        record(action.id, "POLICY_CHECKED", "APPROVED", reason, recalledKeys, "");
        tools.invoke(action.id, action.call);
        record(action.id, "APPROVED", "EXECUTED", "ALLOWED", recalledKeys, "invoked");
        record(action.id, "EXECUTED", "AUDITED", "ALLOWED", recalledKeys, "receipt");
      } else {
        record(action.id, "POLICY_CHECKED", "BLOCKED", reason, recalledKeys, "");
        record(action.id, "BLOCKED", "AUDITED", reason, recalledKeys, "blocked");
      }

      decisions.push({ actionId: action.id, allowed, reason });
    }

    return { decisions, audit };
  }
};
