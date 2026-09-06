import { test } from "node:test";
import assert from "node:assert/strict";
import { rollout } from "../src/controller.mjs";
test("homogeneous healthy rollout publishes its new deployment and warms the cache", () => {
  const service = { id: "s", abi: "v1", deployment: { release: "old", generation: 1 } },
    calls = [];
  const api = {
    inventory: () => [service],
    catalog: () => [{ id: "next", abi: "v1", rank: 2 }],
    stages: () => [],
    cleanup: () => ({ ok: true }),
    stage: () => ({ release: "next", generation: 2 }),
    telemetry: () =>
      [1, 2].map((sequence) => ({ service: "s", release: "next", generation: 2, sequence, ok: true })),
    bind: (r) => {
      calls.push(["bind", r]);
      return { ok: true };
    },
    warm: (r) => {
      calls.push(["warm", r]);
      return { ok: true };
    },
  };
  const result = rollout({ job: 0, requests: [{ service: "s", model: "model" }] }, api);
  assert.equal(result.results[0].status, "deployed");
  assert.deepEqual(
    calls.map((x) => x[0]),
    ["bind", "warm"],
  );
});
