import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const { processCall } = vi.hoisted(() => ({
  processCall: vi.fn(() => {
    throw Error("READ_ONLY_REPORT_DISPATCHED_PROCESS");
  }),
}));
vi.mock("node:child_process", () => ({
  execFileSync: processCall,
  spawnSync: processCall,
  spawn: processCall,
}));

import { verifyContainerIsolationBundle } from "../src/adversarial-audit/container.js";
import { main } from "../src/cli.js";
import { completionsFor } from "../src/commands/reports.js";
import { renderBankCompletion } from "../src/reports/bank-completion-report.js";
import { renderProviderVariance } from "../src/reports/provider-variance.js";
import { renderSharedDifficultyBank } from "../src/reports/shared-difficulty.js";
import { kindedBank } from "../src/trials/bank.js";
import { PROVIDERS, uninspectedProvider } from "../src/trials/provider-registry.js";
import type { Matrix } from "../src/types.js";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  processCall.mockClear();
});

describe("read-only historical reports", () => {
  it("renders portable provider and bank reports identically with or without local credentials", () => {
    const source: Matrix = JSON.parse(readFileSync("examples/durable-outbox/matrix.json", "utf8"));
    const banks = ["ui-action-record-replay", "prompt-injection-containment"].map((familyId, i) => {
      const provider = PROVIDERS[i];
      if (provider === undefined) throw Error("missing fixture provider");
      const matrix: Matrix = {
        ...source,
        subjects: [
          {
            id: provider.subjectId,
            label: provider.id,
            family: "agent",
            model: provider.model,
            effort: null,
            note: null,
          },
        ],
        instances: [],
        results: {},
      };
      return kindedBank({ familyId, matrix, provenance: "test", agentDerived: true }, "agent");
    });
    const render = () => {
      const completions = completionsFor(banks, [], new Map(), uninspectedProvider);
      expect(completions[0]?.unlocks.length).toBeGreaterThan(0);
      return [
        renderProviderVariance({
          families: [],
          artifacts: [],
          availability: PROVIDERS.map(uninspectedProvider),
        }),
        renderBankCompletion({ completions, combined: new Map(), pairs: [] }),
        renderSharedDifficultyBank({ banks, rows: [], threshold: 3 }),
      ];
    };
    vi.stubEnv("CLAUDE_CODE_OAUTH_TOKEN", "");
    const withoutCredentials = render();
    vi.stubEnv("CLAUDE_CODE_OAUTH_TOKEN", "test-placeholder-not-a-credential");
    expect(render()).toEqual(withoutCredentials);
    expect(withoutCredentials[0]).toContain("not inspected");
    expect(withoutCredentials[0]).not.toContain("Checked by executing the binary");
    expect(withoutCredentials[1]).toContain("not inspected during report generation");
    expect(withoutCredentials[2]).toContain("foundry trials campaign prepare");
    expect(processCall).not.toHaveBeenCalled();
  });

  for (const argv of [
    ["phase13", "report"],
    ["phase13", "results"],
    ["phase13", "design"],
    ["phase17", "report"],
  ]) {
    it(`${argv.join(" ")} reads retained evidence without inspecting credentials or launching processes`, () => {
      let output = "";
      vi.spyOn(process.stdout, "write").mockImplementation((value) => {
        output += String(value);
        return true;
      });
      const errors = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      expect(main(argv), JSON.stringify(errors.mock.calls)).toBe(0);
      const first = output;
      expect(first.length).toBeGreaterThan(100);
      output = "";
      expect(main(argv)).toBe(0);
      expect(output).toBe(first);
      expect(processCall).not.toHaveBeenCalled();
      if (argv[1] === "report") expect(output).toContain("Retained historical");
    });
  }

  it("a missing container receipt is unknown evidence, never the current machine's runtime status", () => {
    const bundle = join(process.cwd(), "bundles/caa-revalidation-adversarial-container");
    expect(existsSync(join(bundle, "CONTAINER.json"))).toBe(false);
    const first = verifyContainerIsolationBundle(bundle);
    expect(first.verdict).toBe("fail");
    expect(first.metadata.runtimeAvailable).toBe(false);
    expect(first.failures.join("; ")).toContain("retained container metadata is missing");
    expect(verifyContainerIsolationBundle(bundle)).toEqual(first);
    expect(processCall).not.toHaveBeenCalled();
  });
});
