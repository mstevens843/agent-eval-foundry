// Prompt-injection containment subject.
//
// The whole decision procedure is structural: it reads segment trust and argument provenance and
// never looks at segment or argument *text*. Untrusted content may be read freely; it may not
// authorize a call, widen a scope, or ride out through an egress tool.
//
// The eight rules of SPEC.md are evaluated in their declared order, and the first rule a call hits
// is the one it is attributed to, so reason codes are comparable with the policy's own attribution.

/** The two trust levels that may authorize an action. Everything else is data, however it reads. */
const AUTHORITY_BEARING = new Set(["system", "user"]);

/** Reason code carried by a decision that passed all eight rules. */
const ALLOWED = "ALLOWED";

const deny = (reason, detail) => ({ allowed: false, reason, detail });
const allow = (detail) => ({ allowed: true, reason: ALLOWED, detail });

/** Segment ids an argument's value derives from. Empty means the implementation authored it. */
const provenanceOf = (arg) =>
  arg && Array.isArray(arg.provenance) ? arg.provenance.filter((id) => typeof id === "string") : [];

const show = (v) => (typeof v === "string" ? `"${v}"` : String(v));

const indexBy = (list, key) => {
  const map = new Map();
  for (const item of Array.isArray(list) ? list : []) {
    if (item && typeof item[key] === "string") map.set(item[key], item);
  }
  return map;
};

/**
 * Apply the policy to one requested action.
 *
 * Returns { allowed, reason, detail }. `reason` is the code of the first rule the call violates,
 * matching SPEC.md's evaluation order:
 *   P8 unknown tool -> P7 tool-output authority -> P1 untrusted authority -> P2 capability
 *   -> P6 approval mismatch -> P4 untrusted scope expansion -> P3 scope violation -> P5 secret egress
 */
function evaluate(action, ctx) {
  const call = (action && action.call) || {};

  // 1. P8 — the tool must exist in the scenario's tool list.
  const tool = ctx.toolsByName.get(call.tool);
  if (!tool) {
    return deny("P8_UNKNOWN_TOOL", `tool ${show(call.tool)} is not in the scenario's tool list`);
  }

  // 2. P7 — a result our own tool returned is not permission to do the next thing.
  const authId = call.authorizedBy;
  const auth = ctx.segmentsById.get(authId);
  if (auth && auth.trust === "tool_output") {
    return deny(
      "P7_TOOL_OUTPUT_AUTHORITY",
      `authorizing segment ${show(authId)} is tool_output; tool output is data, never authority`,
    );
  }

  // 3. P1 — retrieved content (or an authorizing segment that does not exist) cannot authorize.
  if (!auth || !AUTHORITY_BEARING.has(auth.trust)) {
    const what = auth ? `is ${auth.trust} content` : "does not exist in the context";
    return deny(
      "P1_UNTRUSTED_AUTHORITY",
      `authorizing segment ${show(authId)} ${what}; only system or user may authorize a call`,
    );
  }

  // 4. P2 — the tool's capability must appear in some grant.
  const capabilityGranted = ctx.grants.some((g) => g && g.capability === tool.capability);
  if (!capabilityGranted) {
    return deny(
      "P2_CAPABILITY_NOT_GRANTED",
      `no grant carries capability ${show(tool.capability)} required by ${show(tool.name)}`,
    );
  }

  // 5. P6 — the cited approval must be the one whose capability matches this tool.
  const cited =
    call.approvalId == null
      ? undefined
      : ctx.grants.find((g) => g && g.approvalId === call.approvalId);
  if (!cited) {
    return deny(
      "P6_APPROVAL_MISMATCH",
      call.approvalId == null
        ? `call cites no approval, but ${show(tool.name)} requires the ${show(tool.capability)} approval`
        : `cited approval ${show(call.approvalId)} does not exist`,
    );
  }
  if (cited.capability !== tool.capability) {
    return deny(
      "P6_APPROVAL_MISMATCH",
      `cited approval ${show(cited.approvalId)} grants ${show(cited.capability)}, but ${show(tool.name)} invokes ${show(tool.capability)}`,
    );
  }

  const args = (call.args && typeof call.args === "object") ? call.args : {};

  // 6. P4 — no scope-bearing argument may derive from a non-authority-bearing segment. Laundering a
  // value through intermediate summaries does not launder its provenance.
  const scopeKeys = Array.isArray(tool.scopeKeys) ? tool.scopeKeys : [];
  for (const key of scopeKeys) {
    if (!Object.prototype.hasOwnProperty.call(args, key)) continue;
    const tainted = provenanceOf(args[key]).filter((id) => {
      const seg = ctx.segmentsById.get(id);
      return !seg || !AUTHORITY_BEARING.has(seg.trust);
    });
    if (tainted.length > 0) {
      const kinds = tainted
        .map((id) => `${id}(${ctx.segmentsById.get(id)?.trust ?? "unknown"})`)
        .join(", ");
      return deny(
        "P4_UNTRUSTED_SCOPE_EXPANSION",
        `scope-bearing argument ${show(key)} derives from non-authority-bearing segment(s): ${kinds}`,
      );
    }
  }

  // 7. P3 — a call may narrow the granted scope, never widen it.
  const scope = (cited.scope && typeof cited.scope === "object") ? cited.scope : {};
  for (const key of Object.keys(scope)) {
    if (!Object.prototype.hasOwnProperty.call(args, key)) continue;
    const bound = scope[key];
    const value = args[key] ? args[key].value : undefined;
    if (typeof bound === "number" && typeof value === "number") {
      if (value > bound) {
        return deny(
          "P3_SCOPE_VIOLATION",
          `argument ${show(key)}=${show(value)} exceeds the ${show(cited.approvalId)} scope bound ${show(bound)}`,
        );
      }
    } else if (value !== bound) {
      return deny(
        "P3_SCOPE_VIOLATION",
        `argument ${show(key)}=${show(value)} does not equal the ${show(cited.approvalId)} scope bound ${show(bound)}`,
      );
    }
  }

  // 8. P5 — nothing derived from a secret-bearing segment leaves the trust boundary.
  if (tool.egress) {
    for (const key of Object.keys(args)) {
      const secrets = provenanceOf(args[key]).filter(
        (id) => ctx.segmentsById.get(id)?.carriesSecret === true,
      );
      if (secrets.length > 0) {
        return deny(
          "P5_SECRET_EGRESS",
          `argument ${show(key)} derives from secret-bearing segment(s) ${secrets.join(", ")} and ${show(tool.name)} is an egress tool`,
        );
      }
    }
  }

  return allow(
    `authorized by ${show(authId)} (${auth.trust}) under approval ${show(cited.approvalId)} for ${show(tool.capability)}; all arguments within granted scope`,
  );
}

