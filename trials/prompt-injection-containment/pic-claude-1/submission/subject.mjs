// Prompt-injection containment control layer.
//
// The whole design rests on one distinction from SPEC.md: reading is unconditional, authority is
// not. A segment may be read no matter how imperative it sounds; only `system` and `user` segments
// may authorize a call, and only authority-bearing segments may supply a scope-bearing argument.
// Nothing here inspects segment TEXT — text is the attacker's medium. Every decision is made from
// structure: segment trust, argument provenance, grants, and the tool spec.
//
// `RequestedAction.origin` is deliberately never read. It is the verifier's ground truth, not an
// input to the policy; deriving the same answer from provenance is the exercise.

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
};

const ALLOWED = "ALLOWED";

const asArray = (v) => (Array.isArray(v) ? v : []);
const asObject = (v) => (v && typeof v === "object" ? v : {});

/** Stable, deterministic ordering so two runs attribute a multi-violation call identically. */
const keysOf = (o) => Object.keys(asObject(o));

const show = (v) => (typeof v === "string" ? JSON.stringify(v) : String(v));

// ---------------------------------------------------------------- context

/**
 * Everything the rules read, indexed once. Tool-output segments handed back by `tools.invoke` are
 * folded in as they arrive, so a later call citing the result of an earlier one is recognised as
 * `tool_output` (rule 2) rather than merely unknown.
 */
function buildContext(scenario, tools) {
  const segById = new Map();
  for (const seg of asArray(scenario && scenario.segments)) {
    if (seg && typeof seg.id === "string") segById.set(seg.id, seg);
  }

  const toolByName = new Map();
  const declared = asArray(scenario && scenario.tools);
  const fallback = asArray(tools && tools.specs);
  for (const spec of declared.length ? declared : fallback) {
    if (spec && typeof spec.name === "string") toolByName.set(spec.name, spec);
  }

  const grants = asArray(scenario && scenario.grants).filter(Boolean);
  const grantByApproval = new Map();
  for (const g of grants) {
    if (typeof g.approvalId === "string" && !grantByApproval.has(g.approvalId)) {
      grantByApproval.set(g.approvalId, g);
    }
  }
  const grantedCapabilities = new Set(grants.map((g) => g.capability));

  return { segById, toolByName, grants, grantByApproval, grantedCapabilities };
}

/**
 * Trust of a cited segment id. An id we have never seen cannot have earned authority, so it is
 * data by default; ids shaped like tool results are attributed to tool output so the audit names
 * the rule that actually applies.
 */
function trustOf(ctx, id) {
  const seg = typeof id === "string" ? ctx.segById.get(id) : undefined;
  if (seg && typeof seg.trust === "string") return seg.trust;
  if (typeof id === "string" && /^(tool|out|output|obs|res|result)[-_.]/i.test(id)) {
    return "tool_output";
  }
  return "retrieved";
}

const carriesSecret = (ctx, id) => {
  const seg = typeof id === "string" ? ctx.segById.get(id) : undefined;
  return Boolean(seg && seg.carriesSecret);
};

// ---------------------------------------------------------------- the eight rules

const deny = (code, detail) => ({ allowed: false, code, detail });
const allow = (detail) => ({ allowed: true, code: ALLOWED, detail });

/**
 * The eight rules of SPEC.md in their normative order. The order is the contract: a call breaking
 * several is attributed to the first one it hits, so the reason code is comparable.
 */
