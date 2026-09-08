import { test } from "node:test";
import assert from "node:assert/strict";
import { assemble } from "../src/layers.mjs";
test("regular file revisions and directory metadata", () => {
  const data = Buffer.from("ready").toString("base64");
  assert.deepEqual(
    assemble([
      {
        entries: [
          { kind: "dir", path: "bin", mode: 493 },
          { kind: "file", path: "bin/app", mode: 493, data },
        ],
      },
    ]),
    { bin: { kind: "dir", mode: 493 }, "bin/app": { kind: "file", mode: 493, data } },
  );
});
