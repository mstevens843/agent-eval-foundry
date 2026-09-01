export const PROMOTION_SMOKE_STATES = [
  "local-evidence-only",
  "smoke-planned",
  "smoke-attempted-uncounted",
  "smoke-failed-on-target",
  "smoke-passed-cleanly",
  "smoke-failed-off-target",
  "transfer-ready",
  "matrix-ready",
] as const;
export type PromotionSmokeState = (typeof PROMOTION_SMOKE_STATES)[number];

export const SMOKE_DIAGNOSIS_STATUSES = [
  "none",
  "on-target",
  "off-target",
  "clean",
  "provider-refusal",
  "infrastructure-error",
] as const;
export type SmokeDiagnosisStatus = (typeof SMOKE_DIAGNOSIS_STATUSES)[number];

export interface PromotionSmokeGateInput {
  readonly familyId: string;
  readonly localEvidencePass: boolean;
  readonly campaignPresent: boolean;
  readonly campaignHashCurrent: boolean;
  readonly packageHashCurrent: boolean;
  readonly verifierMutantBaselinePass: boolean;
  readonly countedSmokeTrials: number;
  readonly countedFailures: number;
  readonly countedSolves: number;
  readonly providerRefusals: number;
  readonly infraFailures: number;
  readonly transferDeclared: boolean;
  readonly diagnosisStatus: SmokeDiagnosisStatus;
  readonly allowMatrixAfterCleanPassReason?: string | null;
  readonly matrixBlockedReason?: string | null;
}

export interface PromotionSmokeGateResult {
  readonly familyId: string;
  readonly state: PromotionSmokeState;
  readonly localEvidenceStatus: "pass" | "fail";
  readonly smokeCampaignStatus: "missing" | "planned" | "attempted-uncounted" | "counted";
  readonly smokeDiagnosisStatus: SmokeDiagnosisStatus;
  readonly transferDeclarationStatus: "declared" | "missing";
  readonly matrixReadinessStatus: "ready" | "blocked";
  readonly fullMatrixReady: boolean;
  readonly blockers: readonly string[];
  readonly nextAction: string;
}

export function evaluatePromotionSmokeGate(input: PromotionSmokeGateInput): PromotionSmokeGateResult {
  const blockers: string[] = [];

  if (!input.localEvidencePass) blockers.push("local reference/mutant/baseline evidence is not clean");
  if (!input.campaignPresent) blockers.push("smoke campaign is missing");
  if (input.campaignPresent && !input.campaignHashCurrent) blockers.push("smoke campaign hash is stale");
  if (!input.packageHashCurrent) blockers.push("challenge package hash is stale");
  if (!input.verifierMutantBaselinePass) blockers.push("verifier/mutant/baseline gates are not clean");
  if (input.countedSmokeTrials === 0) blockers.push("no counted smoke trial");
  if (!input.transferDeclared) blockers.push("transfer test is not declared");

  const cleanPassNeedsReason =
    input.countedSolves > 0 &&
    input.countedFailures === 0 &&
    (input.allowMatrixAfterCleanPassReason ?? "").trim().length === 0;
  if (cleanPassNeedsReason) {
    blockers.push(
      "clean smoke pass routes to already_solved_or_needs_evolution unless a matrix reason is declared",
    );
  }

  if (input.countedFailures > 0 && input.diagnosisStatus !== "on-target") {
    blockers.push("counted smoke failure is not diagnosed as on-target");
  }
  if ((input.matrixBlockedReason ?? "").trim().length > 0) {
    blockers.push(input.matrixBlockedReason ?? "");
  }

  const baseMatrixReady =
    input.localEvidencePass &&
    input.campaignPresent &&
    input.campaignHashCurrent &&
    input.packageHashCurrent &&
    input.verifierMutantBaselinePass &&
    input.countedSmokeTrials > 0 &&
    input.transferDeclared &&
    ((input.countedFailures > 0 && input.diagnosisStatus === "on-target") ||
      (input.countedSolves > 0 && !cleanPassNeedsReason));
  const matrixReady = baseMatrixReady && (input.matrixBlockedReason ?? "").trim().length === 0;

  const attemptedUncounted = input.providerRefusals + input.infraFailures > 0;
  const baseState: PromotionSmokeState = !input.campaignPresent
    ? "local-evidence-only"
    : input.countedSmokeTrials === 0
      ? attemptedUncounted
        ? "smoke-attempted-uncounted"
        : "smoke-planned"
      : input.countedFailures > 0
        ? input.diagnosisStatus === "on-target"
          ? input.transferDeclared
            ? "transfer-ready"
            : "smoke-failed-on-target"
          : "smoke-failed-off-target"
        : "smoke-passed-cleanly";

  const state = matrixReady ? "matrix-ready" : baseState;
  const smokeCampaignStatus = !input.campaignPresent
    ? "missing"
    : input.countedSmokeTrials > 0
      ? "counted"
      : attemptedUncounted
        ? "attempted-uncounted"
        : "planned";

  return {
    familyId: input.familyId,
    state,
    localEvidenceStatus: input.localEvidencePass ? "pass" : "fail",
    smokeCampaignStatus,
    smokeDiagnosisStatus: input.diagnosisStatus,
    transferDeclarationStatus: input.transferDeclared ? "declared" : "missing",
    matrixReadinessStatus: matrixReady ? "ready" : "blocked",
    fullMatrixReady: matrixReady,
    blockers: matrixReady ? [] : [...new Set(blockers)].sort(),
    nextAction: nextActionFor(input, state, matrixReady),
  };
}

function nextActionFor(
  input: PromotionSmokeGateInput,
  state: PromotionSmokeState,
  matrixReady: boolean,
): string {
  if (matrixReady) return "full matrix may be considered; it is not automatic";
  if ((input.matrixBlockedReason ?? "").trim().length > 0) return input.matrixBlockedReason ?? "";
  if (!input.localEvidencePass) return "repair local reference/verifier/mutant evidence";
  if (!input.campaignPresent) return "create a hash-pinned one-agent smoke campaign";
  if (!input.campaignHashCurrent || !input.packageHashCurrent) {
    return "reissue the challenge/campaign hash before any run can count";
  }
  if (state === "smoke-planned") return "run one OpenAI/Codex smoke trial";
  if (state === "smoke-attempted-uncounted")
    return "repair provider or infrastructure path; no evidence counted";
  if (state === "smoke-passed-cleanly")
    return "treat as already_solved_or_needs_evolution unless a matrix reason is declared";
  if (state === "smoke-failed-off-target")
    return "repair spec, package or harness before spending on a matrix";
  if (state === "smoke-failed-on-target") return "declare transfer before considering matrix spend";
  return "complete remaining transfer and matrix gates";
}
