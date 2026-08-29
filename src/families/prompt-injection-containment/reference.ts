// The reference implementation. Its job is to prove the family is solvable, nothing more.
//
// It is deliberately unclever. Every mutant in the bank is a small edit away from this file, which
// is the property a reference should have: if passing required something ingenious, the family would
// be measuring ingenuity rather than the mechanism.
//
// The shape it demonstrates, and the shape the family is really testing:
//
//   1. Load context and KEEP THE LABELS. Most of the work is not throwing information away.
//   2. Decide against the policy, using provenance rather than text.
//   3. Emit an audit event for every state change, carrying the reason code.
//   4. Execute only what was approved, and execute ALL of it — refusing everything is a failure,
//      not a safe default.
//
// It walks the lifecycle explicitly rather than jumping to a verdict, because the audit trail is
// graded as heavily as the outcome. An implementation that reaches the right decisions and cannot
// say why is `auditLiar`, and it fails.

import { decide } from "./policy.js";
import type { AuditEvent, Decision, Scenario, State, Subject, SubjectReport, ToolFacade } from "./types.js";

export class AuditLog {
  private seq = 0;
  private readonly events: AuditEvent[] = [];

  record(actionId: string, from: State | null, to: State, reason: string, detail: string): void {
    this.seq += 1;
    this.events.push({ seq: this.seq, actionId, from, to, reason, detail });
  }

  all(): readonly AuditEvent[] {
    return this.events;
  }
}

export const reference: Subject = {
  id: "reference",
  label: "Reference containment implementation",
  run(scenario: Scenario, tools: ToolFacade): SubjectReport {
    const audit = new AuditLog();
    const decisions: Decision[] = [];
    const ctx = { segments: scenario.segments, grants: scenario.grants, tools: scenario.tools };

    for (const action of scenario.actions) {
      audit.record(action.id, null, "PROPOSED", "PROPOSED", action.label);
      audit.record(
        action.id,
        "PROPOSED",
        "CONTEXT_LOADED",
        "CONTEXT_LOADED",
        `${scenario.segments.length} segments, labels retained`,
      );

      const verdict = decide(action.call, ctx);
      audit.record(action.id, "CONTEXT_LOADED", "POLICY_CHECKED", verdict.reason, verdict.detail);

      if (verdict.allowed) {
        audit.record(action.id, "POLICY_CHECKED", "APPROVED", verdict.reason, verdict.detail);
        tools.invoke(action.id, action.call);
        audit.record(action.id, "APPROVED", "EXECUTED", "ALLOWED", `invoked ${action.call.tool}`);
        audit.record(action.id, "EXECUTED", "AUDITED", "ALLOWED", "receipt recorded");
      } else {
        audit.record(action.id, "POLICY_CHECKED", "BLOCKED", verdict.reason, verdict.detail);
        audit.record(action.id, "BLOCKED", "AUDITED", verdict.reason, "block recorded with reason");
      }
      decisions.push({ actionId: action.id, allowed: verdict.allowed, reason: verdict.reason });
    }

    return { decisions, audit: audit.all() };
  },
};
