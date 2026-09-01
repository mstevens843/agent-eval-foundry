import { describe, expect, it } from "vitest";
import { loadRegistry } from "../src/foundry/load.js";
import { auditHumanReadinessForFamilies } from "../src/human-solvability/readiness.js";
import {
  humanEvidenceForFamilies,
  loadHumanReviewRecords,
  summarizeHumanEvidence,
} from "../src/human-solvability/records.js";
import { renderHumanReadinessReport, renderHumanSolvabilityReport } from "../src/human-solvability/report.js";
import type { HumanReviewRecord } from "../src/human-solvability/types.js";
import {
  assertHumanReviewRecordCounts,
  assertHumanSolvabilityClaim,
  humanReviewFailures,
  isCleanHumanSolve,
} from "../src/human-solvability/validate.js";
import { type FamilyEvidence, assessFamily, renderShipReport } from "../src/reports/ship-report.js";

const ROOT = new URL("..", import.meta.url).pathname;
const PIC = "prompt-injection-containment";
let cachedHash: string | null = null;

const currentHash = (): string => {
  if (cachedHash !== null) return cachedHash;
  const hash = auditHumanReadinessForFamilies(ROOT).find((a) => a.familyId === PIC)?.packageHash;
  if (hash === null || hash === undefined)
    throw new Error("prompt-injection-containment package hash missing");
  cachedHash = hash;
  return cachedHash;
};

const cleanRecord = (hash = currentHash()): HumanReviewRecord => ({
  reviewId: "clean-human-fixture",
  familyId: PIC,
  solver: {
    id: "independent-human-1",
    profile: "independent engineer with no prior source access",
    anonymized: true,
  },
  relationToAuthor: "independent",
  status: "clean-pass",
  countsAsCleanRoomSolve: true,
  reviewedChallengeHash: hash,
  gradedChallengeHash: hash,
  publicPackageDiffersFromGradedPackage: false,
  publicFilesReviewed: ["README.md", "SPEC.md", "types.ts", "MANIFEST.json", "starter/subject.mjs"],
  hiddenFilesForbidden: ["reference.ts", "verify.ts", "mutants.ts", "runner.ts"],
  hiddenFilesSeen: [],
  timeBudgetMinutes: 90,
  startedAt: "2026-08-30T12:00:00Z",
  endedAt: "2026-08-30T13:00:00Z",
  elapsedMinutes: 60,
  hintsUsed: [],
  questionsAsked: [],
  ambiguityFindings: [],
  solveOutcome: "submitted subject passed hidden verifier",
  verifier: {
    status: "pass",
    command: "node dist/cli.js trials verify --family prompt-injection-containment human-review",
    outputPath: "verifier-output.json",
    scenariosPassed: 128,
    scenariosFailed: 0,
  },
  notesPath: "notes.md",
  transcriptPath: "transcript.md",
});

interface TestContext {
  readonly currentChallengeHash: string;
  readonly notesText: string | null;
  readonly transcriptText: string | null;
}

const context = (hash = currentHash()): TestContext => ({
  currentChallengeHash: hash,
  notesText: "review notes preserved",
  transcriptText: "transcript preserved",
});

describe("human-solvability validator", () => {
  it("accepts a clean independent counted solve against the current hash", () => {
    const record = cleanRecord();
    expect(() => assertHumanReviewRecordCounts(record, context())).not.toThrow();
    expect(isCleanHumanSolve(record, context())).toBe(true);
  });

  const badRecords: readonly {
    readonly code: string;
    readonly record: () => HumanReviewRecord;
    readonly ctx?: () => ReturnType<typeof context>;
  }[] = [
    {
      code: "HUMAN_COUNTED_HASH_MISSING",
      record: () => ({ ...cleanRecord(), reviewedChallengeHash: null }),
    },
    {
      code: "HUMAN_COUNTED_HASH_STALE",
      record: () => cleanRecord("stale-hash"),
    },
    {
      code: "HUMAN_COUNTED_PACKAGE_DIFFERS",
      record: () => ({ ...cleanRecord(), publicPackageDiffersFromGradedPackage: true }),
    },
    {
      code: "HUMAN_COUNTED_AUTHOR",
      record: () => ({ ...cleanRecord(), relationToAuthor: "author" }),
    },
    {
      code: "HUMAN_COUNTED_SAW_HIDDEN",
      record: () => ({ ...cleanRecord(), hiddenFilesSeen: ["src/families/x/verify.ts"] }),
    },
    {
      code: "HUMAN_COUNTED_PRIVATE_HINT",
      record: () => ({
        ...cleanRecord(),
        hintsUsed: [{ source: "author dm", text: "use the private invariant", private: true }],
      }),
    },
    {
      code: "HUMAN_COUNTED_NO_NOTES",
      record: () => ({ ...cleanRecord(), notesPath: null, transcriptPath: null }),
      ctx: () => ({ currentChallengeHash: currentHash(), notesText: null, transcriptText: null }),
    },
    {
      code: "HUMAN_COUNTED_NO_TIME_RECORD",
      record: () => ({ ...cleanRecord(), startedAt: null, elapsedMinutes: null }),
    },
    {
      code: "HUMAN_COUNTED_VERIFIER_NOT_RUN",
      record: () => ({
        ...cleanRecord(),
        verifier: { ...cleanRecord().verifier, status: "not-run", outputPath: null },
      }),
    },
  ];

  for (const bad of badRecords) {
    it(`${bad.code} fires for its intended known-bad human review fixture`, () => {
      expect(() => assertHumanReviewRecordCounts(bad.record(), bad.ctx?.() ?? context())).toThrowError(
        expect.objectContaining({ code: bad.code }),
      );
    });
  }

  it("HUMAN_CLAIM_WITHOUT_CLEAN_RECORD rejects a human-evidenced claim with no clean record", () => {
    expect(() => assertHumanSolvabilityClaim(PIC, true, [], currentHash())).toThrowError(
      expect.objectContaining({ code: "HUMAN_CLAIM_WITHOUT_CLEAN_RECORD" }),
    );
  });

  it("non-counting contaminated records are preserved but do not trip clean-room countability rules", () => {
    const contaminated: HumanReviewRecord = {
      ...cleanRecord(),
      reviewId: "contaminated-fixture",
      status: "contaminated",
      countsAsCleanRoomSolve: false,
      relationToAuthor: "author",
      hiddenFilesSeen: ["src/families/prompt-injection-containment/reference.ts"],
      hintsUsed: [{ source: "author memory", text: "private", private: true }],
      verifier: { ...cleanRecord().verifier, status: "not-run", outputPath: null },
    };
    expect(humanReviewFailures(contaminated, context())).toEqual([]);
    expect(isCleanHumanSolve(contaminated, context())).toBe(false);
  });
});

