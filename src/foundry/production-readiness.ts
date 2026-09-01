import type { RuleCode } from "./schema.js";
import type { SmokeDiagnosisStatus } from "./smoke-gates.js";

export const PRODUCTION_READINESS_STATUSES = [
  "local-verifier-ready",
  "package-backed",
  "smoke-planned",
  "smoke-attempted",
  "smoke-failed-on-target",
  "smoke-passed-cleanly",
  "smoke-failed-off-target",
  "cross-lab-smoke-present",
  "cross-lab-smoke-mixed",
  "cross-lab-smoke-needed",
  "cross-lab-difficulty-needed",
  "matrix-ready",
  "matrix-blocked",
  "stale-hash-blocked",
  "adversarial-audit-needed",
  "human-evidence-needed",
] as const;
export type ProductionReadinessStatus = (typeof PRODUCTION_READINESS_STATUSES)[number];

export const PRODUCTION_READINESS_RULE_CODES = [
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
] as const satisfies readonly RuleCode[];
export type ProductionReadinessRuleCode = (typeof PRODUCTION_READINESS_RULE_CODES)[number];

export interface ProductionReadinessFinding {
  readonly code: ProductionReadinessRuleCode;
  readonly severity: "blocker" | "advisory";
  readonly detail: string;
}

export interface ProductionReadinessInput {
  readonly familyId: string;
  readonly challengeHash: string;
  readonly currentChallengeHash: string;
  readonly localVerifierReady: boolean;
  readonly packageBacked: boolean;
  readonly campaignPresent: boolean;
  readonly campaignHashCurrent: boolean;
  readonly packageHashCurrent: boolean;
  readonly countedSmokeTrials: number;
  readonly countedSmokeFailures: number;
  readonly countedSmokeSolves: number;
  readonly providerRefusals: number;
  readonly infraFailures: number;
  readonly modelFamilies: readonly string[];
  readonly countedFailureModelFamilies: readonly string[];
  readonly diagnosisStatus: SmokeDiagnosisStatus;
  readonly transferDeclared: boolean;
  readonly adversarialReady: boolean;
  readonly countedNoBypassAudits: number;
  readonly countedBypassAudits: number;
  readonly unrepairedBypasses: number;
  readonly humanReady: boolean;
  readonly cleanHumanSolves: number;
  readonly explicitOpenAiOnlyMatrixOverrideReason?: string | null;
}

export interface ProductionReadinessResult {
  readonly familyId: string;
  readonly challengeHash: string;
  readonly statuses: readonly ProductionReadinessStatus[];
  readonly fullMatrixReady: boolean;
  readonly productionMatrixStatus: "ready" | "blocked";
  readonly smokeDifficultyEvidenced: boolean;
  readonly crossLabSmokeEvidenced: boolean;
  readonly crossLabDifficultyEvidenced: boolean;
  readonly mixedCrossLabSmoke: boolean;
  readonly hasNonOpenAiCountedSmoke: boolean;
  readonly countedProviderFamilies: readonly string[];
  readonly countedFailureProviderFamilies: readonly string[];
  readonly blockers: readonly ProductionReadinessFinding[];
  readonly advisories: readonly ProductionReadinessFinding[];
  readonly nextAction: string;
}

const NO_CROSS_LAB_PROVIDER_FAMILIES = new Set(["external", "openai", "unknown"]);

