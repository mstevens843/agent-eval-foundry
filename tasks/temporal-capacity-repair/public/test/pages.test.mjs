import test from "node:test";
import assert from "node:assert/strict";
import { readAll } from "../src/pages.mjs";
import { integrate } from "../src/integral.mjs";
test("opaque cursor traversal retains row order", () => {
  const rows = readAll({
    fetch: ({ cursor }) => (cursor === null ? { rows: [1], next: "opaque" } : { rows: [2], next: null }),
  });
  assert.deepEqual(rows, [1, 2]);
});
test("sum distinct additive keys", () =>
  assert.equal(
    integrate(
      [
        { from: 0, to: 2, value: "3" },
        { from: 1, to: 3, value: "5" },
      ],
      { from: 0, to: 3 },
    ),
    "16",
  ));
