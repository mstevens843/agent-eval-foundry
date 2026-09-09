// Fetch a complete static-check set at one upstream revision; never mix main revisions.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
const [destination, revision] = process.argv.slice(2);
if (!destination || !/^[a-f0-9]{40}$/.test(revision ?? "")) throw Error("Usage: sync-tb-checks.mjs FRESH_OUTPUT COMMIT_SHA");
const directory = resolve(destination);
mkdirSync(directory, { recursive: false });
const fetch = (url) => execFileSync("curl", ["-fsSL", "--max-time", "60", url]);
const base = "https://api.github.com/repos/harbor-framework/terminal-bench";
const entries = JSON.parse(fetch(`${base}/contents/scripts/checks?ref=${revision}`));
const records = [];
for (const item of entries.filter((e) => /^check-.*\.sh$/.test(e.name))) {
  const bytes = fetch(`https://raw.githubusercontent.com/harbor-framework/terminal-bench/${revision}/scripts/checks/${item.name}`);
  writeFileSync(join(directory, item.name), bytes);
  records.push({ path: item.name, sha256: createHash("sha256").update(bytes).digest("hex") });
}
writeFileSync(join(directory, "upstream.json"), JSON.stringify({ revision, files: records }, null, 2) + "\n");
console.log(JSON.stringify({ revision, checks: records.length, directory }));
