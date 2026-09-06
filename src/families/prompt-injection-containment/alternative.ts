import { decide } from "./policy.js";
import type { AuditEvent, Subject } from "./types.js";
/** Batch all policy decisions first, then drive a table of legal paths. Shares the normative policy
 * predicate, not the reference's orchestration or audit implementation. */
export const alternative: Subject = {
  id: "alternative",
  label: "Plan then execute legal lifecycle paths",
  run(view, tools) {
    const audit: AuditEvent[] = [];
    const plan = view.actions.map((action) => ({ action, decision: decide(action.call, view) }));
    for (const { action, decision } of plan) {
      const path: AuditEvent["to"][] = decision.allowed
        ? ["PROPOSED", "CONTEXT_LOADED", "POLICY_CHECKED", "APPROVED", "EXECUTED", "AUDITED"]
        : ["PROPOSED", "CONTEXT_LOADED", "POLICY_CHECKED", "BLOCKED", "AUDITED"];
      let from: AuditEvent["from"] = null;
      for (const to of path) {
        if (to === "EXECUTED") tools.invoke(action.id, action.call);
        audit.push({
          seq: audit.length + 1,
          actionId: action.id,
          from,
          to,
          reason: decision.reason,
          detail: "planned lifecycle",
        });
        from = to;
      }
    }
    return {
      audit,
      decisions: plan.map(({ action, decision }) => ({
        actionId: action.id,
        allowed: decision.allowed,
        reason: decision.reason,
      })),
    };
  },
};
