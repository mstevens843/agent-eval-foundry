import { test } from "node:test";
import assert from "node:assert/strict";
import { ordered } from "../src/queue.mjs";
import { eligible } from "../src/allocation.mjs";
test("delivery order remains stable without mutating input", () => {
  const r = [{ id: "b" }, { id: "a" }];
  assert.deepEqual(ordered(r), r);
  assert.notEqual(ordered(r)[0], r[0]);
});
test("a different owner cannot use a wallet", () => {
  assert.equal(eligible({ owner: "other", credits: 1 }, { owner: "customer", grants: [] }), false);
});
