import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RealProviderContext } from "../src/execution/real-provider.js";

const calls = vi.hoisted(() => ({
  dispatch: vi.fn(async (context: RealProviderContext) => {
    // Exercise the real store's signature, budget and binding checks before the mocked provider boundary.
    const job = context.store.reserve(context.request, context.authorization, context.owner);
    return { job, directory: join(context.store.root, "fake-provider-result") };
  }),
  stage: vi.fn(() => "/unused-staged-test-credential"),
  cleanup: vi.fn(),
  process: vi.fn(async () => ({ stdout: "", stderr: "", code: 0 })),
}));
vi.mock("../src/execution/real-provider.js", () => ({
  executeRealProvider: calls.dispatch,
  stageCodexCredential: calls.stage,
  cleanupCredentialStaging: calls.cleanup,
}));
vi.mock("../src/packages/local-process.js", () => ({ localProcess: calls.process }));
vi.mock("../src/packages/portfolio.js", () => ({ verifyPortfolioReceipt: vi.fn(async () => ({})) }));
vi.mock("../src/execution/package-route.js", () => ({
  executionPackage: () => ({
    native: false,
    route: "professional-multifile/authority-process@1",
    image: `sha256:${"a".repeat(64)}`,
    snapshot: { record: { id: "test-task", familyId: "test-family", digest: "b".repeat(64) } },
  }),
}));

import { runFirstTrial } from "../src/execution/first-trial.js";
import { JobStore } from "../src/execution/store.js";

const temporary: string[] = [];
function fixture(reviewed: boolean) {
  const root = mkdtempSync(join(tmpdir(), "foundry-first-trial-test-"));
  temporary.push(root);
  const config = {
    schemaVersion: 1,
    target: "codex",
    package: "package",
    receipt: "receipt.json",
    store: "jobs",
    runId: "first",
    authoringImage: `sha256:${"a".repeat(64)}`,
    wallSeconds: 60,
    memoryMiB: 1024,
    contractReviewed: reviewed,
  };
  const file = join(root, "config.json");
  writeFileSync(file, JSON.stringify(config));
  return { root, file };
}
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe("single-trial dispatch boundary", () => {
  it("reserves exactly one bounded subscription attempt and refuses reuse", async () => {
    const { root, file } = fixture(true);
    const result = await runFirstTrial(file, true);
    expect(result.job.state).toBe("reserved");
    expect(calls.dispatch).toHaveBeenCalledTimes(1);
    const context = calls.dispatch.mock.calls[0]?.[0];
    expect(context?.request).toMatchObject({
      attempt: 1,
      retryOf: null,
      estimatedMicroUsd: null,
      realm: "real-provider",
    });
    expect(context?.profile.limits).toMatchObject({ wallMs: 60000, memoryMiB: 1024 });
    const store = new JobStore(join(root, "jobs"), {}, true);
    try {
      expect(store.list()).toHaveLength(1);
    } finally {
      store.close();
    }
    const plan = JSON.parse(readFileSync(join(root, "jobs/plan.json"), "utf8"));
    expect(plan).toMatchObject({
      maxAttempts: 1,
      automaticRetries: false,
      paidApiFallback: false,
      billingMode: "subscription-only",
    });
    expect(calls.cleanup).toHaveBeenCalledWith("/unused-staged-test-credential");
    await expect(runFirstTrial(file, true)).rejects.toThrow("OUTPUT_EXISTS");
    expect(calls.dispatch).toHaveBeenCalledTimes(1);
  });

  it("fails before credential access and reservation when contract review is absent", async () => {
    const { root, file } = fixture(false);
    await expect(runFirstTrial(file, true)).rejects.toThrow("TRIAL_CONTRACT_REVIEW");
    expect(calls.dispatch).not.toHaveBeenCalled();
    expect(calls.stage).not.toHaveBeenCalled();
    expect(existsSync(join(root, "jobs"))).toBe(false);
  });

  it("cleans staged credentials if dispatch throws and preserves the durable attempt", async () => {
    const { root, file } = fixture(true);
    calls.dispatch.mockImplementationOnce(async (context) => {
      context.store.reserve(context.request, context.authorization, context.owner);
      throw Error("synthetic transport failure");
    });
    await expect(runFirstTrial(file, true)).rejects.toThrow("synthetic transport failure");
    expect(calls.cleanup).toHaveBeenCalledTimes(1);
    const store = new JobStore(join(root, "jobs"), {}, true);
    try {
      expect(store.list()).toHaveLength(1);
    } finally {
      store.close();
    }
    await expect(runFirstTrial(file, true)).rejects.toThrow("OUTPUT_EXISTS");
  });
});
