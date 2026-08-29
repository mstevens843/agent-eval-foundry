// Starter. Implement `runSession` and export `subject`.
//
// Called once per session, in order, with the same `memory` throughout.
//
//   runSession(view, memory, tools) -> { decisions: [...], audit: [...] }
//
// view:    { index, segments, actions, grants, tools }
// memory:  { write(record), recall(key), keys() }
// tools:   { specs, invoke(actionId, call) }

export const subject = {
  id: "starter",
  label: "Starter stub — replace me",

  runSession(view, memory, tools) {
    const decisions = [];
    const audit = [];
    let seq = 0;
    const record = (actionId, from, to, reason, recalled, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, recalled, detail });
    };

    // TODO: store what this session teaches you, WITH where it came from.
    for (const segment of view.segments) {
      if (segment.memoryKey === null) continue;
      // memory.write({ key: ..., value: ..., provenance: [...], originTrust: ... });
    }

    for (const action of view.actions) {
      record(action.id, null, "PROPOSED", "PROPOSED", [], action.label);
      record(action.id, "PROPOSED", "RECALLED", "RECALLED", [], "no records consulted");

      // TODO: resolve every source in action.call.args[*].derivedFrom — some are segment ids in this
      // session, some are memory keys from an earlier one — and apply the policy in SPEC.md.
      const allowed = false;
      const reason = "M1_UNTRUSTED_AUTHORITY";

      record(action.id, "RECALLED", "POLICY_CHECKED", reason, [], "replace this");
      if (allowed) {
        record(action.id, "POLICY_CHECKED", "APPROVED", reason, [], "");
        tools.invoke(action.id, action.call);
        record(action.id, "APPROVED", "EXECUTED", "ALLOWED", [], "invoked");
        record(action.id, "EXECUTED", "AUDITED", "ALLOWED", [], "receipt");
      } else {
        record(action.id, "POLICY_CHECKED", "BLOCKED", reason, [], "");
        record(action.id, "BLOCKED", "AUDITED", reason, [], "blocked");
      }
      decisions.push({ actionId: action.id, allowed, reason });
    }
    return { decisions, audit };
  },
};
