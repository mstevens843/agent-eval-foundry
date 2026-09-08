import { test } from "node:test";
import assert from "node:assert/strict";
import { plan } from "../src/planner.mjs";
test("an empty requested host is serviced", () => {
  const v = {
    hosts: [{ id: "h", zone: "a", capacity: 2 }],
    services: [],
    placement: [],
    requests: ["h"],
    dependencies: [],
  };
  assert.deepEqual(plan(v, { placement: [], done: [] }), [{ kind: "maintain", host: "h" }]);
});
