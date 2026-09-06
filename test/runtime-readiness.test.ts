import { describe, expect, it, vi } from "vitest";
const { probe } = vi.hoisted(() => ({ probe: vi.fn() }));
vi.mock("node:child_process", () => ({ spawnSync: probe }));
import { containerRuntimeReadiness } from "../src/adversarial-audit/isolation.js";
import { withCommandContext } from "../src/foundry/operation-context.js";

describe("advisory runtime snapshots", () => {
  it("bounds probes, avoids plugin discovery, and does not reuse status across commands", () => {
    probe.mockReset().mockReturnValue({ status: 0, stdout: "Docker fixture", stderr: "" });
    withCommandContext(() => {
      expect(containerRuntimeReadiness().available).toBe(true);
      expect(containerRuntimeReadiness().available).toBe(true);
    });
    expect(probe).toHaveBeenCalledTimes(2);
    expect(probe.mock.calls[1]?.[1]).toEqual(["version", "--format", "{{.Server.Version}}"]);
    expect(probe.mock.calls[1]?.[2]).toMatchObject({ timeout: 5000, killSignal: "SIGKILL" });
    probe.mockReturnValue({ status: null, stdout: "", stderr: "", error: new Error("fixture timeout") });
    withCommandContext(() => expect(containerRuntimeReadiness().available).toBe(false));
    expect(probe).toHaveBeenCalledTimes(3);
    containerRuntimeReadiness();
    expect(probe).toHaveBeenCalledTimes(4);
  });
});
