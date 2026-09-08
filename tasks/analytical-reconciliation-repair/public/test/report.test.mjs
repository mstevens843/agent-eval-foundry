import { test } from "node:test";
import assert from "node:assert/strict";
import { subject } from "../entry.mjs";
test("reports metering with an independent credit and a zero-activity customer", async () => {
  const source = {
    customers: [
      { tenant: "t", id: "a", name: "A", active: true },
      { tenant: "t", id: "b", name: "B", active: true },
    ],
    accounts: [{ tenant: "t", id: "meter", customerId: "a", price: { n: "1", d: "1000" } }],
    usage: [
      {
        tenant: "t",
        id: "u",
        revision: 1,
        accountId: "meter",
        at: 5,
        quantity: "2",
        unit: "ms",
        state: "posted",
      },
    ],
    credits: [
      { tenant: "t", id: "c", revision: 1, customerId: "a", at: 5, microcents: "1", state: "posted" },
    ],
  };
  const rows = [];
  await subject.run(
    { tenant: "t", from: 0, to: 10, storage: "/tmp" },
    {
      fetch: async ({ table }) => ({ rows: source[table], next: null }),
      record: async ({ row }) => {
        rows.push(row);
        return { stored: true };
      },
    },
  );
  rows.sort((a, b) => a.customerId.localeCompare(b.customerId));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].usageUs, "2000");
  assert.equal(rows[0].balanceMicrocents, "1");
  assert.equal(rows[1].balanceMicrocents, "0");
});
