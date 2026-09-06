import { test } from "node:test";
import assert from "node:assert/strict";
import { choose } from "../src/catalog.mjs";
import { healthy } from "../src/health.mjs";
test("newest release in a homogeneous fleet", () =>
  assert.equal(
    choose(
      [
        { id: "r1", rank: 1 },
        { id: "r2", rank: 2 },
      ],
      {},
    ).id,
    "r2",
  ));
test("empty telemetry is not healthy", () => assert.equal(healthy([], {}, {}), false));
