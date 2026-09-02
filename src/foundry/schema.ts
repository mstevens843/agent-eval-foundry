// The foundry's domain model: mechanisms, mutants, task shapes, and the candidate ledger.
//
// The axis meter (src/*.ts at the root) answers one question about a suite that already exists: how
// many things does it measure? This layer covers everything before that suite exists -- which
// failure mechanism a task is built around, what a wrong implementation looks like, what the
// family's parameter space is, and which candidates survived screening. The two layers meet at the
// axis report, which is the gate a family passes before it earns frontier budget.
//
// WHY EVERY RULE HAS A CODE
//
// This project argues that a checker you cannot state completely is a checker that runs green over
// the bug it was built to catch. That was the measured finding from the benchmark this grew out of:
// of six frontier engines, the only one that avoided the central defect was the one that wrote down
// a legal-transition table instead of checking by feel. So the validators here are written the same
// way -- as an enumerated table of rules, each with a stable code.
//
// The codes are not decoration. `fixtures/invalid/` holds a known-bad document per rule, each
// declaring the code it should trip, and `test/foundry-validators.test.ts` asserts three things:
// every fixture is rejected, every fixture is rejected for the DECLARED reason rather than
// accidentally by some other rule, and every code in the table has at least one fixture. That last
// assertion is the mutation test: a rule with no known-bad example is a rule nobody has shown works.
//
// FOUR DECISIONS RUN THROUGH THE TYPES
//
// 1. Every claim carries its epistemic status -- `dataQuality: "measured" | "estimated"`, `maturity`
//    on a mechanism. A foundry that prints a measured number and a guessed number in the same column
//    without a marker is a machine for laundering guesses into facts.
// 2. Cross-references are checked, never assumed. Dangling ids are how a registry rots: nothing
//    breaks, coverage quietly overcounts, and later nobody knows which half is real.
// 3. Validation refuses rather than repairs, matching src/matrix.ts. Every plausible repair here
//    makes the registry look more complete than it is.
// 4. Status is a lifecycle, not a label, and kills are as visible as ships -- the kill rate is the
//    only honest input to the budget model.

export const MECHANISM_MATURITY = ["measured", "argued", "speculative"] as const;
export type MechanismMaturity = (typeof MECHANISM_MATURITY)[number];

export const TASK_STATUS = [
  "idea",
  "candidate",
  "built",
  "screened",
  "trialed",
  "shipped",
  "killed",
] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

export const DECISIONS = ["promote", "kill", "open"] as const;
export type Decision = (typeof DECISIONS)[number];

export const DATA_QUALITY = ["measured", "estimated"] as const;
export type DataQuality = (typeof DATA_QUALITY)[number];

// ---------------------------------------------------------------- the rule table
//
// Every validation failure in the foundry is one of these. Structural codes cover malformed JSON;
// the rest are domain rules that encode a judgement about what makes a registry entry, a shape, a
// ledger row, a scaffold or a budget plan actually usable.

