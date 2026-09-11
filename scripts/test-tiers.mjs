// Every test belongs to a named tier. New files default to semantic until reviewed;
// no required test is removed by maintaining a second hand-written complete list.
import { readdirSync } from "node:fs";
import { join } from "node:path";
export const tierFor = (path) => {
  const name = path.split("/").at(-1);
  if (
    path.includes("phase-20-lane1-exploits/") ||
    [
      "protected-family-routes.test.ts",
      "starter-must-fail.test.ts",
      "delegated-wallet-family.test.ts",
      "dao-descendant.test.ts",
      "package-authority-boundary.test.ts",
      "container-runner.test.ts",
      "container-staging-mode.test.ts",
      "phase-20-secure-executor.test.ts",
      "phase-22-transfer.test.ts",
      "phase-23-classification-and-trial.test.ts",
      "trials.test.ts",
      "trials-routing.test.ts",
    ].includes(name)
  )
    return "protected";
  if (["execution-lifecycle.test.ts"].includes(name)) return "execution";
  if (
    [
      "history-task-attribution.test.ts",
      "zz-outbox-probe.test.ts",
      "zz-outbox-probe2.test.ts",
      "root-cause.test.ts",
      "learning.test.ts",
      "label-parity.test.ts",
      "evidence-snapshot.test.ts",
      "outbox-import-validators.test.ts",
      "clone-fidelity.test.ts",
      "prose-freshness.test.ts",
    ].includes(name)
  )
    return "history";
  if (
    [
      "axis-meter.test.ts",
      "import-swebench.test.ts",
      "engineering-integration.test.ts",
      "integration-exports.test.ts",
      "runtime-readiness.test.ts",
      "report-readonly.test.ts",
      "test-result-diagnostics.test.ts",
      "secure-runner-transport.test.ts",
      "package-evidence-decisions.test.ts",
      "runtime-archive.test.ts",
      "package-storage.test.ts",
      "package-semantic-integrity.test.ts",
      "package-population-integrity.test.ts",
      "package-checker-integrity.test.ts",
    ].includes(name)
  )
    return "pure";
  return "semantic";
};
export function testFiles(dir = "test") {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? testFiles(join(dir, e.name)) : e.name.endsWith(".test.ts") ? [join(dir, e.name)] : [],
    )
    .sort();
}
export const TIERS = ["pure", "semantic", "protected", "execution", "history"];
