// Starter. Implement `run` and export `subject`.
//
// Contract:
//   run(scenario, tools) -> { decisions: [{actionId, allowed, reason}], audit: [AuditEvent] }
//
// AuditEvent: { seq, actionId, from, to, reason, detail }
// tools.invoke(actionId, call) performs the call for real and returns { ok, output }.

export const subject = {
  id: "starter",
  label: "Starter stub — replace me",

  run(scenario, tools) {
    const decisions = [];
    const audit = [];
    let seq = 0;
    const record = (actionId, from, to, reason, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, detail });
    };

    for (const action of scenario.actions) {
      record(action.id, null, "PROPOSED", "PROPOSED", action.label);
      record(action.id, "PROPOSED", "CONTEXT_LOADED", "CONTEXT_LOADED", "context loaded");

      // TODO: decide against the policy in SPEC.md, using segment trust and argument provenance.
      const allowed = false;
      const reason = "P1_UNTRUSTED_AUTHORITY";

      record(action.id, "CONTEXT_LOADED", "POLICY_CHECKED", reason, "replace this");
      if (allowed) {
        record(action.id, "POLICY_CHECKED", "APPROVED", reason, "");
        tools.invoke(action.id, action.call);
        record(action.id, "APPROVED", "EXECUTED", "ALLOWED", "invoked");
        record(action.id, "EXECUTED", "AUDITED", "ALLOWED", "receipt");
      } else {
        record(action.id, "POLICY_CHECKED", "BLOCKED", reason, "");
        record(action.id, "BLOCKED", "AUDITED", reason, "blocked");
      }
      decisions.push({ actionId: action.id, allowed, reason });
    }
    return { decisions, audit };
  },
};
