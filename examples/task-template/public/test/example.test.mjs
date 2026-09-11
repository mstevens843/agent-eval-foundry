import assert from "node:assert/strict";
import { test } from "node:test";
import { subject } from "../entry.mjs";

test("publishes the latest value for ordinary sorted input", async () => {
  const publications = [];
  await subject.run({ records: [
    { key: "alpha", revision: 1, value: "old" },
    { key: "alpha", revision: 2, value: "new" },
  ] }, { publish: async ({ rows }) => { publications.push(rows); return {}; } });
  assert.deepEqual(publications, [[{ key: "alpha", revision: 2, value: "new" }]]);
});
