import test from "node:test";
import assert from "node:assert/strict";
import { select } from "../src/selection.mjs";
import { collect } from "../src/pages.mjs";
test("closed and out of scope tickets stay outside migration", () => {
  const rows = [
    { tenant: "a", id: "1", status: "open" },
    { tenant: "a", id: "2", status: "closed" },
    { tenant: "b", id: "3", status: "open" },
  ];
  assert.deepEqual(select(rows, { tenants: ["a"] }), [rows[0]]);
});
test("expired cursor can recover to a fresh continuation", () => {
  let first = true;
  assert.deepEqual(
    collect({
      page: () => {
        if (first) {
          first = false;
          return { status: "EXPIRED", resume: "new" };
        }
        return { status: "OK", rows: [{ id: "x" }], next: null };
      },
    }),
    [{ id: "x" }],
  );
});