export const RULE_CODES = [
  "MIGRATION_UNDECLARED",
  "MIGRATION_UNREASONED",
  "MIGRATION_LOSSES_UNRECORDED",
  "REPORT_STALE_UNLABELLED",
  "CHAIN_QUOTED_AS_BREADTH",
  "BANK_BELOW_THRESHOLD",
  "BANK_INCOMPARABLE",

  // structural
  "E_TYPE",
  "E_SHAPE",
  "E_DUPLICATE_ID",
  "E_BAD_ID",
  "E_DANGLING_REF",
  // mechanism registry
  "MECH_NO_FALSE_POSITIVE_SHAPE",
  "MECH_NO_MEASURABLE_SIGNAL",
  "MECH_MEASURED_WITHOUT_EVIDENCE",
  "MECH_NO_SUGGESTED_MUTANT",
  // mutant bank
  "MUTANT_NO_MECHANISM",
  "MUTANT_NOT_CAUGHT_BY_ANYTHING",
  // task shapes
  "SHAPE_NO_HIDDEN_REGION",
  "SHAPE_NO_REFERENCE_CONTRACT",
  "SHAPE_NO_AUTHORITATIVE_SOURCE",
  "SHAPE_UNFORGEABILITY_UNSTATED",
  "SHAPE_NO_FAIRNESS_CONSTRAINT",
  "SHAPE_NO_CHEAT_RESISTANCE",
  "SHAPE_NO_KNOBS",
  "SHAPE_NO_EXPECTED_MUTANTS",
  "SHAPE_BUILT_WITHOUT_COST",
  // candidate ledger
  "LEDGER_NO_DECISION_RATIONALE",
  "LEDGER_TRIALED_WITHOUT_COST",
  "LEDGER_KILLED_WITHOUT_FAILURE_NOTES",
  "LEDGER_PROMOTED_WITHOUT_EVIDENCE",
  "LEDGER_MEASURED_WITHOUT_RESULTS",
  "LEDGER_RESULTS_WITHOUT_SUBJECTS",
  // coverage
  "COVERAGE_MECHANISM_WITHOUT_MUTANT",
  "COVERAGE_MUTANT_ORPHANED",
  // scaffold output
  "SCAFFOLD_MISSING_ARTIFACT",
  "SCAFFOLD_EMPTY_ARTIFACT",
  "SCAFFOLD_METADATA_MISMATCH",
  // budget plans
  "BUDGET_NO_LABOUR_COST",
  "BUDGET_IMPLAUSIBLE_YIELD",
  "BUDGET_NEGATIVE_INPUT",
  "BUDGET_RETRY_RATE_OUT_OF_RANGE",
  // trial records — the layer that separates "the verifier works" from "the family is hard"
  "TRIAL_COUNTS_WITHOUT_REASON",
  "TRIAL_REFUSAL_COUNTED",
  "TRIAL_BASELINE_IMPOSTER",
  "SHAPE_TRIAL_OUTCOME_MISSING",
  "TRIAL_AGENT_WITHOUT_MODEL",
  "TRIAL_AGENT_WITHOUT_ARTIFACT",
  "TRIAL_EMPTY_CELLS",
  "TRIAL_CELL_UNMEASURED_WITH_FAILURES",
  "TRIAL_DUPLICATE_RUN_ID",
  "TRIAL_CHALLENGE_HASH_MISSING",
  "TRIAL_CHALLENGE_HASH_MISMATCH",
  "TRIAL_COST_CONTRADICTS_USAGE",
  // campaign plans — a trial run declared before it happens
  "CAMPAIGN_NO_KILL_SIGNAL",
  "CAMPAIGN_COUNTING_CONTRADICTS_CODE",
  "CAMPAIGN_SLOT_WITHOUT_RUN",
  "CAMPAIGN_CHALLENGE_HASH_MISMATCH",
  "CAMPAIGN_RETRY_ON_REFUSAL",
  // family status coherence
  "STATUS_SHIP_WITHOUT_TRIALS",
  "STATUS_SHIP_ALREADY_SOLVED",
  "STATUS_STAGE_WITHOUT_EVIDENCE",
  // importing an externally-run trial bundle
  "IMPORT_MISSING_METADATA",
  "IMPORT_FAMILY_MISMATCH",
  "IMPORT_CHALLENGE_MISMATCH",
  "IMPORT_MISSING_TRANSCRIPT",
  "IMPORT_MISSING_SUBMISSION",
  // evidence lifecycle: what happens to a trial when the family it measured is repaired
  "EVIDENCE_STALE_COUNTED",
  "EVIDENCE_CAMPAIGN_NOT_REISSUED",
  "EVIDENCE_SUPERSEDED_HIDDEN",
  "EVIDENCE_AMBIGUITY_UNDOCUMENTED",
  // per-trial root cause: WHY a trial came out the way it did, adjudicated and attributed.
  // Without these, "counted failure" silently meant "capability" and two artifacts published as
  // difficulty evidence were a spec defect and a harness contract violation.
  "ROOTCAUSE_UNKNOWN_LABEL",
  "ROOTCAUSE_NO_RATIONALE",
  "ROOTCAUSE_NO_EVIDENCE",
  "ROOTCAUSE_NO_LABELLER",
  "ROOTCAUSE_RUN_MISMATCH",
  "ROOTCAUSE_LABEL_CONTRADICTS_OUTCOME",
  "ROOTCAUSE_CAPABILITY_OVER_UNREAD_DIAGNOSIS",
  // durable trial directories
  "TRIALDIR_MISSING_FILE",
  "TRIALDIR_COUNTED_WITHOUT_VERIFIER",
  "TRIALDIR_COUNTED_WITHOUT_SUBMISSION",
  "TRIALDIR_CHALLENGE_LEAK",
  "TRIALDIR_SET_MISMATCH",
  "OUTBOX_CTRF_TUPLE_MISMATCH",
  "OUTBOX_CTRF_FAILURE_MISCOUNT",
  "OUTBOX_TASK_SUBTREE_MISSING",
  "OUTBOX_RUN_WITHOUT_TRIAL",
  // shared subject bank
  "BANK_ADDITIVE_WITHOUT_OVERLAP",
  "BANK_INCOMPARABLE_SCENARIO_SET",
  "BANK_KIND_MISMATCH",
  // scenario-space sampling
  "SAMPLE_KNOB_FROZEN",
  // family kill analysis — a family may not die for a reason nobody wrote down
  "KILL_WITHOUT_REASON",
  "KILL_WITHOUT_EVIDENCE",
  "KILL_REASON_UNSUPPORTED",
  "KILL_DISPOSITION_MISSING",
  "KILL_UNKNOWN_REASON",
  // family evolution — a variant must differ from its parent
  "VARIANT_IDENTICAL_TO_PARENT",
  "VARIANT_WITHOUT_OPERATOR",
  "VARIANT_NO_MECHANISM_DELTA",
  "VARIANT_UNKNOWN_MECHANISM",
  "VARIANT_PROMOTED_WITHOUT_BUILD",
  // ledger consistency against the ship gate
  "LEDGER_STATUS_CONTRADICTS_GATE",
  "LEDGER_KILL_WITHOUT_ANALYSIS",
  // agent-facing challenge packages
  "CHALLENGE_LEAKS_HIDDEN_ARTIFACT",
  "CHALLENGE_MISSING_SURFACE",
  "CHALLENGE_MANIFEST_MISMATCH",
  // The visible starter is a working answer. Behavioural, so no identifier blocklist can see it;
  // graded empirically by `checkStarterFailsEnough` rather than by string search.
  "CHALLENGE_STARTER_SOLVES_FAMILY",
  // human clean-room solvability evidence
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
  // adversarial verifier-integrity evidence
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
  // adversarial audit v2: exploit replay and isolation evidence
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
  // adversarial audit v2 container isolation: no-network claims must be mechanically backed
  "ADV_CONTAINER_COUNTED_NO_METADATA",
  "ADV_CONTAINER_COUNTED_NETWORK_ENABLED",
  "ADV_CONTAINER_COUNTED_REPO_ROOT_MOUNTED",
  "ADV_CONTAINER_COUNTED_HIDDEN_FILES_MOUNTED",
  "ADV_CONTAINER_COUNTED_VERIFIER_INSIDE",
  "ADV_CONTAINER_COUNTED_UNPRESERVED_DIRS",
  "ADV_CONTAINER_COUNTED_SECRET_ENV",
  "ADV_CONTAINER_COUNTED_READINESS_FAILED",
  // adaptive benchmark-production funnel
  "FUNNEL_PROBE_NO_TRUTH_SOURCE",
  "FUNNEL_PROBE_NO_EXPECTED_FAILURE",
  "FUNNEL_PROBE_NO_PROMOTION_CRITERIA",
  "FUNNEL_PROBE_HIDDEN_BEHAVIOR_UNDECLARED",
  "FUNNEL_PROBE_NO_TRANSFER_CANDIDATE",
  "FUNNEL_PROBE_WORDING_ONLY",
  "FUNNEL_PROBE_REQUIRES_PRIVATE_KNOWLEDGE",
  "FUNNEL_PROBE_NO_CHEAP_SCREEN",
  "FUNNEL_TRANSFER_NO_FIXED",
  "FUNNEL_TRANSFER_NO_CHANGED",
  "FUNNEL_TRANSFER_NO_EVIDENCE_REQUIREMENT",
  // Discovery Workbench: candidate-pool cheap screens before a task family exists
  "DISCOVERY_CANDIDATE_NO_TRUTH_SOURCE",
  "DISCOVERY_CANDIDATE_HIDDEN_RULES_UNDECLARED",
  "DISCOVERY_CANDIDATE_NO_REFERENCE_PATH",
  "DISCOVERY_CANDIDATE_NO_EXPECTED_MUTANTS",
  "DISCOVERY_CANDIDATE_NO_BASELINE_CHEAT",
  "DISCOVERY_CANDIDATE_NO_TRANSFER",
  "DISCOVERY_CANDIDATE_NO_PROMOTION_CRITERIA",
  "DISCOVERY_CANDIDATE_WORDING_ONLY",
  "DISCOVERY_CANDIDATE_REQUIRES_PRIVATE_CONTEXT",
  "DISCOVERY_CANDIDATE_NO_CHEAP_SCREEN",
  "DISCOVERY_CANDIDATE_HIGH_CHEAT_NO_ISOLATION",
  "DISCOVERY_CANDIDATE_LOW_AXIS_HIGH_BUILD",
  "DISCOVERY_CANDIDATE_SOLVED_NO_EVOLUTION",
  // executable mechanism probes: cheap local evidence before family build
  "PROBE_NO_TRUTH_SOURCE",
  "PROBE_NO_HIDDEN_BEHAVIOR",
  "PROBE_NO_BAD_SUBJECT",
  "PROBE_NO_PROMOTION_CRITERIA",
  "PROBE_NO_SCENARIOS",
  "PROBE_REFERENCE_FAILS",
  "PROBE_BAD_SUBJECT_NOT_CAUGHT",
  "PROBE_UNINTENDED_FAILURE",
  // discovery calibration: backtest scoring against known family outcomes
  "CALIBRATION_NO_KNOWN_OUTCOME",
  "CALIBRATION_MISSING_FEATURES",
  // probe-to-family promotion: the bridge from cheap executable evidence to validation build
  "PROMOTION_NO_SOURCE_PROBE",
  "PROMOTION_SOURCE_NOT_PROMOTED",
  "PROMOTION_NO_FIXED",
  "PROMOTION_NO_CHANGED",
  "PROMOTION_NO_TRUTH_SOURCE",
  "PROMOTION_NO_EXPECTED_MUTANTS",
  "PROMOTION_NO_KILL_SIGNAL",
  "PROMOTION_CLAIMS_DIFFICULTY_PRETRIAL",
  "PROMOTION_HIDDEN_RULE_SURFACE_UNDECLARED",
  // family lineage learning: clean solves and descendants route portfolio spend
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
  // production matrix readiness: one smoke result is routing evidence, not automatic /6 spend
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
  // provider delta: mixed provider smoke evidence routes decisions before production matrix spend
  "PROVIDER_DELTA_NON_OPENAI_MISSING",
  "PROVIDER_DELTA_UNCOUNTED_NON_OPENAI",
  "PROVIDER_DELTA_STALE_OR_INVALID_EVIDENCE",
  "PROVIDER_DELTA_OPENAI_ONLY_NO_CROSS_LAB",
  "PROVIDER_DELTA_MIXED_PROVIDER_SIGNAL",
  "PROVIDER_DELTA_MATRIX_NOT_AUTOMATIC",
  "PROVIDER_DELTA_PROVIDER_FAILURE_NO_COUNT",
  "PROVIDER_DELTA_INFRA_NO_COUNT",
  "PROVIDER_DELTA_DIAGNOSIS_MISSING_ARTIFACT",
  "PROVIDER_DELTA_DIAGNOSIS_STALE_HASH",
  "PROVIDER_DELTA_DIAGNOSIS_MIXED_MATRIX_BLOCKED",
  "PROVIDER_DELTA_DIAGNOSIS_NOT_DIFFICULTY_EVIDENCE",
  "PROVIDER_DELTA_DIAGNOSIS_SAME_PROVIDER_STABILITY_ONLY",
  "PROVIDER_DELTA_EVOLUTION_PROPOSAL_INCOMPLETE",
  // external evidence intake: third-party model/human packets must preserve countable artifacts
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
] as const;
export type RuleCode = (typeof RULE_CODES)[number];

