import { generateKeyPairSync, sign } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { adversarialEvidenceScope, loadAdversarialAttackRecords } from "../src/adversarial-audit/records.js";
import { publishEvidence, regularTree, reserveDirectory, writeEvidence } from "../src/execution/artifacts.js";
import { outboxFinding, outboxViews, portfolioTransfers } from "../src/learning/cases.js";
import { learningCommand, privateLearningOutput } from "../src/learning/command.js";
import {
  type FindingInput,
  type FindingRevision,
  appendFinding,
  assessFindings,
  assessTransfer,
  findingDigest,
  loadFinding,
  parseFinding,
} from "../src/learning/findings.js";
import { inspectRun } from "../src/learning/inspection.js";
import type { TrialView } from "../src/learning/inspection.js";
import { evidenceText, renderTrial } from "../src/learning/render.js";
import {
  type CohortEntry,
  type ProductionCandidate,
  cohortMetrics,
  selectPackages,
} from "../src/learning/selection.js";
import { appendTransfer, assessStoredTransfers, loadTransfers } from "../src/learning/transfers.js";
import type { PackageChecks } from "../src/packages/policy.js";
import {
  COMPONENTS,
  type PackageInput,
  buildPackageRecord,
  canonicalJson,
  publishPackage,
  sha256,
} from "../src/packages/record.js";

const ROOT = resolve(import.meta.dirname, "..");
const temporary: string[] = [];
const temp = () => {
  const path = mkdtempSync(join(tmpdir(), "foundry-learning-"));
  temporary.push(path);
  return path;
};
afterAll(() => {
  for (const dir of temporary) rmSync(dir, { recursive: true });
});
const finding = outboxFinding(ROOT);
const views = outboxViews(ROOT);
function required<T>(value: T | undefined): T {
  if (value === undefined) throw Error("Missing test fixture");
  return value;
}
const firstView = required(views[0]);
const firstSource = required(finding.sources[0]);
const firstClaim = required(finding.claims[0]);
const learning = assessFindings(ROOT, [finding]);
const revision = (r: FindingRevision, patch: Partial<FindingInput>): FindingRevision => {
  const { digest, ...input } = r;
  const body = { ...input, ...patch };
  return parseFinding({ ...body, digest: findingDigest(body) });
};