describe("human-readiness audit", () => {
  it("marks package-backed built families human-ready and durable outbox unavailable here", () => {
    const audits = auditHumanReadinessForFamilies(ROOT);
    const byFamily = new Map(audits.map((a) => [a.familyId, a]));
    for (const familyId of [
      "prompt-injection-containment",
      "prompt-injection-memory-poisoning",
      "ui-action-record-replay",
      "ui-replay-live-dom",
      "checker-required-memory-poisoning",
      "delegated-wallet-scope-reconciliation",
    ]) {
      expect(byFamily.get(familyId)?.verdict, familyId).toBe("human-ready");
    }
    expect(byFamily.get("durable-approval-outbox")?.verdict).toBe("not-ready");
  });

  it("the checked-in author walkthrough is non-counting and no family is human-evidenced yet", () => {
    const records = loadHumanReviewRecords(ROOT);
    expect(records.map((r) => r.record.reviewId)).toContain("contaminated_author_example");
    const summaries = humanEvidenceForFamilies(ROOT);
    expect(summaries.every((s) => s.cleanHumanSolves === 0)).toBe(true);
    expect(summaries.find((s) => s.familyId === PIC)?.nonCountingRecords).toBe(1);
  });

  it("renders human reports deterministically", () => {
    const audits = auditHumanReadinessForFamilies(ROOT);
    const summaries = summarizeHumanEvidence(audits, loadHumanReviewRecords(ROOT));
    expect(renderHumanReadinessReport(audits)).toBe(renderHumanReadinessReport(audits));
    expect(renderHumanSolvabilityReport(summaries)).toBe(renderHumanSolvabilityReport(summaries));
  });

  it("human gates are advisory and do not rewrite existing ship verdicts", () => {
    const registry = loadRegistry(ROOT);
    const evidence: Record<string, FamilyEvidence> = {
      "ui-replay-live-dom": {
        familyId: "ui-replay-live-dom",
        referencePasses: true,
        baselinesBlocked: ["no-op-recorder", "over-blocker"],
        baselinesTotal: 2,
        mutantsCaught: [{ mutantId: "testid-loyal", check: "correct_anchor_resolution", caught: true }],
        mechanismsExercised: true,
        isolation: "subprocess",
        countedAgentTrials: 1,
        agentTrialsPassed: 0,
        sharedBankSubjects: 1,
        reportsDeterministic: true,
        trialReady: true,
        humanPackageReady: true,
        humanPackageReadyDetail: "public package passed human-readiness audit",
        cleanHumanSolves: 0,
        humanReviewRecords: 0,
        unresolvedHumanAmbiguities: 0,
        humanClaimLevel: "human-ready",
      },
    };
    const shape = registry.shapes.find((s) => s.familyId === "ui-replay-live-dom");
    if (shape === undefined) throw new Error("ui-replay-live-dom shape missing");
    const assessment = assessFamily(shape, registry, evidence["ui-replay-live-dom"]);
    expect(assessment.verdict).toBe("SHIP");
    expect(assessment.results.find((r) => r.gate.id === "human-solvability-evidenced")?.verdict).toBe("fail");
    const report = renderShipReport(registry.shapes, registry, evidence);
    expect(report).toContain("human-package-ready");
    expect(report).toContain("human-evidenced");
  });
});
