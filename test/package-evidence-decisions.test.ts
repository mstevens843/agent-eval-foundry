import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { profileDigest, profileFor } from "../src/execution/profiles.js";
import { BUILT_FAMILY_IDS } from "../src/families/registry.js";
import { loadRegistry } from "../src/foundry/load.js";
import { evaluateProductionReadiness } from "../src/foundry/production-readiness.js";
import { packageCommand } from "../src/packages/command.js";
import { inspectTrialEvidence, publishRegrade } from "../src/packages/evidence.js";
import { loadGapLedger, parseGapLedger } from "../src/packages/gaps.js";
import { historicalPhase13Calibration } from "../src/packages/history.js";
import { type PackageChecks, type PackagePolicyInput, decidePackage } from "../src/packages/policy.js";
import {
  COMPONENTS,
  type PackageInput,
  buildPackageRecord,
  canonicalJson,
  parsePackageRecord,
  publicPackageManifest,
  publishPackage,
  resolvePackage,
  sha256,
} from "../src/packages/record.js";
import { packageSourceSeed, retainedTreeDigest } from "../src/packages/source.js";
import { type FamilyEvidence, assessFamily, familyStatusLabel } from "../src/reports/ship-report.js";
import { readTrialDirectory } from "../src/trials/directory.js";
import { createInertProvider, inertInvocationCount } from "../src/trials/inert-provider.js";
import {
  type OrchestrateOptions,
  decideCountability,
  orchestrateTrial,
  trialProfileIdentity,
} from "../src/trials/orchestrator.js";
import { evaluateOutcome } from "../src/trials/outcome.js";
import { getProvider } from "../src/trials/providers.js";
import { currentChallenge, gateByChallengeHash, hashChallengeDir, runAgentTrial } from "../src/trials/run.js";