export function evaluateProductionReadiness(input: ProductionReadinessInput): ProductionReadinessResult {
  const providerFamilies = [...new Set(input.modelFamilies.map((family) => family.toLowerCase()))].sort();
  const failureProviderFamilies = [
    ...new Set(input.countedFailureModelFamilies.map((family) => family.toLowerCase())),
  ].sort();
  const hasNonOpenAiCountedSmoke = providerFamilies.some(
    (family) => !NO_CROSS_LAB_PROVIDER_FAMILIES.has(family),
  );
  const crossLabSmokeEvidenced = providerFamilies.includes("openai") && hasNonOpenAiCountedSmoke;
  const override = (input.explicitOpenAiOnlyMatrixOverrideReason ?? "").trim();
  const smokeDifficultyEvidenced = input.countedSmokeFailures > 0 && input.diagnosisStatus === "on-target";
  const crossLabDifficultyEvidenced =
    smokeDifficultyEvidenced &&
    failureProviderFamilies.filter((family) => !["external", "unknown"].includes(family)).length >= 2;
  const mixedCrossLabSmoke = crossLabSmokeEvidenced && !crossLabDifficultyEvidenced;
  const findings: ProductionReadinessFinding[] = [];
  const add = (
    code: ProductionReadinessRuleCode,
    severity: ProductionReadinessFinding["severity"],
    detail: string,
  ) => findings.push({ code, severity, detail });

  if (!input.localVerifierReady) {
    add("PRODUCTION_LOCAL_VERIFIER_NOT_READY", "blocker", "reference/mutant/baseline gates are not clean");
  } else {
    add(
      "PRODUCTION_LOCAL_MUTANTS_NOT_DIFFICULTY",
      "advisory",
      "local mutant axes prove verifier discrimination, not real-agent difficulty",
    );
  }
  if (!input.packageBacked) {
    add("PRODUCTION_PACKAGE_NOT_BACKED", "blocker", "no current leak-checked challenge package exists");
  }
  if (
    input.challengeHash !== input.currentChallengeHash ||
    !input.packageHashCurrent ||
    !input.campaignHashCurrent
  ) {
    add(
      "PRODUCTION_STALE_HASH_BLOCKS_MATRIX",
      "blocker",
      "challenge package and campaign hashes must match before production evidence can count",
    );
  }
  if (!input.campaignPresent || input.countedSmokeTrials === 0) {
    add(
      "PRODUCTION_NO_COUNTED_SMOKE",
      "blocker",
      input.campaignPresent
        ? "campaign exists but no counted smoke trial exists"
        : "smoke campaign is missing",
    );
  }
  if (input.providerRefusals > 0 || input.infraFailures > 0) {
    add(
      "PRODUCTION_PROVIDER_FAILURE_NO_COUNT",
      "advisory",
      `${input.providerRefusals} refusal(s) and ${input.infraFailures} infrastructure failure(s) are preserved but no-count`,
    );
  }
  if (input.countedSmokeSolves > 0 && input.countedSmokeFailures === 0) {
    add(
      "PRODUCTION_CLEAN_PASS_NOT_DIFFICULTY",
      "blocker",
      "a clean smoke pass routes to already_solved_or_needs_evolution, not full matrix spend",
    );
  }
  if (input.countedSmokeFailures > 0 && input.diagnosisStatus !== "on-target") {
    add(
      "PRODUCTION_OFF_TARGET_SMOKE_REPAIR",
      "blocker",
      "a counted smoke failure must be diagnosed as on-target before production spend",
    );
  }
  if (!input.transferDeclared) {
    add("PRODUCTION_TRANSFER_NOT_DECLARED", "blocker", "transfer target is not declared");
  }
  if (input.countedSmokeTrials > 0 && !crossLabSmokeEvidenced && override.length === 0) {
    add(
      "PRODUCTION_MATRIX_NEEDS_NON_OPENAI_SMOKE",
      "blocker",
      "full /6 matrix remains blocked until a non-OpenAI counted smoke exists or an explicit override is recorded",
    );
    if (providerFamilies.includes("openai")) {
      add(
        "PRODUCTION_OPENAI_ONLY_NO_CROSS_LAB",
        "advisory",
        "one OpenAI/Codex smoke failure is smoke-difficulty evidence for that provider family only",
      );
    }
  }
  if (mixedCrossLabSmoke && override.length === 0) {
    add(
      "PRODUCTION_CROSS_LAB_SMOKE_MIXED",
      "blocker",
      "a non-OpenAI smoke imported cleanly, but counted failures are not shared across provider families; diagnose provider delta or evolve before /6 spend",
    );
  }
  if (!input.adversarialReady) {
    add(
      "PRODUCTION_ADVERSARIAL_NOT_READY",
      "blocker",
      "verifier-integrity attack campaign or bundle is not ready",
    );
  } else if (input.countedNoBypassAudits === 0 && input.countedBypassAudits === 0) {
    add(
      "PRODUCTION_ADVERSARIAL_READY_NOT_AUDITED",
      "advisory",
      "attack materials are ready, but no counted adversarial audit exists",
    );
  }
  if (input.unrepairedBypasses > 0) {
    add(
      "PRODUCTION_UNREPAIRED_BYPASS",
      "blocker",
      `${input.unrepairedBypasses} unrepaired verifier bypass(es) block integrity claims`,
    );
  }
  if (input.humanReady && input.cleanHumanSolves === 0) {
    add(
      "PRODUCTION_HUMAN_READY_NOT_EVIDENCED",
      "advisory",
      "public package is human-ready, but no independent clean-room human solve exists",
    );
  }

  const blockerCodes = new Set(
    findings.filter((finding) => finding.severity === "blocker").map((f) => f.code),
  );
  const fullMatrixReady =
    blockerCodes.size === 0 &&
    input.localVerifierReady &&
    input.packageBacked &&
    smokeDifficultyEvidenced &&
    input.transferDeclared &&
    input.adversarialReady &&
    (crossLabDifficultyEvidenced || override.length > 0);
  const statuses = statusesFor(
    input,
    fullMatrixReady,
    smokeDifficultyEvidenced,
    crossLabSmokeEvidenced,
    mixedCrossLabSmoke,
  );
  const sortedFindings = findings
    .filter(
      (finding, index, array) => array.findIndex((candidate) => candidate.code === finding.code) === index,
    )
    .sort((a, b) => a.code.localeCompare(b.code));

  return {
    familyId: input.familyId,
    challengeHash: input.challengeHash,
    statuses,
    fullMatrixReady,
    productionMatrixStatus: fullMatrixReady ? "ready" : "blocked",
    smokeDifficultyEvidenced,
    crossLabSmokeEvidenced,
    crossLabDifficultyEvidenced,
    mixedCrossLabSmoke,
    hasNonOpenAiCountedSmoke,
    countedProviderFamilies: providerFamilies,
    countedFailureProviderFamilies: failureProviderFamilies,
    blockers: sortedFindings.filter((finding) => finding.severity === "blocker"),
    advisories: sortedFindings.filter((finding) => finding.severity === "advisory"),
    nextAction: nextProductionAction(input, fullMatrixReady, crossLabSmokeEvidenced, mixedCrossLabSmoke),
  };
}

