// Offline audit of the retained Route T7 pass. Never dispatches a model.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] ?? join(repo, ".local/route-t7-pass-audit-" + Date.now()));
assert(!existsSync(out), "Use a fresh directory; prior evidence is immutable");
mkdirSync(out, { recursive: true });
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const hash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const ref = (p) => ({ path: relative(repo, p), sha256: hash(p) });
const prep = read(
  join(repo, "reports/screening/evidence/2026-09-11-hardened-next-five-trial-five-preparation.json"),
);
assert.equal(hash(join(repo, prep.runtime.directory, "dist/index.js")), prep.runtime.bundleSha256);
const api = await import(pathToFileURL(join(repo, prep.runtime.directory, "dist/index.js")));
const id = "route-policy-repair";
const record = join(
  repo,
  ".local/hardened-next-five-trial-five-2026-09-11/real-campaign-frozen/jobs/real-provider/records",
  id + "-attempt-1",
);
const manifest = api.verifyEvidence(record),
  grade = read(join(record, "grade.json"));
assert.equal(grade.reward, 1);
assert.equal(grade.checkerPassed, true);
const pkg = api.executionPackage(join(repo, ".local/next-five-coverage-v2-2026-09-11/release", id, "export"));
assert.equal(pkg.snapshot.record.digest, "2145b82b5c06cafcdc3447510d1d5a02ba799d6cbea77e472eb9ae05be921acc");
const issuedContracts = [];
for (const [component, part] of Object.entries(pkg.snapshot.record.components))
  for (const f of part.files)
    if (/^public\/(SEMANTICS\.md|CHECKER-INPUT\.md|instruction\.md|api\.d\.ts|target\.mjs)$/.test(f.path)) {
      const path = join(record, "submission", f.path.slice("public/".length));
      assert.equal(hash(path), f.sha256, "Issued contract differs from retained submission: " + f.path);
      issuedContracts.push({ component, path: f.path, sha256: f.sha256 });
    }
const directory = join(out, id);
mkdirSync(directory);
cpSync(join(repo, "data/hardened-round-four-pass-audit/replay.mjs"), join(out, "run-local.mjs"));
const files = [];
for (const [component, part] of Object.entries(pkg.snapshot.record.components))
  for (const f of part.files) {
    if (
      ["collector", "verifier"].includes(component) &&
      f.path.endsWith(".mjs") &&
      !f.path.endsWith("bootstrap.mjs")
    ) {
      const text = Buffer.from(api.readSnapshotFile(pkg.snapshot, component, f.path)).toString();
      const path = f.path.replace(/^(runtime|private)\//, "");
      files.push({ path, text });
      const target = join(directory, "authority", path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, text);
    }
    if (f.path.startsWith("private/reference/")) {
      const target = join(directory, "reference", f.path.slice("private/reference/".length));
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, Buffer.from(api.readSnapshotFile(pkg.snapshot, component, f.path)));
    }
  }
const get = (part, path) => Buffer.from(api.readSnapshotFile(pkg.snapshot, part, path)).toString();
const authority = {
  files,
  runtime: JSON.parse(get("dependencies", "runtime.json")),
  scenarios: JSON.parse(get("scenarios", "private/scenarios.json")),
  bootstrap: get("collector", "runtime/bootstrap.mjs"),
};
writeFileSync(join(directory, "authority.json"), JSON.stringify(authority));
const scripts = [
  "data/hardened-round-four-pass-audit/route-fuzz.mjs",
  "data/route-t7-pass-audit/targeted.mjs",
];
const mode = process.argv[3] ?? "all";
assert(["all", "targeted"].includes(mode));
const results = [];
for (const script of scripts) {
  if (mode === "targeted" && !script.endsWith("/targeted.mjs")) continue;
  assert(existsSync(join(repo, script)), "Audit worker is required: " + script);
  const raw = execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "--pull=never",
      "--network=none",
      "--read-only",
      "--user=1000:1000",
      "--cpus=1",
      "--memory=1g",
      "--pids-limit=128",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--tmpfs=/tmp:rw,size=256m",
      "--mount",
      `type=bind,src=${join(record, "submission")},dst=/submitted,readonly`,
      "--mount",
      `type=bind,src=${join(directory, "authority")},dst=/authority,readonly`,
      "--mount",
      `type=bind,src=${join(directory, "reference")},dst=/reference,readonly`,
      "--mount",
      `type=bind,src=${join(record, "grading/checker-grade/cases")},dst=/base,readonly`,
      "--mount",
      `type=bind,src=${join(repo, script)},dst=/audit.mjs,readonly`,
      authority.runtime.image,
      "node",
      "/audit.mjs",
    ],
    { encoding: "utf8", timeout: 180000, maxBuffer: 16 * 1024 * 1024 },
  );
  const { fixtures, ...result } = JSON.parse(raw),
    path = join(out, script.split("/").at(-1).replace(".mjs", "-result.json"));
  if (fixtures) {
    writeFileSync(join(out, "targeted-fixtures.json"), JSON.stringify(fixtures));
    const { replay, check } = await import(pathToFileURL(join(out, "run-local.mjs")));
    const service = replay(id, join(record, "submission"), fixtures.scenarios, "isolated-service");
    result.isolatedService = {
      total: service.length,
      passed: service.filter((c) => c.status === "semantic-pass").length,
    };
    const isolated = check(id, join(record, "submission"), fixtures.cases, "isolated-checker");
    const validShape = (v) =>
      v?.verdicts &&
      Object.keys(v.verdicts).length === fixtures.cases.length &&
      fixtures.cases.every(
        (c) => Object.hasOwn(v.verdicts, c.token) && typeof v.verdicts[c.token]?.ok === "boolean",
      );
    const shape = Boolean(validShape(isolated.first) && validShape(isolated.second));
    result.isolatedChecker = {
      total: fixtures.cases.length,
      correct: fixtures.cases.filter((c, i) => isolated.first?.verdicts?.[c.token]?.ok === fixtures.wanted[i])
        .length,
      shapeValid: shape,
      deterministic:
        shape &&
        fixtures.cases.every(
          (c) => isolated.first.verdicts[c.token].ok === isolated.second.verdicts[c.token].ok,
        ),
      inputUnchanged: !isolated.mutated,
    };
  }
  writeFileSync(path, JSON.stringify(result));
  results.push({ script: ref(join(repo, script)), result: ref(path), summary: result });
  const { classifications, failures, ...counts } = result;
  console.log(JSON.stringify({ script, ...counts, failures: failures?.length }));
}
api.verifyEvidence(record);
const summary = {
  schemaVersion: 1,
  providerCallsMade: 0,
  packageDigest: pkg.snapshot.record.digest,
  record: relative(repo, record),
  filesVerified: manifest.files.length,
  recordedReward: 1,
  issuedContracts,
  completion: ref(join(record, "completion.json")),
  grade: ref(join(record, "grade.json")),
  submission: ["entry.mjs", "checker.mjs"].map((p) => ref(join(record, "submission", p))),
  results,
};
writeFileSync(join(out, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify({ output: relative(repo, out), providerCallsMade: 0 }));
