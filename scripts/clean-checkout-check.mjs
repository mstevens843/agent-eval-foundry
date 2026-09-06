#!/usr/bin/env node
// Compatibility entry point. Test intended working-tree bytes with an independent build,
// never archive old HEAD and link the author's ambient dist into it.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const parent = resolve(".local/candidate-snapshots");
mkdirSync(parent, { recursive: true });
const output = process.argv[2] ?? resolve(parent, `candidate-${Date.now()}`);
execFileSync(process.execPath, [resolve("scripts/candidate-snapshot.mjs"), output, "verify"], {
  stdio: "inherit",
  timeout: 3600000,
});