export class SchemaError extends Error {
  readonly code: RuleCode;
  readonly path: string;
  constructor(code: RuleCode, path: string, message: string) {
    super(`[${code}] ${path}: ${message}`);
    this.name = "SchemaError";
    this.code = code;
    this.path = path;
  }
}

// Declared as a function rather than an arrow const on purpose: TypeScript only treats a
// never-returning call as unreachable for control-flow narrowing when the callee is a function
// declaration or has an explicit type annotation. Written as `const fail = () => never`, every
// `if (x === null) fail(...)` below would leave `x` still nullable afterwards.
export function fail(code: RuleCode, path: string, msg: string): never {
  throw new SchemaError(code, path, msg);
}

// ---------------------------------------------------------------- structural helpers

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const str = (v: unknown, path: string): string =>
  typeof v === "string" && v.trim().length > 0 ? v : fail("E_TYPE", path, "expected a non-empty string");

export const strNullable = (v: unknown, path: string): string | null =>
  v === null || v === undefined ? null : str(v, path);

/**
 * A string field where empty is a legitimate value rather than an omission.
 *
 * `str` rejects the empty string on purpose — a blank `summary` or `rule` is an unfilled field. But
 * some fields are genuinely optional prose (`notes` on a trial record), and forcing an author to
 * invent a sentence to satisfy a validator is how validators get worked around rather than obeyed.
 */
