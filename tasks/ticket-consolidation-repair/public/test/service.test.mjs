import test from "node:test";
import assert from "node:assert/strict";
import { subject } from "../entry.mjs";
test("migrate an open ticket without losing its label", () => {
  let row = { tenant: "a", id: "42", status: "open", owner: "old", revision: 1, labels: ["keep"], note: "n" };
  subject.run(
    { tenants: ["a"], team: "support", marker: "migrated" },
    {
      page: () => ({ status: "OK", rows: [structuredClone(row)], next: null }),
      resolve: () => ({ owner: "new" }),
      read: () => structuredClone(row),
      batch: ({ updates }) => {
        for (const u of updates) Object.assign(row, u.patch);
        return { results: updates.map((u) => ({ tenant: u.tenant, id: u.id, status: "APPLIED" })) };
      },
    },
  );
  assert.equal(row.owner, "new");
  assert.deepEqual(row.labels.sort(), ["keep", "migrated"]);
  assert.equal(row.note, "n");
});
