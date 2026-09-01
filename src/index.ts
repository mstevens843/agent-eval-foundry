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
  loadAdaptiveFunnel,
  loadDiscoveryWorkbench,
  loadDiscoveryCalibration,
  loadMechanisms,
  loadMutants,
  loadProbeDefinitions,
  loadProbeRunSummary,
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
  EVIDENCE_COSTS,
  FUNNEL_DECISIONS,
  FUNNEL_MODES,
  FUNNEL_STAGES,
  TRANSFER_SOURCE_KINDS,
  TRANSFER_STATUSES,
  assertAdaptiveFunnelValid,
  evidenceCostRank,
  parseMechanismProbe,
  parseMechanismProbes,
  parseTransferTest,
  parseTransferTests,
  planAdaptiveFunnel,
} from "./foundry/adaptive-funnel.js";
export type {
  AdaptiveFunnel,
  AdaptiveFunnelSummary,
  CheapValidationCheck,
  EvidenceCost,
  FamilyFunnelEvidence,
  FunnelDecision,
  FunnelMode,
  FunnelNextAction,
  FunnelStage,
  MechanismProbe,
  ProbeCostEstimate,
  ProbeScenario,
  ProbeTruthSource,
  TransferSourceKind,
  TransferStatus,
  TransferTest,
} from "./foundry/adaptive-funnel.js";
export {
  PROMOTION_SMOKE_STATES,
  SMOKE_DIAGNOSIS_STATUSES,
  evaluatePromotionSmokeGate,
} from "./foundry/smoke-gates.js";
export type {
  PromotionSmokeGateInput,
  PromotionSmokeGateResult,
  PromotionSmokeState,
  SmokeDiagnosisStatus,
} from "./foundry/smoke-gates.js";
export {
  PROVIDER_DELTA_DECISIONS,
  PROVIDER_DELTA_EVIDENCE_STATUSES,
  PROVIDER_DELTA_RULE_CODES,
  PROVIDER_DELTA_VERDICTS,
  evaluateProviderDelta,
  providerDeltaEvidenceFromTrialRecords,
  providerFamilyFromModel,
} from "./foundry/provider-delta.js";
export type {
  ProviderDeltaComparison,
  ProviderDeltaDecision,
  ProviderDeltaEvidence,
  ProviderDeltaEvidenceStatus,
  ProviderDeltaFinding,
  ProviderDeltaInput,
  ProviderDeltaRuleCode,
  ProviderDeltaVerdict,
} from "./foundry/provider-delta.js";
export {
  DISCOVERY_CANDIDATE_EVIDENCE_STATUSES,
  DISCOVERY_NEXT_STEPS,
  DISCOVERY_RISK_LEVELS,
  SURFACE_COVERAGE_GROUPS,
  assertDiscoveryWorkbenchValid,
  candidateToTaskShapeDraft,
  parseDiscoveryCandidate,
  parseDiscoveryCandidates,
  scoreDiscoveryCandidate,
  scoreDiscoveryCandidates,
  summarizeDiscoveryWorkbench,
  summarizeSurfaceCoverage,
} from "./foundry/discovery-workbench.js";
export type {
  DiscoveryBlockingReason,
  DiscoveryCandidate,
  DiscoveryCandidateEvidence,
  DiscoveryCandidateEvidenceStatus,
  DiscoveryCandidateScore,
  DiscoveryCheapScreen,
  DiscoveryHiddenRegionSketch,
  DiscoveryKnobSketch,
  DiscoveryNextStep,
  DiscoveryReferenceSolvability,
  DiscoveryRiskLevel,
  DiscoveryRiskNote,
  DiscoveryRiskNotes,
  DiscoveryScoreDimensions,
  DiscoverySurfaceCoverageTags,
  DiscoveryTaskShapeDraft,
  DiscoveryTransferPotential,
  DiscoveryTruthSource,
  DiscoveryWorkbench,
  DiscoveryWorkbenchSummary,
  SurfaceCoverageGroup,
  SurfaceCoverageSummary,
} from "./foundry/discovery-workbench.js";
export {
  CALIBRATION_MATCHES,
  KNOWN_DISCOVERY_OUTCOMES,
  assertDiscoveryCalibrationValid,
  runDiscoveryCalibration,
} from "./foundry/discovery-calibration.js";
export type {
  CalibrationMatch,
  DiscoveryCalibrationKnownOutcome,
  DiscoveryCalibrationRecord,
  DiscoveryCalibrationSummary,
} from "./foundry/discovery-calibration.js";
export {
  EXECUTABLE_PROBES,
  PROBE_STRATEGIES,
  PROBE_SUBJECT_KINDS,
  PROBE_VERDICTS,
  assertProbeDefinitionValid,
  assertProbeDefinitionsValid,
  probeEvidenceForDiscovery,
  probeToTaskShapeDraft,
  runMechanismProbes,
  runProbe,
} from "./foundry/probe-runner.js";
export type {
  ProbeCell,
  ProbeDefinition,
  ProbeExpectedBehavior,
  ProbePromotionDecision,
  ProbeResult,
  ProbeRunSummary,
  ProbeStrategy,
  ProbeSubject,
  ProbeSubjectKind,
  ProbeSubjectResult,
  ProbeTrace,
  ProbeVerdict,
  RunnerProbeScenario,
} from "./foundry/probe-runner.js";
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

