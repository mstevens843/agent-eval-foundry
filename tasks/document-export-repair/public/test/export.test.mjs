import { test } from "node:test";
import assert from "node:assert/strict";
import { subject } from "../entry.mjs";
test("exports a ticket and keeps its relationships and binary attachment", async () => {
  const ticket = {
    id: "t",
    subject: "Hello user@example.test",
    headers: [],
    tags: ["billing"],
    related: ["s"],
    parts: [
      {
        id: "p",
        name: "note",
        media: "text/plain",
        encoding: "base64",
        data: Buffer.from("Reply user@example.test").toString("base64"),
        links: ["b"],
      },
      {
        id: "b",
        name: "blob",
        media: "application/octet-stream",
        encoding: "base64",
        data: "AAECAw==",
        links: [],
      },
    ],
  };
  const results = [];
  await subject.run(
    { ticketIds: ["t"], policy: { literals: ["user@example.test"], fields: ["email"] }, storage: "/tmp" },
    {
      read: async () => ({ ticket }),
      publish: async (r) => {
        results.push(r);
        return { stored: true };
      },
    },
  );
  assert.equal(results.length, 1);
  const out = JSON.parse(Buffer.from(results[0].data, "base64"));
  assert.equal(out.subject, "Hello [REDACTED]");
  assert.equal(Buffer.from(out.parts[0].data, "base64").toString(), "Reply [REDACTED]");
  assert.equal(out.parts[1].data, "AAECAw==");
  assert.deepEqual(out.related, ["s"]);
  assert.deepEqual(out.parts[0].links, ["b"]);
});
