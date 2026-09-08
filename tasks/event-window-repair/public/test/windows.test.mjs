import { test } from "node:test";
import assert from "node:assert/strict";
import { subject } from "../entry.mjs";
test("publishes an ordinary single-partition window", async () => {
  const events = [
      { kind: "data", partition: "p", id: "a", time: 1, key: "x", delta: 3 },
      { kind: "end", partition: "p" },
    ],
    rows = [];
  await subject.run(
    { partitions: ["p"], width: 10, lateness: 0 },
    {
      next: async () => events.shift() ?? null,
      emit: async ({ row }) => {
        rows.push(row);
        return { stored: true };
      },
      late: async () => {
        throw Error("unexpected late");
      },
    },
  );
  assert.deepEqual(rows, [{ start: 0, key: "x", total: 3, count: 1 }]);
});
