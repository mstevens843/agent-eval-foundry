import test from "node:test";
import assert from "node:assert/strict";
import { subject } from "../entry.mjs";
test("add overlapping capacity and ignore future information", () => {
  const rows = [
      { series: "a", key: "x", revision: 1, knownAt: 0, from: 0, to: 4, value: "3" },
      { series: "a", key: "y", revision: 1, knownAt: 9, from: 0, to: 4, value: "90" },
    ],
    out = [];
  subject.run(
    { queries: [{ id: "q", series: "a", knownAt: 0, from: 1, to: 3 }] },
    {
      fetch: () => ({ rows, next: null }),
      record: (r) => {
        out.push(r);
        return { stored: true };
      },
    },
  );
  assert.deepEqual(out, [{ id: "q", total: "6" }]);
});
