import { test } from "node:test";
import assert from "node:assert/strict";
import { subject } from "../entry.mjs";
test("builds an ordinary uncached target", async () => {
  const rounds = [
      {
        id: "r",
        files: { "a.txt": "hello" },
        actions: [{ id: "a", entry: "a.txt", tool: "compiler-1", flags: "identity", deps: [] }],
        targets: ["a"],
        callBudget: 1,
      },
    ],
    out = [],
    records = new Map();
  await subject.run(
    {},
    {
      next: async () => rounds.shift() ?? null,
      artifacts: async () => [...records.keys()],
      inspect: async ({ handle }) => records.get(handle) ?? null,
      compile: async (recipe) => {
        records.set("h", { recipe, bytes: "result" });
        return { handle: "h" };
      },
      publish: async (x) => {
        out.push(x);
        return { stored: true };
      },
    },
  );
  assert.deepEqual(out, [{ round: "r", outputs: [{ target: "a", handle: "h" }] }]);
});
