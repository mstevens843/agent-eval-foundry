// Standalone, read-only reconciliation across the main successor-adaptive-trials
// campaign ledger and the separate verified-installation-repair continuation
// ledger. Never modifies either ledger, the controller error, original trial
// records, or the linked trial-2 regrade/reconciliation. Never invokes a model,
// never restarts the main controller. Writes a single, separately named report;
// never a file named FINAL.json.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { applyTrialOutcome, initialTaskState, nextTrial, providerForTrial } from "./successor-adaptive-policy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const campaign = join(root, ".local/successor-adaptive-trials-2026-09-11");
const continuationRoot = join(root, ".local/verified-installation-continuation-2026-09-11");
const preparationPath = join(
  root,
  "reports/screening/evidence/2026-09-11-successor-adaptive-trials-preparation.json",
);
const trialTwoReconciliationPath = join(
  root,
  "reports/pass-audits/verified-installation-trial-two-reconciliation-2026-09-11.json",
);
const ticketAuditPath = join(root, "reports/pass-audits/ticket-consolidation-trial-four-2026-09-11.md");
const outputPath = join(campaign, "RECONCILED-SUMMARY.json");

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const jsonLines = (path) => {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8");
  assert(!text || text.endsWith("\n"), `Incomplete event write: ${path}`);
  return text.trim() ? text.trim().split("\n").map((line) => JSON.parse(line)) : [];
};

function score(record, expected, api) {
  const completion = read(join(record, "completion.json"));
  const manifest = api.verifyEvidence(record);
  assert(completion.complete, `Incomplete evidence: ${relative(root, record)}`);
  assert.equal(completion.identity.packageDigest, expected.packageDigest, `Package identity mismatch: ${relative(root, record)}`);
  const result = read(join(record, "result.json"));
  const capture = read(join(record, "capture.json"));
  const grade = read(join(record, "grade.json"));
  if (grade.classification === "invalid-execution") {
    return { unscored: true, classification: grade.classification, stage: grade.stage, error: grade.error };
  }
  assert(["semantic-pass", "semantic-fail"].includes(result.outcome), `Unexpected outcome: ${relative(root, record)}`);
  assert.equal(capture.status, "completed");
  assert.equal(capture.exitCode, 0);
  assert(grade.evaluation.complete);
  assert.equal(grade.checkerRequired, true);
  const reward = grade.evaluation.status === "semantic-pass" && grade.checkerPassed === true ? 1 : 0;
  assert.equal(grade.reward, reward);
  const checkerSummaryPath = join(record, "grading/checker-grade/grade-summary.json");
  const checker = existsSync(checkerSummaryPath) ? read(checkerSummaryPath) : null;
  return {
    unscored: false,
    countedReward: reward,
    service: grade.evaluation.status,
    checkerPassed: grade.checkerPassed,
    checker: checker
      ? { correct: checker.correct, total: checker.total, falsePositives: checker.falsePositives, missed: checker.missed }
      : null,
    verifiedFiles: manifest.files.length,
  };
}

function failureType(outcome) {
  if (outcome.unscored) return "infrastructure-or-unresolved-grading";
  if (outcome.countedReward === 1) return "pass";
  if (outcome.service !== "semantic-pass") return "service-failure";
  return outcome.checker
    ? "checker-content-defect (real false-accept/false-reject, not a shape crash)"
    : "checker-failure (aggregate unavailable; __proto__ shape crash confirmed in several sampled cases this session, not independently re-confirmed for every trial here)";
}

