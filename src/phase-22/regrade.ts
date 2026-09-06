// Phase 22 Lane 3, third evidence source — regrading preserved real-agent submissions.
//
// This is NOT a new counted trial, and it is NOT mutant-coverage evidence — it is a third, distinct
// evidence category: does a REAL agent's already-graded submission behave differently depending on
// which of the operator's two hidden scenario suites (naive vs targeted) it is graded against? The
// submission itself is frozen (a real Phase 17 `subject.mjs`, unchanged); only the scenario suite it is
// re-run against varies, through the exact same Phase 20 trusted executor
// (`runSecureContainerHost`/`caa-revalidation` adapter) production trials already use, so this measures
// nothing about the submission's authorship the original counted trial did not already measure.
//
// Kept structurally separate from mutant-coverage results (never merged into the same primary/
// secondary block) because the two evidence categories answer different questions: mutant coverage
// asks whether a HAND-BUILT, KNOWN-BAD implementation gets exposed; regrading asks whether a REAL,
// unknown-quality agent submission's grade changes with the suite. A regression on one does not imply
// anything about the other, and reporting them together would blur which claim the evidence supports.

import type { Scenario } from "../families/caa-revalidation/truth.js";
import { verify as caaVerify } from "../families/caa-revalidation/verify.js";
import { runSecureContainerHost } from "../trials/secure-runner.js";

export interface RegradeCellResult {
  readonly scenarioId: string;
  readonly failed: readonly string[];
  readonly hostError: string | null;
}

export interface RegradeSubmissionResult {
  readonly submissionId: string;
  readonly suiteLabel: string;
  readonly modulePath: string;
  readonly cells: readonly RegradeCellResult[];
  readonly cleanUnderSuite: boolean;
  readonly failedChecks: readonly string[];
}

/** Grade one preserved submission's frozen subject.mjs against one custom scenario suite, for real, through the Phase 20 trusted executor. */
export function regradeSubmissionAgainstSuite(
  submissionId: string,
  modulePath: string,
  suiteLabel: string,
  scenarios: readonly Scenario[],
): RegradeSubmissionResult {
  const cells: RegradeCellResult[] = scenarios.map((scenario) => {
    const result = runSecureContainerHost({ modulePath, familyId: "caa-revalidation" }, { scenario });
    if (result.error !== null) {
      return { scenarioId: scenario.id, failed: ["caa_result_shape"], hostError: result.error };
    }
    try {
      const failures = caaVerify({
        scenario,
        report: result.report as never,
        queries: (result.channels.queries ?? []) as never,
      });
      return {
        scenarioId: scenario.id,
        failed: [...new Set(failures.map((f) => f.check))].sort(),
        hostError: null,
      };
    } catch {
      return { scenarioId: scenario.id, failed: ["caa_result_shape"], hostError: null };
    }
  });
  const failedChecks = [...new Set(cells.flatMap((c) => c.failed))].sort();
  return {
    submissionId,
    suiteLabel,
    modulePath,
    cells,
    cleanUnderSuite: cells.every((c) => c.failed.length === 0 && c.hostError === null),
    failedChecks,
  };
}
