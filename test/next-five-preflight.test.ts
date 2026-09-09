import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { captureProcess } from "../src/execution/capture.js";
import { profileDigest, profileFor } from "../src/execution/profiles.js";
import { executeRealProvider } from "../src/execution/real-provider.js";
import { COMPONENTS, type PackageInput, buildPackageRecord, publishPackage } from "../src/packages/record.js";

const temporary = () => mkdtempSync(join(tmpdir(), "foundry-next-five-preflight-"));
const fixtureCapture = (bytes: number) =>
  captureProcess(
    process.execPath,
    ["-e", `process.stdout.write(JSON.stringify({type:"fixture",payload:"x".repeat(${bytes})})+"\\n")`],
    {
      directory: join(temporary(), "capture"),
      timeoutMs: 10000,
      maxBytes: 32 * 1024 * 1024,
      env: { PATH: process.env.PATH ?? "" },
      jsonEvents: true,
    },
  );

describe("next-five provider-free adapter preparation", () => {
  it("retains a valid event larger than the old 64 KiB Claude limit", async () => {
    const result = await fixtureCapture(80 * 1024);
    expect(result.status).toBe("completed");
    expect(result.eventCount).toBe(1);
    expect(result.truncated).toBe(false);
  });

  it("rejects an event larger than 4 MiB while keeping bounded capture", async () => {
    const result = await fixtureCapture(4 * 1024 * 1024 + 1);
    expect(result.status).toBe("malformed-events");
    expect(result.bytesRetained).toBeLessThanOrEqual(32 * 1024 * 1024);
  });

  it("denies the real adapter before reservation when contract review is absent", async () => {
    const snapshot = publishPackage(
      join(temporary(), "packages"),
      buildPackageRecord({
        id: "fixture",
        version: "1",
        kind: "professional-package",
        familyId: "fixture",
        dependencies: { strategy: "explicit-fixture", unresolved: [] },
        files: Object.fromEntries(
          COMPONENTS.map((name) => [name, [{ path: `${name}.txt`, bytes: Buffer.from(name) }]]),
        ) as unknown as PackageInput["files"],
      }),
    );
    const image = `sha256:${"a".repeat(64)}`;
    const route = "professional-multifile/authority-process@1";
    const profile = profileFor("codex", image, route);
    let reservations = 0;
    await expect(
      executeRealProvider({
        store: {
          reserve: () => {
            reservations++;
            throw Error("UNREACHABLE_RESERVATION");
          },
        } as never,
        package: {
          snapshot,
          directory: "/never",
          native: false,
          route,
          image,
          scenarioIds: [],
          checkIds: [],
          checkerRequired: true,
        },
        profile,
        policy: {
          snapshot,
          checks: {
            reference: true,
            positiveWork: true,
            nearMissControls: true,
            contractReviewed: false,
            publicPackageComplete: true,
            protectedGrading: true,
            localIntegrityControls: true,
            boundedSolveEvidence: false,
            unresolvedAmbiguities: 0,
            unrepairedBypasses: 0,
          },
        },
        request: {
          id: "fixture",
          realm: "real-provider",
          packageDigest: snapshot.record.digest,
          profileDigest: profileDigest(profile),
          operation: "standard",
          slot: "fixture",
          attempt: 1,
          retryOf: null,
          memoryMiB: profile.limits.memoryMiB,
          cpus: profile.limits.cpus,
          outputBytes: profile.limits.outputBytes,
          estimatedMicroUsd: null,
        },
        authorization: "none",
        owner: "fixture",
        target: "codex",
        instruction: "must never dispatch",
        credential: {},
      }),
    ).rejects.toThrow(/required-contractReviewed/);
    expect(reservations).toBe(0);
  });
});
