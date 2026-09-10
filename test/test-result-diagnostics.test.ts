import { describe, expect, it } from "vitest";
import { failedTestDiagnostics } from "../scripts/test-result-diagnostics.mjs";

describe("retained CI failure diagnostics", () => {
  it("preserves the failed assertion and diff without treating a passing negative test as a failure", () => {
    expect(
      failedTestDiagnostics(
        {
          testResults: [
            {
              name: "/repo/test/example.test.ts",
              status: "failed",
              assertionResults: [
                { status: "passed", title: "missing image is an infrastructure error", failureMessages: [] },
                {
                  status: "failed",
                  title: "matches",
                  fullName: "reports > matches",
                  failureMessages: ["Expected x; received y"],
                },
              ],
            },
          ],
        },
        "/repo",
      ),
    ).toEqual([
      {
        file: "test/example.test.ts",
        test: "reports > matches",
        messages: ["Expected x; received y"],
      },
    ]);
  });

  it("retains a collection failure when no assertions could run", () => {
    expect(
      failedTestDiagnostics(
        {
          testResults: [
            {
              name: "/repo/test/broken.test.ts",
              status: "failed",
              message: "Cannot import missing module",
              assertionResults: [],
            },
          ],
        },
        "/repo",
      ),
    ).toEqual([
      {
        file: "test/broken.test.ts",
        test: "suite setup or collection",
        messages: ["Cannot import missing module"],
      },
    ]);
  });

  it("returns no failures for a successful suite", () => {
    expect(
      failedTestDiagnostics(
        {
          testResults: [
            {
              name: "/repo/test/passing.test.ts",
              status: "passed",
              assertionResults: [{ status: "passed", title: "works" }],
            },
          ],
        },
        "/repo",
      ),
    ).toEqual([]);
  });
});
