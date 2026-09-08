// Offline recipient reproduction. Inputs are trusted exported packages, never provider jobs.
// Usage: node scripts/verify-portfolio-exports.mjs NEW_OUTPUT EXPORT [EXPORT ...]
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

const [outputArg, ...inputs] = process.argv.slice(2);
if (!outputArg || !inputs.length) throw Error("usage: verify-portfolio-exports NEW_OUTPUT EXPORT...");
const output = resolve(outputArg);
if (existsSync(output)) throw Error("OUTPUT_EXISTS");
mkdirSync(output, { recursive: true });
const foreignCwd = mkdtempSync(join(tmpdir(), "portfolio-recipient-"));
const json = (p) => JSON.parse(readFileSync(p, "utf8"));
const hash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const summaries = [];
for (const [index, input] of inputs.entries()) {
  const directory = resolve(input);
  const destination = join(output, String(index));
  mkdirSync(destination);
  const cli = join(directory, "package/tooling/local-cli.mjs");
  const call = (label, args, expectedError) => {
    const result = spawnSync(process.execPath, [cli, "portfolio", ...args], {
      cwd: foreignCwd,
      encoding: "utf8",
      timeout: 1200000,
      maxBuffer: 2 * 1024 * 1024,
    });
    writeFileSync(join(destination, `${label}.log`), `${result.stdout ?? ""}\n${result.stderr ?? ""}`, {
      flag: "wx",
    });
    if (result.error) throw result.error;
    if (expectedError) {
      assert.notEqual(result.status, 0, label);
      assert.match(result.stderr, expectedError);
      return;
    }
    assert.equal(result.status, 0, `${label}: ${result.stderr}`);
    return JSON.parse(result.stdout);
  };
  const before = hash(join(directory, "package.json"));
  const inspected = call("inspect", ["inspect", directory]);
  const digest = inspected.record.digest;
  const validation = join(destination, "validation");
  call("validate", ["validate", directory, validation]);
  const receipt = json(join(validation, "assurance.json"));
  assert.equal(receipt.packageDigest, digest);
  const manifest = json(join(directory, "package/private/control-manifest.json"));
  const expectedControls = [
    "reference",
    "alternative",
    "starter",
    ...manifest.map((c) => c.id),
    "visible-workspace-smoke",
    "reference-repeat",
  ];
  assert.deepEqual(receipt.results.map((r) => r.id).sort(), expectedControls.sort());
  assert(receipt.results.every((r) => r.status === "pass"));
  assert.equal(receipt.decision.stages["local-valid"].allowed, true);
  assert.equal(receipt.decision.stages["trial-authorized"].allowed, false);
  const previous = json(join(directory, "verification/assurance.json"));
  for (const r of receipt.results)
    assert.equal(r.artifactDigest, previous.results.find((p) => p.id === r.id).artifactDigest);
  const failingSource = join(destination, "crashing-source");
  mkdirSync(failingSource);
  writeFileSync(
    join(failingSource, "entry.mjs"),
    "export const subject = {run(){throw Error('intentional local invalid-execution control')}};",
    { flag: "wx" },
  );
  const invalid = call("invalid", [
    "grade",
    directory,
    failingSource,
    join(destination, "invalid-run"),
    "case-000",
  ]);
  assert(invalid.cells.length === 1 && invalid.cells[0].status === "invalid" && invalid.cells[0].error);
  const changed = join(destination, "changed-artifact");
  mkdirSync(changed);
  for (const p of ["package.json", "store", "package", "visible"])
    cpSync(join(directory, p), join(changed, p), { recursive: true, errorOnExist: true, force: false });
  appendFileSync(join(changed, "package/public/entry.mjs"), "\n// changed after assembly\n");
  call("reject-artifact-drift", ["inspect", changed], /ASSEMBLY|MATERIALIZED|[Dd]igest|[Bb]ytes/);
  const changedEvidence = join(destination, "changed-evidence");
  cpSync(join(directory, "verification"), changedEvidence, {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
  appendFileSync(join(changedEvidence, "runs/reference/result.json"), "\n");
  call(
    "reject-evidence-drift",
    ["export", directory, join(destination, "refused-export"), join(changedEvidence, "assurance.json")],
    /EVIDENCE_CHANGED/,
  );
  assert(!existsSync(join(destination, "refused-export")));
  assert.equal(hash(join(directory, "package.json")), before);
  const reference = json(join(validation, "runs/reference/result.json"));
  const traces = reference.cells.filter((c) => c.browserTraceArtifact);
  for (const cell of traces) {
    const file = join(validation, "runs/reference", cell.browserTraceArtifact.path);
    assert.equal(hash(file), cell.browserTraceArtifact.sha256);
    assert.equal(readFileSync(file).subarray(0, 2).toString(), "PK");
  }
  summaries.push({
    packageId: inspected.record.id,
    packageDigest: digest,
    operations: receipt.results.length,
    scenarioCount: reference.cells.length,
    browserTraces: traces.length,
    invalidExecutionExcluded: true,
    artifactDriftRejected: true,
    evidenceDriftRejected: true,
    sourceCheckoutRequired: false,
    providerCallsMade: 0,
  });
  console.log(JSON.stringify(summaries.at(-1)));
}
writeFileSync(
  join(output, "result.json"),
  JSON.stringify({ schemaVersion: 1, foreignCwd, packages: summaries, providerCallsMade: 0 }, null, 2) + "\n",
  { flag: "wx" },
);
