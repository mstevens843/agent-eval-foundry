#!/usr/bin/env node
// Build the Phase 18 trial ledger from the preserved Harbor jobs.
//
// Reads back from disk. An attempt that did not produce a graded submission is
// recorded with the reason it did not count, never dropped.
//
//   phase18-ledger.mjs <campaign-dir> <out.json>
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const CAMPAIGN = process.argv[2];
const OUT = process.argv[3];
const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const lock = JSON.parse(readFileSync(join(ROOT, "data/phase-18-package-lock.json"), "utf8"));
const prereg = JSON.parse(readFileSync(join(ROOT, "data/phase-18-preregistration.json"), "utf8"));

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
};

const walk = (dir) => {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
};

/** Slot metadata is encoded in the job name: p18-slot<N>-<provider>[-attemptM]. */
const parseJob = (name) => {
  const m = /^p18-slot(\d+)-([a-z]+)(?:-attempt(\d+))?$/.exec(name);
  return m ? { slot: Number(m[1]), provider: m[2], attempt: m[3] ? Number(m[3]) : 1 } : null;
};

const rows = [];
for (const name of readdirSync(CAMPAIGN).sort()) {
  const jobDir = join(CAMPAIGN, name);
  if (!statSync(jobDir).isDirectory()) continue;
  const meta = parseJob(name);
  if (!meta) continue;

  const trialDir = readdirSync(jobDir)
    .map((d) => join(jobDir, d))
    .find((d) => statSync(d).isDirectory() && existsSync(join(d, "result.json")));
  if (!trialDir) {
    rows.push({ job: name, ...meta, counts: false, countabilityReason: "no trial directory was produced" });
    continue;
  }

  const result = readJson(join(trialDir, "result.json")) ?? {};
  const exception = existsSync(join(trialDir, "exception.txt"))
    ? readFileSync(join(trialDir, "exception.txt"), "utf8")
    : null;
  const rewardRaw = existsSync(join(trialDir, "verifier/reward.txt"))
    ? readFileSync(join(trialDir, "verifier/reward.txt"), "utf8").trim()
    : null;
  const ctrf = readJson(join(trialDir, "verifier/ctrf.json"));
  const collected = readJson(join(trialDir, "verifier/collected.json"));
  const trajectory = readJson(join(trialDir, "agent/trajectory.json"));

  // The submitted artifact, hashed, plus whether it differs from the shipped tree.
  const artifactDir = join(trialDir, "artifacts/app/certd");
  let submission = null;
  if (existsSync(artifactDir)) {
    const files = walk(artifactDir).sort();
    const digest = createHash("sha256");
    for (const f of files) {
      digest.update(f.slice(artifactDir.length));
      digest.update("\0");
      digest.update(readFileSync(f));
      digest.update("\0");
    }
    submission = { files: files.length, sha256: digest.digest("hex") };
  }

  const failedTests = ctrf?.results?.tests?.filter((t) => t.status !== "passed") ?? [];
  const failedChecks = [
    ...new Set(failedTests.map((t) => (t.name.match(/\[[^-\]]+-([a-z_]+)\]/) ?? [])[1]).filter(Boolean)),
  ].sort();
  const failedScenarios = [
    ...new Set(failedTests.map((t) => (t.name.match(/\[([a-z]+-\d+)-/) ?? [])[1]).filter(Boolean)),
  ].sort();

  // An attempt counts only if the agent actually ran and a graded submission came back.
  const providerFailure =
    exception !== null &&
    /401|Unauthorized|Incorrect API key|NonZeroAgentExitCode|Timeout|connection/i.test(exception);
  const counts = !providerFailure && rewardRaw !== null && ctrf !== null;

  rows.push({
    job: name,
    ...meta,
    trialDir: trialDir.slice(CAMPAIGN.length + 1),
    challengeSha256: lock.surfaces.challenge.sha256,
    selectedSha256: lock.surfaces.selected.sha256,
    balancedSha256: lock.surfaces.balanced.sha256,
    reward: rewardRaw === null ? null : Number(rewardRaw),
    counts,
    countabilityReason: counts
      ? "the agent ran and a graded submission was returned"
      : providerFailure
        ? "provider/infrastructure failure: the agent never ran"
        : "no reward or CTRF report was produced",
    exception: exception ? exception.split("\n").slice(-3).join(" ").slice(0, 300) : null,
    checksTotal: ctrf?.results?.tests?.length ?? null,
    checksFailed: failedTests.length,
    failedChecks,
    failedScenarios,
    scenariosGraded: collected?.results?.filter((r) => r.scenario.suite === "selected").length ?? null,
    submission,
    runtimeSeconds: result?.trial?.runtime_seconds ?? result?.runtime_seconds ?? null,
    tokens: trajectory?.usage ?? null,
    costUsd: result?.trial?.cost ?? result?.cost ?? null,
    priced: (result?.trial?.cost ?? result?.cost ?? null) !== null,
  });
}

const countable = rows.filter((r) => r.counts);
const rewardZero = countable.filter((r) => r.reward === 0);
const byProvider = {};
for (const r of rewardZero) byProvider[r.provider] = (byProvider[r.provider] ?? 0) + 1;

const decision =
  countable.length < 4
    ? "INCONCLUSIVE"
    : rewardZero.length >= 3
      ? "ELIGIBLE-FOR-5-OF-6 (pending 2-of-2 capability labels)"
      : "BUNDLE-DID-NOT-TRANSFER";

const ledger = {
  schema: "agent-eval-foundry/phase-18-trial-ledger@1",
  registrationId: prereg.registrationId,
  challengeSha256: lock.surfaces.challenge.sha256,
  attempts: rows,
  summary: {
    attempted: rows.length,
    countable: countable.length,
    rewardZero: rewardZero.length,
    cleanSolves: countable.filter((r) => r.reward === 1).length,
    rewardZeroByProvider: byProvider,
    infrastructureFailures: rows.filter((r) => !r.counts).length,
    pricedSpendUsd: Number(rows.reduce((t, r) => t + (r.costUsd ?? 0), 0).toFixed(4)),
    unpricedAttempts: rows.filter((r) => !r.priced).length,
  },
  provisionalDecision: decision,
  decisionNote:
    "Reward zero is not difficulty. ELIGIBLE-FOR-5-OF-6 additionally requires 2-of-2 blind capability " +
    "agreement on every relevant failure and concentration on public CAA obligations.",
};

writeFileSync(OUT, `${JSON.stringify(ledger, null, 2)}\n`);
for (const r of rows) {
  console.log(
    `  slot${r.slot} ${r.provider.padEnd(9)} attempt${r.attempt} reward=${r.reward ?? "-"} ` +
      `counts=${r.counts} failed=${r.checksFailed ?? "-"}/${r.checksTotal ?? "-"} ${r.counts ? "" : "(" + r.countabilityReason + ")"}`,
  );
}
console.log(JSON.stringify(ledger.summary));
console.log(`provisional: ${decision}`);
