import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startAuthoringDiagnostics } from "../src/execution/authoring-diagnostics.js";

const output = () => join(mkdtempSync(join(tmpdir(), "foundry-diagnostics-")), "resources.jsonl");
describe("bounded authoring resource diagnostics", () => {
  afterEach(() => vi.useRealTimers());
  it("caps samples, preserves memory evidence, and stops scheduling", async () => {
    vi.useFakeTimers();
    const path = output();
    const probe = vi.fn(async () => "memory.peak\n2000000000\nmemory.events\noom 1\noom_kill 0\n");
    const monitor = startAuthoringDiagnostics("fixture", path, { intervalMs: 10, maxSamples: 2, probe });
    await vi.advanceTimersByTimeAsync(100);
    expect(await monitor.stop()).toEqual({ samples: 2, unavailable: 0, capped: true, writeFailed: false });
    expect(probe).toHaveBeenCalledTimes(2);
    expect(readFileSync(path, "utf8")).toContain("oom_kill 0");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not overlap probes or leave an in-flight probe behind on stop", async () => {
    vi.useFakeTimers();
    let release: (value: string) => void = () => {};
    const probe = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );
    const monitor = startAuthoringDiagnostics("fixture", output(), { intervalMs: 10, probe });
    await vi.advanceTimersByTimeAsync(100);
    expect(probe).toHaveBeenCalledTimes(1);
    const stopped = monitor.stop();
    release("memory.current\n123\n");
    expect((await stopped).samples).toBe(1);
    await vi.advanceTimersByTimeAsync(100);
    expect(probe).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("records unavailable diagnostics without propagating errors or raw child output", async () => {
    vi.useFakeTimers();
    const path = output();
    const monitor = startAuthoringDiagnostics("fixture", path, {
      intervalMs: 10,
      maxSamples: 2,
      probe: vi
        .fn()
        .mockRejectedValueOnce(Error("untrusted-child-output"))
        .mockResolvedValueOnce("x".repeat(8193)),
    });
    await vi.advanceTimersByTimeAsync(100);
    expect((await monitor.stop()).unavailable).toBe(2);
    expect(readFileSync(path, "utf8")).not.toContain("untrusted-child-output");
    expect(readFileSync(path, "utf8").length).toBeLessThan(500);
  });
  it("never overwrites existing evidence and handles an unwritable log without a timer", async () => {
    vi.useFakeTimers();
    const path = output();
    const first = startAuthoringDiagnostics("fixture", path);
    const probe = vi.fn(async () => "unused");
    const second = startAuthoringDiagnostics("fixture", path, { probe });
    expect((await second.stop()).writeFailed).toBe(true);
    await first.stop();
    expect(probe).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
