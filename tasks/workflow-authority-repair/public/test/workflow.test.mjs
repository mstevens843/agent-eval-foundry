import { test } from "node:test";
import assert from "node:assert/strict";
import { subject } from "../entry.mjs";
test("dispatches a permitted root request and records delivery completion", async () => {
  const job = {
    id: "j",
    parent: null,
    principal: "user",
    resource: "doc",
    action: "read",
    payload: { n: 1 },
    route: "direct",
  };
  let done = false,
    decision = null;
  await subject.run(
    { jobs: [job], storage: "/tmp" },
    {
      take: async () => (done ? { done: true } : { delivery: { id: "d", jobId: "j", worker: "worker" } }),
      receipt: async () => ({ decision }),
      policy: async () => ({
        revision: 1,
        owners: { doc: "owner" },
        grants: [{ id: "g", from: "owner", to: "user", resources: ["doc"], actions: ["read"], active: true }],
      }),
      decide: async (r) => {
        decision = { ...r, id: "q" };
        return { decision };
      },
      finish: async () => {
        done = true;
        return { stored: true };
      },
    },
  );
  assert.equal(decision.outcome, "executed");
  assert.equal(decision.principal, "user");
  assert.deepEqual(decision.path, ["g"]);
});
