import {
  type ExecutionProfile,
  type ProfileObservation,
  type QualificationEvidence,
  type Target,
  profileDigest,
  qualify,
} from "../execution/profiles.js";
import { type ReservedAuthority, isActiveReservedAuthority } from "../execution/store.js";
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
    readonly evidenceClass?: "real-provider" | "simulation" | "historical-import";
    readonly profileSpecification?: ExecutionProfile;
    readonly profileObservation?: ProfileObservation;
    readonly substantive?: boolean;
    readonly slot?: string;
    readonly attempt?: number;
    readonly retryOf?: string | null;
    readonly retryReason?: string;
    readonly retryAuthorized?: boolean;
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
  readonly reservation?: ReservedAuthority;
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
  const reserved = isActiveReservedAuthority(request?.reservation) ? request.reservation : null;
  if (!request?.approval?.approved && !reserved) authorized.push("explicit-approval-missing");
  if (request) {
    if (
      !request.profile ||
      request.packageDigest !== record?.digest ||
      (reserved?.packageDigest ?? request.approval?.packageDigest) !== request.packageDigest ||
      (reserved?.profile ?? request.approval?.profile) !== request.profile ||
      (reserved?.operation ?? request.approval?.operation) !== request.operation
    )
      authorized.push("approval-binding-mismatch");
    if (request.execution !== "inert-test" && (!reserved || reserved.realm !== "real-provider"))
      authorized.push("durable-signed-reservation-missing");
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
      o.evidenceClass !== "simulation" &&
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
  // The same qualification policy is used by standalone inspection and release. Do not
  // discard invalid attempts before checking retry lineage, or retries become cherry-picks.
  const specifications: Partial<Record<Target, ExecutionProfile>> = {};
  const evidence: QualificationEvidence[] = [];
  for (const o of observations.filter((o) => profiles.includes(o.profile))) {
    try {
      const p = o.profileSpecification;
      if (!o.contentVerified || !p || !o.profileObservation || profileDigest(p) !== o.profile)
        throw Error("profile or content missing");
      const previous = specifications[p.target];
      if (previous && profileDigest(previous) !== o.profile) throw Error("conflicting target profiles");
      specifications[p.target] = p;
      evidence.push({
        ...o,
        target: p.target,
        profileDigest: o.profile,
        slot: o.slot ?? "",
        attempt: o.attempt ?? 0,
        observation: o.profileObservation,
        substantive: o.substantive === true,
        evidenceClass: o.evidenceClass ?? "historical-import",
        outcome: o.outcome === "invalid" ? "invalid-execution" : o.outcome,
      });
    } catch {
      release.push(`unattested-exact-profile:${o.profile}`);
    }
  }
  if (!specifications.codex || !specifications.claude) release.push("exact-two-target-profiles-missing");
  else {
    const qualification = qualify(
      record?.digest ?? "",
      specifications as Record<Target, ExecutionProfile>,
      evidence,
    );
    release.push(...qualification.problems.map((problem) => `qualification:${problem}`));
    if (!qualification.complete) release.push("full-standard-and-adversarial-qualification-missing");
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
    "PACKAGE_AUTHORIZATION_DENIED: legacy direct provider dispatch is disabled; use the signed, reserved execution lifecycle with a controlled adapter",
  );
}
