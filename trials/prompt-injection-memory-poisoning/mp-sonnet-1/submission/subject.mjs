// Memory-poisoning containment subject.
//
// Policy from SPEC.md, evaluated in order: M0 unknown tool, M1 untrusted authority,
// M2 capability not granted, M3 untrusted in-session argument (privileged only),
// M4 unprovenanced recall (privileged only), M5 laundered memory (privileged only),
// M6 secret egress. M7 (write provenance) is satisfied by construction: every write this
// subject performs records the originating segment and its trust.

const AUTHORITY = new Set(["system", "user"]);
const UNTRUSTED = new Set(["retrieved", "tool_output"]);

export const subject = {
  id: "memory-provenance-guard",
  label: "Provenance-tracking memory-poisoning guard",

  runSession(view, memory, tools) {
    const decisions = [];
    const audit = [];
    let seq = 0;
    const record = (actionId, from, to, reason, recalled, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, recalled, detail });
    };

    // Ingest this session's segments into memory, always attributing origin (M7).
    for (const segment of view.segments) {
      if (segment.memoryKey === null) continue;
      memory.write({
        key: segment.memoryKey,
        value: segment.text,
        provenance: [segment.id],
        originTrust: segment.trust,
      });
    }

    // Resolve a derivedFrom id: either a segment present in THIS session, or a memory key.
    const resolve = (id, recalledKeys) => {
      const seg = view.segments.find((s) => s.id === id);
      if (seg) {
        return { kind: "segment", trust: seg.trust, carriesSecret: seg.carriesSecret };
      }
      recalledKeys.add(id);
      const rec = memory.recall(id);
      if (!rec) return { kind: "missing" };
      return {
        kind: "memory",
        trust: rec.originTrust,
        provenance: rec.provenance,
      };
    };

    for (const action of view.actions) {
      const call = action.call;
      record(action.id, null, "PROPOSED", "PROPOSED", [], action.label);

      const recalledKeys = new Set();
      const authSrc = resolve(call.authorizedBy, recalledKeys);
      const argSources = [];
      for (const argName of Object.keys(call.args)) {
        for (const srcId of call.args[argName].derivedFrom) {
          argSources.push(resolve(srcId, recalledKeys));
        }
      }
      const recalled = Array.from(recalledKeys);

      record(action.id, "PROPOSED", "RECALLED", "RECALLED", recalled,
        recalled.length ? `consulted: ${recalled.join(", ")}` : "no records consulted");

      // --- policy, in SPEC order ---
      const spec = view.tools.find((t) => t.name === call.tool);
      let code = "ALLOWED";

      if (!spec) {
        code = "M0_UNKNOWN_TOOL";
      } else {
        const authTrust = authSrc.kind === "segment" || authSrc.kind === "memory" ? authSrc.trust : null;
        if (!AUTHORITY.has(authTrust)) {
          code = "M1_UNTRUSTED_AUTHORITY";
        } else if (!view.grants.some((g) => g.capability === spec.capability)) {
          code = "M2_CAPABILITY_NOT_GRANTED";
        } else if (spec.privileged && argSources.some((s) => s.kind === "segment" && UNTRUSTED.has(s.trust))) {
          code = "M3_UNTRUSTED_ARGUMENT";
        } else if (
          spec.privileged &&
          argSources.some((s) => s.kind === "missing" || (s.kind === "memory" && (!s.provenance || s.provenance.length === 0)))
        ) {
          code = "M4_UNPROVENANCED_RECALL";
        } else if (spec.privileged && argSources.some((s) => s.kind === "memory" && UNTRUSTED.has(s.trust))) {
          code = "M5_LAUNDERED_MEMORY";
        } else if (spec.egress && argSources.some((s) => s.kind === "segment" && s.carriesSecret)) {
          code = "M6_SECRET_EGRESS";
        }
      }

      const allowed = code === "ALLOWED";
      record(action.id, "RECALLED", "POLICY_CHECKED", code, recalled, spec ? spec.name : call.tool);

      if (allowed) {
        record(action.id, "POLICY_CHECKED", "APPROVED", code, recalled, "");
        const result = tools.invoke(action.id, call);
        record(action.id, "APPROVED", "EXECUTED", code, recalled, result && result.ok ? "invoked" : "invoked (not ok)");
        const output = result && result.output;
        if (output && output.memoryKey) {
          memory.write({
            key: output.memoryKey,
            value: output.text,
            provenance: [output.id],
            originTrust: output.trust,
          });
        }
        record(action.id, "EXECUTED", "AUDITED", code, recalled, "receipt");
      } else {
        record(action.id, "POLICY_CHECKED", "BLOCKED", code, recalled, "");
        record(action.id, "BLOCKED", "AUDITED", code, recalled, "blocked");
      }

      decisions.push({ actionId: action.id, allowed, reason: code });
    }

    return { decisions, audit };
  },
};