export const optionalText = (v: unknown, path: string): string =>
  v === null || v === undefined ? "" : typeof v === "string" ? v : fail("E_TYPE", path, "expected a string");

export const num = (v: unknown, path: string): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fail("E_TYPE", path, "expected a finite number");

export const numNullable = (v: unknown, path: string): number | null =>
  v === null || v === undefined ? null : num(v, path);

export const strArray = (v: unknown, path: string): readonly string[] =>
  Array.isArray(v) ? v.map((x, i) => str(x, `${path}[${i}]`)) : fail("E_TYPE", path, "expected an array");

/**
 * A list that must be non-empty for a DOMAIN reason, so the caller supplies the domain rule code and
 * the argument for why emptiness is a defect rather than an omission.
 */
export const requiredList = (v: unknown, path: string, code: RuleCode, why: string): readonly string[] => {
  const list = strArray(v, path);
  if (list.length === 0) fail(code, path, why);
  return list;
};

export const oneOf = <T extends string>(v: unknown, path: string, allowed: readonly T[]): T =>
  typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fail("E_TYPE", path, `expected one of ${allowed.join(" | ")}`);

/** Kebab-case only: ids become filenames, CLI arguments and report anchors. */
export const id = (v: unknown, path: string): string => {
  const s = str(v, path);
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) ? s : fail("E_BAD_ID", path, `"${s}" is not kebab-case`);
};

