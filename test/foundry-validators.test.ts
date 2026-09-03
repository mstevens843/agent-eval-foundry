// Mutation testing for the foundry's own checkers.
//
// Three assertions, in increasing order of how much they are worth:
//
// 1. Every known-bad fixture is rejected. Necessary, and the weakest of the three: a validator that
//    threw on everything would pass it.
// 2. Every fixture is rejected FOR ITS DECLARED CODE. This is what stops a fixture passing by
//    accident through some unrelated rule, which is how a rule quietly stops working while its test
//    stays green.
// 3. Every code in the rule table is exercised by something. A rule with no known-bad example is a
//    rule nobody has demonstrated works. This is the assertion that would have caught the failure
//    the source project measured in its own agents: two of three Opus engines shipped checkers that
//    could not express the rule they were checking, and their own fuzzers ran clean over the bug.
//
// Codes that cannot be expressed as a malformed JSON document -- coverage, scaffold and budget rules
// -- are exercised programmatically below and registered in PROGRAMMATIC so assertion 3 stays
// complete rather than quietly excusing them.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ACCESS_TOKEN_PROFILE,
  type CheckableChallengeFile,
  type LeakProfile,
  STARTER_MIN_FAILING_FRACTION,
  type StarterCheckResult,
  checkChallengePackage,
  checkStarterFailsEnough,
} from "../src/challenge/package-check.js";
import { parseMechanismProbe, parseTransferTest } from "../src/foundry/adaptive-funnel.js";
import { assertBudgetInputs, assertPlanHonest } from "../src/foundry/budget-check.js";
import { MEASURED_DEFAULTS, planBudget } from "../src/foundry/budget.js";
import { parseDiscoveryCandidate } from "../src/foundry/discovery-workbench.js";
import { assertCoverage, buildRegistry } from "../src/foundry/registry.js";
import { checkScaffold } from "../src/foundry/scaffold-check.js";
import { generateScaffold } from "../src/foundry/scaffold.js";
import { RULE_CODES, type RuleCode, SchemaError } from "../src/foundry/schema.js";
import {
  parseCandidate,
  parseMechanism,
  parseMechanisms,
  parseMutant,
  parseTaskShape,
} from "../src/foundry/validate.js";
import { MatrixError, parseMatrix } from "../src/matrix.js";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p: string): unknown => JSON.parse(readFileSync(`${ROOT}fixtures/invalid/${p}`, "utf8"));

interface FixtureEntry {
  readonly file: string;
  readonly kind:
    | "mechanism"
    | "mutant"
    | "shape"
    | "candidate"
    | "matrix"
    | "registry"
    | "probe"
    | "transfer"
    | "discovery-candidate"
    | "challenge-package";
  readonly code: string;
  readonly note: string;
}

const MANIFEST = read("manifest.json") as FixtureEntry[];

/**
 * A whole agent-facing challenge package, checked by the package checker rather than by a row
 * parser.
 *
 * `starterGrade` is the counts a real grader WOULD return, expanded below into the cell shape
 * `checkStarterFailsEnough` consumes. That indirection is the only way this rule can live in a
 * fixture corpus at all: grading one family's starter for real means running its suite in
 * subprocesses and costs 10-90 seconds, which would turn a millisecond corpus into a two-minute one
 * and put pressure on someone to skip it. The rule does not care where the counts came from, so the
 * fixture supplies them.
 *
 * The division of labour, which is the point rather than a compromise: the fixture pins the RULE
 * (the 20% floor, the boundary one scenario under it, the refusal to certify 0 of 0), while
 * `test/starter-must-fail.test.ts` pins the FACT by running this same function over all eight built
 * families with their real graders and no skip condition. Neither substitutes for the other.
 */
interface StarterFixture {
  readonly profile: string;
  readonly familyId: string;
  readonly starterGrade: {
    readonly scenarios: number;
    readonly failing: number;
    readonly hostErrors: number;
  };
  readonly files: readonly CheckableChallengeFile[];
}

/** Leak profiles a fixture may name. Named in the fixture so it cannot silently fall back to another family's profile. */
const PROFILES: Readonly<Record<string, LeakProfile>> = { ACCESS_TOKEN_PROFILE };

/**
 * Run the full package check over a fixture: first every fast rule, then the starter rule.
 *
 * The fast pass is not ceremony. Each of these fixtures claims to be a structurally PERFECT package
 * whose only defect is behavioural, and that claim is what makes it a demonstration of the starter
 * rule rather than of some filename rule that happened to fire first. Asserting it here means a
 * fixture that drifts into tripping an earlier rule reports as a broken fixture instead of quietly
 * scoring coverage for a rule it never reached.
 */
const runPackageGate = (f: StarterFixture): StarterCheckResult => {
  const profile = PROFILES[f.profile];
  if (profile === undefined) {
    throw new Error(`fixture names an unknown leak profile ${f.profile}`);
  }
  try {
    checkChallengePackage(f.files, profile);
  } catch (err) {
    throw new Error(
      `fixture is not a clean package — the fast checker rejected it (${String(err)}), so this entry would be demonstrating that rule and not the starter rule`,
    );
  }
  return checkStarterFailsEnough(f.familyId, f.files, () => ({
    cells: Array.from({ length: f.starterGrade.scenarios }, (_, i) => ({
      failed: i < f.starterGrade.failing ? ["some_check"] : [],
    })),
    hostErrors: f.starterGrade.hostErrors,
  }));
};