async function main() {
  assert(!existsSync(outputPath), "Reconciled summary already written");
  const preparation = read(preparationPath);
  const api = await import(pathToFileURL(join(campaign, "frozen-source/dist/index.js")));

  const mainEvents = jsonLines(join(campaign, "events.jsonl"));
  const contEvents = jsonLines(join(continuationRoot, "events.jsonl")).map((event) =>
    event.stage === "launch" || event.stage === "trial-result" || event.stage === "task-stopped-unscored"
      ? { ...event, id: event.id ?? event.task }
      : event,
  );
  const mainLaunches = mainEvents.filter((event) => event.stage === "launch");
  const contLaunches = contEvents.filter((event) => event.stage === "launch");

  // 1. Every dispatched/receipted slot maps to exactly one authorized launch, in exactly one ledger.
  const dispatchAudit = [];
  for (const slot of preparation.slots) {
    const runRoot = join(root, slot.runRoot);
    const dispatched = existsSync(join(runRoot, "DISPATCH-CLAIM"));
    const record = join(runRoot, "jobs/real-provider/records", `${slot.id}-attempt-1`);
    const receipted = existsSync(join(record, "dispatch.started"));
    const inMain = mainLaunches.filter((event) => event.id === slot.id && event.trial === slot.trial);
    const inCont = contLaunches.filter((event) => event.id === slot.id && event.trial === slot.trial);
    assert(inMain.length <= 1, `Duplicate launch in main ledger: ${slot.id} trial ${slot.trial}`);
    assert(inCont.length <= 1, `Duplicate launch in continuation ledger: ${slot.id} trial ${slot.trial}`);
    const total = inMain.length + inCont.length;
    if (dispatched || receipted) {
      assert(
        !(inMain.length && inCont.length),
        `Slot claimed by both ledgers: ${slot.id} trial ${slot.trial}`,
      );
      assert.equal(
        total,
        1,
        `Unknown or duplicate dispatch: ${slot.id} trial ${slot.trial} (main=${inMain.length}, continuation=${inCont.length}, dispatched=${dispatched}, receipted=${receipted})`,
      );
    } else {
      assert.equal(total, 0, `Launch event without a dispatch claim: ${slot.id} trial ${slot.trial}`);
    }
    dispatchAudit.push({
      id: slot.id,
      trial: slot.trial,
      target: slot.target,
      expectedTarget: providerForTrial(slot.trial),
      dispatched,
      receipted,
      ledger: inMain.length ? "main" : inCont.length ? "continuation" : null,
    });
    assert.equal(slot.target, providerForTrial(slot.trial), `Slot target disagrees with policy: ${slot.id} trial ${slot.trial}`);
  }

  // 2. Independently score every receipted slot: package identity, submission evidence, reward.
  const scored = new Map();
  for (const audit of dispatchAudit.filter((a) => a.receipted)) {
    const task = preparation.packages.find((t) => t.id === audit.id);
    const runRoot = join(
      root,
      preparation.slots.find((s) => s.id === audit.id && s.trial === audit.trial).runRoot,
    );
    const record = join(runRoot, "jobs/real-provider/records", `${audit.id}-attempt-1`);
    const outcome = score(record, task, api);
    scored.set(`${audit.id}/${audit.trial}`, { ...audit, outcome, record: relative(root, record) });
  }

  // 3. Apply the trial-2 reconciliation for verified-installation-repair (zero new model attempts).
  const trialTwoReconciliation = read(trialTwoReconciliationPath);
  assert.equal(trialTwoReconciliation.recoveredReward, 0);
  const vi2 = scored.get("verified-installation-repair/2");
  assert(vi2.outcome.unscored, "Reconciliation expects the original trial-2 slot to still show invalid-execution");
  scored.set("verified-installation-repair/2", {
    ...vi2,
    outcome: {
      unscored: false,
      countedReward: trialTwoReconciliation.recoveredReward,
      service: trialTwoReconciliation.regrade.service,
      checkerPassed: trialTwoReconciliation.regrade.checkerPassed,
      checker: null,
      reconciledFrom: relative(root, trialTwoReconciliationPath),
      note: "Original dispatch was a real model attempt; this regrade added zero new model attempts.",
    },
  });

  // 4. Replay each package's counted history through the unmodified policy, merging both ledgers
  //    in trial order, to get an authoritative final state and enforce provider/trial limits.
  const packageStates = {};
  for (const task of preparation.packages) {
    let state = initialTaskState(task.id);
    const trials = dispatchAudit
      .filter((a) => a.id === task.id && (a.dispatched || a.receipted))
      .sort((a, b) => a.trial - b.trial)
      .map((a) => scored.get(`${a.id}/${a.trial}`));
    for (const entry of trials) {
      assert(nextTrial(state), `Trial recorded after package already stopped: ${task.id} trial ${entry.trial}`);
      assert.equal(entry.trial, nextTrial(state).trial, `Out-of-order trial: ${task.id}`);
      assert.equal(entry.target, nextTrial(state).provider, `Provider disagrees with policy: ${task.id} trial ${entry.trial}`);
      const outcome = entry.outcome.unscored
        ? "unscored"
        : entry.outcome.countedReward === 1
          ? "pass"
          : "clean-fail";
      state = applyTrialOutcome(state, outcome);
    }
    packageStates[task.id] = state;
  }

  // 5. Ticket Consolidation correction: reward stays 1 historically; not certified as an audited clean pass.
  assert(existsSync(ticketAuditPath), "Ticket Consolidation audit doc is missing");
  const ticketAuditSha256 = hash(ticketAuditPath);
  const ticketState = packageStates["ticket-consolidation-repair"];
  assert.equal(ticketState.stopReason, "solver-pass");
  assert.equal(ticketState.attempts.at(-1).outcome, "pass");

  const trialReport = [];
  for (const task of preparation.packages) {
    for (const audit of dispatchAudit.filter((a) => a.id === task.id && a.receipted).sort((a, b) => a.trial - b.trial)) {
      const entry = scored.get(`${audit.id}/${audit.trial}`);
      const row = {
        id: audit.id,
        trial: audit.trial,
        target: audit.target,
        ledger: audit.ledger,
        record: entry.record,
        serviceOutcome: entry.outcome.unscored ? "unavailable (infrastructure incident)" : entry.outcome.service,
        checkerOutcome: entry.outcome.unscored ? "unavailable" : entry.outcome.checkerPassed ? "passed" : "failed",
        checkerDetail: entry.outcome.checker,
        countedReward: entry.outcome.unscored ? null : entry.outcome.countedReward,
        failureType: failureType(entry.outcome),
        reconciledFrom: entry.outcome.reconciledFrom ?? null,
      };
      if (audit.id === "ticket-consolidation-repair" && audit.trial === 4) {
        row.auditDisposition = "reproduced-checker-validation-false-positive";
        row.auditedAsCleanPass = false;
        row.auditDoc = relative(root, ticketAuditPath);
        row.auditDocSha256 = ticketAuditSha256;
        row.note =
          "Recorded reward remains 1 (historical, unchanged). A subsequent audit reproduced 24 new false-accept " +
          "cells plus 2 full-bank false accepts against the frozen task's pre-existing membership/schema rules; " +
          "the original 17-candidate bank did not expose them. This is a checker-validation-bank gap, not a " +
          "confirmed clean solution. Do not describe this trial as an audited clean pass.";
      }
      trialReport.push(row);
    }
  }

  const originalMainProviderAttempts = dispatchAudit.filter((a) => a.receipted && a.ledger === "main").length;
  const continuationProviderAttempts = dispatchAudit.filter((a) => a.receipted && a.ledger === "continuation").length;

  const summary = {
    schemaVersion: 1,
    at: new Date().toISOString(),
    purpose:
      "Read-only reconciliation across the main successor-adaptive-trials campaign ledger (blocked from " +
      "producing FINAL.json by an 'Orphan slot dispatch' assertion caused by the separately authorized " +
      "verified-installation-repair continuation sharing the same prepared slot directories) and that " +
      "continuation's own ledger. This file is not, and does not replace, the reviewed controller's FINAL.json.",
    controllerError: {
      path: relative(root, join(campaign, "CONTROLLER-ERROR.json")),
      preserved: existsSync(join(campaign, "CONTROLLER-ERROR.json")),
      cause:
        "inspectCampaign() rescans all 30 prepared slots regardless of which per-package loop owns them; " +
        "verified-installation-repair trials 3-6 carried real dispatch claims/receipts from the continuation " +
        "ledger with no matching launch event in the main ledger, which the controller's own integrity check " +
        "(by design) treats as an orphan dispatch.",
    },
    dispatchIntegrity: {
      totalSlots: preparation.slots.length,
      dispatched: dispatchAudit.filter((a) => a.dispatched).length,
      receipted: dispatchAudit.filter((a) => a.receipted).length,
      ownedByMainLedger: dispatchAudit.filter((a) => a.ledger === "main").length,
      ownedByContinuationLedger: dispatchAudit.filter((a) => a.ledger === "continuation").length,
      everyDispatchHasExactlyOneAuthorizedLaunch: true,
      noUnknownOrDuplicateDispatches: true,
    },
    providerAttempts: {
      main: originalMainProviderAttempts,
      continuation: continuationProviderAttempts,
      total: originalMainProviderAttempts + continuationProviderAttempts,
      trialTwoRegradeCountedAsNewAttempt: false,
    },
    packages: preparation.packages.map((task) => ({
      id: task.id,
      version: task.version,
      state: packageStates[task.id],
    })),
    trialTwoReconciliation: {
      path: relative(root, trialTwoReconciliationPath),
      sha256: hash(trialTwoReconciliationPath),
    },
    trials: trialReport,
    note:
      "Every trial above separates serviceOutcome from checkerOutcome. A trial with serviceOutcome " +
      "'semantic-pass' and checkerOutcome 'failed' is a checker-validation failure, not a failure to " +
      "implement the service. capacity-maintenance-repair and compatible-rollout-repair each reached six " +
      "counted trials with the service passing in all six; only the required checker failed in each.",
  };
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(summary, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(summary, null, 2));
}

await main();