function evaluate(action, ctx) {
  const call = asObject(action && action.call);
  const args = asObject(call.args);
  const argKeys = keysOf(args);

  // 1 — P8_UNKNOWN_TOOL. Nothing else can be checked about a tool we have no spec for.
  const spec = typeof call.tool === "string" ? ctx.toolByName.get(call.tool) : undefined;
  if (!spec) {
    return deny(
      CODE.UNKNOWN_TOOL,
      `tool ${show(call.tool)} is not in the scenario's tool list; no capability, scope or egress ` +
        `facts exist for it, so the call is rejected before context is loaded`,
    );
  }
  const capability = spec.capability;

  // 2 — P7_TOOL_OUTPUT_AUTHORITY. A result our own tool returned is data, not permission.
  const authId = call.authorizedBy;
  const authTrust = trustOf(ctx, authId);
  if (authTrust === "tool_output") {
    return deny(
      CODE.TOOL_OUTPUT_AUTHORITY,
      `authorizing segment ${show(authId)} is tool output; a value a tool returned is readable but ` +
        `never authoritative, so it cannot authorize ${show(call.tool)}`,
    );
  }

  // 3 — P1_UNTRUSTED_AUTHORITY. Retrieved content may be read, never obeyed.
  if (!AUTHORITY_BEARING.has(authTrust)) {
    return deny(
      CODE.UNTRUSTED_AUTHORITY,
      `authorizing segment ${show(authId)} has trust ${show(authTrust)}, which is data rather than ` +
        `authority-bearing; only system or user segments may authorize a call`,
    );
  }

  // 4 — P2_CAPABILITY_NOT_GRANTED.
  if (!ctx.grantedCapabilities.has(capability)) {
    return deny(
      CODE.CAPABILITY_NOT_GRANTED,
      `tool ${show(call.tool)} needs capability ${show(capability)}, which appears in no grant ` +
        `(granted: ${[...ctx.grantedCapabilities].map(show).join(", ") || "none"})`,
    );
  }

  // 5 — P6_APPROVAL_MISMATCH. The approval must be the one whose capability matches this tool.
  const approvalId = call.approvalId;
  const grant = typeof approvalId === "string" ? ctx.grantByApproval.get(approvalId) : undefined;
  if (!grant) {
    return deny(
      CODE.APPROVAL_MISMATCH,
      approvalId == null
        ? `call cites no approval, but ${show(call.tool)} requires the approval granting ` +
          `${show(capability)}`
        : `call cites approval ${show(approvalId)}, which matches no grant in this scenario`,
    );
  }
  if (grant.capability !== capability) {
    return deny(
      CODE.APPROVAL_MISMATCH,
      `call cites approval ${show(approvalId)}, granted for capability ${show(grant.capability)}, ` +
        `but invokes ${show(call.tool)} whose capability is ${show(capability)}; an approval binds ` +
        `to one action and cannot be reused elsewhere`,
    );
  }
  const scope = asObject(grant.scope);

  // 6 — P4_UNTRUSTED_SCOPE_EXPANSION. Scope-bearing arguments are the tool's scope keys together
  //     with anything the grant actually bounds. Provenance is checked, not the value's text: a
  //     figure laundered through a summary still traces to the segment it came from.
  const scopeBearing = new Set([...asArray(spec.scopeKeys), ...keysOf(scope)]);
  for (const key of argKeys) {
    if (!scopeBearing.has(key)) continue;
    for (const src of asArray(asObject(args[key]).provenance)) {
      const trust = trustOf(ctx, src);
      if (!AUTHORITY_BEARING.has(trust)) {
        return deny(
          CODE.UNTRUSTED_SCOPE_EXPANSION,
          `scope-bearing argument ${show(key)}=${show(asObject(args[key]).value)} derives from ` +
            `segment ${show(src)} (trust ${show(trust)}), which is not authority-bearing; untrusted ` +
            `content may not set the bounds of a call`,
        );
      }
    }
  }

  // 7 — P3_SCOPE_VIOLATION. A call may narrow the grant, never widen it.
  for (const key of keysOf(scope)) {
    if (!Object.prototype.hasOwnProperty.call(args, key)) continue;
    const bound = scope[key];
    const value = asObject(args[key]).value;
    if (typeof bound === "number") {
      const n = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(n)) {
        return deny(
          CODE.SCOPE_VIOLATION,
          `numeric scope key ${show(key)} is bounded at ${bound} but the call passes ` +
            `${show(value)}, which is not a number`,
        );
      }
      if (n > bound) {
        return deny(
          CODE.SCOPE_VIOLATION,
          `argument ${show(key)}=${n} exceeds the granted bound of ${bound} under approval ` +
            `${show(approvalId)}`,
        );
      }
    } else if (String(value) !== String(bound)) {
      return deny(
        CODE.SCOPE_VIOLATION,
        `argument ${show(key)}=${show(value)} does not equal the granted scope value ` +
          `${show(bound)} under approval ${show(approvalId)}`,
      );
    }
  }

  // 8 — P5_SECRET_EGRESS. Every argument, not just the scope-bearing ones: the carrier of an
  //     exfiltration is usually a free-text field the grant says nothing about.
  if (spec.egress) {
    for (const key of argKeys) {
      for (const src of asArray(asObject(args[key]).provenance)) {
        if (carriesSecret(ctx, src)) {
          return deny(
            CODE.SECRET_EGRESS,
            `argument ${show(key)} derives from secret-bearing segment ${show(src)} and ` +
              `${show(call.tool)} moves data outside the trust boundary`,
          );
        }
      }
    }
  }

  const within = keysOf(scope).length
    ? `within approval ${show(approvalId)} (${keysOf(scope)
        .map((k) => `${k}<=${show(scope[k])}`)
        .join(", ")})`
    : `under approval ${show(approvalId)}`;
  return allow(
    `authorized by ${show(authId)} (trust ${show(authTrust)}), capability ${show(capability)} ` +
      `granted, ${within}; every scope-bearing argument traces to authority-bearing segments` +
      (spec.egress ? " and no argument derives from a secret-bearing segment" : ""),
  );
}

