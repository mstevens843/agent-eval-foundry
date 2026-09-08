import { test } from "node:test";
import assert from "node:assert/strict";
import { tokens } from "../src/tokens.mjs";
import { compile } from "../src/compiler.mjs";
test("escaped characters remain literal and stars retain identity", () => {
  assert.deepEqual(tokens("a\\*?**"), [
    { kind: "literal", value: "a" },
    { kind: "literal", value: "*" },
    { kind: "any" },
    { kind: "star" },
    { kind: "star" },
  ]);
  const p = compile([{ id: "r", pattern: "abc", fold: false, tag: "x" }]);
  assert.ok(p.code.length > 3);
  assert.ok(p.entry < p.code.length);
});