const PARSERS: Record<FixtureEntry["kind"], (v: unknown) => unknown> = {
  mechanism: (v) => parseMechanism(v, "fixture"),
  mutant: (v) => parseMutant(v, "fixture"),
  shape: (v) => parseTaskShape(v, "fixture"),
  candidate: (v) => parseCandidate(v, "fixture"),
  matrix: (v) => parseMatrix(v),
  probe: (v) => parseMechanismProbe(v, "fixture"),
  transfer: (v) => parseTransferTest(v, "fixture"),
  "discovery-candidate": (v) => parseDiscoveryCandidate(v, "fixture"),
  "challenge-package": (v) => runPackageGate(v as StarterFixture),
  // Cross-collection references are checked when the registry is assembled, not when a single row
  // is parsed. Routing this fixture differently is the point: a dangling id is invisible to the row
  // validator by design, and a corpus that hid that would be testing the wrong layer.
  registry: (v) => buildRegistry([parseMechanism(v, "fixture")], [], [], []),
};

/**
 * Rules exercised in ANOTHER test file, with the file named.
 *
 * Splitting this out from PROGRAMMATIC matters: "covered somewhere" and "covered here" are different
 * claims, and a list that merged them would let a rule be excused by a file nobody has to name. Each
 * entry below is a promise that `test/trials.test.ts` asserts the code fires, and that file has a
 * matching test per rule.
 */
const COVERED_IN_TRIALS_TEST: readonly RuleCode[] = [
  "TRIAL_COUNTS_WITHOUT_REASON",
  "TRIAL_REFUSAL_COUNTED",
  "TRIAL_AGENT_WITHOUT_MODEL",
  "TRIAL_AGENT_WITHOUT_ARTIFACT",
  "TRIAL_EMPTY_CELLS",
  "TRIAL_DUPLICATE_RUN_ID",
  "CHALLENGE_LEAKS_HIDDEN_ARTIFACT",
  "CHALLENGE_MISSING_SURFACE",
  "CHALLENGE_MANIFEST_MISMATCH",
];

/**
 * Rules whose known-bad case lives in `orchestration.test.ts`, because building one takes a real
 * trial directory on disk rather than a JSON fixture. Same delegation contract as above: the guard
 * below asserts each of these actually appears in that file.
 */
const COVERED_IN_ORCHESTRATION_TEST: readonly RuleCode[] = [
  "TRIALDIR_MISSING_FILE",
  "TRIALDIR_COUNTED_WITHOUT_VERIFIER",
  "TRIALDIR_COUNTED_WITHOUT_SUBMISSION",
  "TRIALDIR_CHALLENGE_LEAK",
  "TRIALDIR_SET_MISMATCH",
  "BANK_ADDITIVE_WITHOUT_OVERLAP",
  "BANK_INCOMPARABLE_SCENARIO_SET",
  "TRIAL_BASELINE_IMPOSTER",
  "TRIAL_COST_CONTRADICTS_USAGE",
];

/**
 * Rules whose known-bad case lives in `history-task-attribution.test.ts`: the cell-level guard that
 * stops the Harbor importer hedging a fabricated failure by marking a cell both ungraded and failing.
 */
const COVERED_IN_HISTORY_TASK_TEST: readonly RuleCode[] = ["TRIAL_CELL_UNMEASURED_WITH_FAILURES"];

/**
 * Rules whose known-bad case lives in `evolution.test.ts`: the kill taxonomy, the evolution engine,
 * the sampler and the ledger-consistency checks. Same delegation contract — the guard below asserts
 * each of these actually appears in that file.
 */
const COVERED_IN_EVOLUTION_TEST: readonly RuleCode[] = [
  "SAMPLE_KNOB_FROZEN",
  "KILL_WITHOUT_REASON",
  "KILL_WITHOUT_EVIDENCE",
  "KILL_REASON_UNSUPPORTED",
  "KILL_DISPOSITION_MISSING",
  "KILL_UNKNOWN_REASON",
  "VARIANT_IDENTICAL_TO_PARENT",
  "VARIANT_WITHOUT_OPERATOR",
  "VARIANT_NO_MECHANISM_DELTA",
  "VARIANT_UNKNOWN_MECHANISM",
  "VARIANT_PROMOTED_WITHOUT_BUILD",
  "LEDGER_STATUS_CONTRADICTS_GATE",
  "LEDGER_KILL_WITHOUT_ANALYSIS",
];

/**
 * Rules whose known-bad case lives in `trials-routing.test.ts`: the campaign plan format, the
 * challenge hash, bank kinds and status coherence. Same delegation contract as above.
 */
const COVERED_IN_ROUTING_TEST: readonly RuleCode[] = [
  "TRIAL_CHALLENGE_HASH_MISSING",
  "TRIAL_CHALLENGE_HASH_MISMATCH",
  "CAMPAIGN_NO_KILL_SIGNAL",
  "CAMPAIGN_COUNTING_CONTRADICTS_CODE",
  "CAMPAIGN_SLOT_WITHOUT_RUN",
  "CAMPAIGN_CHALLENGE_HASH_MISMATCH",
  "CAMPAIGN_RETRY_ON_REFUSAL",
  "STATUS_SHIP_WITHOUT_TRIALS",
  "STATUS_SHIP_ALREADY_SOLVED",
  "STATUS_STAGE_WITHOUT_EVIDENCE",
  "BANK_KIND_MISMATCH",
];

