import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { consume } from "../src/consumer.mjs";
test("a stored approved source can be exported by a later job", () => {
  const storage = mkdtempSync(join(tmpdir(), "knowledge-visible-")),
    effects = [];
  const api = {
    receipts: () => effects,
    publish: (value) => {
      effects.push(value);
      return value;
    },
  };
  consume(
    {
      storage,
      job: 0,
      updates: [
        { id: "title", revision: 1, kind: "source", value: "Quarterly report", authority: "approved" },
      ],
      requests: [],
      grants: [],
    },
    api,
  );
  const result = consume(
    {
      storage,
      job: 1,
      updates: [],
      requests: [{ id: "publish", root: "title", destination: "archive", grantVersion: 1 }],
      grants: [{ destination: "archive", version: 1, allowed: true }],
    },
    api,
  );
  assert.equal(result.decisions[0].outcome, "published");
  assert.equal(effects[0].value, "Quarterly report");
});
