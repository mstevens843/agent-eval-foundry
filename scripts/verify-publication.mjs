// Portable publication checks only: no raw transcripts, credentials, Docker or provider calls.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SCREENING_BATCHES = [
  ["original-five", "2026-09-07-original-five"],
  ["next-five", "2026-09-08-next-five"],
  ["third-five", "2026-09-08-third-five"],
  ["fourth-five", "2026-09-08-fourth-five"],
  ["fifth-five", "2026-09-08-fifth-five"],
];

// Versioned follow-ups reuse the original per-package analysis files. They are
// additional trials or engineering evidence, not additional distinct packages.
export const SCREENING_FOLLOWUPS = [
  "second-trial-priority-2026-09-09.md",
  "top-five-implementation-plan-2026-09-09.md",
  "next-five-implementation-plan-2026-09-09.md",
  "third-ranked-five-implementation-plan-2026-09-09.md",
  "round-two-top-five-2026-09-09.md",
  "evidence/2026-09-09-second-trial-source-audit.json",
  "evidence/2026-09-09-successor-generators.json",
  "evidence/2026-09-09-top-five-integration.json",
  "evidence/2026-09-09-top-five-implementation.json",
  "evidence/2026-09-09-next-five-generators.json",
  "evidence/2026-09-09-next-five-implementation.json",
  "evidence/2026-09-09-third-ranked-five-generators.json",
  "evidence/2026-09-09-third-ranked-five-implementation.json",
  "evidence/2026-09-09-round-two-top-five.json",
  "evidence/2026-09-09-round-two-top-five-audit.json",
];

