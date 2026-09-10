// Additional service grading over the same unchanged contract and frozen authority.
// This module never imports a submitted module into the host process.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { hash } from "./grade-post-final-supplement.mjs";
import { validationMetadataCurrent } from "../data/remaining-pass-grading-controls/cache-metadata.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export async function replayRemainingServiceCoverage({ id, submission, output }) {
  const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
  const audit = read("reports/screening/evidence/2026-09-09-remaining-pass-audit.json");
  assert.equal(hash(join(root, audit.authorityPatch.path)), audit.authorityPatch.sha256);
  const frozen = join(root, ".local/round-two-top-five-2026-09-09/frozen-source/dist/index.js");
  assert.equal(hash(frozen), audit.frozenRuntimeSha256);
  const api = await import(frozen);
  const spec = read(
    "reports/screening/evidence/2026-09-09-round-three-failing-five-preparation.json",
  ).packages.find((p) => p.id === id);
  const pkg = api.executionPackage(join(root, spec.foundry.export));
  assert.equal(pkg.snapshot.record.digest, spec.foundry.digest);
  const source = (c, p) => Buffer.from(api.readSnapshotFile(pkg.snapshot, c, p)).toString();
  const files = [
    ...pkg.snapshot.record.components.collector.files,
    ...pkg.snapshot.record.components.verifier.files,
  ]
    .filter((f) => f.path.endsWith(".mjs") && !f.path.endsWith("bootstrap.mjs"))
    .map((f) => ({
      path: f.path.replace(/^(runtime|private)\//, ""),
      text: source(f.path.startsWith("runtime/") ? "collector" : "verifier", f.path),
    }));
  const definitions = audit.generated.filter((d) => d.id === id);
  assert(definitions.length);
  const scenarios = definitions.map((d) => {
    assert.equal(hash(join(root, d.scenarioPath)), d.scenarioSha256);
    return read(d.scenarioPath);
  });
  const raw = execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "--network",
      "none",
      "--read-only",
      "--tmpfs",
      "/tmp:rw,size=512m",
      "--tmpfs",
      "/work:rw,size=128m",
      "--shm-size",
      "256m",
      "--cpus",
      "2",
      "--memory",
      "2g",
      "--pids-limit",
      "256",
      "--cap-drop",
      "ALL",
      "--cap-add",
      "SETUID",
      "--cap-add",
      "SETGID",
      "--cap-add",
      "KILL",
      "--cap-add",
      "CHOWN",
      "--security-opt",
      "no-new-privileges",
      "--mount",
      `type=bind,src=${resolve(submission)},dst=/submission,readonly`,
      "-i",
      pkg.image,
      "node",
      "--input-type=module",
      "-e",
      source("collector", "runtime/bootstrap.mjs"),
    ],
    {
      input: JSON.stringify({ files, scenarios }),
      encoding: "utf8",
      timeout: 90000 * scenarios.length,
      maxBuffer: 24 * 1024 * 1024,
    },
  );
  const execution = JSON.parse(raw);
  assert.equal(execution.cells.length, scenarios.length);
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, "execution.json"), JSON.stringify(execution, null, 2) + "\n", { flag: "wx" });
  const details = execution.cells.map((c, i) => {
    assert.notEqual(c.status, "invalid", "Diagnose execution error before scoring");
    const metadataCurrent = id !== "variant-cache-repair" || validationMetadataCurrent(c);
    return {
      scenario: definitions[i].name,
      originalStatus: c.status,
      metadataCurrent,
      pass: c.status === "semantic-pass" && metadataCurrent,
    };
  });
  const result = {
    id,
    gradingRevision: audit.gradingRevision,
    packageDigest: spec.foundry.digest,
    sourceSha256: hash(join(submission, "entry.mjs")),
    pass: details.every((d) => d.pass),
    details,
  };
  writeFileSync(join(output, "grade.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  return result;
}
