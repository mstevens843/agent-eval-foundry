// Reproducible inspection ledger; historical decisions remain unchanged.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const hash = (b) => createHash("sha256").update(b).digest("hex");
const selections = {
  "worker-rebalance-partition-callback-dedup": "partition-index-repair",
  "replica-lag-stale-read-reconciliation": "causal-replica-repair",
  "deployment-rollback-partial-effects": "partial-release-repair",
  "stale-crm-ticket-automation": "ticket-consolidation-repair",
  "crm-pagination-locator-resilience": "ticket-consolidation-repair",
  "crm-assignment-pagination-drop": "ticket-consolidation-repair",
  "tool-result-partial-error": "ticket-consolidation-repair",
  "tool-result-pagination-race": "ticket-consolidation-repair",
  "audit-truth-financial-workflow": "temporal-capacity-repair",
};
const sources = [
  ["data/portfolio-dispositions.json", "families", "current construction inventory"],
  ["data/candidate-pool.json", null, "retained proposal, not solving evidence"],
  ["data/retired-candidates.json", "retired", "uncalibrated prior-based retirement"],
  ["data/row-five-candidates.json", null, "construction hypothesis, not model trial"],
  ["data/research-task-family-candidates.json", "families20", "historical sourced research argument"],
  ["data/candidates-klavis.json", null, "historical proposal registry"],
  ["data/candidates-new.json", null, "historical proposal registry"],
  ["data/candidates-checker-required.json", null, "checker construction proposal"],
  ["data/phase-15-candidate-queue.json", "candidates", "bounded queue/probe/reviewer evidence"],
  ["data/phase-16-candidate-queue.json", "candidates", "contract/probe/reviewer evidence"],
  ["data/phase-19-candidate-assessments.json", "rows", "retained assessment, original corpus unavailable"],
];
const records = new Map(),
  coverage = [];
for (const [path, field, kind] of sources) {
  const bytes = readFileSync(path),
    raw = JSON.parse(bytes);
  const entries = field ? raw[field] : raw;
  if (!Array.isArray(entries)) throw Error("inventory schema: " + path + " " + Object.keys(raw));
  coverage.push({
    path,
    sha256: hash(bytes),
    entries: entries.length,
    reviewDepth: "full identity/decision fields; targeted deep review of finalists",
  });
  entries.forEach((entry, index) => {
    const id = entry.familyId ?? entry.candidateId ?? entry.id;
    if (!id) throw Error("missing identity: " + path + " " + index);
    const record = records.get(id) ?? { id, sources: [] };
    record.sources.push({
      path,
      sha256: hash(bytes),
      locator: field ? field + "[" + index + "]" : "[" + index + "]",
      kind,
      historicalDecision:
        entry.disposition ??
        entry.verdict ??
        entry.gate ??
        entry.reason ??
        entry.why ??
        entry.status ??
        "No direct decision in this record",
      retainedRecord: entry,
    });
    records.set(id, record);
  });
}
const special = {
  "worker-rebalance-partition-callback-dedup": {
    decisionAssessment:
      "Narrower conclusion: both readers rejected an unbuilt packet. No recorded solving trial. Public-task duplication objection remains supported for the old shape.",
    opportunity:
      "Index version ordering and contiguous checkpoint prefix across ownership epochs; original non-payment service with zero duplicate tolerance.",
    counterargument:
      "Fencing and prefix accounting are familiar algorithms. A compact legal implementation is acceptable; no hardness claim.",
  },
  "rollback-reactivates-dormant-defect": {
    decisionAssessment:
      "Disputed reader evidence: OpenAI kill vs Anthropic promote. Missing necessary-change proof and legal fleet-wide repair were not a measured solve.",
    opportunity: "Actual dormant-code deployment repair could be legitimate.",
    counterargument:
      "Existing compatible-rollout package already covers attestation/restart/coverage; reserve, not a fifth renamed rollout.",
  },
  "replica-lag-stale-read-reconciliation": {
    decisionAssessment:
      "Old duplicate-kill supports rejecting stale-read/role-check repetition. It does not evaluate a causal sibling/tombstone join.",
    opportunity:
      "Offline causal multi-value state with retained removal context; not a regrade of the primary/standby proposal.",
    counterargument:
      "Novel descendant, not recovered evidence of hardness. A standard causal join may solve it rapidly.",
  },
  "deployment-rollback-partial-effects": {
    decisionAssessment: "Research shape was not a completed protected professional graph reconciler.",
    opportunity:
      "Plan dependency closure for removal and recreation without changing unrelated shared resources.",
    counterargument: "Graph difference/topological sorting is a strong simple legal strategy.",
  },
  "stale-crm-ticket-automation": {
    decisionAssessment:
      "Retained research; inherited classifier and pagination folklore do not evaluate this implementation.",
    opportunity:
      "Complete snapshot population, compound identities, partial batch responses and conditional preservation.",
    counterargument: "Reading every page and retrying one row at a time is valid and may be easy.",
  },
  "audit-truth-financial-workflow": {
    decisionAssessment: "No complete bitemporal reporting package was retained in the existing portfolio.",
    opportunity:
      "Nonfinancial capacity reporting separates revision time, effective intervals, populations and exact arithmetic.",
    counterargument:
      "A short exact interval algorithm is valid. More record volume alone does not establish difficulty.",
  },
};
for (const candidate of ["worker-rebalance-partition-callback-dedup", "rollback-reactivates-dormant-defect"])
  for (const provider of ["openai", "anthropic"]) {
    const path =
      "data/phase-19-candidate-review-runs/" + candidate + "/" + provider + "/normalized-review.json";
    const bytes = readFileSync(path),
      review = JSON.parse(bytes);
    records
      .get(candidate)
      .sources.push({
        path,
        sha256: hash(bytes),
        locator: "verdict/rationale",
        kind: "independent packet review, not a solving trial",
        historicalDecision: review.verdict,
        retainedRecord: review,
      });
    coverage.push({ path, sha256: hash(bytes), entries: 1, reviewDepth: "full" });
  }