/**
 * Rules whose known-bad case lives in `cross-provider.test.ts`: strict import of externally-run
 * bundles, and the evidence lifecycle that invalidates trials when a family is repaired.
 */
const COVERED_IN_CROSS_PROVIDER_TEST: readonly RuleCode[] = [
  "IMPORT_MISSING_METADATA",
  "IMPORT_FAMILY_MISMATCH",
  "IMPORT_CHALLENGE_MISMATCH",
  "IMPORT_MISSING_TRANSCRIPT",
  "IMPORT_MISSING_SUBMISSION",
  "EVIDENCE_STALE_COUNTED",
  "EVIDENCE_CAMPAIGN_NOT_REISSUED",
  "EVIDENCE_SUPERSEDED_HIDDEN",
  "EVIDENCE_AMBIGUITY_UNDOCUMENTED",
];

/**
 * Rules whose known-bad case lives in `cross-family-evidence.test.ts`: challenge migrations, the
 * stale-evidence guard that runs over rendered report text, and the chain detector.
 */
const COVERED_IN_CROSS_FAMILY_TEST: readonly RuleCode[] = [
  "MIGRATION_UNDECLARED",
  "MIGRATION_UNREASONED",
  "MIGRATION_LOSSES_UNRECORDED",
  "REPORT_STALE_UNLABELLED",
  "CHAIN_QUOTED_AS_BREADTH",
  "BANK_BELOW_THRESHOLD",
  "BANK_INCOMPARABLE",
];

/**
 * Rules whose known-bad case lives in `human-solvability.test.ts`: clean-room human solve
 * countability and human-evidenced claim coherence.
 */
const COVERED_IN_HUMAN_SOLVABILITY_TEST: readonly RuleCode[] = [
  "HUMAN_COUNTED_HASH_MISSING",
  "HUMAN_COUNTED_HASH_STALE",
  "HUMAN_COUNTED_AUTHOR",
  "HUMAN_COUNTED_SAW_HIDDEN",
  "HUMAN_COUNTED_PRIVATE_HINT",
  "HUMAN_COUNTED_NO_NOTES",
  "HUMAN_COUNTED_NO_TIME_RECORD",
  "HUMAN_COUNTED_VERIFIER_NOT_RUN",
  "HUMAN_COUNTED_PACKAGE_DIFFERS",
  "HUMAN_CLAIM_WITHOUT_CLEAN_RECORD",
];

/**
 * Rules whose known-bad case lives in `adversarial-audit.test.ts`: verifier-integrity audit
 * countability, bypass repair lifecycle and adversarial-audited claim coherence.
 */
const COVERED_IN_ADVERSARIAL_AUDIT_TEST: readonly RuleCode[] = [
  "ADV_COUNTED_HASH_MISSING",
  "ADV_COUNTED_HASH_STALE",
  "ADV_COUNTED_NO_TRANSCRIPT",
  "ADV_COUNTED_NO_ATTACK_SURFACE",
  "ADV_COUNTED_NO_ACCESS_BOUNDARY",
  "ADV_COUNTED_PROVIDER_REFUSAL",
  "ADV_COUNTED_INFRA_ERROR",
  "ADV_COUNTED_TIMEOUT",
  "ADV_COUNTED_NO_COUNTABILITY_REASON",
  "ADV_COUNTED_NO_BYPASS_WITHOUT_VERIFIER",
  "ADV_COUNTED_BYPASS_WITHOUT_EXPLOIT",
  "ADV_BYPASS_FIXED_WITHOUT_REPAIR",
  "ADV_REPAIR_CHANGED_PACKAGE_WITHOUT_INVALIDATION",
  "ADV_CLAIM_WITHOUT_NO_BYPASS_AUDIT",
  "ADV_HIDDEN_ARTIFACT_IN_ATTACKER_CONTEXT",
  "ADV_V2_COUNTED_NO_EXECUTION_PROFILE",
  "ADV_V2_COUNTED_NO_ISOLATION_PROFILE",
  "ADV_V2_COUNTED_WEAK_ISOLATION",
  "ADV_V2_COUNTED_NO_TRIAGE",
  "ADV_V2_COUNTED_NO_REPLAY_RESULT",
  "ADV_V2_COUNTED_BYPASS_REPLAY_NOT_PASSING",
  "ADV_V2_COUNTED_BYPASS_NO_CONTRACT_VIOLATION",
  "ADV_V2_COUNTED_BYPASS_FORBIDDEN_ACCESS",
  "ADV_V2_COUNTED_NO_BYPASS_NOT_ATTEMPTED",
  "ADV_V2_COUNTED_NO_BYPASS_THEORETICAL_ONLY",
  "ADV_V2_COUNTED_NORMAL_SOLUTION",
  "ADV_V2_COUNTED_PROBES_FAILING",
  "ADV_CONTAINER_COUNTED_NO_METADATA",
  "ADV_CONTAINER_COUNTED_NETWORK_ENABLED",
  "ADV_CONTAINER_COUNTED_REPO_ROOT_MOUNTED",
  "ADV_CONTAINER_COUNTED_HIDDEN_FILES_MOUNTED",
  "ADV_CONTAINER_COUNTED_VERIFIER_INSIDE",
  "ADV_CONTAINER_COUNTED_UNPRESERVED_DIRS",
  "ADV_CONTAINER_COUNTED_SECRET_ENV",
  "ADV_CONTAINER_COUNTED_READINESS_FAILED",
];

