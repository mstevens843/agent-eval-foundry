import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatch } from "../src/dispatcher.mjs";
test("an ordinary accepted transport response is reported", () => {
  const r = {
    id: "work",
    owner: "alice",
    delegate: "helper",
    wallet: "wallet",
    grant: "grant",
    grantVersion: 1,
    credits: 2,
  };
  const effects = [];
  const api = {
    describe: () => ({
      owner: "alice",
      grants: [{ id: "grant", delegate: "helper", version: 1, allowed: true, limit: 10, spent: 0 }],
    }),
    lookup: () => ({ status: "ABSENT" }),
    debit: (request) => {
      effects.push(request);
      return { status: "ACCEPTED", receipt: request };
    },
  };
  const result = dispatch(
    { storage: mkdtempSync(join(tmpdir(), "budget-visible-")), job: 0, requests: [r] },
    api,
  );
  assert.equal(result.decisions[0].status, "accepted");
  assert.equal(effects[0].credits, 2);
});
