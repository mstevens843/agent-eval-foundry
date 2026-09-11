import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const file = name => new URL(name, import.meta.url);
const json = name => JSON.parse(readFileSync(file(name), "utf8"));
const manifest = json("SHA256SUMS.json");
for (const [name, expected] of Object.entries(manifest)) {
  const actual = createHash("sha256").update(readFileSync(file(name))).digest("hex");
  assert.equal(actual, expected, `Frozen replay file changed: ${name}`);
}
// Only the reviewed, checksum-verified module in this replay is imported. No arbitrary submission path.
const { run } = await import("./frozen/submitted-checker.mjs");
const { publicationOrdering } = await import("./frozen/ordering-oracle.mjs");
const input = json("frozen/cases.json"), provenance = json("provenance.json");
const verdicts = run(structuredClone(input)).verdicts;
const results = input.cases.map(candidate => {
  const oracle = publicationOrdering(candidate.cells[0]);
  const actual = { submittedCheckerAccepts: verdicts[candidate.token].ok, orderingOracleAccepts: oracle.ok };
  assert.deepEqual(actual, provenance.expected[candidate.token], `Unexpected outcome for ${candidate.token}`);
  return { candidate: candidate.token, ...actual, violations: oracle.violations };
});
console.log(JSON.stringify({ version: provenance.version, reproduced: true, results,
  providerCallsMade: 0, scope: provenance.scope }, null, 2));
