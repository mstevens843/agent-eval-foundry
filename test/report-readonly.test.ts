import { existsSync } from "node:fs";
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

afterEach(() => {
  vi.restoreAllMocks();
  processCall.mockClear();
});

describe("read-only historical reports", () => {
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