export const subject = {
  id: "provenance-gate",
  label: "Provenance-gated policy engine — trust and derivation, never text",

  run(scenario, tools) {
    const decisions = [];
    const audit = [];
    let seq = 0;
    const record = (actionId, from, to, reason, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, detail });
    };

    const segments = Array.isArray(scenario?.segments) ? scenario.segments : [];
    const grants = Array.isArray(scenario?.grants) ? scenario.grants : [];
    const ctx = {
      segmentsById: indexBy(segments, "id"),
      toolsByName: indexBy(Array.isArray(scenario?.tools) ? scenario.tools : [], "name"),
      grants,
    };

    const actions = Array.isArray(scenario?.actions) ? scenario.actions : [];
    for (const action of actions) {
      const id = action?.id;

      record(id, null, "PROPOSED", "PROPOSED", action?.label ?? "requested action");
      record(
        id,
        "PROPOSED",
        "CONTEXT_LOADED",
        "CONTEXT_LOADED",
        `${segments.length} segment(s), ${grants.length} grant(s) loaded; trust and provenance indexed`,
      );

      let verdict;
      try {
        verdict = evaluate(action, ctx);
      } catch (err) {
        // Deny by default: an action we cannot evaluate is an action we do not perform.
        verdict = deny("P8_UNKNOWN_TOOL", `action could not be evaluated: ${err?.message ?? err}`);
      }

      record(id, "CONTEXT_LOADED", "POLICY_CHECKED", verdict.reason, verdict.detail);

      if (verdict.allowed) {
        record(id, "POLICY_CHECKED", "APPROVED", verdict.reason, verdict.detail);
        let outcome = "invoked";
        try {
          const result = tools.invoke(id, action.call);
          const outId = result?.output?.id;
          outcome = `invoked ${action.call.tool}${result?.ok === false ? " (tool reported failure)" : ""}${
            outId ? `; output segment ${show(outId)} recorded as tool_output (data, not authority)` : ""
          }`;
        } catch (err) {
          // The call reached the boundary; the audit says so rather than pretending it never ran.
          outcome = `invoked ${action.call.tool}; tool threw: ${err?.message ?? err}`;
        }
        // APPROVED -> EXECUTED -> AUDITED: history is recorded, never rewritten.
        record(id, "APPROVED", "EXECUTED", ALLOWED, outcome);
        record(id, "EXECUTED", "AUDITED", ALLOWED, `receipt: ${action.call.tool} executed under ${verdict.reason}`);
      } else {
        record(id, "POLICY_CHECKED", "BLOCKED", verdict.reason, verdict.detail);
        record(id, "BLOCKED", "AUDITED", verdict.reason, `blocked by ${verdict.reason}: ${verdict.detail}`);
      }

      decisions.push({ actionId: id, allowed: verdict.allowed, reason: verdict.reason });
    }

    return { decisions, audit };
  },
};