export const array = <T>(v: unknown, path: string, item: (x: unknown, p: string) => T): readonly T[] =>
  Array.isArray(v) ? v.map((x, i) => item(x, `${path}[${i}]`)) : fail("E_TYPE", path, "expected an array");

export const uniqueIds = (ids: readonly string[], path: string): void => {
  const seen = new Set<string>();
  for (const x of ids) {
    if (seen.has(x)) fail("E_DUPLICATE_ID", path, `duplicate id "${x}"`);
    seen.add(x);
  }
};

export const mustExist = (
  refs: readonly string[],
  known: ReadonlySet<string>,
  path: string,
  what: string,
): void => {
  for (const r of refs) {
    if (!known.has(r)) {
      fail("E_DANGLING_REF", path, `unknown ${what} "${r}" — dangling references make coverage reports lie`);
    }
  }
};

// ---------------------------------------------------------------- domain types

/** A transferable way agents get things wrong. The unit a family is designed around. */
export interface Mechanism {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly whyAgentsFail: string;
  readonly whatCorrectSystemsDo: string;
  /**
   * How an implementation passes a naive suite while still carrying the bug. The field that earns a
   * mechanism its place: no plausible false-positive shape means a simple test already catches it,
   * and no family needs building around it.
   */
  readonly falsePositiveShape: string;
  readonly exampleDomains: readonly string[];
  readonly suggestedMutants: readonly string[];
  readonly fairnessRisks: readonly string[];
  readonly cheatRisks: readonly string[];
  readonly measurableSignals: readonly string[];
  readonly maturity: MechanismMaturity;
  readonly evidence: string | null;
}