/** Rules whose known-bad case lives in `probe-runner.test.ts`: executable mechanism probes and discovery calibration. */
const COVERED_IN_PROBE_RUNNER_TEST: readonly RuleCode[] = [
  "PROBE_NO_TRUTH_SOURCE",
  "PROBE_NO_HIDDEN_BEHAVIOR",
  "PROBE_NO_BAD_SUBJECT",
  "PROBE_NO_PROMOTION_CRITERIA",
  "PROBE_NO_SCENARIOS",
  "PROBE_REFERENCE_FAILS",
  "PROBE_BAD_SUBJECT_NOT_CAUGHT",
  "PROBE_UNINTENDED_FAILURE",
];

/**
 * Rules whose known-bad case lives in `outbox-import-validators.test.ts`.
 *
 * These four had NO case anywhere, which meant this suite had been failing since the CTRF import was
 * written — invisibly, because the verification suite was deferred for three phases. The cases are
 * real corruptions fed to the real import, not entries added to this list to quiet it.
 */
const COVERED_IN_OUTBOX_IMPORT_TEST: readonly RuleCode[] = [
  "OUTBOX_CTRF_TUPLE_MISMATCH",
  "OUTBOX_CTRF_FAILURE_MISCOUNT",
  "OUTBOX_TASK_SUBTREE_MISSING",
  "OUTBOX_RUN_WITHOUT_TRIAL",
];

/** Rules whose known-bad case lives in `label-parity.test.ts`: difficulty must be attributed. */
const COVERED_IN_LABEL_PARITY_TEST: readonly RuleCode[] = ["PROMOTION_DIFFICULTY_UNATTRIBUTED"];

/** Rules whose known-bad case lives in `promotion.test.ts`: probe-to-family promotion validation. */
const COVERED_IN_PROMOTION_TEST: readonly RuleCode[] = [
  "PROMOTION_NO_SOURCE_PROBE",
  "PROMOTION_SOURCE_NOT_PROMOTED",
  "PROMOTION_NO_FIXED",
  "PROMOTION_NO_CHANGED",
  "PROMOTION_NO_TRUTH_SOURCE",
  "PROMOTION_NO_EXPECTED_MUTANTS",
  "PROMOTION_NO_KILL_SIGNAL",
  "PROMOTION_CLAIMS_DIFFICULTY_PRETRIAL",
  "PROMOTION_HIDDEN_RULE_SURFACE_UNDECLARED",
];

/** Rules whose known-bad case lives in `lineage.test.ts`: lineage graph, solve routing and feedback labels. */
const COVERED_IN_LINEAGE_TEST: readonly RuleCode[] = [
  "LINEAGE_NO_ROOT",
  "LINEAGE_NODE_UNKNOWN_FAMILY",
  "LINEAGE_EDGE_DANGLING_NODE",
  "LINEAGE_NO_FIXED_DELTA",
  "LINEAGE_NO_CHANGED_DELTA",
  "LINEAGE_CROSS_LAB_FROM_SAME_PROVIDER",
  "LINEAGE_MATRIX_AFTER_CLEAN_PASS",
  "LINEAGE_FEEDBACK_UNLABELLED",
  "LINEAGE_NO_REALLOCATION",
  "LINEAGE_WITHDRAWN_EVIDENCE_CLAIMED_INFORMATIVE",
  "LINEAGE_WITHDRAWAL_UNREASONED",
  "LINEAGE_FEEDBACK_WITHDRAWN_UNREASONED",
  "LINEAGE_REALLOCATION_ON_WITHDRAWN_EVIDENCE",
];

/** Rules whose known-bad case lives in `provider-delta.test.ts`: cross-provider smoke routing. */
const COVERED_IN_PROVIDER_DELTA_TEST: readonly RuleCode[] = [
  "PROVIDER_DELTA_NON_OPENAI_MISSING",
  "PROVIDER_DELTA_UNCOUNTED_NON_OPENAI",
  "PROVIDER_DELTA_STALE_OR_INVALID_EVIDENCE",
  "PROVIDER_DELTA_OPENAI_ONLY_NO_CROSS_LAB",
  "PROVIDER_DELTA_MIXED_PROVIDER_SIGNAL",
  "PROVIDER_DELTA_MATRIX_NOT_AUTOMATIC",
  "PROVIDER_DELTA_PROVIDER_FAILURE_NO_COUNT",
  "PROVIDER_DELTA_INFRA_NO_COUNT",
];

