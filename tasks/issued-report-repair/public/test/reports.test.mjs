import { test } from "node:test";
import assert from "node:assert/strict";
import { subject } from "../entry.mjs";
test("issues and delivers a new report", async () => {
  const steps = [{ id: "step", requests: [{ report: "r", recipient: "a" }], queries: [] }],
    history = [],
    receipts = [];
  await subject.run(
    {},
    {
      next: async () => steps.shift() ?? null,
      snapshot: async () => ({
        readings: [{ id: "m", version: 1, value: 3 }],
        definitions: [{ id: "r", op: "sum", inputs: [{ kind: "reading", id: "m" }] }],
        history,
        receipts,
      }),
      publish: async ({ record }) => {
        history.push(record);
        return { stored: true };
      },
      deliver: async (r) => {
        receipts.push(r);
        return { stored: true };
      },
      answer: async () => {
        throw Error("unexpected");
      },
    },
  );
  assert.equal(history[0].payload.value, 3);
  assert.equal(receipts[0].kind, "initial");
});