const ROOT = resolve(import.meta.dirname, "..");
const PROFILE_A = sha256("inert fixture exact profile A");
const PROFILE_B = sha256("inert fixture exact profile B");
const ownedTemporaryDirectories: string[] = [];
const temporary = () => {
  const dir = mkdtempSync(join(tmpdir(), "foundry-package-policy-"));
  ownedTemporaryDirectories.push(dir);
  return dir;
};
afterAll(() => {
  for (const dir of ownedTemporaryDirectories) rmSync(dir, { recursive: true });
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
  destinationChecks: true,
  unresolvedAmbiguities: 0,
  unrepairedBypasses: 0,
};
function fixture(kind: PackageInput["kind"] = "professional-package") {
  const root = temporary();
  const files = Object.fromEntries(
    COMPONENTS.map((name) => [name, [{ path: `${name}.txt`, bytes: Buffer.from(name) }]]),
  ) as unknown as PackageInput["files"];
  const input: PackageInput = {
    id: "fixture",
    familyId: "fixture",
    version: "1",
    kind,
    files: {
      ...files,
      scenarios: [
        { path: "scenario-ids.json", bytes: Buffer.from('["a","b"]') },
        { path: "check-ids.json", bytes: Buffer.from('["completion"]') },
      ],
    },
    dependencies: { strategy: "explicit-fixture", unresolved: [] },
  };
  const built = buildPackageRecord(input);
  const store = join(root, "store");
  const snapshot = publishPackage(store, built);
  return { root, store, input, snapshot, built };
}
function runFixture() {
  const f = fixture("calibration-kernel");
  const challenge = join(f.root, "challenge");
  mkdirSync(challenge);
  for (const name of ["contract", "workspace"] as const)
    for (const file of f.input.files[name]) writeFileSync(join(challenge, file.path), file.bytes);
  const sandbox = join(f.root, "sandbox");
  mkdirSync(join(sandbox, "submission"), { recursive: true });
  writeFileSync(join(sandbox, "submission/subject.mjs"), "export const subject = {};");
  const adapter = createInertProvider({
    transcript: "recorded fixture only",
    submission: [{ path: "subject.mjs", content: "export const subject = {};" }],
    workspace: [],
    captureLevel: "full",
    classification: "completed",
    detail: "inert",
    runtimeSeconds: 0,
    sandbox,
    usage: null,
    command: [],
  });
  const base: OrchestrateOptions = {
    familyId: "fixture",
    runId: "one",
    challengeDir: challenge,
    trialsRoot: join(f.root, "trials"),
    instruction: "Fixture",
    provider: "inert-test",
    model: "recorded-fixture",
    effort: null,
    subjectId: "fixture",
    scenarioSetId: "fixture-2",
    timeoutMs: 1000,
    expectedScenarioIds: ["a", "b"],
    grade: () => ({
      cells: [
        { scenarioId: "a", failed: ["completion"] },
        { scenarioId: "b", failed: [] },
      ],
      detail: "complete near miss",
      hostErrors: 0,
      isolation: "cell-container",
    }),
  };
  const binding = {
    packageDigest: f.snapshot.record.digest,
    operation: "standard" as const,
    profile: trialProfileIdentity(base),
  };
  const policy: PackagePolicyInput = {
    snapshot: f.snapshot,
    checks: CHECKS,
    authorization: { ...binding, approval: { ...binding, approved: true }, execution: "inert-test" },
  };
  const options: OrchestrateOptions = { ...base, execution: { policy, adapter } };
  return { ...f, options, adapter, policy };
}

describe("complete package identity", () => {
  it("canonicalizes JSON without locale/timestamps and refuses non-JSON values", () => {
    expect(canonicalJson({ z: 1, a: [true, "x"] })).toBe('{"a":[true,"x"],"z":1}');
    expect(() => canonicalJson({ x: Number.NaN })).toThrow(/PACKAGE_SCHEMA/);
    expect(() => canonicalJson({ x: undefined })).toThrow(/PACKAGE_SCHEMA/);
  });
  it("publishes and resolves immutable actual bytes, including binary", () => {
    const f = fixture();
    const built = buildPackageRecord({
      ...f.input,
      files: { ...f.input.files, workspace: [{ path: "binary", bytes: new Uint8Array([0, 255, 128]) }] },
    });
    const snapshot = publishPackage(f.store, built);
    expect(resolvePackage(f.store, snapshot.record.digest)).toEqual(snapshot);
    expect(snapshot.record.digest).not.toBe(f.snapshot.record.digest);
    expect(resolvePackage(f.store, f.snapshot.record.digest)).toEqual(f.snapshot);
    expect(publishPackage(f.store, built)).toEqual(snapshot);
  });
  it.each(["contract", "scenarios", "collector", "verifier", "dependencies"] as const)(
    "detects changed %s bytes despite unchanged metadata",
    (component) => {
      const f = fixture();
      const file = f.snapshot.record.components[component].files[0];
      if (!file) throw new Error("fixture missing");
      const path = join(f.store, "blobs", file.sha256);
      chmodSync(path, 0o644);
      writeFileSync(path, "tampered");
      expect(() => resolvePackage(f.store, f.snapshot.record.digest)).toThrow(/BLOB_MISMATCH/);
      expect(
        decidePackage({ snapshot: f.snapshot, checks: CHECKS }).stages["local-valid"].blockers,
      ).toContain("retained-package-content-invalid");
      expect(() => publishPackage(f.store, f.built)).toThrow(/IMMUTABLE_CONFLICT/);
    },
  );
  it("rejects malformed digest, missing component, unsafe and case-colliding paths", () => {
    const f = fixture();
    expect(() => parsePackageRecord({ ...f.snapshot.record, digest: "0".repeat(64) })).toThrow(
      /DIGEST_MISMATCH/,
    );
    expect(() => parsePackageRecord({ ...f.snapshot.record, components: {} })).toThrow(/SCHEMA/);
    for (const path of ["../secret", "/root", "a//b", "a\\b", "a/./b", "a\0b"])
      expect(() =>
        buildPackageRecord({
          ...f.input,
          files: { ...f.input.files, contract: [{ path, bytes: Buffer.from("x") }] },
        }),
      ).toThrow(/PACKAGE_PATH/);
    expect(() =>
      buildPackageRecord({
        ...f.input,
        files: {
          ...f.input.files,
          contract: [
            { path: "a", bytes: Buffer.from("x") },
            { path: "A", bytes: Buffer.from("y") },
          ],
        },
      }),
    ).toThrow(/PACKAGE_PATH/);
  });
  it("does not leak private names or identities in the public manifest", () => {
    const f = fixture();
    const text = JSON.stringify(publicPackageManifest(f.snapshot));
    expect(text).not.toContain("scenarios");
    expect(text).not.toContain("controls");
    expect(text).not.toContain(f.snapshot.record.digest);
    expect(() => publicPackageManifest({ ...f.snapshot })).toThrow(/UNVERIFIED/);
  });
  it("inspects without writes and reports missing assurance instead of green defaults", () => {
    const f = fixture();
    const before = statSync(join(f.store, "records")).mtimeMs;
    const output = JSON.parse(packageCommand(ROOT, ["inspect", f.store, f.snapshot.record.digest]));
    expect(output.decision.stages["local-valid"].allowed).toBe(false);
    expect(statSync(join(f.store, "records")).mtimeMs).toBe(before);
    expect(readdirSync(join(f.store, "records"))).toHaveLength(1);
  });
  it("supplies a real native CAA seed with conservative dependency identity", () => {
    const seed = packageSourceSeed(ROOT, "caa-revalidation-repair", "prompt-01-seed");
    const snapshot = publishPackage(join(temporary(), "store"), seed);
    expect(snapshot.record.kind).toBe("professional-package");
    expect(snapshot.record.components.collector.files.some((f) => f.path.endsWith("artifact_guard.py"))).toBe(
      true,
    );
    expect(snapshot.record.components.dependencies.files.some((f) => f.path === "pnpm-lock.yaml")).toBe(true);
    expect(snapshot.record.components.reference.files.length).toBeGreaterThan(0);
    expect(decidePackage({ snapshot, checks: CHECKS }).stages["trial-eligible"].blockers).toContain(
      "runtime-dependencies-unresolved",
    );
  });
});

describe("one stage-aware policy", () => {
  it("permits exploratory eligibility without claiming a measured human solve", () => {
    const f = fixture();
    const decision = decidePackage({
      snapshot: f.snapshot,
      checks: { ...CHECKS, boundedSolveEvidence: false },
    });
    expect(decision.stages["trial-eligible"].allowed).toBe(true);
    expect(decision.stages["trial-authorized"].allowed).toBe(false);
    expect(decision.stages["release-eligible"].allowed).toBe(false);
  });
  it("local validity needs no trials, and one-mechanism calibration can be trial-eligible, not releasable", () => {
    const { snapshot } = fixture("calibration-kernel");
    const decision = decidePackage({ snapshot, checks: CHECKS });
    expect(decision.stages["local-valid"].allowed).toBe(true);
    expect(decision.stages["trial-eligible"].allowed).toBe(true);
    expect(decision.stages["trial-authorized"].allowed).toBe(false);
    expect(decision.stages["release-eligible"].allowed).toBe(false);
  });
  it.each(["unrepairedBypasses", "unresolvedAmbiguities"] as const)(
    "blocks every trusted claim for %s",
    (field) => {
      const { snapshot } = fixture();
      const decision = decidePackage({ snapshot, checks: { ...CHECKS, [field]: 1 } });
      expect(Object.values(decision.stages).every((s) => !s.allowed)).toBe(true);
    },
  );
  it("cannot turn ambiguous six zeros or profile names into six qualified failures", () => {
    const { snapshot } = fixture();
    const observations: NonNullable<PackagePolicyInput["observations"]> = Array.from(
      { length: 6 },
      (_, i) => ({
        runId: `r${i}`,
        packageDigest: snapshot.record.digest,
        profile: i < 3 ? PROFILE_A : PROFILE_B,
        operation: "standard",
        outcome: "semantic-fail",
        adjudication: i === 5 ? "unlabelled" : "specification-ambiguity",
        contentVerified: true,
      }),
    );
    expect(
      decidePackage({ snapshot, checks: CHECKS, observations, qualificationProfiles: [PROFILE_A, PROFILE_B] })
        .stages["hardness-observed"].allowed,
    ).toBe(false);
    const qualified = observations.map((o) => ({ ...o, adjudication: "capability" as const }));
    const first = qualified[0];
    if (!first) throw new Error("missing qualification fixture");
    const audits = [PROFILE_A, PROFILE_B].map((profile) => ({
      ...first,
      profile,
      runId: `audit-${profile}`,
      operation: "adversarial" as const,
    }));
    const input = {
      snapshot,
      checks: CHECKS,
      observations: [...qualified, ...audits],
      qualificationProfiles: [PROFILE_A, PROFILE_B],
    };
    expect(decidePackage(input).stages["release-eligible"].allowed).toBe(false);
    const specs = [
      profileFor("codex", `sha256:${"a".repeat(64)}`, "fixture"),
      profileFor("claude", `sha256:${"a".repeat(64)}`, "fixture"),
    ];
    for (const p of specs) p.adapter.scaffoldVersion = "observed-fixture-version";
    const observed = (value: string) => ({
      value,
      source: "host-verified fixture receipt",
      status: "observed" as const,
    });
    const exact = {
      ...input,
      qualificationProfiles: specs.map(profileDigest),
      observations: input.observations.map((o) => {
        const p = specs[o.profile === PROFILE_A ? 0 : 1];
        if (!p) throw Error("missing fixture profile");
        return {
          ...o,
          slot: o.runId,
          attempt: 1,
          profile: profileDigest(p),
          evidenceClass: "real-provider" as const,
          substantive: true,
          profileSpecification: p,
          profileObservation: {
            model: observed(p.requested.model),
            effort: observed(p.requested.effort),
            scaffoldVersion: observed("observed-fixture-version"),
            fallback: false,
            evidenceClass: "real-provider" as const,
          },
        };
      }),
    };
    expect(decidePackage(exact).stages["release-eligible"].allowed).toBe(true);
    expect(
      decidePackage({ ...input, observations: [...input.observations, first] }).stages["release-eligible"]
        .allowed,
    ).toBe(false);
  });
  it("rejects the legacy SHIP counterexample and readiness despite affirmative old flags", () => {
    const registry = loadRegistry(ROOT);
    const shape = registry.shapes.find((s) => s.familyId === "ui-action-record-replay");
    if (!shape) throw new Error("missing shape");
    const evidence: FamilyEvidence = {
      familyId: shape.familyId,
      referencePasses: true,
      baselinesBlocked: ["nop"],
      baselinesTotal: 1,
      mutantsCaught: [{ mutantId: "m", check: "c", caught: true }],
      mechanismsExercised: true,
      isolation: "cell-container",
      countedAgentTrials: 6,
      agentTrialsPassed: 0,
      capabilityEvidencedTrials: 6,
      sharedBankSubjects: 6,
      reportsDeterministic: true,
      trialReady: true,
      humanPackageReady: false,
      unresolvedHumanAmbiguities: 1,
      unrepairedBypasses: 1,
    };
    const assessment = assessFamily(shape, registry, evidence);
    expect(assessment.verdict).not.toBe("SHIP");
    expect(familyStatusLabel(assessment)).toBe("HOLD");
    expect(assessment.packageDecision?.stages["release-eligible"].blockers).toContain(
      "known-unrepaired-bypass",
    );
    const productionInput = {
      familyId: shape.familyId,
      challengeHash: "same",
      currentChallengeHash: "same",
      localVerifierReady: true,
      packageBacked: true,
      campaignPresent: true,
      campaignHashCurrent: true,
      packageHashCurrent: true,
      countedSmokeTrials: 6,
      countedSmokeFailures: 6,
      countedSmokeSolves: 0,
      providerRefusals: 0,
      infraFailures: 0,
      modelFamilies: ["openai", "anthropic"],
      countedFailureModelFamilies: ["openai", "anthropic"],
      diagnosisStatus: "on-target" as const,
      transferDeclared: true,
      adversarialReady: true,
      countedNoBypassAudits: 2,
      countedBypassAudits: 1,
      unrepairedBypasses: 1,
      humanReady: false,
      cleanHumanSolves: 0,
    };
    const production = evaluateProductionReadiness(productionInput);
    expect(production.fullMatrixReady).toBe(false);
    expect(production.smokeDifficultyEvidenced).toBe(false);
    expect(production.crossLabDifficultyEvidenced).toBe(false);
    expect(production.legacySmokeDiagnostics?.smokeDifficultyEvidenced).toBe(true);
    expect(production.packageDecision?.stages["trial-eligible"].blockers).toContain(
      "known-unrepaired-bypass",
    );
    const f = fixture();
    const snapshot = publishPackage(f.store, buildPackageRecord({ ...f.input, familyId: shape.familyId }));
    const eligibleInput = {
      ...productionInput,
      packagePolicy: { snapshot, checks: CHECKS },
      unrepairedBypasses: 0,
      humanReady: true,
      countedSmokeTrials: 0,
      countedSmokeFailures: 0,
      countedBypassAudits: 0,
      countedNoBypassAudits: 0,
    };
    expect(evaluateProductionReadiness(eligibleInput).fullMatrixReady).toBe(true);
    expect(
      evaluateProductionReadiness(eligibleInput).packageDecision?.stages["trial-authorized"].allowed,
    ).toBe(false);
    const contradicted = assessFamily(shape, registry, {
      ...evidence,
      packagePolicy: { snapshot, checks: { ...CHECKS, reference: false } },
      humanPackageReady: true,
      unresolvedHumanAmbiguities: 0,
      unrepairedBypasses: 0,
    });
    expect(contradicted.packageDecision?.stages["local-valid"].blockers).toContain("required-reference");
  });
  it("derives provider evidence only from verified exact-package observations, not lab counts", () => {
    const f = fixture();
    const observations: NonNullable<PackagePolicyInput["observations"]> = ["openai", "anthropic"].map(
      (providerFamily, i) => ({
        providerFamily: providerFamily as "openai" | "anthropic",
        profile: i ? PROFILE_B : PROFILE_A,
        runId: `profile-${i}`,
        packageDigest: f.snapshot.record.digest,
        contentVerified: true,
        operation: "standard",
        outcome: "semantic-fail",
        adjudication: "capability",
      }),
    );
    const input = { snapshot: f.snapshot, checks: CHECKS, observations };
    expect(decidePackage(input).failureProviderFamilies).toEqual(["anthropic", "openai"]);
    expect(
      decidePackage({ ...input, checks: { ...CHECKS, unrepairedBypasses: 1 } }).failureProviderFamilies,
    ).toEqual([]);
    expect(
      decidePackage({ ...input, observations: observations.map((o) => ({ ...o, contentVerified: false })) })
        .observedProviderFamilies,
    ).toEqual([]);
  });
});

describe("execution authorization and semantic completeness", () => {
  it("includes dependency directories in retained submission identity", () => {
    const dir = temporary();
    writeFileSync(join(dir, "subject.mjs"), "export const subject = {};");
    const before = retainedTreeDigest(dir);
    mkdirSync(join(dir, "node_modules"));
    writeFileSync(join(dir, "node_modules/helper.js"), "export default 1;");
    expect(retainedTreeDigest(dir)).not.toBe(before);
  });
  it("revalidates retained private bytes before any provider invocation", () => {
    const f = runFixture();
    const descriptor = f.snapshot.record.components.collector.files[0];
    if (!descriptor) throw new Error("missing collector fixture");
    const path = join(f.store, "blobs", descriptor.sha256);
    chmodSync(path, 0o644);
    writeFileSync(path, "changed after approval");
    expect(() => orchestrateTrial(f.options)).toThrow(/retained-package-content-invalid/);
    expect(inertInvocationCount(f.adapter)).toBe(0);
  });
  it("rejects unknown checks even when every expected scenario is present", () => {
    const result = evaluateOutcome({
      providerStatus: "completed",
      expectedIds: ["a"],
      expectedCheckIds: ["completion"],
      cells: [{ scenarioId: "a", failed: ["HOST_ERROR"] }],
      hostErrors: 0,
      artifactPresent: true,
    });
    expect(result.complete).toBe(false);
    expect(result.problems).toContain("unknown-failed-check:a");
  });
  it("missing context denies before provider lookup or any invocation", () => {
    const f = runFixture();
    const { execution: _execution, ...options } = f.options;
    expect(() => orchestrateTrial(options)).toThrow(/AUTHORIZATION_DENIED/);
    expect(inertInvocationCount(f.adapter)).toBe(0);
    expect(() =>
      runAgentTrial({
        root: ROOT,
        familyId: "caa-revalidation",
        runId: "forbidden",
        provider: "shell",
        model: "never",
        subjectId: "none",
      }),
    ).toThrow(/AUTHORIZATION_DENIED/);
  });
  it.each(["approval", "profile", "package", "prerequisite", "command"])(
    "denies changed/missing %s with zero inert invocations",
    (change) => {
      const f = runFixture();
      const authorization = f.policy.authorization;
      if (!authorization) throw new Error("missing authorization fixture");
      const policy: PackagePolicyInput = {
        ...f.policy,
        checks: change === "prerequisite" ? { ...CHECKS, positiveWork: false } : CHECKS,
        authorization: {
          ...authorization,
          approval: change === "approval" ? null : authorization.approval,
          profile: change === "profile" ? "other" : authorization.profile,
          packageDigest: change === "package" ? "0".repeat(64) : authorization.packageDigest,
        },
      };
      expect(() =>
        orchestrateTrial({
          ...f.options,
          ...(change === "command" ? { command: ["never"] } : {}),
          execution: { policy, adapter: f.adapter },
        }),
      ).toThrow(/DENIED/);
      expect(inertInvocationCount(f.adapter)).toBe(0);
    },
  );
  it("preserves a completed simulated near miss without counting it as model evidence", () => {
    const f = runFixture();
    const result = orchestrateTrial(f.options);
    expect(inertInvocationCount(f.adapter)).toBe(1);
    expect(result.countability.counts).toBe(false);
    const metadata = JSON.parse(readFileSync(join(result.directory, "metadata.json"), "utf8"));
    expect(metadata.evaluation.status).toBe("semantic-fail");
    expect(metadata.authoringIsolation).toBe("process");
    expect(metadata.gradingIsolation).toBe("cell-container");
    expect(readTrialDirectory(result.directory).rootCause.label).toBe("unlabelled");
  });
  it("incomplete grading and host errors are never semantic failures", () => {
    for (const grade of [
      () => ({
        cells: [
          { scenarioId: "a", failed: [] },
          { scenarioId: "a", failed: [] },
        ],
        detail: "duplicate",
        hostErrors: 0,
      }),
      () => ({ cells: [{ scenarioId: "a", failed: [] }], detail: "missing", hostErrors: 0 }),
      () => ({ cells: [], detail: "host", hostErrors: 1 }),
    ]) {
      const f = runFixture();
      const result = orchestrateTrial({ ...f.options, grade });
      expect(result.countability.counts).toBe(false);
      expect(result.record.status).toBe("infrastructure_error");
    }
  });
  it("actual adapters cannot be unlocked by test objects or arbitrary shell commands", () => {
    expect(() =>
      getProvider("shell").run({
        challengeDir: "/does-not-exist",
        submissionPath: "x",
        instruction: "x",
        timeoutMs: 1,
        env: {},
        command: ["never"],
      }),
    ).toThrow(/AUTHORIZATION_DENIED/);
  });
  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5, 0])("malformed cell count %s cannot count", (n) =>
    expect(decideCountability("completed", "", n).counts).toBe(false),
  );
  it.each(["crashed", "timeout", "refused", "infrastructure_error"] as const)(
    "%s cannot count even if an artifact contains results",
    (status) => {
      expect(
        evaluateOutcome({
          providerStatus: status,
          expectedIds: ["a"],
          cells: [{ scenarioId: "a", failed: ["work"] }],
          hostErrors: 0,
          artifactPresent: true,
        }).complete,
      ).toBe(false);
      expect(decideCountability(status, "", 1).counts).toBe(false);
    },
  );
  it("rejects malformed envelopes, unexpected IDs, ungraded cells and duplicate failing checks", () => {
    for (const cells of [
      null,
      [{}],
      [{ scenarioId: "foreign", failed: [] }],
      [{ scenarioId: "a", failed: [], error: "crashed" }],
      [{ scenarioId: "a", failed: [], unmeasured: "no grade" }],
      [{ scenarioId: "a", failed: ["c", "c"] }],
    ]) {
      expect(
        evaluateOutcome({
          providerStatus: "completed",
          expectedIds: ["a"],
          cells,
          hostErrors: 0,
          artifactPresent: true,
        }).complete,
      ).toBe(false);
    }
  });
});

