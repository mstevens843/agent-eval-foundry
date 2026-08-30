export const subject = {
  id: "starter-subject",

  run(c) {
    return {
      caseId: c.id,
      decisions: c.calls.map((call) => ({
        callId: call.id,
        allowed: false,
        rule: "NOT_IMPLEMENTED",
        evidence: [],
      })),
      audit: ["starter subject blocks by default; replace this"],
    };
  },
};

