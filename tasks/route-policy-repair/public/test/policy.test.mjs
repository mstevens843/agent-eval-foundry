import { test } from "node:test";
import assert from "node:assert/strict";
import { specialize } from "../src/specialize.mjs";
test("terminal preference changes preserve attached effects", () => {
  const x = { main: { terms: [], fallback: { kind: "accept", preference: 100, add: ["exported"] } } };
  assert.deepEqual(specialize(x, 0).main.fallback, { kind: "accept", preference: 0, add: ["exported"] });
  assert.equal(x.main.fallback.preference, 100);
});