/** A deliberately broken implementation. The bank a verifier is graded against. */
export interface Mutant {
  readonly id: string;
  readonly name: string;
  readonly bug: string;
  readonly mechanisms: readonly string[];
  readonly caughtBy: readonly string[];
  readonly falseConfidence: string;
  readonly sketch: string;
}

export interface Knob {
  readonly name: string;
  readonly type: "int" | "enum" | "bool" | "seed";
  readonly values: readonly (string | number | boolean)[];
  readonly purpose: string;
}

export interface AuthoritativeSource {
  readonly name: string;
  readonly whatItSettles: string;
  /** Why the implementation under test cannot forge or read it. The trust boundary in one line. */
  readonly whyEngineCannotForge: string;
}

export interface ExpectedMutant {
  readonly mutantId: string;
  readonly mustFailCheck: string;
}

/** A parameterized task family: the expensive artifact, from which instances are cheap. */
export interface TaskShape {
  readonly familyId: string;
  readonly name: string;
  readonly domain: string;
  readonly mechanisms: readonly string[];
  readonly visibleRules: readonly string[];
  readonly hiddenGradedRegion: string;
  readonly knobs: readonly Knob[];
  readonly authoritativeSources: readonly AuthoritativeSource[];
  readonly referenceContract: readonly string[];
  readonly expectedMutants: readonly ExpectedMutant[];
  readonly fairnessConstraints: readonly string[];
  readonly cheatResistance: readonly string[];
  readonly expectedFailureModes: readonly string[];
  readonly estimatedBuildHours: number;
  readonly estimatedFrontierUsd: number;
  readonly status: TaskStatus;
  readonly dataQuality: DataQuality;
  readonly evidence: string | null;
  readonly estimatedAxes: number | null;
  /**
   * How many real agent/model trials this family has been run against. Null means none.
   *
   * Added after the second family was built and exposed the gap: a family can have a MEASURED axis
   * count against a bank of hand-written mutants and still be completely unevidenced as a
   * difficulty, because nothing that could actually fail it has ever attempted it. Those are two
   * different claims and the ship gate now separates them.
   */
  readonly agentTrialsRun: number | null;
  /**
   * How many of those trials passed every graded scenario. Null only when no trials were run.
   *
   * A trial count without an outcome is the ambiguous state that let a family claiming six frontier
   * attempts sit at the same gate verdict as one claiming none: `SHAPE_TRIAL_OUTCOME_MISSING` makes
   * it unrepresentable. The outcome declared here is still a claim, and a measured trial record
   * always overrides it — but a claim with a number attached can at least be checked against the
   * repository it cites.
   */
  readonly agentTrialsPassed: number | null;
}

export interface CandidateResults {
  readonly subjectsTested: readonly string[];
  readonly passed: number;
  readonly failed: number;
  readonly note: string;
}

/** One row of the screening record. Kills are the point: they feed the budget model. */
export interface Candidate {
  readonly id: string;
  readonly title: string;
  readonly mechanisms: readonly string[];
  readonly domain: string;
  readonly status: TaskStatus;
  readonly hypothesis: string;
  readonly whyHard: string;
  readonly whyMightBeUnfair: string;
  readonly results: CandidateResults | null;
  readonly costUsd: number | null;
  readonly failureNotes: string | null;
  readonly decision: Decision;
  readonly decisionRationale: string;
  readonly transferability: string;
  readonly links: readonly string[];
  readonly dataQuality: DataQuality;
}