// --- human solvability: reference-solvable vs human-ready vs human-evidenced ---
export {
  HUMAN_AUDITED_FAMILIES,
  auditHumanReadiness,
  auditHumanReadinessForFamilies,
} from "./human-solvability/readiness.js";
export {
  assertHumanReviewsValid,
  augmentFamilyEvidenceMap,
  humanEvidenceForFamilies,
  humanGateEvidenceMap,
  loadHumanReviewRecords,
  summarizeHumanEvidence,
} from "./human-solvability/records.js";
export type { LoadedHumanReview } from "./human-solvability/records.js";
export { renderHumanReadinessReport, renderHumanSolvabilityReport } from "./human-solvability/report.js";
export {
  HUMAN_CLAIM_LEVELS,
  HUMAN_REVIEW_STATUSES,
  HUMAN_VERIFIER_STATUSES,
  SOLVER_RELATIONS,
} from "./human-solvability/types.js";
export type {
  HumanAmbiguityFinding,
  HumanClaimLevel,
  HumanEvidenceSummary,
  HumanHint,
  HumanQuestion,
  HumanReadinessAudit,
  HumanReadinessCheck,
  HumanReviewRecord,
  HumanReviewStatus,
  HumanSolverProfile,
  HumanValidationFailure,
  HumanVerifierOutcome,
  HumanVerifierStatus,
  SolverRelation,
} from "./human-solvability/types.js";
export {
  assertHumanReviewRecordCounts,
  assertHumanSolvabilityClaim,
  humanReviewFailures,
  isCleanHumanSolve,
  parseHumanReviewRecord,
} from "./human-solvability/validate.js";

// --- external intake: third-party run packets before counted trials ---
export { importExternalRunPacket, externalIntakeReceivedRoot } from "./external-intake/import.js";
export {
  DEPLOYMENT_ALIAS_EXTERNAL_FAMILY_ID,
  auditExternalEvidencePacket,
  externalPacketAuditFindings,
  externalPacketSupplementalFiles,
  writeExternalPacketSupplementalFiles,
} from "./external-intake/packet.js";
export {
  assertExternalIntakeResultsValid,
  auditDeploymentAliasExternalPackets,
  loadExternalIntakeResults,
  renderExternalIntakeReport,
} from "./external-intake/report.js";
export {
  EXTERNAL_INTAKE_RULE_CODES,
  EXTERNAL_INTAKE_STATUSES,
  EXTERNAL_PACKET_REQUIRED_FILES,
  EXTERNAL_PROVIDER_FAMILIES,
  EXTERNAL_RUN_RELATIONS,
} from "./external-intake/types.js";
export type {
  ExternalHalfMatrixPlan,
  ExternalHalfMatrixSlot,
  ExternalIntakeFinding,
  ExternalIntakeImportResult,
  ExternalIntakeRuleCode,
  ExternalIntakeStatus,
  ExternalIntakeValidationResult,
  ExternalPacketAudit,
  ExternalProviderFamily,
  ExternalReturnedPacket,
  ExternalRunMetadata,
  ExternalRunRelation,
} from "./external-intake/types.js";
export {
  parseExternalRunMetadata,
  validateExternalRunPacket,
} from "./external-intake/validate.js";

// --- browser-backed UI foundation: scaffolded descendant, not measured evidence ---
export {
  BROWSER_BACKED_PAGE_FIXTURE_MODEL,
  BROWSER_BACKED_SCENARIO_CONTRACTS,
  browserBackedReadiness,
} from "./families/ui-replay-browser-backed/readiness.js";
export type { BrowserBackedReadiness } from "./families/ui-replay-browser-backed/readiness.js";
export {
  BROWSER_BACKED_FAMILY_ID,
  BROWSER_BACKED_STATUS,
  BROWSER_HARNESS_REQUIREMENTS,
  browserHarnessPlanFailures,
} from "./families/ui-replay-browser-backed/harness.js";
export type {
  BrowserActionTrace,
  BrowserBackedReadinessCheck,
  BrowserBackedScenarioContract,
  BrowserEffectRecord,
  BrowserHarnessCall,
  BrowserHarnessPlan,
  BrowserNodeSnapshot,
  BrowserPageFixture,
  BrowserRecordedSelector,
  BrowserRecordedStep,
  BrowserReplayAuditStep,
  BrowserReplayHarness,
  BrowserReplayOutcome,
  BrowserReplayReport,
  BrowserTraceArtifact,
} from "./families/ui-replay-browser-backed/harness.js";

