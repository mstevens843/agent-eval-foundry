import { test } from "node:test";
import assert from "node:assert/strict";
import { subject } from "../entry.mjs";
test("collects an ordinary success", async () => {
  const lines = [
    { request: "a", attempt: 1, kind: "chunk", seq: 0, value: "hello" },
    { request: "a", attempt: 1, kind: "finish", next: 1, status: "ok", code: null, retryable: false },
  ];
  const chunks = [
      { channel: "c", bytes: Buffer.from(lines.map(JSON.stringify).join("\n") + "\n").toString("base64") },
    ],
    rows = [];
  await subject.run(
    { requests: ["a"] },
    {
      next: async () => chunks.shift() ?? null,
      record: async ({ row }) => {
        rows.push(row);
        return { stored: true };
      },
    },
  );
  assert.deepEqual(rows, [{ request: "a", attempt: 1, status: "ok", data: "hello", error: null }]);
});