function statusesFor(
  input: ProductionReadinessInput,
  fullMatrixReady: boolean,
  smokeDifficultyEvidenced: boolean,
  crossLabSmokeEvidenced: boolean,
  mixedCrossLabSmoke: boolean,
): readonly ProductionReadinessStatus[] {
  const out: ProductionReadinessStatus[] = [];
  if (input.localVerifierReady) out.push("local-verifier-ready");
  if (input.packageBacked) out.push("package-backed");
  if (input.campaignPresent) out.push("smoke-planned");
  if (input.countedSmokeTrials > 0 || input.providerRefusals > 0 || input.infraFailures > 0) {
    out.push("smoke-attempted");
  }
  if (smokeDifficultyEvidenced) out.push("smoke-failed-on-target");
  if (input.countedSmokeSolves > 0 && input.countedSmokeFailures === 0) out.push("smoke-passed-cleanly");
  if (input.countedSmokeFailures > 0 && input.diagnosisStatus !== "on-target") {
    out.push("smoke-failed-off-target");
  }
  if (crossLabSmokeEvidenced) out.push("cross-lab-smoke-present");
  if (mixedCrossLabSmoke) out.push("cross-lab-smoke-mixed");
  if (!crossLabSmokeEvidenced) out.push("cross-lab-smoke-needed");
  if (mixedCrossLabSmoke) out.push("cross-lab-difficulty-needed");
  if (
    !input.packageHashCurrent ||
    !input.campaignHashCurrent ||
    input.challengeHash !== input.currentChallengeHash
  ) {
    out.push("stale-hash-blocked");
  }
  if (!input.adversarialReady || (input.countedNoBypassAudits === 0 && input.countedBypassAudits === 0)) {
    out.push("adversarial-audit-needed");
  }
  if (input.humanReady && input.cleanHumanSolves === 0) out.push("human-evidence-needed");
  out.push(fullMatrixReady ? "matrix-ready" : "matrix-blocked");
  return [...new Set(out)];
}

function nextProductionAction(
  input: ProductionReadinessInput,
  fullMatrixReady: boolean,
  crossLabSmokeEvidenced: boolean,
  mixedCrossLabSmoke: boolean,
): string {
  if (fullMatrixReady) return "production /6 matrix may be scheduled; it is still not automatic";
  if (!input.localVerifierReady) return "repair local verifier, reference, mutant or baseline evidence";
  if (!input.packageBacked) return "build and leak-check a current challenge package";
  if (
    !input.packageHashCurrent ||
    !input.campaignHashCurrent ||
    input.challengeHash !== input.currentChallengeHash
  ) {
    return "reissue current-hash package and campaign before any evidence can count";
  }
  if (input.countedSmokeTrials === 0) return "run or import one counted smoke trial under the current hash";
  if (input.countedSmokeSolves > 0 && input.countedSmokeFailures === 0) {
    return "route to evolve/repair rather than matrix spend";
  }
  if (input.countedSmokeFailures > 0 && input.diagnosisStatus !== "on-target") {
    return "repair off-target spec, package or harness failure";
  }
  if (!input.transferDeclared) return "declare a transfer target before production matrix spend";
  if (!crossLabSmokeEvidenced && (input.explicitOpenAiOnlyMatrixOverrideReason ?? "").trim().length === 0) {
    return "import or run one non-OpenAI counted smoke under the current hash";
  }
  if (mixedCrossLabSmoke && (input.explicitOpenAiOnlyMatrixOverrideReason ?? "").trim().length === 0) {
    return "diagnose provider delta or evolve before production /6 matrix spend";
  }
  if (!input.adversarialReady) return "prepare verifier-integrity attack campaign and bundle";
  if (input.unrepairedBypasses > 0) return "repair verifier bypass and invalidate stale audits";
  return "complete advisory human/adversarial evidence before broadening claims";
}
