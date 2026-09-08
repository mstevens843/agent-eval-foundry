import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { type Authorization, JobStore } from "../src/execution/store.js";
import { canonicalJson } from "../src/packages/record.js";

function fixture(overrides: Partial<Authorization> = {}) {
  const keys = generateKeyPairSync("ed25519");
  const store = new JobStore(mkdtempSync(join(tmpdir(), "subscription-reservation-")), {
    owner: keys.publicKey.export({ type: "spki", format: "pem" }).toString(),
  });
  const payload: Authorization = {
    schemaVersion: 1,
    id: "approval",
    realm: "real-provider",
    packageDigest: "a".repeat(64),
    profileDigest: "b".repeat(64),
    operations: ["standard"],
    notBefore: Date.now() - 1000,
    expires: Date.now() + 60000,
    maxAttempts: 1,
    maxConcurrent: 1,
    maxMicroUsd: 0,
    perAttemptMicroUsd: 0,
    maxMemoryMiB: 2048,
    maxCpuUnits: 2,
    maxOutputBytes: 1024,
    retryInfrastructure: false,
    billingMode: "subscription-only",
    ...overrides,
  };
  const { billingMode, ...withoutMode } = payload;
  const signedPayload = billingMode === undefined ? withoutMode : payload;
  const install = () =>
    store.install({
      authority: "owner",
      payload: signedPayload,
      signature: sign(null, Buffer.from(canonicalJson(signedPayload)), keys.privateKey).toString("base64"),
    });
  const request = {
    id: "one",
    realm: "real-provider" as const,
    packageDigest: payload.packageDigest,
    profileDigest: payload.profileDigest,
    operation: "standard" as const,
    slot: "single",
    attempt: 1,
    retryOf: null,
    memoryMiB: 2048,
    cpus: 2,
    outputBytes: 1024,
    estimatedMicroUsd: null,
  };
  return { store, install, request };
}
it("reserves zero incremental dollars without disabling call/resource limits or fabricating usage", () => {
  const f = fixture();
  try {
    const id = f.install();
    const job = f.store.reserve(f.request, id, "root");
    expect(job.reservedMicroUsd).toBe(0);
    expect(job.settledMicroUsd).toBeNull();
    expect(f.store.reservation(job.id, job.fence).realm).toBe("real-provider");
    expect(() => f.store.reserve({ ...f.request, id: "two", slot: "second" }, id, "root")).toThrow(
      "AUTHORIZATION_BUDGET_EXHAUSTED",
    );
  } finally {
    f.store.close();
  }
});
it.each([
  { billingMode: "metered" as const },
  { billingMode: undefined },
  { maxMicroUsd: 1, perAttemptMicroUsd: 1 },
  { realm: "simulation" as const },
  { billingMode: "unrecognized" as Authorization["billingMode"] },
])("rejects implicit/free metered authority and inconsistent subscription limits %j", (override) => {
  const f = fixture(override as Partial<Authorization>);
  try {
    expect(f.install).toThrow("AUTHORIZATION_SCHEMA");
  } finally {
    f.store.close();
  }
});
it("rejects paid estimates even when account-only authority is valid", () => {
  const f = fixture();
  try {
    const id = f.install();
    expect(() => f.store.reserve({ ...f.request, estimatedMicroUsd: 1 }, id, "root")).toThrow(
      "AUTHORIZATION_BUDGET_EXHAUSTED",
    );
  } finally {
    f.store.close();
  }
});
