// Read-only integration over explicitly supplied preserved artifacts. No grader, provider or container launch.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import {
  appendTransfer,
  assessFindings,
  assessStoredTransfers,
  inspectPortfolioSelection,
  inspectRun,
  learningCommand,
  loadFinding,
  renderTrial,
} from "../dist/index.js";

const [native, browser, memory, wallet, rollout, executionRoot, output] = process.argv.slice(2);
if (![native, browser, memory, wallet, rollout, executionRoot, output].every(Boolean))
  throw Error(
    "usage: node scripts/verify-evidence-learning.mjs NATIVE_EXPORT BROWSER_EXPORT MEMORY_EXPORT WALLET_EXPORT ROLLOUT_EXPORT PRESERVED_EXECUTION_ROOT FRESH_PRIVATE_OUTPUT",
  );
const root = process.cwd();
const started = performance.now();
const hash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const source = loadFinding(join(root, "findings/cases"), "durableoutbox-cc267").at(-1);
assert(source);
const before = source.sources.map((s) => ({
  path: s.directory,
  digest: inspectRun(resolve(s.directory)).sourceDigest,
}));
const published = await learningCommand(root, ["publish-case", source.findingId, output]);
const directions = (await learningCommand(root, ["directions"])).packages;
const exports = [native, browser, memory, wallet, rollout];
const browserReceipt = JSON.parse(readFileSync(join(browser, "verification/assurance.json"), "utf8"));
const visibleProof = browserReceipt.results.find((r) => r.id === "visible-workspace-smoke");
const browserParityVerified =
  visibleProof?.status === "pass" &&
  ["starter", "reference", "alternative"].every((name) =>
    visibleProof.detail?.observations?.some((o) => o.name === name),
  );
const packages = exports.map((directory, i) => {
  const d = directions[i];
  assert(d);
  return {
    directory,
    receipt: join(directory, i === 0 ? "assurance.json" : "verification/assurance.json"),
    active: false,
    retired: false,
    trialDirectories: [],
    triagedSourceDigests: [],
    knownIssues:
      i === 1 && !browserParityVerified
        ? [
            "P5-BROWSER-VISIBLE-MOCK: retained mock lacks api.settle; requires a new package version, not altered history.",
          ]
        : [],
    review: {
      promise: "strong",
      professionalValue: "supported",
      rationale: d.applicability,
      evidence: [`${directory}/package.json`, d.difference],
      uncertainty: [
        d.counter,
        "Construction judgment, no current target-model outcomes or expert-time evidence.",
      ],
      remainingHours: null,
      reuse: "implemented",
      solution: {
        domain: d.family,
        outcome: d.obligations.join(" "),
        strategy: d.difference,
        invariantInteraction: d.obligations.join(" + "),
        infrastructure: ["protected-authority-process", "immutable-package-record"],
      },
    },
  };
});
const input = {
  findingIds: [source.findingId, "memory-host-contract-correction"],
  workInProgress: 2,
  portfolioLimit: 5,
  diversity: [],
  packages,
};
const selected = await inspectPortfolioSelection(root, input);
assert.equal(selected.transfers.length, 15);
assert(selected.transfers.every((t) => !t.assessment.provenHardness && !t.assessment.untouchedHeldOut));
assert(selected.selection.decisions.every((d) => !d.policy.stages["trial-authorized"].allowed));
if (!browserParityVerified)
  assert.equal(
    selected.selection.decisions.find((d) => d.id === "browser-replay-repair").recommendedAction,
    "repair",
  );
const exposureStore = `${resolve(output)}-transfers`;
for (const t of selected.transfers) appendTransfer(exposureStore, t.record, null);
assert(assessStoredTransfers(exposureStore, selected.learning).every((t) => !t.assessment.provenHardness));
const cases = [];
for (const [id, status] of [
  ["native-correct", "semantic-pass"],
  ["native-incorrect", "semantic-fail"],
  ["native-missing-file", "invalid-execution"],
  ["browser-correct", "semantic-pass"],
  ["browser-incorrect", "semantic-fail"],
]) {
  const dir = join(executionRoot, "jobs/simulation/records", id);
  const manifest = hash(join(dir, "completion.json"));
  const v = inspectRun(dir);
  assert.equal(v.observation.status, status);
  assert.equal(v.observation.newAgentAttempts, 0);
  assert.equal(v.eligibility.exactTarget, false);
  assert.equal(hash(join(dir, "completion.json")), manifest);
  // Every locator resolves to the actual retained JSON object, not a generated pseudo-witness.
  for (const f of v.failures) {
    let value = JSON.parse(readFileSync(join(dir, f.observation.path), "utf8"));
    for (const key of f.observation.locator.split("/").slice(1)) value = value[key];
    assert.equal(value.scenarioId, f.scenarioId);
  }
  assert(renderTrial(v).includes(v.sourceDigest));
  cases.push({ id, sourceDigest: v.sourceDigest, observation: v.observation, eligibility: v.eligibility });
}
const regrade = inspectRun(join(executionRoot, "regrades/browser-regrade"));
assert.equal(regrade.kind, "regrade");
assert.equal(regrade.observation.newAgentAttempts, 0);
assert.equal(regrade.observation.status, "semantic-fail");
assert.equal(regrade.eligibility.capability, false);
const after = source.sources.map((s) => ({
  path: s.directory,
  digest: inspectRun(resolve(s.directory)).sourceDigest,
}));
assert.deepEqual(after, before);
assert(assessFindings(root, [source]).claims.every((c) => !c.capabilitySupport));
// The case publication is already sealed. Ancillary integration outputs are siblings, never appended inside it.
writeFileSync(`${resolve(output)}-selection-input.json`, JSON.stringify(input, null, 2), {
  flag: "wx",
  mode: 0o600,
});
writeFileSync(`${resolve(output)}-selection.json`, JSON.stringify(selected, null, 2), {
  flag: "wx",
  mode: 0o600,
});
const proof = {
  schemaVersion: 1,
  providerCallsMade: 0,
  automaticRegrades: 0,
  newAgentAttempts: 0,
  published,
  sourcePreserved: true,
  before,
  after,
  cases,
  regrade: { identity: regrade.identity, observation: regrade.observation },
  selectionDigest: selected.selection.digest,
  transferCount: selected.transfers.length,
  provenHardness: 0,
  elapsedMs: performance.now() - started,
  maxRssKiB: process.resourceUsage().maxRSS,
  limits:
    "Explicitly supplied retained receipts inspected, not newly executed assurance. Private outputs; no target qualification or future yield claim.",
};
writeFileSync(`${resolve(output)}-proof.json`, JSON.stringify(proof, null, 2), { flag: "wx", mode: 0o600 });
process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
