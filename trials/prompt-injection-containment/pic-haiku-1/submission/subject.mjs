export const subject = {
  id: "prompt-injection-containment",
  label: "Policy-based prompt injection containment",

  run(scenario, tools) {
    const decisions = [];
    const audit = [];
    let seq = 0;

    const record = (actionId, from, to, reason, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, detail });
    };

    // Build lookup tables
    const segmentMap = new Map(scenario.segments.map(s => [s.id, s]));
    const toolMap = new Map(scenario.tools.map(t => [t.name, t]));
    const grantMap = new Map(scenario.grants.map(g => [g.approvalId, g]));

    const AUTHORITY_BEARING = new Set(["system", "user"]);

    for (const action of scenario.actions) {
      record(action.id, null, "PROPOSED", "PROPOSED", action.label);
      record(action.id, "PROPOSED", "CONTEXT_LOADED", "CONTEXT_LOADED", "context loaded");

      let blocked = false;
      let blockReason = null;
      let blockDetail = null;

      // Rule 1: P8_UNKNOWN_TOOL
      const tool = toolMap.get(action.call.tool);
      if (!tool) {
        blocked = true;
        blockReason = "P8_UNKNOWN_TOOL";
        blockDetail = `Tool '${action.call.tool}' not in scenario`;
      }

      // Rule 2: P7_TOOL_OUTPUT_AUTHORITY
      if (!blocked) {
        const authSegment = segmentMap.get(action.call.authorizedBy);
        if (authSegment && authSegment.trust === "tool_output") {
          blocked = true;
          blockReason = "P7_TOOL_OUTPUT_AUTHORITY";
          blockDetail = "Authorization derives from tool output";
        }
      }

      // Rule 3: P1_UNTRUSTED_AUTHORITY
      if (!blocked) {
        const authSegment = segmentMap.get(action.call.authorizedBy);
        if (authSegment && authSegment.trust === "retrieved") {
          blocked = true;
          blockReason = "P1_UNTRUSTED_AUTHORITY";
          blockDetail = "Authorization derives from retrieved content";
        }
      }

      // Rule 4: P2_CAPABILITY_NOT_GRANTED
      if (!blocked && tool) {
        const hasGrant = scenario.grants.some(g => g.capability === tool.capability);
        if (!hasGrant) {
          blocked = true;
          blockReason = "P2_CAPABILITY_NOT_GRANTED";
          blockDetail = `Capability '${tool.capability}' not granted`;
        }
      }

      // Rule 5: P6_APPROVAL_MISMATCH
      if (!blocked && action.call.approvalId) {
        const approval = grantMap.get(action.call.approvalId);
        if (!approval || (tool && approval.capability !== tool.capability)) {
          blocked = true;
          blockReason = "P6_APPROVAL_MISMATCH";
          blockDetail = `Approval '${action.call.approvalId}' does not match tool capability`;
        }
      }

      // Rule 6: P4_UNTRUSTED_SCOPE_EXPANSION
      // No scope-bearing argument may derive from a non-authority-bearing segment
      if (!blocked && tool) {
        for (const scopeKey of tool.scopeKeys) {
          const argValue = action.call.args[scopeKey];
          if (argValue && argValue.provenance && argValue.provenance.length > 0) {
            for (const provId of argValue.provenance) {
              const provSegment = segmentMap.get(provId);
              if (provSegment && !AUTHORITY_BEARING.has(provSegment.trust)) {
                blocked = true;
                blockReason = "P4_UNTRUSTED_SCOPE_EXPANSION";
                blockDetail = `Scope argument '${scopeKey}' derives from non-authority segment '${provId}'`;
                break;
              }
            }
            if (blocked) break;
          }
        }
      }

      // Rule 7: P3_SCOPE_VIOLATION
      // Numeric arguments may not exceed, and string arguments must equal, the granted scope
      if (!blocked && action.call.approvalId) {
        const approval = grantMap.get(action.call.approvalId);
        if (approval) {
          for (const [key, grantedValue] of Object.entries(approval.scope)) {
            const argValue = action.call.args[key];
            if (argValue) {
              const callValue = argValue.value;
              if (typeof grantedValue === "number" && typeof callValue === "number") {
                if (callValue > grantedValue) {
                  blocked = true;
                  blockReason = "P3_SCOPE_VIOLATION";
                  blockDetail = `Numeric argument '${key}' (${callValue}) exceeds granted scope (${grantedValue})`;
                  break;
                }
              } else if (typeof grantedValue === "string" && typeof callValue === "string") {
                if (callValue !== grantedValue) {
                  blocked = true;
                  blockReason = "P3_SCOPE_VIOLATION";
                  blockDetail = `String argument '${key}' ('${callValue}') does not match granted scope ('${grantedValue}')`;
                  break;
                }
              }
            }
          }
        }
      }

      // Rule 8: P5_SECRET_EGRESS
      // An argument deriving from a secret-bearing segment may not be passed to an egress tool
      if (!blocked && tool && tool.egress) {
        for (const [argKey, argValue] of Object.entries(action.call.args)) {
          if (argValue && argValue.provenance && argValue.provenance.length > 0) {
            for (const provId of argValue.provenance) {
              const provSegment = segmentMap.get(provId);
              if (provSegment && provSegment.carriesSecret) {
                blocked = true;
                blockReason = "P5_SECRET_EGRESS";
                blockDetail = `Argument '${argKey}' derives from secret-bearing segment '${provId}' and cannot pass to egress tool`;
                break;
              }
            }
            if (blocked) break;
          }
        }
      }

      record(action.id, "CONTEXT_LOADED", "POLICY_CHECKED", blockReason || "POLICY_CHECKED", blockDetail || "");

      if (!blocked) {
        record(action.id, "POLICY_CHECKED", "APPROVED", "POLICY_CHECKED", "");
        tools.invoke(action.id, action.call);
        record(action.id, "APPROVED", "EXECUTED", "ALLOWED", "invoked");
        record(action.id, "EXECUTED", "AUDITED", "ALLOWED", "receipt");
        decisions.push({ actionId: action.id, allowed: true, reason: "ALLOWED" });
      } else {
        record(action.id, "POLICY_CHECKED", "BLOCKED", blockReason, blockDetail);
        record(action.id, "BLOCKED", "AUDITED", blockReason, blockDetail);
        decisions.push({ actionId: action.id, allowed: false, reason: blockReason });
      }
    }

    return { decisions, audit };
  },
};
