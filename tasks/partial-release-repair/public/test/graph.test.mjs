import test from "node:test";
import assert from "node:assert/strict";
import { order, same } from "../src/graph.mjs";
test("graph order covers disconnected components", () => {
  const rows = [
    { id: "child", parents: ["parent"], payload: "c" },
    { id: "other", parents: [], payload: "o" },
    { id: "parent", parents: [], payload: "p" },
  ];
  const ids = order(rows).map((r) => r.id);
  assert.equal(ids.length, 3);
  assert.ok(ids.indexOf("parent") < ids.indexOf("child"));
});
test("parent order does not change immutable resource identity", () =>
  assert.ok(same({ parents: ["a", "b"], payload: "p" }, { parents: ["b", "a"], payload: "p" })));
