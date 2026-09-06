import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize } from "../src/recording.mjs";
import { resolveTarget } from "../src/resolver.mjs";
test("recording retains entity and normalizes entered text", () => {
  assert.deepEqual(normalize({ events: [{ step: 0, entity: "order", value: 12 }] }), [
    { step: 0, entity: "order", value: "12" },
  ]);
});
test("a stable recorded locator resolves its form", () => {
  assert.equal(
    resolveTarget({ step: 0, selector: "save" }, { query: () => [{ handle: "one", selector: "save" }] })
      .handle,
    "one",
  );
});
