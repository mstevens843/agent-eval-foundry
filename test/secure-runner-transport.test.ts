import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const docker = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ execFileSync: docker }));
vi.mock("../src/adversarial-audit/isolation.js", () => ({
  CONTAINER_IMAGE: "node:22-alpine",
  containerRuntimeReadiness: () => ({ available: true }),
}));
vi.mock("../src/trials/authority-build.js", () => ({ assertCurrentAuthorityBundle: () => {} }));
import { runSecureContainerHost } from "../src/trials/secure-runner.js";

const scratch = mkdtempSync(join(tmpdir(), "foundry-transport-unit-"));
const modulePath = join(scratch, "subject.mjs");
const source = "export const subject = {}; // transport control\n";
writeFileSync(modulePath, source);
afterAll(() => rmSync(scratch, { recursive: true, force: true }));
const envelope = JSON.stringify({
  channels: {},
  report: {},
  error: null,
  execution: {
    expectedAttempts: 1,
    reportedAttempts: 1,
    completed: true,
    requests: 1,
    requestBytes: 1,
    responseBytes: 1,
    diagnosticBytes: 0,
  },
});
beforeEach(() => {
  docker.mockReset();
});

describe("protected transport without per-cell host mounts", () => {
  it("captures exact public bytes on stdin, not argv or a host bind, and keeps isolation", () => {
    docker.mockReturnValue(envelope);
    const hidden = { secretMarker: "private-scenario-marker" };
    expect(runSecureContainerHost({ familyId: "caa-revalidation", modulePath }, hidden).error).toBeNull();
    const call = docker.mock.calls[0];
    if (!call) throw Error("missing Docker invocation");
    const [command, argv, options] = call;
    expect(command).toBe("docker");
    expect(argv.some((s: string) => s.startsWith("--mount="))).toBe(false);
    expect(argv).toContain("--tmpfs=/work:rw,nosuid,nodev,size=32m,mode=0700");
    for (const flag of [
      "--network=none",
      "--read-only",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
    ])
      expect(argv).toContain(flag);
    expect(argv.join(" ")).not.toContain(hidden.secretMarker);
    expect(argv.join(" ")).not.toContain(source);
    const input = JSON.parse(options.input);
    expect(input.input.secretMarker).toBe(hidden.secretMarker);
    expect(Buffer.from(input.publicFiles["subject.mjs"], "base64").toString()).toBe(source);
    expect(Buffer.from(input.publicFiles["authority-entry.mjs"], "base64").toString()).toBe(
      readFileSync("scripts/secure/authority-entry.mjs", "utf8"),
    );
  });

  it("retains bounded Docker startup diagnostics and labels setup, not a subject artifact", () => {
    docker.mockImplementation((_command, argv) => {
      if (argv[0] === "rm") return "";
      throw Object.assign(new Error("Docker start failed"), {
        status: 125,
        stderr: Buffer.from(`${"x".repeat(12000)}mount preparation failed`),
        stdout: Buffer.from(""),
      });
    });
    const result = runSecureContainerHost({ familyId: "caa-revalidation", modulePath }, {});
    expect(result.errorKind).toBe("setup");
    expect(result.diagnostics.stderrTail).toContain("mount preparation failed");
    expect(result.diagnostics.stderrTail.length).toBeLessThanOrEqual(8192);
    expect(result.report).toBeNull();
    expect(result.channels).toEqual({});
    expect(docker.mock.calls.filter(([, argv]) => argv[0] === "run")).toHaveLength(1);
  });

  it("keeps missing submission files distinct from startup errors", () => {
    const result = runSecureContainerHost(
      { familyId: "caa-revalidation", modulePath: join(scratch, "absent.mjs") },
      {},
    );
    expect(result.errorKind).toBe("artifact");
    expect(result.error).toContain("ENOENT");
    expect(docker.mock.calls.filter(([, argv]) => argv[0] === "run")).toHaveLength(0);
  });

  it("labels malformed host JSON as protocol, not a bad submission", () => {
    docker.mockReturnValue("not JSON");
    expect(runSecureContainerHost({ familyId: "caa-revalidation", modulePath }, {}).errorKind).toBe(
      "protocol",
    );
  });

  it("retains wall-clock exhaustion as an execution error without retrying", () => {
    docker.mockImplementation((_command, argv) => {
      if (argv[0] === "rm") return "";
      throw Object.assign(new Error("execution deadline"), { code: "ETIMEDOUT" });
    });
    const result = runSecureContainerHost({ familyId: "caa-revalidation", modulePath }, {});
    expect(result.errorKind).toBe("resource");
    expect(docker.mock.calls.filter(([, argv]) => argv[0] === "run")).toHaveLength(1);
  });
});
