// Public surface. The pure core only — `cli.ts` is the shell and is not re-exported, so importing
// this package can never read a file, write one, or set an exit code. The one exception is
// `foundry/load.ts`, which is the deliberate filesystem edge and is exported because a consumer
// loading a registry from disk should not have to reimplement it.

// --- axis layer: how many things does an existing suite measure? ---
export { axisCurve, measure } from "./axis-meter.js";
export type { MeasureOptions } from "./axis-meter.js";
export { blindInstances, catchSets, cluster, subjectStats } from "./catch-sets.js";
export { importSweBenchVerified } from "./import-swebench.js";
export type { SweBenchImportOptions } from "./import-swebench.js";
export { MatrixError, parseMatrix } from "./matrix.js";
export { nullBaseline } from "./null-model.js";
export type { NullBaseline, NullBaselineOptions } from "./null-model.js";
export { renderReport } from "./report.js";
export {
  antichainWidth,
  isProperSubset,
  jaccard,
  jaccardGroups,
  maxBipartiteMatching,
  subsetAdjacency,
} from "./similarity.js";
export type {
  AxisReport,
  CatchSet,
  Cell,
  Cluster,
  CurvePoint,
  Instance,
  Matrix,
  NullBaselineSummary,
  Provenance,
  Subject,
  SubjectRole,
  SubjectStat,
} from "./types.js";

// --- foundry layer: what should be built, and has it earned budget? ---
export {
  MEASURED_DEFAULTS,
  HOURS_PER_ENGINEER_YEAR,
  costOfTarget,
  handAuthoredComparison,
  planBudget,
} from "./foundry/budget.js";
export type { BudgetInputs, BudgetPlan } from "./foundry/budget.js";
export {
  MIN_LABOUR_SHARE,
  MIN_PLAUSIBLE_FAMILY_HOURS,
  assertBudgetInputs,
  assertPlanHonest,
  shortfallForTarget,
} from "./foundry/budget-check.js";
export {
  loadCandidates,
  loadMechanisms,
  loadMutants,
  loadRegistry,
  loadShapes,
} from "./foundry/load.js";
export {
  assertCoverage,
  buildRegistry,
  checkReferentialIntegrity,
  coverage,
} from "./foundry/registry.js";
export type { CoverageReport, MechanismCoverage, Registry } from "./foundry/registry.js";
export { ARTIFACT_PLAN, generateScaffold, scaffoldFromShape } from "./foundry/scaffold.js";
export type { ScaffoldFile, ScaffoldMetadata, ScaffoldOutput, ScaffoldRequest } from "./foundry/scaffold.js";
export { EXPECTED_ARTIFACTS, MIN_ARTIFACT_BYTES, checkScaffold } from "./foundry/scaffold-check.js";
export type { CheckableFile, ScaffoldCheckResult } from "./foundry/scaffold-check.js";
export {
  DATA_QUALITY,
  DECISIONS,
  MECHANISM_MATURITY,
  RULE_CODES,
  SchemaError,
  TASK_STATUS,
} from "./foundry/schema.js";
export type {
  AuthoritativeSource,
  Candidate,
  CandidateResults,
  DataQuality,
  Decision,
  ExpectedMutant,
  Knob,
  Mechanism,
  MechanismMaturity,
  Mutant,
  RuleCode,
  TaskShape,
  TaskStatus,
} from "./foundry/schema.js";
export {
  parseCandidate,
  parseCandidates,
  parseMechanism,
  parseMechanisms,
  parseMutant,
  parseMutants,
  parseTaskShape,
} from "./foundry/validate.js";

// --- sources: everything that can produce a normalized matrix ---
export { SOURCES, getSource, implementedSources } from "./sources/index.js";
export type { MatrixSource, SourceLoadOptions } from "./sources/index.js";

// --- reports ---
export { renderBudgetReport, renderPlanSummary } from "./reports/budget-report.js";
export { renderFamilyDiversityReport, renderLedgerReport } from "./reports/ledger-report.js";
export { renderMechanismReport, renderMutantReport } from "./reports/registry-report.js";
export { GATES, assessFamily, renderShipReport } from "./reports/ship-report.js";
export type { FamilyAssessment, Gate, GateVerdict, ShipVerdict } from "./reports/ship-report.js";