/** Rules whose known-bad case lives in deployment-alias tests: production routing. */
const COVERED_IN_DEPLOYMENT_ALIAS_TEST: readonly RuleCode[] = [
  "PRODUCTION_LOCAL_VERIFIER_NOT_READY",
  "PRODUCTION_PACKAGE_NOT_BACKED",
  "PRODUCTION_NO_COUNTED_SMOKE",
  "PRODUCTION_STALE_HASH_BLOCKS_MATRIX",
  "PRODUCTION_PROVIDER_FAILURE_NO_COUNT",
  "PRODUCTION_CLEAN_PASS_NOT_DIFFICULTY",
  "PRODUCTION_OFF_TARGET_SMOKE_REPAIR",
  "PRODUCTION_TRANSFER_NOT_DECLARED",
  "PRODUCTION_MATRIX_NEEDS_NON_OPENAI_SMOKE",
  "PRODUCTION_CROSS_LAB_SMOKE_MIXED",
  "PRODUCTION_OPENAI_ONLY_NO_CROSS_LAB",
  "PRODUCTION_LOCAL_MUTANTS_NOT_DIFFICULTY",
  "PRODUCTION_ADVERSARIAL_NOT_READY",
  "PRODUCTION_ADVERSARIAL_READY_NOT_AUDITED",
  "PRODUCTION_HUMAN_READY_NOT_EVIDENCED",
  "PRODUCTION_UNREPAIRED_BYPASS",
];

/** Rules whose known-bad case lives in `provider-delta-diagnosis.test.ts`: mixed-provider diagnosis routing. */
const COVERED_IN_PROVIDER_DELTA_DIAGNOSIS_TEST: readonly RuleCode[] = [
  "PROVIDER_DELTA_DIAGNOSIS_MISSING_ARTIFACT",
  "PROVIDER_DELTA_DIAGNOSIS_STALE_HASH",
  "PROVIDER_DELTA_DIAGNOSIS_MIXED_MATRIX_BLOCKED",
  "PROVIDER_DELTA_DIAGNOSIS_NOT_DIFFICULTY_EVIDENCE",
  "PROVIDER_DELTA_DIAGNOSIS_SAME_PROVIDER_STABILITY_ONLY",
  "PROVIDER_DELTA_EVOLUTION_PROPOSAL_INCOMPLETE",
];

/** Rules whose known-bad case lives in `external-intake.test.ts`: third-party packet countability. */
const COVERED_IN_EXTERNAL_INTAKE_TEST: readonly RuleCode[] = [
  "EXTERNAL_PACKET_MISSING_TEMPLATE",
  "EXTERNAL_PACKET_LEAKS_HIDDEN",
  "EXTERNAL_INTAKE_METADATA_MISSING",
  "EXTERNAL_INTAKE_CHALLENGE_HASH_MISSING",
  "EXTERNAL_INTAKE_CHALLENGE_HASH_STALE",
  "EXTERNAL_INTAKE_MODIFIED_CHALLENGE_PACKAGE",
  "EXTERNAL_INTAKE_PROVIDER_ID_MISSING",
  "EXTERNAL_INTAKE_TRANSCRIPT_MISSING",
  "EXTERNAL_INTAKE_SUBMISSION_MISSING",
  "EXTERNAL_INTAKE_VERIFIER_OUTPUT_MISSING",
  "EXTERNAL_INTAKE_HIDDEN_ARTIFACT_LEAK",
  "EXTERNAL_INTAKE_PROVIDER_REFUSAL_COUNTED",
  "EXTERNAL_INTAKE_INFRA_ERROR_COUNTED",
  "EXTERNAL_INTAKE_AUTHOR_CONTAMINATED",
  "EXTERNAL_INTAKE_PRIVATE_HINT",
  "EXTERNAL_INTAKE_SCENARIO_SET_MISMATCH",
  "EXTERNAL_INTAKE_VERIFIER_RUN_MISMATCH",
  "EXTERNAL_INTAKE_DUPLICATE_RUN_ID",
  "EXTERNAL_INTAKE_PROVIDER_FAMILY_MISLABELLED",
];

/** Per-trial root-cause records; every one has a known-bad case in test/root-cause.test.ts. */
const COVERED_IN_ROOT_CAUSE_TEST: readonly RuleCode[] = [
  "ROOTCAUSE_UNKNOWN_LABEL",
  "ROOTCAUSE_NO_RATIONALE",
  "ROOTCAUSE_NO_EVIDENCE",
  "ROOTCAUSE_NO_LABELLER",
  "ROOTCAUSE_RUN_MISMATCH",
  "ROOTCAUSE_LABEL_CONTRADICTS_OUTCOME",
  "ROOTCAUSE_CAPABILITY_OVER_UNREAD_DIAGNOSIS",
];

/** Rules exercised by code below rather than by a JSON fixture. Keeps assertion 3 honest. */
const PROGRAMMATIC: readonly RuleCode[] = [
  "E_TYPE",
  "E_SHAPE",
  "E_DUPLICATE_ID",
  "COVERAGE_MECHANISM_WITHOUT_MUTANT",
  "COVERAGE_MUTANT_ORPHANED",
  "SCAFFOLD_MISSING_ARTIFACT",
  "SCAFFOLD_EMPTY_ARTIFACT",
  "SCAFFOLD_METADATA_MISMATCH",
  "BUDGET_NO_LABOUR_COST",
  "BUDGET_IMPLAUSIBLE_YIELD",
  "BUDGET_NEGATIVE_INPUT",
  "BUDGET_RETRY_RATE_OUT_OF_RANGE",
  "BUDGET_KILL_RATE_OUT_OF_RANGE",
  "BUDGET_LOST_RUN_RATE_OUT_OF_RANGE",
];