// --- adversarial verifier-integrity: attempted bypass records vs cheat-resistance design ---
export {
  adversarialVerifierOutput,
  importAdversarialBundle,
  prepareAdversarialBundle,
} from "./adversarial-audit/bundles.js";
export type { PreparedAdversarialBundle } from "./adversarial-audit/bundles.js";
export {
  ISOLATION_PROFILES,
  isolationSummaryPath,
  verifyIsolationBundle,
  writeIsolationManifest,
} from "./adversarial-audit/isolation.js";
export type { IsolationVerification } from "./adversarial-audit/isolation.js";
export {
  runAdversarialHardeningProbes,
  runAllAdversarialHardeningProbes,
} from "./adversarial-audit/probes.js";
export {
  ADVERSARIAL_AUDITED_FAMILIES,
  ADVERSARIAL_PACKAGE_FAMILIES,
  adversarialBundlePath,
  adversarialCampaignPath,
  adversarialChallengeDir,
  auditAdversarialReadiness,
  auditAdversarialReadinessForFamilies,
  buildAdversarialCampaign,
  currentAdversarialPackageHash,
  defaultThreatModel,
  loadAdversarialCampaigns,
  parseAdversarialCampaign,
  verifierHashFor,
} from "./adversarial-audit/readiness.js";
export {
  adversarialGateEvidenceMap,
  assertAdversarialAuditsValid,
  augmentAdversarialEvidenceMap,
  attacksForFamily,
  loadAdversarialAttackRecords,
  summarizeAdversarialEvidence,
} from "./adversarial-audit/records.js";
export {
  replayAdversarialExploit,
  replayAdversarialExploitRecord,
  renderReplayResult,
  renderTriageResult,
  triageAdversarialAttack,
} from "./adversarial-audit/replay.js";
export {
  renderAdversarialAuditReport,
  renderAdversarialCampaignReport,
  renderAdversarialExploitReplayReport,
  renderAdversarialHardeningProbesReport,
  renderAdversarialIsolationReport,
  renderAdversarialReadinessReport,
  renderAdversarialV2Report,
} from "./adversarial-audit/report.js";
export {
  adversarialExploitArtifactFor,
  triageAdversarialAttackRecord,
} from "./adversarial-audit/triage.js";
export {
  ADVERSARIAL_AUDIT_VERSIONS,
  ADVERSARIAL_AUDIT_STATUSES,
  ADVERSARIAL_CLAIM_LEVELS,
  ADVERSARIAL_VERIFIER_STATUSES,
  ATTACK_EXECUTION_PROFILE_KINDS,
  BYPASS_TRIAGE_DECISIONS,
  BYPASS_CLASSES,
  EXPLOIT_ARTIFACT_KINDS,
  EXPLOIT_REPLAY_STATUSES,
  HARDENING_PROBE_STATUSES,
  ISOLATION_PROFILE_IDS,
} from "./adversarial-audit/types.js";
export type {
  AdversarialAuditVersion,
  AdversarialAttackRecord,
  AdversarialAttacker,
  AdversarialAuditStatus,
  AdversarialBypassTriage,
  AdversarialCampaign,
  AdversarialClaimLevel,
  AdversarialEvidenceSummary,
  AdversarialExecutionProfile,
  AdversarialExploitArtifact,
  AdversarialExploitReplayResult,
  AdversarialHardeningProbe,
  AdversarialIsolationProfile,
  AdversarialReadinessAudit,
  AdversarialReadinessCheck,
  AdversarialRepairRecord,
  AdversarialThreatModel,
  AdversarialValidationFailure,
  AdversarialVerifierResult,
  AdversarialVerifierStatus,
  AttackExecutionProfileKind,
  BypassTriageDecision,
  BypassClass,
  ExploitArtifactKind,
  ExploitReplayStatus,
  HardeningProbeStatus,
  IsolationProfileId,
  LoadedAdversarialAttack,
} from "./adversarial-audit/types.js";
export {
  adversarialAttackFailures,
  assertAdversarialAttackRecordCounts,
  assertAdversarialAuditedClaim,
  isCountedBypassAudit,
  isCountedNoBypassAudit,
  parseAdversarialAttackRecord,
} from "./adversarial-audit/validate.js";

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
