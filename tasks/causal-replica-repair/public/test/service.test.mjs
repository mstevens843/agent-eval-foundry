import test from "node:test";
import assert from "node:assert/strict";
import { subject } from "../entry.mjs";
test("retain two concurrent offline edits", () => {
  const db = {
    east: { d: { context: { a: 1 }, values: [{ site: "a", n: 1, payload: "first" }] } },
    west: { d: { context: { b: 1 }, values: [{ site: "b", n: 1, payload: "second" }] } },
  };
  subject.run(
    { replicas: Object.keys(db), documents: ["d"] },
    {
      read: ({ replica }) => structuredClone({ documents: db[replica] }),
      replace: ({ replica, document, state }) => {
        db[replica][document] = structuredClone(state);
        return { stored: true };
      },
    },
  );
  assert.equal(db.east.d.values.length, 2);
  assert.deepEqual(db.east, db.west);
});
