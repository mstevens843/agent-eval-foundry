export const check = {
  id: "starter-checker",

  async run({ subject, cases }) {
    const failures = [];
    const casesRun = [];
    let subjectInvocations = 0;

    for (const c of cases) {
      casesRun.push(c.id);
      subjectInvocations += 1;
      const report = await subject.run(c);
      if (!report || report.caseId !== c.id || !Array.isArray(report.decisions)) {
        failures.push({ caseId: c.id, rule: "CHECKER_OBSERVED_REPORT", detail: "malformed report" });
      }
    }

    return {
      ok: failures.length === 0,
      failures,
      casesRun,
      subjectInvocations,
    };
  },
};

