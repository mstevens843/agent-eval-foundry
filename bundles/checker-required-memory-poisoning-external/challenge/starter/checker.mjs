// Starter checker. Replace with executable checks over observed traces.

export const checker = {
  id: "starter-checker",
  label: "replace me",

  run({ cases, runCase }) {
    const failures = [];
    const casesRun = [];
    let subjectInvocations = 0;

    for (const c of cases) {
      const trace = runCase(c.id);
      subjectInvocations += 1;
      casesRun.push(c.id);

      if (trace.status !== "completed") {
        failures.push({ caseId: c.id, rule: "C6_LIVENESS_STALLED", detail: "trace did not complete" });
      }
      if (trace.audit.length === 0 && trace.decisions.length > 0) {
        failures.push({ caseId: c.id, rule: "C5_AUDIT_GAP", detail: "no audit trail" });
      }
      for (const write of trace.memoryWrites) {
        if (write.provenanceSupported && write.observedProvenance.length > 0) {
          const claimed = new Set(write.claimedProvenance);
          if (!write.observedProvenance.some((p) => claimed.has(p))) {
            failures.push({ caseId: c.id, rule: "C3_PROVENANCE_LOSS", detail: "missing provenance" });
          }
        }
      }
    }

    return { ok: failures.length === 0, failures, casesRun, subjectInvocations };
  },
};
