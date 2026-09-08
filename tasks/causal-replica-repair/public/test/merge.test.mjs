import test from "node:test";
import assert from "node:assert/strict";
import { merge } from "../src/merge.mjs";
test("idempotent repeated identical snapshots", () => {
  const s = { context: { a: 1 }, values: [{ site: "a", n: 1, payload: "one" }] };
  assert.deepEqual(merge([s, s]), s);
});
test("empty input represents an empty document", () =>
  assert.deepEqual(merge([]), { context: {}, values: [] }));
