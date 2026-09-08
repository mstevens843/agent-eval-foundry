import test from "node:test";
import assert from "node:assert/strict";
import { subject } from "../entry.mjs";
test("ordered callbacks index and advance checkpoint", () => {
  const events = [0, 1].map((offset) => ({
      kind: "callback",
      partition: "p",
      generation: 0,
      offset,
      eventId: "e" + offset,
      record: { entity: "doc", version: offset + 1, body: "v" + offset },
    })),
    writes = [],
    commits = [];
  subject.run(
    { partitions: ["p"] },
    {
      next: () => events.shift() ?? null,
      read: () => writes.at(-1) ?? null,
      put: (r) => {
        writes.push(r);
        return { stored: true };
      },
      complete: () => ({ stored: true }),
      commit: (r) => {
        commits.push(r);
        return { stored: true };
      },
    },
  );
  assert.equal(writes.at(-1).version, 2);
  assert.equal(commits.at(-1).offset, 1);
});
