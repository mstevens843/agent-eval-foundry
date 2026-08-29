const AUTHORITY_BEARING = new Set(["system", "user"]);

const reasonDetails = {
  P8_UNKNOWN_TOOL: "tool is not listed in this scenario",
  P7_TOOL_OUTPUT_AUTHORITY: "authorizing segment is tool output",
  P1_UNTRUSTED_AUTHORITY: "authorizing segment is not authority-bearing",
  P2_CAPABILITY_NOT_GRANTED: "tool capability has no grant",
  P6_APPROVAL_MISMATCH: "approval id does not match the tool capability",
  P4_UNTRUSTED_SCOPE_EXPANSION:
    "scope-bearing argument derives from a non-authority-bearing segment",
  P3_SCOPE_VIOLATION: "argument exceeds or differs from the granted scope",
  P5_SECRET_EGRESS: "secret-bearing provenance would be passed to an egress tool",
  ALLOWED: "all policy checks passed",
};

const isAuthorityBearing = (segment) =>
  segment !== undefined && AUTHORITY_BEARING.has(segment.trust);

const provenanceFor = (arg) =>
  Array.isArray(arg?.provenance) ? arg.provenance : [];

const firstProvenanceSegment = (arg, segments, predicate) => {
  for (const segmentId of provenanceFor(arg)) {
    const segment = segments.get(segmentId);
    if (predicate(segment, segmentId)) {
      return { segment, segmentId };
    }
  }
  return null;
};

const scopeValueViolates = (actual, granted) => {
  if (typeof actual === "number" && typeof granted === "number") {
    return actual > granted;
  }
  if (typeof actual === "string" && typeof granted === "string") {
    return actual !== granted;
  }
  return actual !== granted;
};

const evaluate = (action, context) => {
  const { call } = action;
  const args = call?.args ?? {};
  const tool = context.toolsByName.get(call?.tool);

  if (!tool) {
    return {
      allowed: false,
      reason: "P8_UNKNOWN_TOOL",
      detail: `${call?.tool ?? "<missing>"} is not in scenario.tools`,
    };
  }

  const authorizingSegment = context.segmentsById.get(call.authorizedBy);

  if (authorizingSegment?.trust === "tool_output") {
    return {
      allowed: false,
      reason: "P7_TOOL_OUTPUT_AUTHORITY",
      detail: `${call.authorizedBy} is tool_output`,
    };
  }

  if (authorizingSegment?.trust === "retrieved") {
    return {
      allowed: false,
      reason: "P1_UNTRUSTED_AUTHORITY",
      detail: `${call.authorizedBy} is retrieved content`,
    };
  }

  if (!isAuthorityBearing(authorizingSegment)) {
    return {
      allowed: false,
      reason: "P1_UNTRUSTED_AUTHORITY",
      detail: `${call.authorizedBy ?? "<missing>"} is not authority-bearing`,
    };
  }

  if (!context.grants.some((grant) => grant.capability === tool.capability)) {
    return {
      allowed: false,
      reason: "P2_CAPABILITY_NOT_GRANTED",
      detail: `${tool.capability} has no grant`,
    };
  }

  const grant = context.grants.find(
    (candidate) =>
      candidate.approvalId === call.approvalId &&
      candidate.capability === tool.capability,
  );

  if (!grant) {
    return {
      allowed: false,
      reason: "P6_APPROVAL_MISMATCH",
      detail: `${call.approvalId ?? "<none>"} does not grant ${tool.capability}`,
    };
  }

  const scopeKeys = new Set(tool.scopeKeys ?? []);
  for (const [argName, arg] of Object.entries(args)) {
    if (!scopeKeys.has(argName)) {
      continue;
    }

    const nonAuthority = firstProvenanceSegment(
      arg,
      context.segmentsById,
      (segment) => !isAuthorityBearing(segment),
    );

    if (nonAuthority) {
      const trust = nonAuthority.segment?.trust ?? "unknown";
      return {
        allowed: false,
        reason: "P4_UNTRUSTED_SCOPE_EXPANSION",
        detail: `${argName} derives from ${nonAuthority.segmentId} (${trust})`,
      };
    }
  }

  for (const [scopeKey, grantedValue] of Object.entries(grant.scope ?? {})) {
    if (!Object.prototype.hasOwnProperty.call(args, scopeKey)) {
      continue;
    }

    const actualValue = args[scopeKey]?.value;
    if (scopeValueViolates(actualValue, grantedValue)) {
      return {
        allowed: false,
        reason: "P3_SCOPE_VIOLATION",
        detail: `${scopeKey}=${String(actualValue)} exceeds or differs from ${String(
          grantedValue,
        )}`,
      };
    }
  }

  if (tool.egress) {
    for (const [argName, arg] of Object.entries(args)) {
      const secret = firstProvenanceSegment(
        arg,
        context.segmentsById,
        (segment) => segment?.carriesSecret === true,
      );

      if (secret) {
        return {
          allowed: false,
          reason: "P5_SECRET_EGRESS",
          detail: `${argName} derives from secret-bearing segment ${secret.segmentId}`,
        };
      }
    }
  }

  return {
    allowed: true,
    reason: "ALLOWED",
    detail: reasonDetails.ALLOWED,
  };
};

export const subject = {
  id: "provenance-policy-enforcer",
  label: "Provenance policy enforcer",

  run(scenario, tools) {
    const decisions = [];
    const audit = [];
    let seq = 0;

    const context = {
      segmentsById: new Map(
        (scenario.segments ?? []).map((segment) => [segment.id, segment]),
      ),
      grants: scenario.grants ?? [],
      toolsByName: new Map(
        (scenario.tools ?? []).map((toolSpec) => [toolSpec.name, toolSpec]),
      ),
    };

    const record = (actionId, from, to, reason, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, detail });
    };

    for (const action of scenario.actions ?? []) {
      record(action.id, null, "PROPOSED", "PROPOSED", action.label);
      record(
        action.id,
        "PROPOSED",
        "CONTEXT_LOADED",
        "CONTEXT_LOADED",
        "segments, grants, and tool specs loaded",
      );

      const decision = evaluate(action, context);
      record(
        action.id,
        "CONTEXT_LOADED",
        "POLICY_CHECKED",
        decision.reason,
        decision.detail,
      );

      if (decision.allowed) {
        record(
          action.id,
          "POLICY_CHECKED",
          "APPROVED",
          decision.reason,
          decision.detail,
        );

        const result = tools.invoke(action.id, action.call);
        if (result?.output?.id) {
          context.segmentsById.set(result.output.id, result.output);
        }

        record(
          action.id,
          "APPROVED",
          "EXECUTED",
          "ALLOWED",
          result?.output?.id
            ? `invoked ${action.call.tool}; output ${result.output.id} recorded`
            : `invoked ${action.call.tool}`,
        );
        record(
          action.id,
          "EXECUTED",
          "AUDITED",
          "ALLOWED",
          "allowed action audited",
        );
      } else {
        record(
          action.id,
          "POLICY_CHECKED",
          "BLOCKED",
          decision.reason,
          decision.detail || reasonDetails[decision.reason],
        );
        record(
          action.id,
          "BLOCKED",
          "AUDITED",
          decision.reason,
          "blocked action audited",
        );
      }

      decisions.push({
        actionId: action.id,
        allowed: decision.allowed,
        reason: decision.reason,
      });
    }

    return { decisions, audit };
  },
};
