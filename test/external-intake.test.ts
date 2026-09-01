import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXTERNAL_PACKET_REQUIRED_FILES,
  auditDeploymentAliasExternalPackets,
  auditExternalEvidencePacket,
  externalPacketAuditFindings,
  renderExternalIntakeReport,
  validateExternalRunPacket,
} from "../src/index.js";
import { analyseFamilyTrials } from "../src/reports/agent-results.js";
import {
  renderDeploymentAliasHumanIntake,
  renderDeploymentAliasMatrixReadinessGap,
} from "../src/reports/deployment-alias-production.js";
import { loadCampaigns } from "../src/trials/campaign.js";
import { prepareProviderBundle } from "../src/trials/cross-provider.js";
import { readFamilyTrials } from "../src/trials/directory.js";
import { prepareChallenge } from "../src/trials/run.js";
import type { TrialSet } from "../src/trials/types.js";

const ROOT = new URL("..", import.meta.url).pathname;
const FAMILY_ID = "deployment-model-alias-rollout-drift";
const CHALLENGE_HASH = "0e9b87a5f260544cfbc1cdce8f08938c";
const SCENARIO_SET_ID = "drift-339-590affe3";

const writeJson = (path: string, value: unknown) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");

function returnedPacket(overrides: Record<string, unknown> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "deployment-alias-external-"));
  const bundle = prepareProviderBundle(ROOT, FAMILY_ID, "external", dir);
  const runId = "deployment-alias-external-valid";
  const starter = readFileSync(join(dir, "challenge", "starter", "subject.mjs"), "utf8");
  writeFileSync(join(dir, "submission", "subject.mjs"), starter, "utf8");
  writeFileSync(join(dir, "transcript.txt"), "external runner produced a subject.mjs artifact\n", "utf8");
  writeJson(join(dir, "verifier-output.json"), {
    runId,
    challengeHash: bundle.challenge.hash,
    cells: [],
    detail: "external verifier output preserved",
  });
  writeJson(join(dir, "metadata.json"), {
    runId,
    familyId: FAMILY_ID,
    providerFamily: "external",
    provider: "external-lab",
    model: "external/deployment-alias-smoke",
    subjectId: "external-deployment-alias-smoke",
    runtime: "external-cli",
    runDate: "2026-09-01",
    scenarioSetId: bundle.challenge.scenarioSetId,
    challengeHash: bundle.challenge.hash,
    status: "completed",
    countsRequested: true,
    relationToAuthor: "independent",
    privateHintsUsed: false,
    hiddenFilesSeen: [],
    notes: "valid external packet fixture",
    ...overrides,
  });
  return { dir, runId };
}

const validate = (dir: string, existingRunIds: readonly string[] = []) =>
  validateExternalRunPacket(ROOT, dir, {
    familyId: FAMILY_ID,
    currentChallengeHash: CHALLENGE_HASH,
    expectedScenarioSetId: SCENARIO_SET_ID,
    existingRunIds,
  });

