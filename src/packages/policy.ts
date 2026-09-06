import { type PackageSnapshot, isVerifiedSnapshot, refreshSnapshot } from "./record.js";

export const PACKAGE_STAGES = [
  "local-valid",
  "trial-eligible",
  "trial-authorized",
  "hardness-observed",
  "release-eligible",
] as const;
export type PackageStage = (typeof PACKAGE_STAGES)[number];
export interface StageDecision {
  readonly allowed: boolean;
  readonly blockers: readonly string[];
  readonly notApplicable: readonly string[];
}
export interface PackageChecks {
  readonly reference: boolean;
  readonly positiveWork: boolean;
  readonly nearMissControls: boolean;
  readonly contractReviewed: boolean;
  readonly publicPackageComplete: boolean;
  readonly protectedGrading: boolean;
  readonly localIntegrityControls: boolean;
  readonly boundedSolveEvidence: boolean;
  readonly destinationChecks: boolean;
  readonly unresolvedAmbiguities: number;
  readonly unrepairedBypasses: number;
}
/** Host-evaluated inputs, never populated from a subject/imported `counts` or `ready` flag. */
export interface PackagePolicyInput {
  readonly expectedFamilyId?: string;
  readonly snapshot?: PackageSnapshot;
  readonly checks: Partial<PackageChecks>;
  readonly observations?: readonly {
    readonly packageDigest: string;
    readonly profile: string;
    readonly runId: string;
    readonly operation: "standard" | "adversarial";
    readonly outcome: "semantic-pass" | "semantic-fail" | "invalid";
    readonly adjudication: "capability" | "specification-ambiguity" | "unlabelled" | "other";
    readonly contentVerified: boolean;
    /** Host-attested profile lab, not a name inferred from imported model text. */
    readonly providerFamily?: "openai" | "anthropic" | "google" | "other" | "unknown";
  }[];
  /** Exact, frozen configuration identities; general provider names are insufficient. */
  readonly qualificationProfiles?: readonly string[];
  readonly authorization?: AuthorizationRequest;
}
export interface AuthorizationRequest {
  readonly packageDigest: string;
  readonly operation: "standard" | "adversarial" | "label";
  readonly profile: string;
  readonly approval: {
    readonly packageDigest: string;
    readonly operation: "standard" | "adversarial" | "label";
    readonly profile: string;
    readonly approved: boolean;
  } | null;
  readonly execution: "inert-test" | "real-provider";
}
export interface PackageDecision {
  readonly policyVersion: "package-stages-v1";
  readonly packageDigest: string | null;
  readonly stages: Readonly<Record<PackageStage, StageDecision>>;
  readonly observedProviderFamilies: readonly string[];
  readonly failureProviderFamilies: readonly string[];
}
const count = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;

