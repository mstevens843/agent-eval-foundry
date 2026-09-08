import test from "node:test";
import assert from "node:assert/strict";
import { subject } from "../entry.mjs";
test("create a service after its database", () => {
  const actual = [],
    target = [
      { id: "service", parents: ["database"], payload: "s" },
      { id: "database", parents: [], payload: "d" },
    ];
  subject.run(
    { scope: target.map((r) => r.id), target },
    {
      inspect: () => ({ resources: structuredClone(actual) }),
      create: ({ resource }) => {
        assert.ok(resource.parents.every((p) => actual.some((r) => r.id === p)));
        actual.push(resource);
        return { status: "DONE" };
      },
      remove: () => {
        throw Error("unexpected");
      },
    },
  );
  assert.deepEqual(
    actual.map((r) => r.id),
    ["database", "service"],
  );
});
