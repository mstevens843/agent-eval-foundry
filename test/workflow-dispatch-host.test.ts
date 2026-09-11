import { cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";

it("rejects unknown dispatch tokens after terminal outcomes and preserves valid idempotent retries", async () => {
  const root = mkdtempSync(join(tmpdir(), "workflow-dispatch-contract-"));
  try {
    cpSync("tasks/workflow-authority-repair/private", root, { recursive: true });
    cpSync("tasks/portfolio-runtime/adapter.mjs", join(root, "adapter.mjs"));
    const load = (file: string) => import(pathToFileURL(join(root, file)).href);
    const { runScenario } = await load("domain.mjs");
    const { scenarios } = await load("scenarios.mjs");
    const { subject } = await load("reference/entry.mjs");
    const outcomes = new Set<string>();
    for (const scenario of scenarios()) {
      const storage = join(root, scenario.id);
      mkdirSync(storage);
      const cell = await runScenario(
        scenario,
        async (adapter: {
          begin: (n: number) => { view: unknown; facades: { methods: string[] }[] };
          invoke: (name: string, args: unknown[]) => Promise<unknown>;
          report: (report: unknown) => void;
        }) => {
          const begin = adapter.begin(0);
          const api = Object.fromEntries(
            (begin.facades[0]?.methods ?? []).map((method) => [
              method,
              async (request: unknown) => {
                const result = await adapter.invoke(`api.${method}`, [request]);
                if (method === "outcome") {
                  const receipt = result as {
                    status: string;
                    decision?: { outcome: string; authorizationId: string; revision: number };
                  };
                  if (receipt.status === "TERMINAL" && receipt.decision) {
                    outcomes.add(receipt.decision.outcome);
                    for (const bad of [{}, { authorizationId: "missing", revision: -1 }]) {
                      expect(await adapter.invoke("api.dispatch", [bad])).toEqual({ error: "request" });
                    }
                    if (receipt.decision.outcome === "executed") {
                      const { authorizationId, revision } = receipt.decision;
                      expect(await adapter.invoke("api.dispatch", [{ authorizationId, revision }])).toEqual({
                        status: "PENDING",
                      });
                    }
                  }
                }
                return structuredClone(result);
              },
            ]),
          );
          adapter.report(await subject.run(structuredClone(begin.view), api));
          return {};
        },
        storage,
      );
      expect(cell.failures).toEqual([]);
    }
    expect([...outcomes].sort()).toEqual(["denied", "executed"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