/** One policy for reports, intake and execution. Readiness and spend authority are independent. */
export function decidePackage(input: PackagePolicyInput): PackageDecision {
  const common: string[] = [];
  let record: PackageSnapshot["record"] | undefined;
  if (isVerifiedSnapshot(input.snapshot)) {
    try {
      record = refreshSnapshot(input.snapshot).record;
    } catch {
      common.push("retained-package-content-invalid");
    }
  }
  const checks = input.checks;
  if (!record) common.push("content-verified-package-missing");
  if (record && input.expectedFamilyId && record.familyId !== input.expectedFamilyId)
    common.push("package-family-mismatch");
  if (!count(checks.unresolvedAmbiguities)) common.push("ambiguity-status-unknown");
  else if (checks.unresolvedAmbiguities > 0) common.push("unresolved-material-ambiguity");
  if (!count(checks.unrepairedBypasses)) common.push("bypass-status-unknown");
  else if (checks.unrepairedBypasses > 0) common.push("known-unrepaired-bypass");
  const requireChecks = (names: readonly (keyof PackageChecks)[]): string[] =>
    names.filter((name) => checks[name] !== true).map((name) => `required-${name}`);
  const local = [
    ...common,
    ...requireChecks(["reference", "positiveWork", "nearMissControls", "contractReviewed"]),
  ];
  if (record)
    for (const name of [
      "contract",
      "workspace",
      "scenarios",
      "verifier",
      "reference",
      "controls",
      "policy",
    ] as const) {
      if (!record.components[name].files.length) local.push(`missing-component-${name}`);
    }
  const eligible = [
    ...local,
    ...requireChecks([
      "publicPackageComplete",
      "protectedGrading",
      "localIntegrityControls",
      "boundedSolveEvidence",
    ]),
  ];
  if (record?.dependencies.unresolved.length) eligible.push("runtime-dependencies-unresolved");
  const authorized = [...eligible];
  const request = input.authorization;
  if (!request?.approval?.approved) authorized.push("explicit-approval-missing");
  if (request) {
    if (
      !request.profile ||
      request.packageDigest !== record?.digest ||
      request.approval?.packageDigest !== request.packageDigest ||
      request.approval?.profile !== request.profile ||
      request.approval?.operation !== request.operation
    )
      authorized.push("approval-binding-mismatch");
    if (request.execution !== "inert-test")
      authorized.push("durable-spend-authority-not-implemented-prompt-5");
  }
  const observations = input.observations ?? [];
  const unique = new Set<string>();
  const duplicate = observations.some((o) => {
    const key = o.runId;
    if (unique.has(key)) return true;
    unique.add(key);
    return false;
  });
  const valid = observations.filter(
    (o) =>
      o.contentVerified &&
      o.packageDigest === record?.digest &&
      o.outcome !== "invalid" &&
      /^[a-f0-9]{64}$/.test(o.profile) &&
      o.runId.trim().length > 0,
  );
  const failures = valid.filter(
    (o) => o.operation === "standard" && o.outcome === "semantic-fail" && o.adjudication === "capability",
  );
  const hardness = [...eligible];
  if (duplicate) hardness.push("duplicate-observation-id");
  if (!failures.length) hardness.push("no-qualified-capability-failure");
  const release = [...hardness, ...requireChecks(["destinationChecks"])];
  if (record?.kind !== "professional-package") release.push("not-destination-professional-package");
  const profiles = input.qualificationProfiles ?? [];
  if (
    profiles.length !== 2 ||
    new Set(profiles).size !== 2 ||
    profiles.some((p) => !/^[a-f0-9]{64}$/.test(p))
  )
    release.push("exact-two-target-profiles-missing");
  for (const profile of profiles) {
    const standard = valid.filter((o) => o.operation === "standard" && o.profile === profile);
    if (
      standard.length !== 3 ||
      standard.some((o) => o.outcome !== "semantic-fail" || o.adjudication !== "capability")
    )
      release.push(`requires-three-genuine-failures:${profile}`);
    const audit = valid.filter((o) => o.operation === "adversarial" && o.profile === profile);
    if (audit.length < 1 || audit.some((o) => o.outcome !== "semantic-fail"))
      release.push(`requires-zero-reward-adversarial-evidence:${profile}`);
  }
  const stage = (blockers: string[], notApplicable: string[] = []): StageDecision => ({
    allowed: blockers.length === 0,
    blockers: [...new Set(blockers)],
    notApplicable,
  });
  return {
    policyVersion: "package-stages-v1",
    packageDigest: record?.digest ?? null,
    observedProviderFamilies:
      eligible.length || duplicate
        ? []
        : [
            ...new Set(
              valid
                .filter(
                  (o) =>
                    o.operation === "standard" &&
                    o.providerFamily &&
                    !["unknown", "other"].includes(o.providerFamily),
                )
                .map((o) => o.providerFamily as string),
            ),
          ].sort(),
    failureProviderFamilies:
      eligible.length || duplicate
        ? []
        : [
            ...new Set(
              failures
                .filter((o) => o.providerFamily && !["unknown", "other"].includes(o.providerFamily))
                .map((o) => o.providerFamily as string),
            ),
          ].sort(),
    stages: {
      "local-valid": stage(local, ["model-evidence", "spend-approval", "axis-breadth"]),
      "trial-eligible": stage(eligible, ["prior-model-failure", "spend-approval", "axis-breadth"]),
      "trial-authorized": stage(authorized),
      "hardness-observed": stage(hardness, ["full-six-trial-qualification"]),
      "release-eligible": stage(release),
    },
  };
}

export function assertPackageStage(input: PackagePolicyInput, stage: PackageStage): PackageDecision {
  const decision = decidePackage(input);
  const result = decision.stages[stage];
  if (!result.allowed) throw new Error(`PACKAGE_POLICY_DENIED:${stage}: ${result.blockers.join(", ")}`);
  return decision;
}

/** Actual subprocess adapters cannot be unlocked by a test-mode flag or a plain approval object. */
export function denyUnreservedProviderExecution(): void {
  throw new Error(
    "PACKAGE_AUTHORIZATION_DENIED: real provider execution requires Prompt 5 durable reservations; inert test adapter only",
  );
}