export function verifyPublication(root = process.cwd()) {
  const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
  const hash = /^[a-f0-9]{64}$/;
  const first = read("reports/screening/evidence/2026-09-07-original-five.json");
  const next = read("reports/screening/evidence/2026-09-08-next-five.json");
  const ids = new Set();
  let verifiedFiles = 0;
  const expected = ["README.md", ...SCREENING_FOLLOWUPS];
  let index = 0;
  let missingBatch = false;
  for (const [batchIndex, [folder, file]] of SCREENING_BATCHES.entries()) {
    const path = `reports/screening/evidence/${file}.json`;
    if (!existsSync(join(root, path))) {
      assert.ok(batchIndex >= 2, "historical evidence must remain present");
      missingBatch = true;
      continue;
    }
    assert.ok(!missingBatch, "screening publication must preserve batch order");
    const batch = read(path);
    assert.equal(batch.schemaVersion, 1);
    assert.equal(batch.evidenceClass, "real-provider-screening");
    assert.equal(batch.packages.length, 5);
    assert.ok(batch.limitations.length > 0);
    if (batchIndex >= 2) {
      assert.equal(batch.automaticRetries, 0);
      assert.equal(batch.packages.filter((p) => p.target === "codex").length, 2);
      assert.equal(batch.packages.filter((p) => p.target === "claude").length, 3);
      assert.equal(batch.concurrencyRequestFulfilled, true);
      assert.equal(batch.concurrencyObservation.count, 5);
      assert.equal(new Set(batch.concurrencyObservation.packageIds).size, 5);
      assert.deepEqual(
        [...batch.concurrencyObservation.packageIds].sort(),
        batch.packages.map((p) => p.id).sort(),
      );
      assert.match(batch.sourceDigest, hash);
    }
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
      if (record.checker?.reasonPolicy === "any-observed-public-obligation") {
        const checker = record.checker;
        assert.match(checker.gradeSummarySha256, hash);
        assert.equal(checker.details.length, checker.total);
        for (const detail of checker.details) {
          assert.ok(Array.isArray(detail.observedFailingChecks));
          if (detail.expectedFailingCheck === null) assert.equal(detail.observedFailingChecks.length, 0);
          else
            assert.ok(
              detail.observedFailingChecks.includes(detail.expectedFailingCheck),
              "negative candidate's primary control must actually activate",
            );
        }
        assert.equal(
          checker.namedRightCheck,
          checker.details.filter((d) => d.outcome === "correct-reject-named").length,
        );
        assert.equal(
          checker.pass,
          checker.deterministic &&
            checker.falsePositives === 0 &&
            checker.missed === 0 &&
            checker.namedRightCheck === checker.details.filter((d) => d.expectedFailingCheck !== null).length,
        );
      }
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
  const retrials = read("reports/screening/evidence/2026-09-09-round-two-top-five.json");
  const audit = read("reports/screening/evidence/2026-09-09-round-two-top-five-audit.json");
  assert.equal(retrials.packages.length, 5);
  assert.equal(new Set(retrials.packages.map((p) => p.id)).size, 5);
  assert.equal(audit.newModelCalls, 0);
  assert.equal(audit.formalAdjudicationChanged, false);
  let retrialVerifiedFiles = 0;
  for (const record of retrials.packages) {
    assert.ok(ids.has(record.id), "retrial must extend an existing package history");
    for (const key of ["packageDigest", "profileDigest", "completionSha256", "resultSha256", "gradeSha256"])
      assert.match(record[key], hash, `${record.id}:${key}`);
    const checker = record.checker;
    assert.equal(checker.reasonPolicy, "diagnostic-only");
    assert.equal(checker.details.length, checker.total);
    assert.equal(checker.falsePositives, checker.details.filter((d) => d.outcome === "false-positive").length);
    assert.equal(checker.missed, checker.details.filter((d) => d.outcome === "missed").length);
    assert.equal(checker.correct, checker.total - checker.falsePositives - checker.missed);
    assert.equal(checker.pass, checker.deterministic && checker.falsePositives === 0 && checker.missed === 0);
    assert.equal(record.reward, record.serviceOutcome === "semantic-pass" && checker.pass ? 1 : 0);
    assert.equal(record.outcome, record.reward === 1 ? "semantic-pass" : "semantic-fail");
    assert.equal(record.recordedAdjudication, "unlabelled");
    assert.equal(record.recordedCountsAsModelFailure, false);
    assert.equal(record.recordedModelEvidenceEligible, false);
    const integrity = audit.manifestVerification.find((p) => p.id === record.id);
    assert.ok(integrity);
    assert.deepEqual(integrity.errors, []);
    assert.equal(integrity.recordedReward, record.reward);
    assert.equal(integrity.manifestFilesVerified, record.manifestFilesVerified);
    assert.ok(Number.isInteger(record.manifestFilesVerified) && record.manifestFilesVerified > 0);
    retrialVerifiedFiles += record.manifestFilesVerified;
  }
  assert.equal(retrials.audit.manifestFilesVerified, retrialVerifiedFiles);
  const walk = (dir, prefix = "") =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      assert.ok(!entry.isSymbolicLink(), "publication symlink");
      return entry.isDirectory()
        ? walk(join(dir, entry.name), `${prefix}${entry.name}/`)
        : [`${prefix}${entry.name}`];
    });
  assert.deepEqual(
    walk(join(root, "reports/screening")).sort(),
    expected.sort(),
    "unaccounted screening artifact",
  );
  const documents = [
    "README.md",
    "docs/project-status.md",
    "docs/engineering-progress.md",
    "docs/artifact-lifecycle.md",
    "reports/PORTFOLIO-PUBLICATION.md",
    ...expected.filter((p) => p.endsWith(".md")).map((p) => `reports/screening/${p}`),
  ];
  for (const doc of documents) {
    const text = readFileSync(join(root, doc), "utf8");
    for (const [, target] of text.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^https?:|^#/.test(target)) continue;
      const path = resolve(root, dirname(doc), target.split("#")[0]);
      assert.ok(
        !target.startsWith("/") && !target.includes(".local/") && !relative(root, path).startsWith(".."),
        `${doc}: nonportable link`,
      );
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
  return {
    screenedPackages: ids.size,
    manifestListedFilesVerifiedAtPublication: verifiedFiles,
    successorTrials: retrials.packages.length,
    successorManifestListedFilesVerifiedAtPublication: retrialVerifiedFiles,
    documents: documents.length,
    promotedPaths: promotion.paths.length,
    providerCallsMade: 0,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(verifyPublication()));