describe("retained history is not current source", () => {
  it("links regrading to the original attempt and keeps both versions immutable", () => {
    const f = runFixture();
    const result = orchestrateTrial(f.options);
    const before = readFileSync(join(result.directory, "result.json"));
    const next = publishPackage(
      f.store,
      buildPackageRecord({
        ...f.input,
        version: "2",
        parent: f.snapshot.record.digest,
        files: { ...f.input.files, verifier: [{ path: "verifier.txt", bytes: Buffer.from("new grader") }] },
      }),
    );
    const historical = inspectTrialEvidence(result.directory, { store: f.store });
    expect(historical.usableSemanticObservation).toBe(true);
    expect(historical.capabilityEvidence).toBe(false);
    expect(
      inspectTrialEvidence(result.directory, { store: f.store, current: next }).usableSemanticObservation,
    ).toBe(false);
    const regrade = publishRegrade({
      store: f.store,
      originalDirectory: result.directory,
      policy: { snapshot: next, checks: CHECKS },
      grade: () => ({
        cells: [
          { scenarioId: "a", failed: [] },
          { scenarioId: "b", failed: [] },
        ],
        hostErrors: 0,
      }),
    });
    expect(regrade.newAgentAttempts).toBe(0);
    expect(regrade.targetPackageDigest).toBe(next.record.digest);
    expect(regrade.originalPackageDigest).toBe(f.snapshot.record.digest);
    expect(regrade.evaluation.status).toBe("semantic-pass");
    expect(readFileSync(join(result.directory, "result.json"))).toEqual(before);
  });
  it("detects tampered modern grading on directory ingestion", () => {
    const f = runFixture();
    const result = orchestrateTrial(f.options);
    const path = join(result.directory, "verifier-output.json");
    const output = JSON.parse(readFileSync(path, "utf8"));
    output.cells.push(output.cells[0]);
    writeFileSync(path, JSON.stringify(output));
    expect(() => readTrialDirectory(result.directory)).toThrow(/EVIDENCE_CONTENT_MISMATCH/);
  });
  it("derives retained bytes instead of trusting a forged current hash", () => {
    const dir = temporary();
    mkdirSync(join(dir, "challenge"));
    writeFileSync(join(dir, "challenge/README.md"), "old");
    const current = currentChallenge(ROOT, "caa-revalidation");
    const metadataPath = join(dir, "metadata.json");
    writeFileSync(metadataPath, JSON.stringify({ challengeHash: current.hash }));
    const result = gateByChallengeHash(ROOT, "caa-revalidation", [{ runId: "old", metadataPath, dir }]);
    expect(result.gates[0]?.matches).toBe(false);
    expect(result.gates[0]?.integrity).toBe("mismatch");
    expect(result.gates[0]?.recorded).toBe(hashChallengeDir(join(dir, "challenge")));
  });
  it("reads frozen Phase 13 local calibration without reissuing a campaign", () => {
    const rows = historicalPhase13Calibration(ROOT);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.selected.referenceFailures === 0)).toBe(true);
  });
});

