import { test } from "node:test";
import assert from "node:assert/strict";
import { subject } from "../entry.mjs";
test("reuses a fresh representation across edges", async () => {
  const events = [
    { id: "a", kind: "get", path: "/x", tier: "edge-a", headers: {}, now: 0 },
    { id: "b", kind: "get", path: "/x", tier: "edge-b", headers: {}, now: 1 },
  ];
  const caches = { "edge-a": [], "edge-b": [], shield: [] },
    responses = [];
  let i = 0,
    calls = 0;
  await subject.run(
    { limits: { maxOriginRequests: 1, maxOriginBytes: 2 }, storage: "/tmp" },
    {
      next: async () => (i < events.length ? { event: events[i] } : { done: true }),
      read: async ({ tier }) => ({ entries: structuredClone(caches[tier]) }),
      write: async ({ tier, entries }) => {
        caches[tier] = structuredClone(entries);
        return { stored: true };
      },
      origin: async () => {
        calls++;
        return { status: 200, body: "ok", etag: "e", vary: [], maxAge: 20, age: 0, noStore: false };
      },
      deliver: async ({ response }) => {
        responses.push(response);
        i++;
        return { stored: true };
      },
    },
  );
  assert.equal(calls, 1);
  assert.deepEqual(responses, [
    { body: "ok", etag: "e" },
    { body: "ok", etag: "e" },
  ]);
});