describe("known-bad fixtures", () => {
  it("the corpus is non-trivial", () => {
    expect(MANIFEST.length).toBeGreaterThanOrEqual(25);
  });

  for (const entry of MANIFEST) {
    it(`rejects ${entry.file} with ${entry.code}`, () => {
      let thrown: unknown;
      try {
        PARSERS[entry.kind](read(entry.file));
      } catch (err) {
        thrown = err;
      }
      expect(thrown, `${entry.file} was accepted; ${entry.note}`).toBeDefined();
      const code =
        thrown instanceof SchemaError
          ? thrown.code
          : thrown instanceof MatrixError
            ? thrown.code
            : `unexpected:${String(thrown)}`;
      // The load-bearing assertion: rejected for the DECLARED reason, not by luck.
      expect(code, `${entry.file} was rejected, but by the wrong rule`).toBe(entry.code);
    });
  }
});

describe("the challenge-package harness is not simply 'always throws'", () => {
  // Assertion 2 above proves each fixture is rejected for the starter rule. It cannot prove the
  // harness that feeds the rule is honest: a `runPackageGate` that ignored `starterGrade` and always
  // handed the checker a passing starter would reject all three fixtures for the right code while
  // demonstrating nothing about the floor. One accepting case fixes that, and pins where the
  // boundary is at the same time.
  const solvesFamily = read("challenge-packages/starter-solves-family.json") as StarterFixture;

  it("accepts the same package when its starter fails exactly the floor", () => {
    const atFloor = { ...solvesFamily, starterGrade: { scenarios: 100, failing: 20, hostErrors: 0 } };
    const result = runPackageGate(atFloor);
    expect(result.failing).toBe(20);
    expect(result.scenarios).toBe(100);
    expect(result.failingFraction).toBe(STARTER_MIN_FAILING_FRACTION);
  });

  it("rejects it one scenario below the floor, so the counts are what decide", () => {
    const under = { ...solvesFamily, starterGrade: { scenarios: 100, failing: 19, hostErrors: 0 } };
    expect(() => runPackageGate(under)).toThrowError(
      expect.objectContaining({ code: "CHALLENGE_STARTER_SOLVES_FAMILY" }),
    );
  });
});

describe("structural rules", () => {
  const base = read("mechanisms/no-measurable-signal.json") as Record<string, unknown>;

  it("E_TYPE — a field of the wrong type", () => {
    expect(() => parseMechanism({ ...base, name: 42 }, "f")).toThrowError(
      expect.objectContaining({ code: "E_TYPE" }),
    );
  });

  it("E_SHAPE — a document that is not an object", () => {
    expect(() => parseMechanism([1, 2, 3], "f")).toThrowError(expect.objectContaining({ code: "E_SHAPE" }));
  });

  it("E_DUPLICATE_ID — two entries with the same id", () => {
    const one = read("mechanisms/dangling-mutant-ref.json");
    expect(() => parseMechanisms([one, one], "f")).toThrowError(
      expect.objectContaining({ code: "E_DUPLICATE_ID" }),
    );
  });
});

describe("coverage rules", () => {
  const mech = {
    id: "lonely-mechanism",
    name: "Lonely",
    summary: "No mutant exercises it.",
    whyAgentsFail: "n/a",
    whatCorrectSystemsDo: "n/a",
    falsePositiveShape: "n/a",
    exampleDomains: [],
    suggestedMutants: ["some-mutant"],
    fairnessRisks: [],
    cheatRisks: [],
    measurableSignals: ["a signal"],
    maturity: "argued",
    evidence: null,
  };
  const mutant = {
    id: "some-mutant",
    name: "Some mutant",
    bug: "n/a",
    mechanisms: ["other-mechanism"],
    caughtBy: ["a check"],
    falseConfidence: "n/a",
    sketch: "n/a",
  };

  it("COVERAGE_MECHANISM_WITHOUT_MUTANT — a mechanism nothing can detect", () => {
    const other = { ...mech, id: "other-mechanism", suggestedMutants: ["some-mutant"] };
    const registry = buildRegistry(
      [parseMechanism(mech, "m0"), parseMechanism(other, "m1")],
      [parseMutant(mutant, "x0")],
      [],
      [],
    );
    // `lonely-mechanism` is named by no mutant, so nothing in the bank exercises it.
    expect(() => assertCoverage(registry)).toThrowError(
      expect.objectContaining({ code: "COVERAGE_MECHANISM_WITHOUT_MUTANT" }),
    );
  });

  it("COVERAGE_MUTANT_ORPHANED — a mutant no mechanism suggests and no family expects", () => {
    const m = parseMechanism({ ...mech, id: "other-mechanism", suggestedMutants: ["some-mutant"] }, "m");
    const used = parseMutant(mutant, "x0");
    const orphan = parseMutant({ ...mutant, id: "orphan-mutant" }, "x1");
    expect(() => assertCoverage(buildRegistry([m], [used, orphan], [], []))).toThrowError(
      expect.objectContaining({ code: "COVERAGE_MUTANT_ORPHANED" }),
    );
  });

  it("E_DANGLING_REF fires across collections, not just within a document", () => {
    const m = parseMechanism({ ...mech, suggestedMutants: ["nope"] }, "m");
    expect(() => buildRegistry([m], [], [], [])).toThrowError(
      expect.objectContaining({ code: "E_DANGLING_REF" }),
    );
  });
});

