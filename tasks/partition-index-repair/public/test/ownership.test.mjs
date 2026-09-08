import test from "node:test";
import assert from "node:assert/strict";
import { owners } from "../src/ownership.mjs";
test("assignment updates scoped ownership", () => {
  const o = owners(["p"]);
  assert.ok(o.accept({ partition: "p", generation: 0 }));
  o.assign({ partition: "p", generation: 2 });
  assert.ok(o.accept({ partition: "p", generation: 2 }));
});
test("unassigned partitions are outside the service", () =>
  assert.equal(owners(["p"]).accept({ partition: "other", generation: 0 }), false));
