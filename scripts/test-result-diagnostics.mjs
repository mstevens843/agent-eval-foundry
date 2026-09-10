import { relative } from "node:path";

/** Keep failed assertions and collection errors with the summary, not only in a private JSON file. */
export function failedTestDiagnostics(report, root = process.cwd()) {
  return report.testResults.flatMap((suite) => {
    const file = relative(root, suite.name);
    const failed = suite.assertionResults.filter((test) => test.status === "failed");
    if (failed.length) {
      return failed.map((test) => ({
        file,
        test: test.fullName || test.title,
        messages: test.failureMessages ?? [],
      }));
    }
    return suite.status === "failed"
      ? [{ file, test: "suite setup or collection", messages: [suite.message || "Suite failed before an assertion result was recorded."] }]
      : [];
  });
}