describe("scaffold rules", () => {
  const registry = buildRegistry(
    [
      parseMechanism(
        {
          id: "m-one",
          name: "M",
          summary: "s",
          whyAgentsFail: "w",
          whatCorrectSystemsDo: "c",
          falsePositiveShape: "f",
          exampleDomains: [],
          suggestedMutants: ["x-one"],
          fairnessRisks: ["r"],
          cheatRisks: ["c"],
          measurableSignals: ["s"],
          maturity: "argued",
          evidence: null,
        },
        "m",
      ),
    ],
    [
      parseMutant(
        {
          id: "x-one",
          name: "X",
          bug: "b",
          mechanisms: ["m-one"],
          caughtBy: ["a"],
          falseConfidence: "f",
          sketch: "s",
        },
        "x",
      ),
    ],
    [],
    [],
  );
  const good = generateScaffold(
    { familyId: "demo", name: "Demo", domain: "payments", mechanismIds: ["m-one"] },
    registry,
  );

  it("the generator's own output passes the independent checker", () => {
    expect(() => checkScaffold(good.files, "demo")).not.toThrow();
  });

  it("SCAFFOLD_MISSING_ARTIFACT — a gate was skipped", () => {
    const missing = good.files.filter((f) => f.path !== "mutant-plan.md");
    expect(() => checkScaffold(missing, "demo")).toThrowError(
      expect.objectContaining({ code: "SCAFFOLD_MISSING_ARTIFACT" }),
    );
  });

  it("SCAFFOLD_EMPTY_ARTIFACT — a file that looks finished and says nothing", () => {
    const hollow = good.files.map((f) =>
      f.path === "fairness-checklist.md" ? { path: f.path, content: "# Fairness\n" } : f,
    );
    expect(() => checkScaffold(hollow, "demo")).toThrowError(
      expect.objectContaining({ code: "SCAFFOLD_EMPTY_ARTIFACT" }),
    );
  });

  it("SCAFFOLD_METADATA_MISMATCH — the manifest disagrees with the folder", () => {
    expect(() => checkScaffold(good.files, "a-different-family")).toThrowError(
      expect.objectContaining({ code: "SCAFFOLD_METADATA_MISMATCH" }),
    );
  });
});

describe("budget rules", () => {
  // Built from MEASURED_DEFAULTS rather than a hand-rolled literal. The literal it replaced had to
  // be kept in sync by hand and was not: it still carried `usdPerMatrix`, `instancesPerFamily` and
  // `evolutionCyclesPerSurvivor` after the budget model retired all three.
  const sane = { ...MEASURED_DEFAULTS, totalUsd: 100_000, labourRateUsdPerHour: 120 };

  it("a sane plan passes both checkers", () => {
    expect(() => assertBudgetInputs(sane)).not.toThrow();
    expect(() => assertPlanHonest(planBudget(sane))).not.toThrow();
  });

  it("BUDGET_NEGATIVE_INPUT — a non-positive input", () => {
    expect(() => assertBudgetInputs({ ...sane, hoursPerFamily: 0 })).toThrowError(
      expect.objectContaining({ code: "BUDGET_NEGATIVE_INPUT" }),
    );
  });

  it("BUDGET_LOST_RUN_RATE_OUT_OF_RANGE — a loss rate of 1, at which no run ever returns", () => {
    // Buying N verdicts costs N/(1-lostRunRate) runs, so at 1 the cost of any evidence is infinite.
    // Measured at 0.0667 across 30 recorded runs; the guard exists because nothing validated it and
    // nothing priced it for four phases.
    expect(() => assertBudgetInputs({ ...sane, lostRunRate: 1 })).toThrowError(
      expect.objectContaining({ code: "BUDGET_LOST_RUN_RATE_OUT_OF_RANGE" }),
    );
  });

  it("BUDGET_KILL_RATE_OUT_OF_RANGE — a kill rate of 1, at which nothing ever ships", () => {
    // `buildsPerShippedFamily` is `1 / (1 - rate)`. At 1 that is infinite: every family built dies,
    // so the cost of shipping one is unbounded. That is a statement about the pipeline, not a plan,
    // and it used to sail through unvalidated along with `descendantReuse`.
    expect(() => assertBudgetInputs({ ...sane, postBuildKillRate: 1 })).toThrowError(
      expect.objectContaining({ code: "BUDGET_KILL_RATE_OUT_OF_RANGE" }),
    );
  });

  it("BUDGET_RETRY_RATE_OUT_OF_RANGE — a rate outside [0,1]", () => {
    expect(() => assertBudgetInputs({ ...sane, retryRate: 3 })).toThrowError(
      expect.objectContaining({ code: "BUDGET_RETRY_RATE_OUT_OF_RANGE" }),
    );
  });

  it("BUDGET_NO_LABOUR_COST — the fake 1,000-tasks-for-$100k plan", () => {
    // The shape this rule exists to catch: price the trials, omit the engineering, divide.
    const fake = { ...sane, hoursPerFamily: 0.1, hoursPerScreenedCandidate: 0.01 };
    const plan = planBudget(fake);
    // It "works" arithmetically, and spectacularly: omitting the engineering multiplies the yield.
    expect(plan.deliverableTasks).toBeGreaterThan(planBudget(sane).deliverableTasks * 10);
    expect(() => assertPlanHonest(plan)).toThrowError(
      expect.objectContaining({ code: "BUDGET_NO_LABOUR_COST" }),
    );
  });

  it("BUDGET_IMPLAUSIBLE_YIELD — a plan that does not fit its own budget", () => {
    // Labour priced at a token rate so the share check passes, but the implied engineer-years
    // exceed what the money buys at that rate.
    const plan = planBudget(sane);
    const inflated = { ...plan, impliedEngineerYears: plan.impliedEngineerYears * 100 };
    expect(() => assertPlanHonest(inflated)).toThrowError(
      expect.objectContaining({ code: "BUDGET_IMPLAUSIBLE_YIELD" }),
    );
  });
});

