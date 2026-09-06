import { mkdirSync, chownSync, readFileSync } from "node:fs";
import { executeAuthority } from "./authority-engine.mjs";
import { runScenario } from "./domain.mjs";

export async function run(input) {
  const cells = [];
  // This root-readable positive control is paired with the submitted reader control.
  const privateReadable = readFileSync("/tmp/authority/domain.mjs").length > 0;
  for (const [index, scenario] of input.scenarios.entries()) {
    const directory = `/work/case-${index}`;
    mkdirSync(directory, { mode: 0o700 });
    chownSync(directory, 1000, 1000);
    const executions = [];
    const execute = async (adapter) => {
      const result = await executeAuthority(adapter, {
        cellPath: "/tmp/client.mjs",
        modulePath: "/submission/entry.mjs",
        uid: 1000,
      });
      executions.push(result);
      if (result.error)
        throw Object.assign(Error(result.error), { kind: result.errorKind ?? "infrastructure" });
      return result;
    };
    try {
      const result = await runScenario(scenario, execute, directory);
      cells.push({
        scenarioId: scenario.id,
        status: result.failures.length ? "semantic-fail" : "semantic-pass",
        ...result,
        executions,
      });
    } catch (error) {
      cells.push({
        scenarioId: scenario.id,
        status: "invalid",
        error: String(error),
        errorKind: error.kind ?? "infrastructure",
        executions,
      });
    }
  }
  return { schemaVersion: 1, privateReadable, cells, providerCallsMade: 0 };
}
