// Prompt-injection containment control layer.
//
// The whole decision procedure is structural: a call's authority is the TRUST of the segment it
// cites, and an argument's legitimacy is the trust of the segments it DERIVED from. Text is never
// consulted. Reading untrusted content is always permitted; what is read can never grant authority.
//
// Rules are evaluated in the order given by SPEC.md and the first violation wins, so the reported
// reason code is the one the policy attributes.

const AUTHORITY_BEARING = new Set(["system", "user"]);

const CODE = {
  UNKNOWN_TOOL: "P8_UNKNOWN_TOOL",
  TOOL_OUTPUT_AUTHORITY: "P7_TOOL_OUTPUT_AUTHORITY",
  UNTRUSTED_AUTHORITY: "P1_UNTRUSTED_AUTHORITY",
  CAPABILITY_NOT_GRANTED: "P2_CAPABILITY_NOT_GRANTED",
  APPROVAL_MISMATCH: "P6_APPROVAL_MISMATCH",
  UNTRUSTED_SCOPE_EXPANSION: "P4_UNTRUSTED_SCOPE_EXPANSION",
  SCOPE_VIOLATION: "P3_SCOPE_VIOLATION",
  SECRET_EGRESS: "P5_SECRET_EGRESS",
  ALLOWED: "ALLOWED",
};

/** Best-effort trust for a segment id that is not in the registry. Both fallbacks deny. */
const inferTrust = (id) => {
  const s = String(id ?? "").toLowerCase();
  if (/^(tool|to|out|obs|res|tout)\b|^(tool|to|out|obs|res|tout)[-_.]?\d/.test(s)) return "tool_output";
  return "retrieved";
};

/** Compare one argument value against one granted scope bound. Returns a message, or null if ok. */
const scopeBreach = (key, argValue, scopeValue) => {
  const bothNumbers = typeof argValue === "number" && typeof scopeValue === "number";
  if (bothNumbers) {
    return argValue > scopeValue
      ? `${key}=${argValue} exceeds granted bound ${scopeValue}`
      : null;
  }
  if (typeof argValue === "string" && typeof scopeValue === "string") {
    return argValue !== scopeValue
      ? `${key}="${argValue}" does not equal granted value "${scopeValue}"`
      : null;
  }
  // Mixed types: compare numerically when both sides read as numbers, else by exact text.
  const an = Number(argValue);
  const sn = Number(scopeValue);
  if (Number.isFinite(an) && Number.isFinite(sn)) {
    return an > sn ? `${key}=${argValue} exceeds granted bound ${scopeValue}` : null;
  }
  return String(argValue) !== String(scopeValue)
    ? `${key}="${argValue}" does not equal granted value "${scopeValue}"`
    : null;
};

