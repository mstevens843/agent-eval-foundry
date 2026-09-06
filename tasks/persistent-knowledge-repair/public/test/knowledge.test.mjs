import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "../src/derive.mjs";
import { ingest } from "../src/revisions.mjs";
test("source updates replace prior revisions", () => {
  const records = {};
  ingest(records, [{ id: "a", revision: 1, kind: "source", value: "first", authority: "approved" }]);
  ingest(records, [{ id: "a", revision: 2, kind: "source", value: "second", authority: "approved" }]);
  assert.equal(resolve(records, "a").value, "second");
});
test("a missing parent makes a summary unavailable", () => {
  assert.equal(
    resolve({ x: { id: "x", revision: 1, kind: "derived", parents: ["absent"], separator: " " } }, "x"),
    null,
  );
});
