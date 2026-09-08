import { test } from "node:test";
import assert from "node:assert/strict";
import { fold } from "../src/recovery.mjs";
import { select } from "../src/catalog.mjs";
test("ordinary transaction and point selection", () => {
  const state = { accounts: [{ id: 1, name: "A" }], entries: [], nextId: 1 };
  assert.deepEqual(
    fold(state, [
      { changes: [{ table: "entries", op: "put", row: { id: 1, account: 1, amount: 7 } }], nextId: 2 },
    ]),
    { ...state, entries: [{ id: 1, account: 1, amount: 7 }], nextId: 2 },
  );
  assert.equal(
    select({
      tenant: "a",
      branch: "main",
      cutoff: 2,
      catalog: [{ id: "one", tenant: "a", branch: "main", at: 1, lsn: 1 }],
    }).id,
    "one",
  );
});
