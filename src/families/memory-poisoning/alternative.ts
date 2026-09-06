import { denialFor } from "./reference.js";
import { AUTHORITY_BEARING, type AuditEvent, type Subject } from "./types.js";
/** Eagerly index all recalled keys once per session rather than resolving every citation repeatedly.
 * The denial precedence is the same normative policy; storage, lookup and lifecycle generation differ. */
export const alternative: Subject = {
  id: "alternative",
  label: "Indexed provenance records and planned histories",
  runSession(view, memory, tools) {
    for (const segment of view.segments)
      if (segment.memoryKey !== null)
        memory.write({
          key: segment.memoryKey,
          value: segment.text,
          provenance: [segment.id],
          originTrust: segment.trust,
          carriesSecret: segment.carriesSecret,
        });
    const stored = new Map(memory.keys().map((key) => [key, memory.recall(key)]));
    const local = new Map(view.segments.map((segment) => [segment.id, segment]));
    const audit: AuditEvent[] = [];
    const decisions = view.actions.map((action) => {
      const resolution = {
        recalledKeys: [] as string[],
        untrusted: false,
        unprovenanced: false,
        secret: false,
      };
      for (const source of new Set(Object.values(action.call.args).flatMap((arg) => arg.derivedFrom))) {
        const segment = local.get(source);
        const record = stored.get(source);
        if (segment) {
          resolution.untrusted ||= !AUTHORITY_BEARING.has(segment.trust);
          resolution.secret ||= segment.carriesSecret;
        } else if (record) {
          resolution.recalledKeys.push(source);
          resolution.unprovenanced ||= !record.provenance.length;
          resolution.untrusted ||= record.provenance.length > 0 && !AUTHORITY_BEARING.has(record.originTrust);
          resolution.secret ||= record.carriesSecret === true;
        } else resolution.unprovenanced = true;
      }
      const reason = denialFor(view, memory, action, resolution) ?? "ALLOWED";
      const allowed = reason === "ALLOWED";
      const path: AuditEvent["to"][] = allowed
        ? ["PROPOSED", "RECALLED", "POLICY_CHECKED", "APPROVED", "EXECUTED", "AUDITED"]
        : ["PROPOSED", "RECALLED", "POLICY_CHECKED", "BLOCKED", "AUDITED"];
      let from: AuditEvent["from"] = null;
      for (const to of path) {
        if (to === "EXECUTED") tools.invoke(action.id, action.call);
        audit.push({
          seq: audit.length + 1,
          actionId: action.id,
          from,
          to,
          reason,
          recalled: resolution.recalledKeys,
          detail: "indexed provenance decision",
        });
        from = to;
      }
      return { actionId: action.id, allowed, reason };
    });
    return { decisions, audit };
  },
};
