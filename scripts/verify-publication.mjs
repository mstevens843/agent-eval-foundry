// Portable publication checks only: no raw transcripts, credentials, Docker or provider calls.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function verifyPublication(root = process.cwd()) {
  const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
  const hash = /^[a-f0-9]{64}$/;
  const first = read("reports/screening/evidence/2026-09-07-original-five.json");
  const next = read("reports/screening/evidence/2026-09-08-next-five.json");
  const ids = new Set();
  let verifiedFiles = 0;
  const expected = ["README.md"];
  let index = 0;
  for (const [folder, file, batch] of [
    ["original-five", "2026-09-07-original-five", first],
    ["next-five", "2026-09-08-next-five", next],
  ]) {
    assert.equal(batch.schemaVersion, 1);
    assert.equal(batch.evidenceClass, "real-provider-screening");
    assert.equal(batch.packages.length, 5);
    assert.ok(batch.limitations.length > 0);
    expected.push(`evidence/${file}.json`);
    for (const record of batch.packages) {
      assert.match(record.id, /^[a-z0-9-]+$/);
      assert.ok(!ids.has(record.id), "duplicate screened package");
      ids.add(record.id);
      assert.ok(existsSync(join(root, "tasks", record.id)));
      for (const key of ["packageDigest", "profileDigest", "completionSha256", "resultSha256", "gradeSha256"])
        assert.match(record[key], hash, `${record.id}:${key}`);
      assert.ok(Number.isInteger(record.verifiedFiles) && record.verifiedFiles > 0);
      verifiedFiles += record.verifiedFiles;
      assert.ok(!Object.hasOwn(record, "directory"));
      assert.ok(!/\/Users\/|\.local\//.test(JSON.stringify(record)), "nonportable/private record path");
      expected.push(`${folder}/${String(++index).padStart(2, "0")}-${record.id}.md`);
    }
  }
  assert.equal(first.excludedAttempts.length, 3);
  assert.match(first.setupIncident, /accidental/);
  assert.equal(next.concurrencyRequestFulfilled, false);
  const partial = next.packages.find((p) => p.id === "partial-release-repair");
  assert.equal(partial.assessment, "contract-grader-alignment-concern");
  assert.equal(partial.service.failedScenarios, 0);
  assert.equal(partial.checker.correct, partial.checker.total);
  const walk = (dir, prefix = "") => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    assert.ok(!entry.isSymbolicLink(), "publication symlink");
    return entry.isDirectory()
      ? walk(join(dir, entry.name), `${prefix}${entry.name}/`)
      : [`${prefix}${entry.name}`];
  });
  assert.deepEqual(walk(join(root, "reports/screening")).sort(), expected.sort(), "unaccounted screening artifact");
  const documents = [
    "README.md", "docs/project-status.md", "docs/engineering-progress.md", "docs/artifact-lifecycle.md",
    "reports/PORTFOLIO-PUBLICATION.md",
    ...expected.filter((p) => p.endsWith(".md")).map((p) => `reports/screening/${p}`),
  ];
  for (const doc of documents) {
    const text = readFileSync(join(root, doc), "utf8");
    for (const [, target] of text.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^https?:|^#/.test(target)) continue;
      const path = resolve(root, dirname(doc), target.split("#")[0]);
      assert.ok(!target.startsWith("/") && !target.includes(".local/") && !relative(root, path).startsWith(".."), `${doc}: nonportable link`);
      assert.ok(existsSync(path), `${doc}: missing ${target}`);
    }
  }
  const promotion = read("reports/portfolio-promotion-manifest.json");
  assert.equal(promotion.kind, "source-promotion-receipt");
  assert.ok(promotion.paths.length > 0);
  assert.equal(new Set(promotion.paths.map((p) => p.path)).size, promotion.paths.length);
  for (const p of promotion.paths) {
    assert.match(p.integratedSha256, hash);
    assert.match(p.selectedSourceSha256, hash);
    assert.ok(!p.path.startsWith("/") && !p.path.split("/").includes(".."));
  }
  return { screenedPackages: ids.size, manifestListedFilesVerifiedAtPublication: verifiedFiles, documents: documents.length, promotedPaths: promotion.paths.length, providerCallsMade: 0 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(verifyPublication()));