describe("rule coverage — the mutation test on the checkers themselves", () => {
  it("every rule code has at least one known-bad case", () => {
    const fromFixtures = new Set(MANIFEST.map((m) => m.code));
    const covered = new Set<string>([
      ...fromFixtures,
      ...PROGRAMMATIC,
      ...COVERED_IN_TRIALS_TEST,
      ...COVERED_IN_HISTORY_TASK_TEST,
      ...COVERED_IN_ORCHESTRATION_TEST,
      ...COVERED_IN_EVOLUTION_TEST,
      ...COVERED_IN_ROUTING_TEST,
      ...COVERED_IN_CROSS_PROVIDER_TEST,
      ...COVERED_IN_CROSS_FAMILY_TEST,
      ...COVERED_IN_HUMAN_SOLVABILITY_TEST,
      ...COVERED_IN_ADVERSARIAL_AUDIT_TEST,
      ...COVERED_IN_PROBE_RUNNER_TEST,
      ...COVERED_IN_PROMOTION_TEST,
      ...COVERED_IN_LINEAGE_TEST,
      ...COVERED_IN_PROVIDER_DELTA_TEST,
      ...COVERED_IN_DEPLOYMENT_ALIAS_TEST,
      ...COVERED_IN_PROVIDER_DELTA_DIAGNOSIS_TEST,
      ...COVERED_IN_EXTERNAL_INTAKE_TEST,
      ...COVERED_IN_ROOT_CAUSE_TEST,
      ...COVERED_IN_OUTBOX_IMPORT_TEST,
      ...COVERED_IN_LABEL_PARITY_TEST,
    ]);
    const uncovered = RULE_CODES.filter((c) => !covered.has(c));
    expect(
      uncovered,
      `these rules have no known-bad example, so nobody has shown they work: ${uncovered.join(", ")}`,
    ).toEqual([]);
  });

  it("every rule delegated to another file is actually asserted there", () => {
    // Guards the delegation itself: a code listed as covered elsewhere must appear in that file, or
    // the exemption is a hole rather than a pointer.
    const delegated: readonly (readonly [string, readonly RuleCode[]])[] = [
      ["test/trials.test.ts", COVERED_IN_TRIALS_TEST],
      ["test/history-task-attribution.test.ts", COVERED_IN_HISTORY_TASK_TEST],
      ["test/orchestration.test.ts", COVERED_IN_ORCHESTRATION_TEST],
      ["test/evolution.test.ts", COVERED_IN_EVOLUTION_TEST],
      ["test/trials-routing.test.ts", COVERED_IN_ROUTING_TEST],
      ["test/cross-provider.test.ts", COVERED_IN_CROSS_PROVIDER_TEST],
      ["test/cross-family-evidence.test.ts", COVERED_IN_CROSS_FAMILY_TEST],
      ["test/human-solvability.test.ts", COVERED_IN_HUMAN_SOLVABILITY_TEST],
      ["test/adversarial-audit.test.ts", COVERED_IN_ADVERSARIAL_AUDIT_TEST],
      ["test/probe-runner.test.ts", COVERED_IN_PROBE_RUNNER_TEST],
      ["test/promotion.test.ts", COVERED_IN_PROMOTION_TEST],
      ["test/lineage.test.ts", COVERED_IN_LINEAGE_TEST],
      ["test/provider-delta.test.ts", COVERED_IN_PROVIDER_DELTA_TEST],
      ["test/deployment-alias-family.test.ts", COVERED_IN_DEPLOYMENT_ALIAS_TEST],
      ["test/provider-delta-diagnosis.test.ts", COVERED_IN_PROVIDER_DELTA_DIAGNOSIS_TEST],
      ["test/external-intake.test.ts", COVERED_IN_EXTERNAL_INTAKE_TEST],
      ["test/root-cause.test.ts", COVERED_IN_ROOT_CAUSE_TEST],
    ];
    for (const [file, codes] of delegated) {
      const source = readFileSync(`${ROOT}${file}`, "utf8");
      const missing = codes.filter((c) => !source.includes(c));
      expect(
        missing,
        `listed as covered in ${file} but never mentioned there: ${missing.join(", ")}`,
      ).toEqual([]);
    }
  });

  it("no fixture declares a code outside the rule table or the matrix loader's codes", () => {
    const matrixCodes = new Set([
      "E_TYPE",
      "E_SHAPE",
      "E_SCHEMA",
      "E_DUP",
      "E_MISSING_ROW",
      "E_MISSING_CELL",
      "E_UNKNOWN_SUBJECT",
      "E_UNKNOWN_INSTANCE",
      "E_NO_CAVEAT",
      "E_REFERENCE_IN_SUBJECTS",
    ]);
    const known = new Set<string>([...RULE_CODES, ...matrixCodes]);
    const stray = MANIFEST.filter((m) => !known.has(m.code)).map((m) => `${m.file}:${m.code}`);
    expect(stray).toEqual([]);
  });
});