describe("preserved trial inspection", () => {
  it("opens all six zeros with actual checking source and qualified attribution", () => {
    expect(views.map((v) => v.observation.reward)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(views.map((v) => v.adjudication.label)).toEqual([
      "unlabelled",
      ...Array(5).fill("spec-underspecified"),
    ]);
    expect(views.map((v) => v.observation.failedScenarios)).toEqual([2, 13, 11, 11, 11, 11]);
    expect(views.every((v) => v.checkers.length > 0 && v.timeline.length > 0)).toBe(true);
    expect(views.every((v) => !v.eligibility.capability && !v.eligibility.exactTarget)).toBe(true);
    expect(
      views[5]?.checkers.some((c) => /\(\s*['"]ACKED['"]\s*,\s*['"]REVOKED['"]\s*\)/.test(c.source)),
    ).toBe(true);
    expect(views[0]?.failures.map((f) => f.scenarioId)).toEqual([
      "crash-after-tool-1013-16",
      "hostile-mix-1009-12",
    ]);
    expect(
      views.every((v) =>
        v.failures.every((f) => f.observation.sha256 && f.visibleClauses.length && f.missing.length),
      ),
    ).toBe(true);
  });
  it("links records, code, visible clauses, inline scripts and logged outputs without changing source", async () => {
    const before = views.map((v) => v.sourceDigest);
    for (const v of views) {
      const text = renderTrial(v);
      expect(text).toContain("verifier-output.json");
      expect(text).toContain("Visible checking source");
      expect(text).toContain("not causal proofs");
      expect(text).toContain(v.sourceDigest);
    }
    const source = await learningCommand(ROOT, ["outbox-sources"]);
    expect((source as { sourceDigest: string }[]).map((v) => v.sourceDigest)).toEqual(before);
    expect(outboxViews(ROOT).map((v) => v.sourceDigest)).toEqual(before);
  });
  it.each(["mp-claude-3", "mp-claude-r1", "mp-codex-3"])(
    "host-caused %s stays an observation, never capability",
    (id) => {
      const v = inspectRun(join(ROOT, "trials/prompt-injection-memory-poisoning", id));
      expect(v.adjudication.label).toBe("harness-contract-violation");
      expect(v.eligibility.capability).toBe(false);
      const forged = revision(finding, {
        sources: [
          {
            id,
            runId: id,
            directory: `trials/prompt-injection-memory-poisoning/${id}`,
            sourceDigest: v.sourceDigest,
            packageDigest: v.identity.packageDigest,
            pointers: [],
          },
        ],
        claims: [{ ...firstClaim, sources: [id], status: "capability-supported" }],
        corrections: [],
      });
      expect(assessFindings(ROOT, [forged]).claims[0]?.capabilitySupport).toBe(false);
    },
  );
  it("a clean solve, missing effort and provider infrastructure outcome stay separate", () => {
    const clean = inspectRun(join(ROOT, "trials/prompt-injection-memory-poisoning/mp-codex-1"));
    expect(clean.observation.failedScenarios).toBe(0);
    expect(clean.eligibility.exactTarget).toBe(false);
    const ui = inspectRun(join(ROOT, "trials/ui-replay-live-dom/live-dom-2026-08-o2"));
    expect(ui.identity.requested).toMatchObject({ effort: null });
    expect(ui.eligibility.exactTarget).toBe(false);
    const infra = inspectRun(join(ROOT, "trials/prompt-injection-memory-poisoning/mp-gemini-1"));
    expect(infra.observation.status).toBe("invalid-execution");
    expect(infra.eligibility.capability).toBe(false);
  });
  it.each(["simulation", "regrade", "refused"])("%s cannot masquerade as an exact target attempt", (kind) => {
    const p = temp();
    const r = reserveDirectory(p, "record");
    writeEvidence(join(r.stage, "result.json"), {
      schemaVersion: 1,
      id: "record",
      kind: kind === "regrade" ? "linked-regrade" : "execution",
      evidenceClass: kind === "simulation" ? "simulation" : "real-provider",
      outcome: kind === "refused" ? "refused" : "semantic-fail",
      adjudication: "capability",
    });
    writeEvidence(join(r.stage, "grade.json"), {
      reward: 0,
      evaluation: { complete: true, status: "semantic-fail" },
      cells: [{ scenarioId: "s", failed: ["completion"] }],
    });
    writeEvidence(join(r.stage, "capture.json"), { status: kind === "refused" ? "refused" : "completed" });
    publishEvidence(r.stage, r.destination, { kind });
    const view = inspectRun(r.destination);
    expect(view.eligibility.exactTarget).toBe(false);
    expect(view.eligibility.capability).toBe(false);
    if (kind !== "refused") expect(view.observation.newAgentAttempts).toBe(0);
  });
  it("changed source/adjudication invalidates findings and hashes without deleting observation", () => {
    const root = temp();
    const rel = firstSource.directory;
    mkdirSync(join(root, rel, ".."), { recursive: true });
    cpSync(join(ROOT, rel), join(root, rel), { recursive: true });
    const only = revision(finding, {
      sources: [firstSource],
      claims: [{ ...firstClaim, sources: [firstSource.id] }],
      corrections: [],
    });
    const a = assessFindings(root, [only]);
    const cause = JSON.parse(readFileSync(join(root, rel, "root-cause.json"), "utf8"));
    cause.rationale += " Explicit local regression correction, not historical corpus mutation.";
    writeFileSync(join(root, rel, "root-cause.json"), JSON.stringify(cause));
    const b = assessFindings(root, [only]);
    expect(a.digest).not.toBe(b.digest);
    expect(b.claims[0]?.effectiveStatus).toBe("needs-revalidation");
    expect(inspectRun(join(root, rel)).observation.reward).toBe(0);
  });
  it("refuses artifact links/special files and never writes analysis into solver exports", () => {
    const p = temp();
    symlinkSync(
      join(ROOT, "trials/durable-approval-outbox/cc267-claude-1/result.json"),
      join(p, "result.json"),
    );
    expect(() => inspectRun(p)).toThrow("EVIDENCE_SPECIAL_FILE");
    expect(() => privateLearningOutput(ROOT, "tasks/browser-replay-repair/public/findings")).toThrow(
      "PRIVATE",
    );
    expect(privateLearningOutput(ROOT, ".local/learning/case")).toContain(".local/learning/case");
    expect(evidenceText("<script>alert(1)</script> [click](javascript:bad)")).not.toContain("<script>");
  });
});

describe("claim lifecycle and corrections", () => {
  it("seeded primary cases reproduce without ignored author notes", async () => {
    expect(loadFinding(join(ROOT, "findings/cases"), finding.findingId)[0]?.digest).toBe(finding.digest);
    const text = await learningCommand(ROOT, ["case", finding.findingId]);
    expect(text).toContain("cc267-codex-3/transcript.txt");
    expect(text).toContain("spec-underspecified");
    const memory = await learningCommand(ROOT, ["assess", "memory-host-contract-correction"]);
    expect(
      (memory as { claims: { capabilitySupport: boolean }[] }).claims.every((c) => !c.capabilitySupport),
    ).toBe(true);
  });
  it("validates claim-level limits and anonymous/malformed promotion", () => {
    const c = learning.claims.find((c) => c.claimId === "fair-hardness");
    expect(c?.effectiveStatus).toBe("disputed");
    const promoted = revision(finding, {
      review: {
        kind: "human",
        id: "agent-filled-human-name",
        evidence: "a claim, not verified review",
        signature: null,
      },
      claims: finding.claims.map((c) => ({ ...c, status: "capability-supported" })),
    });
    const view = assessFindings(ROOT, [promoted]);
    expect(view.claims.every((c) => !c.capabilitySupport && !c.humanReviewed)).toBe(true);
    expect(() => parseFinding({ ...finding, digest: "0".repeat(64) })).toThrow("FINDING_DIGEST");
  });
  it("publishes exclusive revision chains and rejects stale writers", () => {
    const store = temp();
    const { digest: _digest, ...input } = finding;
    appendFinding(store, input);
    const second = {
      ...input,
      revision: 2,
      previous: finding.digest,
      claims: input.claims.map((c) => ({ ...c, status: "withdrawn" as const })),
    };
    const r2 = appendFinding(store, second);
    expect(loadFinding(store, finding.findingId).map((r) => r.digest)).toEqual([finding.digest, r2.digest]);
    expect(() => appendFinding(store, second)).toThrow("FINDING_CONCURRENT");
    expect(readFileSync(join(store, finding.findingId, "000001.json"), "utf8")).toContain(finding.digest);
  });
  it("withdrawal invalidates dependent views and selection cache identity while preserving raw records", () => {
    const dependent = revision(finding, {
      findingId: "dependent",
      claims: [
        {
          ...firstClaim,
          id: "transfer",
          dependencies: [
            { findingId: finding.findingId, claimId: "engineering-lessons", revisionDigest: finding.digest },
          ],
        },
      ],
    });
    const a = assessFindings(ROOT, [finding, dependent]);
    const next = revision(finding, {
      revision: 2,
      previous: finding.digest,
      claims: finding.claims.map((c) => (c.id === "engineering-lessons" ? { ...c, status: "withdrawn" } : c)),
    });
    const b = assessFindings(ROOT, [next, dependent]);
    expect(a.digest).not.toBe(b.digest);
    expect(b.claims.find((c) => c.findingId === "dependent")?.effectiveStatus).toBe("needs-revalidation");
    expect(selectPackages([], a, { workInProgress: 2, portfolioLimit: 5 }).digest).not.toBe(
      selectPackages([], b, { workInProgress: 2, portfolioLimit: 5 }).digest,
    );
    expect(outboxViews(ROOT).map((v) => v.observation.reward)).toEqual([0, 0, 0, 0, 0, 0]);
  });
  it("keeps a missing source unknown rather than promoting its stored status", () => {
    const view = assessFindings(temp(), [finding]);
    expect(view.claims.every((c) => c.effectiveStatus === "source-unavailable")).toBe(true);
  });
});

describe("explicit policy doubles, never persisted as real model evidence", () => {
  it("a signed correction removes genuine support from dependencies, rankings and transfer views", () => {
    const c = candidate("qualified-fixture");
    const digest = required(c.policy.snapshot).record.digest;
    const view: TrialView = {
      ...firstView,
      familyId: c.id,
      kind: "execution",
      identity: { ...firstView.identity, packageDigest: digest, fullPackageVerified: true, current: true },
      observation: { ...firstView.observation, evidenceClass: "real-provider" },
      adjudication: { ...firstView.adjudication, familyId: c.id, label: "unlabelled" },
      eligibility: { capability: false, exactTarget: false, blockers: ["adjudication:unlabelled"] },
    };
    const key = generateKeyPairSync("ed25519");
    const source = { ...firstSource, packageDigest: digest };
    let supported = revision(finding, {
      sources: [source],
      corrections: [],
      claims: [
        {
          ...firstClaim,
          sources: [source.id],
          status: "capability-supported",
          adjudications: [{ sourceId: source.id, record: { ...view.adjudication, label: "capability" } }],
        },
      ],
      review: {
        kind: "human",
        id: "fixture-reviewer",
        evidence: "Synthetic review regression, not a claim about historical models",
        signature: null,
      },
    });
    supported = {
      ...supported,
      review: {
        ...required(supported.review ?? undefined),
        signature: sign(null, Buffer.from(supported.digest), key.privateKey).toString("base64"),
      },
    };
    const options = {
      inspect: () => view,
      trustedReviewers: {
        "fixture-reviewer": key.publicKey.export({ type: "spki", format: "pem" }).toString(),
      },
    };
    const a = assessFindings(ROOT, [supported], options);
    expect(a.claims[0]?.exactTargetSupport).toBe(true);
    c.findings = [{ findingId: supported.findingId, claimId: firstClaim.id }];
    c.trials = [{ ...view, eligibility: { capability: true, exactTarget: true, blockers: [] } }];
    c.triagedSourceDigests = [view.sourceDigest];
    const before = selectPackages([c], a, { workInProgress: 1, portfolioLimit: 1 });
    expect(before.decisions[0]?.action).toBe("deep-investigation");
    expect(before.decisions[0]?.supports).toHaveLength(1);
    const child = revision(supported, {
      findingId: "dependent-proof",
      review: { kind: "automated", id: "fixture", evidence: "test", signature: null },
      claims: [
        {
          ...required(supported.claims[0]),
          adjudications: [],
          dependencies: [
            { findingId: supported.findingId, claimId: firstClaim.id, revisionDigest: supported.digest },
          ],
        },
      ],
    });
    const current = { ...view, eligibility: { capability: true, exactTarget: true, blockers: [] } };
    expect(
      assessFindings(ROOT, [supported, child], { ...options, inspect: () => current }).claims.every(
        (x) => x.capabilitySupport,
      ),
    ).toBe(true);
    const withdrawn = revision(supported, {
      revision: 2,
      previous: supported.digest,
      review: null,
      claims: [{ ...required(supported.claims[0]), status: "withdrawn" }],
    });
    const b = assessFindings(ROOT, [withdrawn, child], options);
    expect(b.claims.every((x) => !x.capabilitySupport)).toBe(true);
    const after = selectPackages([c], b, { workInProgress: 1, portfolioLimit: 1 });
    expect(after.decisions[0]?.supports).toHaveLength(0);
    expect(after.digest).not.toBe(before.digest);
    const mismatch = assessFindings(ROOT, [supported], {
      ...options,
      inspect: () => ({
        ...view,
        eligibility: { ...view.eligibility, blockers: ["adjudication:unlabelled", "effort-mismatch"] },
      }),
    });
    expect(mismatch.claims[0]?.exactTargetSupport).toBe(false);
    expect(assessFindings(ROOT, [supported], { inspect: () => view }).claims[0]?.humanReviewed).toBe(false);
  });
  it("exposure cannot be reset by revising or renaming a transfer", () => {
    const c = candidate("browser-replay-repair", "strong", "ui-replay-browser-backed");
    const t = required(portfolioTransfers(finding, [required(c.policy.snapshot)])[0]);
    const store = temp();
    const first = appendTransfer(store, t, null);
    expect(() => appendTransfer(store, { ...t, exposures: [] }, first.digest)).toThrow("EXPOSURE_RESET");
    expect(() => appendTransfer(store, t, null)).toThrow("HISTORY_BROKEN");
    appendTransfer(
      store,
      {
        ...t,
        id: `${t.id}-alias`,
        exposures: [
          { at: "2026-09-07T00:00:00Z", role: "held-out-evaluation", evidence: "synthetic policy fixture" },
        ],
      },
      null,
    );
    expect(
      assessStoredTransfers(store, learning).every(
        (x) => x.assessment.heldOutContaminated && !x.assessment.provenHardness,
      ),
    ).toBe(true);
    expect(loadTransfers(store)).toHaveLength(2);
  });
  it("private destinations reject symlink ancestors", () => {
    const root = temp();
    mkdirSync(join(root, ".local"));
    symlinkSync(temp(), join(root, ".local/learning"));
    expect(() => privateLearningOutput(root, ".local/learning/published")).toThrow("SYMLINK");
  });
});

const CHECKS: PackageChecks = {
  reference: true,
  positiveWork: true,
  nearMissControls: true,
  contractReviewed: true,
  publicPackageComplete: true,
  protectedGrading: true,
  localIntegrityControls: true,
  boundedSolveEvidence: true,
  destinationChecks: false,
  unresolvedAmbiguities: 0,
  unrepairedBypasses: 0,
};
function candidate(
  id: string,
  promise: ConstructionReviewPromise = "strong",
  familyId = id,
): ProductionCandidate {
  const root = temp();
  const input: PackageInput = {
    id,
    version: "1",
    familyId,
    kind: "professional-package",
    dependencies: { strategy: "explicit-fixture", unresolved: [] },
    files: Object.fromEntries(
      COMPONENTS.map((c) => [c, [{ path: `${c}.txt`, bytes: Buffer.from(c + id) }]]),
    ) as unknown as PackageInput["files"],
  };
  return {
    id,
    policy: { snapshot: publishPackage(join(root, "store"), buildPackageRecord(input)), checks: CHECKS },
    review: {
      promise,
      professionalValue: "supported",
      rationale: "Explicit simulation-only policy review",
      evidence: ["local fixture"],
      uncertainty: ["No empirical probability"],
      remainingHours: 10,
      reuse: "implemented",
      solution: {
        domain: id,
        outcome: "complete requested work",
        strategy: "one coherent mechanism",
        invariantInteraction: "complete safely",
        infrastructure: ["collector"],
      },
    },
    findings: [],
    trials: [],
    triagedSourceDigests: [],
    active: false,
    retired: false,
  };
}
type ConstructionReviewPromise = ProductionCandidate["review"]["promise"];
describe("package-first selection and transfer", () => {
  it("reviews one-axis and repaired stale-history packages, repairs invalid many-axis packages", () => {
    const one = candidate("one-axis");
    const invalid = candidate("many-axis");
    invalid.policy = { ...invalid.policy, checks: { ...CHECKS, unresolvedAmbiguities: 1 } };
    const stale = candidate("repaired-current");
    stale.trials = [firstView];
    const result = selectPackages([one, invalid, stale], learning, { workInProgress: 3, portfolioLimit: 5 });
    expect(result.decisions.find((d) => d.id === one.id)?.action).toBe("eligibility-review");
    expect(result.decisions.find((d) => d.id === invalid.id)?.action).toBe("repair");
    expect(result.decisions.find((d) => d.id === stale.id)?.action).toBe("eligibility-review");
  });
  it("strong complete construction outranks a weak cheap screen; WIP is bounded", () => {
    const weak = candidate("a-cheap", "weak");
    const strong = candidate("z-strong");
    weak.review.remainingHours = 0;
    strong.review.remainingHours = 20;
    const result = selectPackages([weak, strong], learning, { workInProgress: 1, portfolioLimit: 2 });
    expect(result.decisions[0]?.id).toBe(strong.id);
    expect(result.decisions[1]?.action).toBe("hold");
    expect(result.sensitivity).toHaveLength(8);
  });
  it("an easy current solve gets brief triage, never a deep causal campaign", () => {
    const c = candidate("easy");
    c.trials = [
      {
        ...firstView,
        identity: { ...firstView.identity, packageDigest: required(c.policy.snapshot).record.digest },
        observation: {
          ...firstView.observation,
          status: "semantic-pass",
          reward: 1,
          evidenceClass: "real-provider",
        },
      },
    ];
    expect(selectPackages([c], learning, { workInProgress: 1, portfolioLimit: 1 }).decisions[0]?.action).toBe(
      "brief-triage",
    );
  });
  it("same-essential-repair reviews limit duplicates; common infrastructure alone does not", () => {
    const a = candidate("left");
    const b = candidate("right");
    const review = {
      leftDigest: required(a.policy.snapshot).record.digest,
      rightDigest: required(b.policy.snapshot).record.digest,
      decision: "same-essential-repair" as const,
      reviewer: "local fixture",
      evidence: ["compared solution outlines"],
      explanation: "Only names changed",
    };
    expect(
      selectPackages([a, b], learning, { workInProgress: 2, portfolioLimit: 2 }).decisions.every(
        (d) => d.selected,
      ),
    ).toBe(true);
    expect(
      selectPackages([a, b], learning, {
        workInProgress: 2,
        portfolioLimit: 2,
        diversity: [review],
      }).decisions.filter((d) => d.selected),
    ).toHaveLength(1);
  });
  it("specific and conceptual transfers have exact target identity and cannot launder disputed support", () => {
    const input: PackageInput = {
      id: "browser-replay-repair",
      familyId: "ui-replay-browser-backed",
      version: "1",
      kind: "professional-package",
      dependencies: { strategy: "explicit-fixture", unresolved: [] },
      files: Object.fromEntries(
        COMPONENTS.map((k) => [k, [{ path: `${k}.txt`, bytes: Buffer.from(k) }]]),
      ) as unknown as PackageInput["files"],
    };
    const target = publishPackage(join(temp(), "store"), buildPackageRecord(input));
    const transfers = portfolioTransfers(finding, [target]);
    expect(transfers).toHaveLength(3);
    for (const t of transfers) {
      const v = assessTransfer(t, learning);
      expect(v.provenHardness).toBe(false);
      expect(v.untouchedHeldOut).toBe(false);
      expect(t.target.packageDigest).toBe(target.record.digest);
    }
    const t = required(transfers[2]);
    t.exposures.push({
      at: "2026-09-07T00:00:00Z",
      role: "held-out-evaluation",
      evidence: "Already inspected test",
    });
    expect(assessTransfer(t, learning).heldOutContaminated).toBe(true);
  });
  it("historical audit counts remain recorded but never support a different current package", () => {
    const row = required(
      loadAdversarialAttackRecords(ROOT).find((r) => r.record.attackId.includes("checker-required")),
    );
    const scope = adversarialEvidenceScope(row, "different-current");
    expect(scope.originalCounts).toBe(true);
    expect(scope.currentSupport).toBe(false);
    expect(scope.historicalPackageVerified).toBe(false);
  });
});

describe("cohort and cost denominators", () => {
  const entry: CohortEntry = {
    candidateId: "candidate",
    packageDigest: sha256("version"),
    enteredAt: "2026-09-06T00:00:00Z",
    validAt: "2026-09-06T01:00:00Z",
    promisingAt: null,
    qualifiedAt: null,
    diagnosisAt: null,
    outcomeAt: null,
    evidence: ["explicit simulated cohort"],
    reworkHours: null,
    costs: { authorUsd: null, reviewerUsd: null, providerUsd: 0, computeUsd: 1, storageUsd: null },
    attempts: [
      { id: "sim", kind: "simulation", outcome: "invalid", source: "local fixture" },
      { id: "regrade", kind: "regrade", outcome: "valid", source: "local fixture" },
    ],
    solutionCluster: null,
  };
  it("retains unknown costs, no-attempt denominators and package-version units", () => {
    const v = cohortMetrics("test", "2026-09-06T00:00:00Z", "2026-09-06T23:59:00Z", [entry]);
    expect(v.candidateToValid.rate).toBe(1);
    expect(v.validToPromising.rate).toBe(0);
    expect(v.invalidExecution.rate).toBe(null);
    expect(v.costs.authorUsd?.total).toBe(null);
    expect(v.timeToValidMs).toEqual([3600000]);
    expect(v.forecast).toBe(null);
  });
  it("rejects duplicate versions, attempts and impossible chronology", () => {
    const run = (entries: CohortEntry[]) =>
      cohortMetrics("test", "2026-09-06T00:00:00Z", "2026-09-06T23:59:00Z", entries);
    expect(() => run([entry, entry])).toThrow("COHORT_IDENTITY");
    expect(() => run([{ ...entry, qualifiedAt: "2026-09-06T02:00:00Z" }])).toThrow("COHORT_EVENT_ORDER");
  });
});