export const subject = {
  id: "provenance-gate",
  label: "Provenance-gated policy engine with lifecycle audit trail",

  run(scenario, tools) {
    const decisions = [];
    const audit = [];
    let seq = 0;
    const record = (actionId, from, to, reason, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, detail: String(detail ?? "") });
    };

    const actions = Array.isArray(scenario?.actions) ? scenario.actions : [];

    // ---- context ------------------------------------------------------------------------
    // Segment registry. Seeded from the scenario, then extended with every tool output we
    // actually produce, because a later call may cite a result our own tool returned — and a
    // result our own tool returned is data, not permission.
    const segments = new Map();
    for (const s of scenario?.segments ?? []) {
      if (s && s.id != null) segments.set(String(s.id), s);
    }

    const segmentOf = (id) => {
      const key = String(id ?? "");
      const known = segments.get(key);
      if (known) {
        return {
          id: key,
          trust: known.trust ?? inferTrust(key),
          carriesSecret: known.carriesSecret === true,
          known: true,
        };
      }
      return { id: key, trust: inferTrust(key), carriesSecret: false, known: false };
    };

    const declaredTools = Array.isArray(scenario?.tools) && scenario.tools.length
      ? scenario.tools
      : (Array.isArray(tools?.specs) ? tools.specs : []);
    const toolByName = new Map();
    for (const t of declaredTools) {
      if (t && t.name != null) toolByName.set(String(t.name), t);
    }

    const grants = Array.isArray(scenario?.grants) ? scenario.grants : [];
    const grantByApproval = new Map();
    const grantedCapabilities = new Set();
    for (const g of grants) {
      if (!g) continue;
      if (g.approvalId != null && !grantByApproval.has(String(g.approvalId))) {
        grantByApproval.set(String(g.approvalId), g);
      }
      if (g.capability != null) grantedCapabilities.add(String(g.capability));
    }

    const contextDetail = (() => {
      const counts = { system: 0, user: 0, retrieved: 0, tool_output: 0 };
      for (const s of segments.values()) {
        const t = s?.trust;
        if (t in counts) counts[t] += 1;
      }
      return `context: ${segments.size} segment(s) ` +
        `[system:${counts.system} user:${counts.user} retrieved:${counts.retrieved} tool_output:${counts.tool_output}], ` +
        `${toolByName.size} tool(s), ${grants.length} grant(s)`;
    })();

    // ---- the policy ---------------------------------------------------------------------
    const evaluate = (action) => {
      const call = action?.call ?? {};
      const args = call.args && typeof call.args === "object" ? call.args : {};
      const argEntries = Object.entries(args).filter(([, v]) => v && typeof v === "object");
      const provenanceOf = (argValue) =>
        Array.isArray(argValue?.provenance) ? argValue.provenance : [];

      // Rule 1 — the tool must exist in the scenario's tool list.
      const toolName = String(call.tool ?? "");
      const spec = toolByName.get(toolName);
      if (!spec) {
        return {
          allowed: false,
          reason: CODE.UNKNOWN_TOOL,
          detail: `tool "${toolName}" is not in the scenario tool list`,
        };
      }

      // Rules 2 and 3 — where the authority is claimed to come from.
      const authority = segmentOf(call.authorizedBy);
      const authorityNote = authority.known
        ? `${authority.id} (${authority.trust})`
        : `${authority.id} (unknown segment, treated as ${authority.trust})`;
      if (authority.trust === "tool_output") {
        return {
          allowed: false,
          reason: CODE.TOOL_OUTPUT_AUTHORITY,
          detail: `authorizing segment ${authorityNote} is tool output; a result a tool returned is data, not authority`,
        };
      }
      if (!AUTHORITY_BEARING.has(authority.trust)) {
        return {
          allowed: false,
          reason: CODE.UNTRUSTED_AUTHORITY,
          detail: `authorizing segment ${authorityNote} is not authority-bearing; retrieved content cannot authorize a call`,
        };
      }

      // Rule 4 — the capability must be granted at all.
      const capability = String(spec.capability ?? "");
      if (!grantedCapabilities.has(capability)) {
        return {
          allowed: false,
          reason: CODE.CAPABILITY_NOT_GRANTED,
          detail: `capability "${capability}" for tool "${toolName}" appears in no grant`,
        };
      }

      // Rule 5 — the cited approval must be the one covering this tool's capability.
      const approvalId = call.approvalId == null ? null : String(call.approvalId);
      const grant = approvalId == null ? undefined : grantByApproval.get(approvalId);
      if (!grant) {
        return {
          allowed: false,
          reason: CODE.APPROVAL_MISMATCH,
          detail: approvalId == null
            ? `call cites no approval; "${toolName}" requires the approval granting "${capability}"`
            : `cited approval "${approvalId}" matches no grant`,
        };
      }
      if (String(grant.capability ?? "") !== capability) {
        return {
          allowed: false,
          reason: CODE.APPROVAL_MISMATCH,
          detail: `cited approval "${approvalId}" grants "${grant.capability}", but "${toolName}" invokes "${capability}"`,
        };
      }

      // Rule 6 — no scope-bearing argument may derive from data.
      const scopeKeys = Array.isArray(spec.scopeKeys) ? spec.scopeKeys : [];
      for (const key of scopeKeys) {
        const arg = args[key];
        if (!arg || typeof arg !== "object") continue;
        for (const src of provenanceOf(arg)) {
          const seg = segmentOf(src);
          if (!AUTHORITY_BEARING.has(seg.trust)) {
            return {
              allowed: false,
              reason: CODE.UNTRUSTED_SCOPE_EXPANSION,
              detail: `scope-bearing argument "${key}" derives from ${seg.id} (${seg.trust}${seg.known ? "" : ", unknown segment"}), which cannot widen or set scope`,
            };
          }
        }
      }

      // Rule 7 — the call may narrow the granted scope, never widen it.
      const scope = grant.scope && typeof grant.scope === "object" ? grant.scope : {};
      for (const [key, bound] of Object.entries(scope)) {
        const arg = args[key];
        if (!arg || typeof arg !== "object") continue;
        const breach = scopeBreach(key, arg.value, bound);
        if (breach) {
          return {
            allowed: false,
            reason: CODE.SCOPE_VIOLATION,
            detail: `${breach} (approval "${approvalId}")`,
          };
        }
      }

      // Rule 8 — nothing touched by a secret leaves the trust boundary.
      if (spec.egress === true) {
        for (const [key, arg] of argEntries) {
          for (const src of provenanceOf(arg)) {
            const seg = segmentOf(src);
            if (seg.carriesSecret) {
              return {
                allowed: false,
                reason: CODE.SECRET_EGRESS,
                detail: `argument "${key}" derives from secret-bearing segment ${seg.id}; "${toolName}" is an egress tool`,
              };
            }
          }
        }
      }

      const scopeSummary = Object.keys(scope).length
        ? `within scope ${JSON.stringify(scope)}`
        : "grant carries no scope bounds";
      return {
        allowed: true,
        reason: CODE.ALLOWED,
        detail: `authorized by ${authorityNote} under approval "${approvalId}" for capability "${capability}"; ${scopeSummary}; no scope-bearing argument derives from data${spec.egress === true ? "; no secret-derived argument egresses" : ""}`,
      };
    };

    // ---- run ----------------------------------------------------------------------------
    for (const action of actions) {
      const actionId = action?.id ?? "";
      record(actionId, null, "PROPOSED", "PROPOSED", action?.label ?? "requested action");
      record(actionId, "PROPOSED", "CONTEXT_LOADED", "CONTEXT_LOADED", contextDetail);

      let verdict;
      try {
        verdict = evaluate(action);
      } catch (err) {
        // Fail closed: an evaluation we could not complete is not an evaluation that passed.
        verdict = {
          allowed: false,
          reason: CODE.UNTRUSTED_AUTHORITY,
          detail: `policy evaluation failed (${err && err.message ? err.message : String(err)}); denied by default`,
        };
      }

      record(actionId, "CONTEXT_LOADED", "POLICY_CHECKED", verdict.reason, verdict.detail);

      if (verdict.allowed) {
        record(actionId, "POLICY_CHECKED", "APPROVED", verdict.reason, "policy satisfied; approved for execution");

        let invokeNote = "invoked";
        try {
          const result = tools.invoke(actionId, action.call);
          // A tool result is a new tool_output segment: readable by later checks, never authoritative.
          const out = result?.output;
          if (out && out.id != null && !segments.has(String(out.id))) {
            segments.set(String(out.id), {
              id: String(out.id),
              trust: out.trust ?? "tool_output",
              text: out.text ?? "",
              carriesSecret: out.carriesSecret === true,
            });
            invokeNote = `invoked; result recorded as segment ${out.id} (${out.trust ?? "tool_output"}), data only`;
          } else if (result && result.ok === false) {
            invokeNote = "invoked; tool reported failure";
          }
        } catch (err) {
          invokeNote = `invoked; tool threw (${err && err.message ? err.message : String(err)})`;
        }

        // The call reached the tool. History records that first, whatever followed.
        record(actionId, "APPROVED", "EXECUTED", CODE.ALLOWED, invokeNote);
        record(actionId, "EXECUTED", "AUDITED", CODE.ALLOWED, `receipt: ${verdict.detail}`);
      } else {
        record(actionId, "POLICY_CHECKED", "BLOCKED", verdict.reason, verdict.detail);
        record(actionId, "BLOCKED", "AUDITED", verdict.reason, `blocked under ${verdict.reason}: ${verdict.detail}`);
      }

      decisions.push({ actionId, allowed: verdict.allowed, reason: verdict.reason });
    }

    return { decisions, audit };
  },
};