describe("external deployment-alias evidence intake", () => {
  it("generates an idiot-proof external packet without hidden artifacts", () => {
    const dir = mkdtempSync(join(tmpdir(), "deployment-alias-packet-"));
    prepareProviderBundle(ROOT, FAMILY_ID, "external", dir);
    const files = [
      "README.md",
      "RUN_INSTRUCTIONS.md",
      "SUBMISSION_TEMPLATE.md",
      "METADATA_TEMPLATE.json",
      "VERIFY_COMMANDS.md",
      "DO_NOT_INCLUDE.md",
      "challenge_hash.txt",
      "scenario_set_id.txt",
      "metadata.json",
      "challenge/MANIFEST.json",
    ];

    for (const file of EXTERNAL_PACKET_REQUIRED_FILES) {
      expect(files).toContain(file);
      expect(readFileSync(join(dir, file), "utf8").length).toBeGreaterThan(0);
    }
    expect(readFileSync(join(dir, "challenge_hash.txt"), "utf8").trim()).toBe(CHALLENGE_HASH);
    expect(readFileSync(join(dir, "scenario_set_id.txt"), "utf8").trim()).toBe(SCENARIO_SET_ID);
    expect(readFileSync(join(dir, "DO_NOT_INCLUDE.md"), "utf8")).toContain("hidden verifier");
    expect(() => readFileSync(join(dir, "challenge", "verify.ts"), "utf8")).toThrow();
  });

  it("rejects prepared packets that are missing templates or leak hidden artifacts", () => {
    const missing = auditExternalEvidencePacket(
      ROOT,
      FAMILY_ID,
      "external",
      join(mkdtempSync(join(tmpdir(), "deployment-alias-missing-packet-")), "missing"),
    );
    const leakedDir = mkdtempSync(join(tmpdir(), "deployment-alias-leaking-packet-"));
    prepareProviderBundle(ROOT, FAMILY_ID, "external", leakedDir);
    writeFileSync(join(leakedDir, "challenge", "reference.ts"), "hidden reference\n", "utf8");
    const leaked = auditExternalEvidencePacket(ROOT, FAMILY_ID, "external", leakedDir);

    expect(externalPacketAuditFindings(missing).map((finding) => finding.code)).toContain(
      "EXTERNAL_PACKET_MISSING_TEMPLATE",
    );
    expect(externalPacketAuditFindings(leaked).map((finding) => finding.code)).toContain(
      "EXTERNAL_PACKET_LEAKS_HIDDEN",
    );
  });

  it("validates a completed returned packet with current hash and preserved artifacts", () => {
    const { dir } = returnedPacket();
    const result = validate(dir);

    expect(result.countable).toBe(true);
    expect(result.importedTrialEligible).toBe(true);
    expect(result.findings).toEqual([]);
    expect(result.packet.actualChallengeHash).toBe(CHALLENGE_HASH);
    expect(result.packet.verifierRunId).toBe("deployment-alias-external-valid");
  });

  it("rejects stale hashes and modified challenge packets without deleting the packet", () => {
    const stale = returnedPacket({ challengeHash: "stale-hash" });
    const modified = returnedPacket();
    writeFileSync(
      join(modified.dir, "challenge", "README.md"),
      `${readFileSync(join(modified.dir, "challenge", "README.md"), "utf8")}\nmodified\n`,
      "utf8",
    );

    expect(validate(stale.dir).countable).toBe(false);
    expect(validate(stale.dir).findings.map((finding) => finding.code)).toContain(
      "EXTERNAL_INTAKE_CHALLENGE_HASH_STALE",
    );
    expect(validate(modified.dir).countable).toBe(false);
    expect(validate(modified.dir).findings.map((finding) => finding.code)).toContain(
      "EXTERNAL_INTAKE_MODIFIED_CHALLENGE_PACKAGE",
    );
  });

  it("rejects missing transcript, submission, metadata and verifier output by intended codes", () => {
    const missingMetadata = returnedPacket();
    writeFileSync(join(missingMetadata.dir, "metadata.json"), "{", "utf8");
    const missingHash = returnedPacket({ challengeHash: undefined });
    const missingProvider = returnedPacket({ provider: "", runtime: "TODO" });
    const missingTranscript = returnedPacket();
    writeFileSync(join(missingTranscript.dir, "transcript.txt"), "", "utf8");
    const missingSubmission = returnedPacket();
    writeFileSync(join(missingSubmission.dir, "submission", "subject.mjs"), "", "utf8");
    const missingVerifier = returnedPacket();
    writeFileSync(join(missingVerifier.dir, "verifier-output.json"), "", "utf8");

    expect(validate(missingMetadata.dir).findings.map((finding) => finding.code)).toContain(
      "EXTERNAL_INTAKE_METADATA_MISSING",
    );
    expect(validate(missingHash.dir).findings.map((finding) => finding.code)).toContain(
      "EXTERNAL_INTAKE_CHALLENGE_HASH_MISSING",
    );
    expect(validate(missingProvider.dir).findings.map((finding) => finding.code)).toContain(
      "EXTERNAL_INTAKE_PROVIDER_ID_MISSING",
    );
    expect(validate(missingTranscript.dir).findings.map((finding) => finding.code)).toContain(
      "EXTERNAL_INTAKE_TRANSCRIPT_MISSING",
    );
    expect(validate(missingSubmission.dir).findings.map((finding) => finding.code)).toContain(
      "EXTERNAL_INTAKE_SUBMISSION_MISSING",
    );
    expect(validate(missingVerifier.dir).findings.map((finding) => finding.code)).toContain(
      "EXTERNAL_INTAKE_VERIFIER_OUTPUT_MISSING",
    );
  });

  it("rejects no-count statuses, contamination, private hints, mismatches and hidden leaks", () => {
    const refusal = returnedPacket({ status: "provider_refusal", countsRequested: true });
    const infra = returnedPacket({ status: "infrastructure_error", countsRequested: true });
    const contaminated = returnedPacket({ relationToAuthor: "author" });
    const hinted = returnedPacket({ privateHintsUsed: true });
    const scenarioMismatch = returnedPacket({ scenarioSetId: "wrong-set" });
    const familyMislabel = returnedPacket({ providerFamily: "google", provider: "claude" });
    const duplicate = returnedPacket();
    const verifierMismatch = returnedPacket();
    writeJson(join(verifierMismatch.dir, "verifier-output.json"), {
      runId: "different-run",
      challengeHash: CHALLENGE_HASH,
      cells: [],
    });
    const hidden = returnedPacket();
    writeFileSync(join(hidden.dir, "submission", "reference.ts"), "hidden answer file\n", "utf8");

    expect(validate(refusal.dir).findings.map((finding) => finding.code)).toContain(
      "EXTERNAL_INTAKE_PROVIDER_REFUSAL_COUNTED",
    );
    expect(validate(infra.dir).findings.map((finding) => finding.code)).toContain(
      "EXTERNAL_INTAKE_INFRA_ERROR_COUNTED",
    );
    expect(validate(contaminated.dir).findings.map((finding) => finding.code)).toContain(
      "EXTERNAL_INTAKE_AUTHOR_CONTAMINATED",
    );
    expect(validate(hinted.dir).findings.map((finding) => finding.code)).toContain(
      "EXTERNAL_INTAKE_PRIVATE_HINT",
    );
    expect(validate(scenarioMismatch.dir).findings.map((finding) => finding.code)).toContain(
      "EXTERNAL_INTAKE_SCENARIO_SET_MISMATCH",
    );
    expect(validate(familyMislabel.dir).findings.map((finding) => finding.code)).toContain(
      "EXTERNAL_INTAKE_PROVIDER_FAMILY_MISLABELLED",
    );
    expect(validate(duplicate.dir, [duplicate.runId]).findings.map((finding) => finding.code)).toContain(
      "EXTERNAL_INTAKE_DUPLICATE_RUN_ID",
    );
    expect(validate(verifierMismatch.dir).findings.map((finding) => finding.code)).toContain(
      "EXTERNAL_INTAKE_VERIFIER_RUN_MISMATCH",
    );
    expect(validate(hidden.dir).findings.map((finding) => finding.code)).toContain(
      "EXTERNAL_INTAKE_HIDDEN_ARTIFACT_LEAK",
    );
  });

  it("renders external intake and human intake reports without inventing evidence", () => {
    const prepared = prepareChallenge(ROOT, FAMILY_ID);
    const packetAudits = auditDeploymentAliasExternalPackets(ROOT);
    const external = renderExternalIntakeReport({
      familyId: FAMILY_ID,
      expectedHash: prepared.hash,
      expectedScenarioSetId: prepared.scenarioSetId,
      packetAudits,
      intakeResults: [],
    });
    const human = renderDeploymentAliasHumanIntake({
      challengeHash: prepared.hash,
      scenarioSetId: prepared.scenarioSetId,
      human: {
        familyId: FAMILY_ID,
        humanPackageReady: true,
        humanPackageReadyDetail: "public package passed human-readiness audit",
        cleanHumanSolves: 0,
        humanReviewRecords: 0,
        unresolvedHumanAmbiguities: 0,
        humanClaimLevel: "human-ready",
      },
      packetPath: "human-reviews/deployment-model-alias-rollout-drift",
    });

    expect(packetAudits.every((audit) => audit.requiredFilesPresent)).toBe(true);
    expect(packetAudits.every((audit) => audit.leakCheck === "pass")).toBe(true);
    expect(external).toContain("No returned external packets have been imported yet.");
    expect(external).toContain("No cross-lab claim exists");
    expect(human).toContain("human-evidenced | no");
    expect(human).toContain("Human-ready is not human-evidenced");
  });

  it("plans the OpenAI half-matrix without satisfying cross-lab or /6 readiness", () => {
    const campaigns = loadCampaigns(ROOT);
    const half = campaigns.find(
      (campaign) => campaign.campaignId === "deployment-model-alias-rollout-drift-openai-half-matrix-2026-09",
    );
    if (half === undefined) throw new Error("half-matrix campaign missing");
    const trials: TrialSet = {
      familyId: FAMILY_ID,
      scenarioSetId: SCENARIO_SET_ID,
      records: readFamilyTrials(join(ROOT, "trials"), FAMILY_ID).map((trial) => trial.record),
    };
    const analysis = analyseFamilyTrials(FAMILY_ID, trials, new Map(), half);
    const report = renderDeploymentAliasMatrixReadinessGap({
      readiness: {
        familyId: FAMILY_ID,
        challengeHash: CHALLENGE_HASH,
        statuses: ["smoke-failed-on-target", "cross-lab-smoke-needed", "matrix-blocked"],
        fullMatrixReady: false,
        productionMatrixStatus: "blocked",
        smokeDifficultyEvidenced: true,
        crossLabSmokeEvidenced: false,
        hasNonOpenAiCountedSmoke: false,
        countedProviderFamilies: ["openai"],
        blockers: [
          {
            code: "PRODUCTION_MATRIX_NEEDS_NON_OPENAI_SMOKE",
            severity: "blocker",
            detail: "non-OpenAI smoke missing",
          },
        ],
        advisories: [],
        nextAction: "import or run one non-OpenAI counted smoke under the current hash",
      },
      analysis,
      human: undefined,
      adversarial: undefined,
      externalResults: [],
      openAiHalfMatrix: half,
      challengeHash: CHALLENGE_HASH,
      scenarioSetId: SCENARIO_SET_ID,
    });

    expect(half.slots).toHaveLength(3);
    expect(half.slots[0]?.runId).toBe("deployment-model-alias-rollout-drift-2026-08-o1");
    expect(half.slots.slice(1).every((slot) => slot.state === "NOT_RUN")).toBe(true);
    expect(half.slots.some((slot) => /anthropic|claude|gemini/i.test(slot.model))).toBe(false);
    expect(analysis.counted).toBe(1);
    expect(analysis.modelFamilies).toEqual(["openai"]);
    expect(report).toContain("OpenAI half-matrix");
    expect(report).toContain("OpenAI-only 3/6 would strengthen same-provider stability only");
  });
});
