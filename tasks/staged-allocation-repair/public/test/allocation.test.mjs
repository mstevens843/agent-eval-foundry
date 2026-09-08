import { test } from "node:test";
import assert from "node:assert/strict";
import { subject } from "../entry.mjs";
test("accepts a single ordinary request", async () => {
  const v = {
      resources: [{ id: "r", tags: ["g"], zone: "a", capacity: 1, used: 0 }],
      tree: {
        id: "n",
        request: { units: 1, tags: ["g"], minZones: 1, antiWith: [], shareZoneWith: null },
        children: [],
      },
    },
    path = ["n"],
    out = [];
  await subject.run(v, {
    next: async () => path.shift() ?? null,
    place: async (x) => {
      out.push(x);
      return { stored: true };
    },
  });
  assert.deepEqual(out, [{ node: "n", resources: ["r"] }]);
});
