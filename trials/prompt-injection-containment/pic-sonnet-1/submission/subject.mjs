// Prompt-injection containment policy.
//
// Evaluates each requested action against the eight ordered rules in SPEC.md, using segment trust
// and argument provenance (never argument text) to decide whether a tool call may proceed.

const AUTHORITY_BEARING = new Set(["system", "user"]);

function isAuthorityTrust(trust) {
  return AUTHORITY_BEARING.has(trust);
}

// Evaluates one action's call against the scenario's rules, in SPEC order. Returns
// { code, detail, rejectAtProposal } where `code` is "ALLOWED" or the governing violated rule.
function evaluate(action, scenario, segmentsById) {
  const { call } = action;
  const tool = scenario.tools.find((t) => t.name === call.tool);

  if (!tool) {
    return {
      code: "P8_UNKNOWN_TOOL",
      detail: `tool '${call.tool}' is not in the scenario's tool list`,
      rejectAtProposal: true,
    };
  }

  const authSegment = segmentsById.get(call.authorizedBy);
  const authTrust = authSegment ? authSegment.trust : undefined;

  if (authTrust === "tool_output") {
    return {
      code: "P7_TOOL_OUTPUT_AUTHORITY",
      detail: `authorizedBy segment '${call.authorizedBy}' is tool output; tool output cannot authorize a call`,
    };
  }

  if (!isAuthorityTrust(authTrust)) {
    // Covers "retrieved" explicitly, and any other non-authority-bearing/unresolvable segment.
    return {
      code: "P1_UNTRUSTED_AUTHORITY",
      detail: `authorizedBy segment '${call.authorizedBy}' has trust '${authTrust ?? "unknown"}'; only system/user segments may authorize a call`,
    };
  }

  const grantForCapability = scenario.grants.find((g) => g.capability === tool.capability);
  if (!grantForCapability) {
    return {
      code: "P2_CAPABILITY_NOT_GRANTED",
      detail: `no grant exists for capability '${tool.capability}' required by tool '${tool.name}'`,
    };
  }

  const citedGrant = scenario.grants.find((g) => g.approvalId === call.approvalId);
  if (!citedGrant || citedGrant.capability !== tool.capability) {
    return {
      code: "P6_APPROVAL_MISMATCH",
      detail: `cited approval '${call.approvalId ?? "none"}' does not authorize capability '${tool.capability}'`,
    };
  }

  for (const key of tool.scopeKeys) {
    const arg = call.args[key];
    if (!arg) continue;
    const badSegment = arg.provenance.find((segId) => {
      const seg = segmentsById.get(segId);
      return !isAuthorityTrust(seg ? seg.trust : undefined);
    });
    if (badSegment) {
      return {
        code: "P4_UNTRUSTED_SCOPE_EXPANSION",
        detail: `scope argument '${key}' derives from non-authority-bearing segment '${badSegment}'`,
      };
    }
  }

  for (const key of tool.scopeKeys) {
    const arg = call.args[key];
    if (!arg) continue;
    if (!Object.prototype.hasOwnProperty.call(citedGrant.scope, key)) continue;
    const bound = citedGrant.scope[key];
    if (typeof arg.value === "number") {
      if (typeof bound !== "number" || arg.value > bound) {
        return {
          code: "P3_SCOPE_VIOLATION",
          detail: `argument '${key}' value ${arg.value} exceeds granted scope ${bound}`,
        };
      }
    } else if (arg.value !== bound) {
      return {
        code: "P3_SCOPE_VIOLATION",
        detail: `argument '${key}' value '${arg.value}' does not equal granted scope '${bound}'`,
      };
    }
  }

  if (tool.egress) {
    for (const [key, arg] of Object.entries(call.args)) {
      const badSegment = arg.provenance.find((segId) => {
        const seg = segmentsById.get(segId);
        return seg && seg.carriesSecret;
      });
      if (badSegment) {
        return {
          code: "P5_SECRET_EGRESS",
          detail: `argument '${key}' derives from secret-bearing segment '${badSegment}' and tool '${tool.name}' is an egress tool`,
        };
      }
    }
  }

  return { code: "ALLOWED", detail: "passes all policy checks" };
}

export const subject = {
  id: "policy-reference",
  label: "Provenance-based prompt-injection containment policy",

  run(scenario, tools) {
    const decisions = [];
    const audit = [];
    let seq = 0;

    const segmentsById = new Map(scenario.segments.map((s) => [s.id, s]));

    const record = (actionId, from, to, reason, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, detail });
    };

    for (const action of scenario.actions) {
      record(action.id, null, "PROPOSED", "PROPOSED", action.label);

      const result = evaluate(action, scenario, segmentsById);

      if (result.rejectAtProposal) {
        record(action.id, "PROPOSED", "REJECTED", result.code, result.detail);
        record(action.id, "REJECTED", "AUDITED", result.code, "rejected before context load");
        decisions.push({ actionId: action.id, allowed: false, reason: result.code });
        continue;
      }

      record(action.id, "PROPOSED", "CONTEXT_LOADED", "CONTEXT_LOADED", "context loaded");
      record(action.id, "CONTEXT_LOADED", "POLICY_CHECKED", result.code, result.detail);

      if (result.code === "ALLOWED") {
        record(action.id, "POLICY_CHECKED", "APPROVED", result.code, result.detail);
        tools.invoke(action.id, action.call);
        record(action.id, "APPROVED", "EXECUTED", "ALLOWED", "invoked");
        record(action.id, "EXECUTED", "AUDITED", "ALLOWED", "receipt");
        decisions.push({ actionId: action.id, allowed: true, reason: result.code });
      } else {
        record(action.id, "POLICY_CHECKED", "BLOCKED", result.code, result.detail);
        record(action.id, "BLOCKED", "AUDITED", result.code, "blocked");
        decisions.push({ actionId: action.id, allowed: false, reason: result.code });
      }
    }

    return { decisions, audit };
  },
};
