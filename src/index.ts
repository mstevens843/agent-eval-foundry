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

// --- families: measured mini-benchmarks built by the foundry process ---
export {
  ALL_SUBJECTS,
  referenceFailures,
  runCell,
  runFamily,
  toMatrix,
} from "./families/prompt-injection-containment/runner.js";
export type { CellResult, RunResult } from "./families/prompt-injection-containment/runner.js";
export { MUTANTS } from "./families/prompt-injection-containment/mutants.js";
export { reference } from "./families/prompt-injection-containment/reference.js";
export {
  RULES,
  REASON_CODES,
  decide,
  expectedDecisions,
} from "./families/prompt-injection-containment/policy.js";
export type { PolicyDecision, ReasonCode } from "./families/prompt-injection-containment/policy.js";
export {
  ATTACKS,
  CARRIERS,
  buildScenario,
  enumerateSpace,
  generateScenarios,
  selectMeasuredSet,
} from "./families/prompt-injection-containment/scenarios.js";
export { CHECKS, verify } from "./families/prompt-injection-containment/verify.js";
export { LEGAL_TRANSITIONS, STATES, TRUST_LEVELS } from "./families/prompt-injection-containment/types.js";
export type {
  Scenario,
  ScenarioParams,
  Segment,
  Subject as FamilySubject,
  SubjectReport,
} from "./families/prompt-injection-containment/types.js";
export { renderCrossFamilyReport, renderFamilyReport } from "./reports/family-report.js";
export type { FamilyAxis, FamilyReportInput } from "./reports/family-report.js";

// --- trials: the layer that separates "the verifier works" from "the family is hard" ---
export {
  ISOLATION_GUARANTEES,
  ISOLATION_LEVELS,
  NEVER_COUNTS,
  SUBJECT_TYPES,
  TRIAL_STATUSES,
  countedAgentTrials,
  summarise,
  uncountedTrials,
} from "./trials/types.js";
export type {
  IsolationLevel,
  SubjectType,
  TrialCell,
  TrialRecord,
  TrialSet,
  TrialStatus,
} from "./trials/types.js";
export { checkScenarioCoverage, parseTrialRecord, parseTrialSet } from "./trials/validate.js";
export { inProcessRunner, isolationSummary, subprocessRunner } from "./trials/runners.js";
export type { RunOutcome, SubjectRunner } from "./trials/runners.js";
export {
  FAMILY_ID,
  importAgentTrial,
  importAgentTrials,
  measuredScenarios,
  runLocalTrials,
  scenarioSetId,
} from "./trials/orchestrate.js";
export { MIN_SHARED_SUBJECTS, combineOverSharedSubjects, computeOverlap } from "./trials/bank.js";
export type { BankOverlap, CombinedView, FamilyBank, OverlapVerdict } from "./trials/bank.js";

// --- agent-facing challenge packages ---
export { HIDDEN_ARTIFACTS, buildChallengePackage } from "./challenge/package.js";
export type { ChallengeFile, ChallengeManifest, ChallengePackage } from "./challenge/package.js";
export {
  FORBIDDEN_CONTENT,
  FORBIDDEN_FILENAMES,
  REQUIRED_FILES,
  REQUIRED_SPEC_CODES,
  checkChallengePackage,
} from "./challenge/package-check.js";
export { INTENDED_CHECK, computeEvidence, renderTrialReadinessReport } from "./reports/trial-report.js";
export type { FamilyEvidence } from "./reports/ship-report.js";
export {
  readFamilyTrials,
  readTrialDirectory,
  writeTrialDirectory,
  assertComparable,
  HIDDEN_IN_CHALLENGE,
  TRIAL_FILES,
} from "./trials/directory.js";
export type { Countability, TrialDirectory } from "./trials/directory.js";
export {
  PROVIDERS,
  classifyRun,
  claudeCliAdapter,
  dockerPlan,
  getProvider,
  makeSandbox,
  shellAdapter,
} from "./trials/providers.js";
export type {
  DockerPlan,
  ProviderAdapter,
  ProviderRunRequest,
  ProviderRunResult,
} from "./trials/providers.js";
export {
  classifyHistorical,
  importDurableOutboxHistory,
  normalizeModel,
  parseHarborResult,
} from "./trials/history.js";
export type { HistoricalRun, ImportedHistory } from "./trials/history.js";
export { PIC_INSTRUCTION, decideCountability, orchestrateTrial } from "./trials/orchestrator.js";
export type {
  FamilyGrader,
  GradeResult,
  OrchestrateOptions,
  OrchestrateResult,
} from "./trials/orchestrator.js";
export { classifyRunKind } from "./trials/history.js";
export { renderHistoricalReport, renderSharedBankReport } from "./reports/bank-report.js";
export type { SharedBankInput } from "./reports/bank-report.js";

// ---------------------------------------------------------------- the evolution layer
export {
  KILL_REASONS,
  KILL_REASON_SPECS,
  DISPOSITIONS,
  analyzeFamily,
  assertKillAnalysis,
  killReasonSpec,
} from "./foundry/kill.js";
export type { KillAnalysis, KillFinding, KillReason, Disposition, DeclaredConcerns } from "./foundry/kill.js";
export {
  OPERATORS,
  OPERATOR_IDS,
  evolve,
  operator,
  variantToShape,
  assertVariantNovel,
  assertPromotionEvidence,
} from "./foundry/evolve.js";
export type { EvolutionOperator, OperatorId, VariantProposal } from "./foundry/evolve.js";
export { familyLoop, loopAll, DECLARED_CONCERNS } from "./foundry/loop.js";
export type { FamilyLoopState } from "./foundry/loop.js";
export { assertLedgerConsistency, assertPostmortemExists, familyIdOf } from "./foundry/consistency.js";
export { sampleSpace, assertKnobCoverage, hash32 } from "./foundry/sample.js";
export { shapeFromFamily } from "./foundry/shape-sync.js";
export type { ShapeProse } from "./foundry/shape-sync.js";
export { SHAPE_PROSE } from "./foundry/shape-prose.js";
export { BUILT_FAMILIES, BUILT_FAMILY_IDS, builtFamily, scenarioSetIdFor } from "./families/registry.js";
export type { BuiltFamily, FamilySweep } from "./families/registry.js";
export { renderKillReport } from "./reports/kill-report.js";
export { renderEvolutionReport } from "./reports/evolution-report.js";
export { buildMemoryChallengePackage } from "./challenge/memory-package.js";
export { buildUiChallengePackage } from "./challenge/ui-package.js";
export { MEMORY_PROFILE, PIC_PROFILE, UI_PROFILE } from "./challenge/package-check.js";
export type { LeakProfile } from "./challenge/package-check.js";
