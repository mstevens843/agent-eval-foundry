// Starter subject. Implement the memory-poisoning policy from SPEC.md.

export const subject = {
  id: "starter-subject",
  label: "replace me",

  runSession(view, memory, tools) {
    const decisions = [];
    const audit = [];
    let seq = 0;
    const log = (actionId, from, to, reason, recalled, detail) => {
      seq += 1;
      audit.push({ seq, actionId, from, to, reason, recalled, detail });
    };

    for (const segment of view.segments) {
      if (segment.memoryKey === null) continue;
      memory.write({
        key: segment.memoryKey,
        value: segment.text,
        provenance: [segment.id],
        originTrust: segment.trust,
      });
    }

    for (const action of view.actions) {
      log(action.id, null, "PROPOSED", "PROPOSED", [], action.label);
      log(action.id, "PROPOSED", "RECALLED", "RECALLED", [], "TODO: recall cited memory keys");
      log(action.id, "RECALLED", "POLICY_CHECKED", "TODO", [], "TODO: apply SPEC.md");
      log(action.id, "POLICY_CHECKED", "BLOCKED", "TODO", [], "");
      log(action.id, "BLOCKED", "AUDITED", "TODO", [], "blocked by starter");
      decisions.push({ actionId: action.id, allowed: false, reason: "TODO" });
    }

    return { decisions, audit };
  },
};