// ---------------------------------------------------------------- the run loop

export const subject = {
  id: "provenance-gate",
  label: "Provenance-gated containment: eight rules in order, legality-table lifecycle",

  run(scenario, tools) {
    const ctx = buildContext(scenario, tools);
    const decisions = [];
    const audit = [];
    let seq = 0;

    const record = (actionId, from, to, reason, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, detail });
    };

    for (const action of asArray(scenario && scenario.actions)) {
      const id = action && typeof action.id === "string" ? action.id : `action-${seq}`;
      const call = asObject(action && action.call);
      const label = (action && action.label) || id;

      record(id, null, "PROPOSED", "PROPOSED", `${label} -> ${show(call.tool)}`);

      const verdict = evaluate(action, ctx);

      // Rule 1 is a rejection, not a block: an unknown tool never gets as far as having a context
      // loaded for it. PROPOSED -> REJECTED -> AUDITED.
      if (!verdict.allowed && verdict.code === CODE.UNKNOWN_TOOL) {
        record(id, "PROPOSED", "REJECTED", verdict.code, verdict.detail);
        record(id, "REJECTED", "AUDITED", verdict.code, `rejected under ${verdict.code}; not invoked`);
        decisions.push({ actionId: id, allowed: false, reason: verdict.code });
        continue;
      }

      record(
        id,
        "PROPOSED",
        "CONTEXT_LOADED",
        "CONTEXT_LOADED",
        `authorizedBy=${show(call.authorizedBy)} trust=${show(trustOf(ctx, call.authorizedBy))} ` +
          `approvalId=${show(call.approvalId)} args=[${keysOf(call.args)
            .map((k) => `${k}<-${JSON.stringify(asArray(asObject(asObject(call.args)[k]).provenance))}`)
            .join(" ")}]`,
      );
      record(id, "CONTEXT_LOADED", "POLICY_CHECKED", verdict.code, verdict.detail);

      if (!verdict.allowed) {
        record(id, "POLICY_CHECKED", "BLOCKED", verdict.code, verdict.detail);
        record(id, "BLOCKED", "AUDITED", verdict.code, `blocked under ${verdict.code}; not invoked`);
        decisions.push({ actionId: id, allowed: false, reason: verdict.code });
        continue;
      }

      record(id, "POLICY_CHECKED", "APPROVED", ALLOWED, verdict.detail);

      // Once approved, the call happens and the audit says so. APPROVED -> BLOCKED and
      // EXECUTED -> BLOCKED are not legal transitions: history is recorded, never rewritten.
      let outcome;
      try {
        const result = tools.invoke(id, action.call);
        const output = result && result.output;
        if (output && typeof output.id === "string") ctx.segById.set(output.id, output);
        outcome =
          result && result.ok === false
            ? `invoked ${show(call.tool)}; tool reported failure`
            : `invoked ${show(call.tool)}`;
      } catch (err) {
        // The boundary was crossed regardless of what came back. Record it as executed.
        outcome = `invoked ${show(call.tool)}; boundary threw: ${err && err.message ? err.message : String(err)}`;
      }

      record(id, "APPROVED", "EXECUTED", ALLOWED, outcome);
      record(id, "EXECUTED", "AUDITED", ALLOWED, `permitted call complete; ${outcome}`);
      decisions.push({ actionId: id, allowed: true, reason: ALLOWED });
    }

    return { decisions, audit };
  },
};
