import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { replay } from "../src/replay.mjs";
test("one stable form is filled and submitted through the driver interface", () => {
  const storage = mkdtempSync(join(tmpdir(), "replay-visible-")),
    effects = [];
  const event = { step: 0, entity: "order", field: "memo", value: "ready", selector: "save" };
  let value = "";
  const api = {
    query: () => [{ handle: "h", entity: "order", field: "memo", selector: "save" }],
    observe: () => ({ connected: true, ready: true, entity: "order", field: "memo", value, generation: "0" }),
    settle: () => ({ stable: true }),
    receipts: () => effects,
    act: (r) => {
      if (r.kind === "fill") value = r.value;
      else effects.push({ traceId: "example", ...event, value });
      return { ok: true, pending: false };
    },
  };
  const result = replay({ storage, traceId: "example", events: [event], attempt: 0 }, api);
  assert.equal(effects[0].value, "ready");
  assert.equal(result.steps[0].status, "completed");
});