const result = [...records.values()]
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((record) => {
    const current = record.sources.find((s) => s.kind === "current construction inventory");
    const invalid = /hidden-dependency/.test(record.id),
      integrity = /verifier|reward-hack|self-authored-verification|tool-shim/.test(record.id);
    const selected = selections[record.id];
    const disposition = selected
      ? "build-descendant"
      : invalid
        ? "defer-unfair-as-written"
        : integrity
          ? "infrastructure-only"
          : record.id === "rollback-reactivates-dormant-defect" ||
              /restore-proven|permission-boundary/.test(record.id)
            ? "reserve"
            : current
              ? current.retainedRecord.disposition
              : "retain-unmeasured-research-or-merge-concepts";
    return {
      ...record,
      disposition,
      packageId: selected ?? null,
      observationValidity: record.sources.map((s) => s.kind),
      decisionAssessment:
        special[record.id]?.decisionAssessment ??
        (record.sources.some((s) => s.kind === "uncalibrated prior-based retirement")
          ? "Prior-only exclusion is not empirical solve evidence; do not infer the opposite. Retain actual rationale and screen for fair construction/duplication."
          : "Retain the scoped historical observation; no broad task-family hardness conclusion added."),
      opportunity:
        special[record.id]?.opportunity ??
        current?.retainedRecord.leverage ??
        "Concept reserve; requires a distinct complete public contract and protected implementation before reconsideration.",
      counterargument:
        special[record.id]?.counterargument ??
        (invalid
          ? "Unavailable requirements cannot be used for difficulty."
          : integrity
            ? "Evaluation infrastructure is not another professional task."
            : "A renamed existing solution or short classifier is not an additional substantial package."),
      missingEvidence: [
        "No new target-model solving trial in Prompt 9",
        "Independent expert-time review not performed",
      ],
    };
  });
const output = process.argv[2] ?? "data/next-portfolio-opportunity-audit.json";
writeFileSync(
  output,
  JSON.stringify(
    {
      schemaVersion: 1,
      createdAt: "2026-09-07",
      providerCallsMade: 0,
      base: "4b974a21aba09a7bb434d20b2ed1a6a0b9dd2135",
      coverage,
      uniqueCandidates: result.length,
      registeredFamilies: 22,
      phase24:
        "No dedicated Phase 24 source/data/report paths recovered; prior broad-hardening claims are not assumed implemented.",
      limits: [
        "Original Phase 19 research corpus bytes still unavailable",
        "Not every historical transcript was reread; source/decision inventory covers the opportunity pool and finalist reviews were read fully.",
        "No preserved unknown submission was executed in the trusted process; no historical regrade was needed to correct a packet-review vs solving-trial category error.",
      ],
      candidates: result,
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
console.log(JSON.stringify({ output, candidates: result.length, sources: coverage.length }));
