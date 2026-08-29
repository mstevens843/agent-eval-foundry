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