describe("program gap ledger", () => {
  it("has accountable owners, dependency IDs and checkout-accessible proof for every package", () => {
    const rows = loadGapLedger(ROOT);
    for (const familyId of [...BUILT_FAMILY_IDS, "caa-revalidation-repair"])
      expect(
        rows.some((row) => row.packageId === familyId),
        familyId,
      ).toBe(true);
    for (const row of rows)
      for (const path of row.proof)
        expect(statSync(join(ROOT, path)).isFile(), `${row.id}: ${path}`).toBe(true);
    expect(new Set(rows.map((r) => r.owner))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
  });
  it("rejects duplicate IDs, unknown dependencies and unproven closure", () => {
    const first = loadGapLedger(ROOT)[0];
    if (!first) throw new Error("missing gap fixture");
    expect(() => parseGapLedger({ schemaVersion: 1, gaps: [first, first] })).toThrow(/DUPLICATE/);
    expect(() =>
      parseGapLedger({ schemaVersion: 1, gaps: [{ ...first, dependencies: ["absent"] }] }),
    ).toThrow(/UNKNOWN_DEPENDENCY/);
    expect(() =>
      parseGapLedger({ schemaVersion: 1, gaps: [{ ...first, status: "verified", proof: [] }] }),
    ).toThrow(/UNPROVEN_CLOSURE/);
  });
});
