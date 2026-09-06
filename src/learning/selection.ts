import { type PackagePolicyInput, decidePackage } from "../packages/policy.js";
import { canonicalJson, sha256 } from "../packages/record.js";
import type { LearningView } from "./findings.js";
import type { TrialView } from "./inspection.js";

export const PRODUCTION_ACTIONS = [
  "repair",
  "construct",
  "locally-validate",
  "eligibility-review",
  "authorized-execution",
  "brief-triage",
  "deep-investigation",
  "transfer",
  "retire",
  "hold",
] as const;
export type ProductionAction = (typeof PRODUCTION_ACTIONS)[number];
export interface ConstructionReview {
  /** Explicit author/reviewer judgments, not probabilities inferred from knob counts. */
  promise: "strong" | "moderate" | "weak" | "unknown";
  professionalValue: "supported" | "unsupported" | "unknown";
  rationale: string;
  evidence: string[];
  uncertainty: string[];
  remainingHours: number | null;
  reuse: "implemented" | "proposed" | "none";
  solution: {
    domain: string;
    outcome: string;
    strategy: string;
    invariantInteraction: string;
    infrastructure: string[];
  };
}
export interface ProductionCandidate {
  id: string;
  policy: PackagePolicyInput;
  review: ConstructionReview;
  findings: { findingId: string; claimId: string }[];
  trials: TrialView[];
  triagedSourceDigests: string[];
  active: boolean;
  retired: boolean;
}
export interface DiversityReview {
  leftDigest: string;
  rightDigest: string;
  decision: "materially-distinct" | "same-essential-repair" | "unknown";
  reviewer: string;
  evidence: string[];
  explanation: string;
}
export interface SelectionOptions {
  workInProgress: number;
  portfolioLimit: number;
  /** Ordinal preferences only. Perturbations are returned, not presented as calibrated value. */
  weights?: { promise: number; completeness: number; support: number; remainingHours: number };
  diversity?: DiversityReview[];
}
export function selectPackages(
  candidates: readonly ProductionCandidate[],
  learning: LearningView,
  options: SelectionOptions,
) {
  if (![options.workInProgress, options.portfolioLimit].every((n) => Number.isSafeInteger(n) && n > 0))
    throw Error("SELECTION_LIMIT");
  if (new Set(candidates.map((c) => c.id)).size !== candidates.length)
    throw Error("SELECTION_DUPLICATE_CANDIDATE");
  const weights = options.weights ?? { promise: 8, completeness: 2, support: 3, remainingHours: 0.05 };
  if (Object.values(weights).some((v) => !Number.isFinite(v) || v < 0)) throw Error("SELECTION_WEIGHT");
  const raw = candidates.map((c) => {
    const review = c.review;
    if (
      !review.rationale ||
      !review.evidence.length ||
      !review.uncertainty.length ||
      (review.remainingHours !== null &&
        (!Number.isFinite(review.remainingHours) || review.remainingHours < 0))
    )
      throw Error("SELECTION_REVIEW");
    const policy = decidePackage(c.policy);
    const digest = policy.packageDigest;
    const current = c.trials.filter(
      (t) =>
        digest !== null &&
        t.identity.packageDigest === digest &&
        t.kind !== "regrade" &&
        t.observation.evidenceClass !== "simulation",
    );
    const untriaged = current.filter((t) => !c.triagedSourceDigests.includes(t.sourceDigest));
    const supports = learning.claims.filter(
      (a) =>
        c.findings.some((f) => a.findingId === f.findingId && a.claimId === f.claimId) && a.capabilitySupport,
    );
    let action: ProductionAction;
    let reason: string;
    if (c.retired) {
      action = "retire";
      reason = "Explicit retirement retained with review; no automatic rerun.";
    } else if (
      c.policy.checks.unresolvedAmbiguities ||
      c.policy.checks.unrepairedBypasses ||
      review.professionalValue === "unsupported"
    ) {
      action = "repair";
      reason = "Known package validity/integrity defect takes precedence over difficulty or axis count.";
    } else if (untriaged.length) {
      action = "brief-triage";
      reason =
        "Classify new outcome, visible obligations and invalid execution before claiming insight; easy solves do not require deep decomposition.";
    } else if (!digest || c.policy.checks.publicPackageComplete !== true) {
      action = "construct";
      reason = "Complete a coherent professional package before proposing agent evidence.";
    } else if (
      !policy.stages["local-valid"].allowed ||
      c.policy.checks.protectedGrading !== true ||
      c.policy.checks.localIntegrityControls !== true
    ) {
      action = "locally-validate";
      reason =
        "Current package needs reference/alternative/near-miss/integrity evidence through its actual route.";
    } else if (supports.length && current.some((t) => t.eligibility.capability)) {
      action = "deep-investigation";
      reason = "Current qualified signal merits linked obligation analysis and falsifiable decomposition.";
    } else if (policy.stages["release-eligible"].allowed) {
      action = "transfer";
      reason =
        "Qualified package can inform a materially different construction; transfer still needs its own evidence.";
    } else if (policy.stages["trial-authorized"].allowed) {
      action = "authorized-execution";
      reason =
        "Only the existing execution policy and active reservation authorize dispatch; this planner dispatches nothing.";
    } else {
      action = "eligibility-review";
      reason =
        "Review current package blockers, independent expert evidence and separate authority; stale history alone requires no repeated repair.";
    }
    const promise = { strong: 3, moderate: 2, weak: 1, unknown: 0 }[review.promise];
    const completeness =
      Number(!!digest) +
      Number(c.policy.checks.publicPackageComplete === true) +
      Number(policy.stages["local-valid"].allowed);
    return {
      id: c.id,
      packageDigest: digest,
      action,
      reason,
      active: c.active,
      promise,
      completeness,
      supports: supports.map((s) => `${s.findingId}/${s.claimId}`),
      hours: review.remainingHours,
      uncertainty: review.uncertainty,
      policy,
      review,
    };
  });
  const unknownHoursAssumption = Math.max(24, ...raw.flatMap((r) => (r.hours === null ? [] : [r.hours])));
  const score = (r: (typeof raw)[number], w: typeof weights) =>
    r.promise * w.promise +
    r.completeness * w.completeness +
    r.supports.length * w.support -
    (r.hours ?? unknownHoursAssumption) * w.remainingHours;
  // Unknown costs remain null; ranking uses a disclosed conservative planning assumption.
  const rank = (w: typeof weights) =>
    raw
      .map((r, i) => ({ ...r, score: score(r, w), inputOrder: i }))
      .sort((a, b) => b.score - a.score || a.inputOrder - b.inputOrder);
  const ranked = rank(weights);
  const admitted: typeof ranked = [];
  const diversity = options.diversity ?? [];
  for (const d of diversity)
    if (!d.reviewer || !d.explanation || !d.evidence.length || d.leftDigest === d.rightDigest)
      throw Error("DIVERSITY_REVIEW");
  const rows = ranked.map((r) => {
    const duplicate = admitted.find(
      (other) =>
        r.packageDigest &&
        other.packageDigest &&
        (r.packageDigest === other.packageDigest ||
          diversity.some(
            (d) =>
              d.decision === "same-essential-repair" &&
              [d.leftDigest, d.rightDigest].includes(r.packageDigest as string) &&
              [d.leftDigest, d.rightDigest].includes(other.packageDigest as string),
          )),
    );
    const excluded =
      r.action === "retire"
        ? "retired"
        : duplicate
          ? `same-essential-repair:${duplicate.id}`
          : admitted.length >= options.portfolioLimit
            ? "portfolio-limit"
            : null;
    if (!excluded) admitted.push(r);
    return { ...r, selected: !excluded, selectionBlocker: excluded, costKnown: r.hours !== null };
  });
  let active = candidates.filter((c) => c.active && !c.retired).length;
  const decisions = rows.map((r) => {
    const withinWip = r.selected && (r.active || active < options.workInProgress);
    if (withinWip && !r.active) active++;
    return {
      ...r,
      recommendedAction: r.action,
      action: withinWip ? r.action : r.action === "retire" ? ("retire" as const) : ("hold" as const),
      holdReason: withinWip ? null : (r.selectionBlocker ?? "work-in-progress-limit"),
    };
  });
  const sensitivity = Object.keys(weights).flatMap((key) =>
    [0.5, 2].map((multiplier) => ({
      parameter: key,
      multiplier,
      order: rank({ ...weights, [key]: weights[key as keyof typeof weights] * multiplier }).map((r) => r.id),
    })),
  );
  const state = {
    learning: learning.digest,
    decisions,
    weights,
    unknownHoursAssumption,
    diversity,
    limits: { workInProgress: options.workInProgress, portfolioLimit: options.portfolioLimit },
  };
  return {
    schemaVersion: 1,
    policy: "package-production-selection@1",
    digest: sha256(canonicalJson(state)),
    learningDigest: learning.digest,
    decisions,
    weights,
    unknownHoursAssumption,
    sensitivity,
    activeLimitExceeded: candidates.filter((c) => c.active && !c.retired).length > options.workInProgress,
    assumptions: [
      "Ordinal construction judgments, not calibrated model failure probabilities.",
      "Missing cost is unknown. Ranking assumes max(24 hours, largest known remaining estimate), not a measured cost.",
      "No axes/knobs/prose-length bonus. Shared infrastructure alone neither proves nor disproves diversity.",
      "No provider dispatch, replay, paid analysis or extrapolation to a thousand deliveries.",
    ],
  };
}

export interface CohortEntry {
  candidateId: string;
  packageDigest: string;
  enteredAt: string;
  validAt: string | null;
  promisingAt: string | null;
  qualifiedAt: string | null;
  diagnosisAt: string | null;
  outcomeAt: string | null;
  /** A supplied assessment source, not a seed count. */
  evidence: string[];
  reworkHours: number | null;
  costs: {
    authorUsd: number | null;
    reviewerUsd: number | null;
    providerUsd: number | null;
    computeUsd: number | null;
    storageUsd: number | null;
  };
  attempts: {
    id: string;
    kind: "agent" | "regrade" | "simulation";
    outcome: "valid" | "invalid";
    source: string;
  }[];
  solutionCluster: string | null;
}
export function cohortMetrics(
  id: string,
  startedAt: string,
  endedAt: string,
  entries: readonly CohortEntry[],
) {
  const start = Date.parse(startedAt);
  const end = Date.parse(endedAt);
  if (!id || !Number.isFinite(start) || !Number.isFinite(end) || end < start) throw Error("COHORT_WINDOW");
  const identities = new Set<string>();
  const attempts = new Set<string>();
  for (const e of entries) {
    const key = `${e.candidateId}/${e.packageDigest}`;
    if (identities.has(key) || !/^[a-f0-9]{64}$/.test(e.packageDigest) || !e.evidence.length)
      throw Error("COHORT_IDENTITY");
    identities.add(key);
    const entered = Date.parse(e.enteredAt);
    if (!Number.isFinite(entered) || entered < start || entered > end) throw Error("COHORT_ENTRY_WINDOW");
    for (const at of [e.validAt, e.promisingAt, e.qualifiedAt, e.diagnosisAt, e.outcomeAt])
      if (
        at !== null &&
        (!Number.isFinite(Date.parse(at)) || Date.parse(at) < entered || Date.parse(at) > end)
      )
        throw Error("COHORT_EVENT_WINDOW");
    if (
      (e.promisingAt && (!e.validAt || Date.parse(e.promisingAt) < Date.parse(e.validAt))) ||
      (e.qualifiedAt && (!e.promisingAt || Date.parse(e.qualifiedAt) < Date.parse(e.promisingAt))) ||
      (e.diagnosisAt && (!e.outcomeAt || Date.parse(e.diagnosisAt) < Date.parse(e.outcomeAt)))
    )
      throw Error("COHORT_EVENT_ORDER");
    for (const v of [e.reworkHours, ...Object.values(e.costs)])
      if (v !== null && (!Number.isFinite(v) || v < 0)) throw Error("COHORT_COST");
    for (const a of e.attempts) {
      if (!a.id || !a.source || attempts.has(a.id)) throw Error("COHORT_DUPLICATE_ATTEMPT");
      attempts.add(a.id);
    }
  }
  const valid = entries.filter((e) => e.validAt);
  const promising = entries.filter((e) => e.promisingAt);
  const qualified = entries.filter((e) => e.qualifiedAt);
  const ratio = (numerator: number, denominator: number) => ({
    numerator,
    denominator,
    rate: denominator ? numerator / denominator : null,
  });
  const costs = Object.fromEntries(
    ["authorUsd", "reviewerUsd", "providerUsd", "computeUsd", "storageUsd"].map((k) => {
      const values = entries.map((e) => e.costs[k as keyof CohortEntry["costs"]]);
      return [
        k,
        {
          knownSum: values.reduce<number>((n, v) => n + (v ?? 0), 0),
          unknownEntries: values.filter((v) => v === null).length,
          total: values.some((v) => v === null) ? null : values.reduce<number>((n, v) => n + (v ?? 0), 0),
        },
      ];
    }),
  );
  const agentAttempts = entries.flatMap((e) => e.attempts).filter((a) => a.kind === "agent");
  return {
    schemaVersion: 1,
    id,
    startedAt,
    endedAt,
    unit: "candidate-package-version",
    evidenceBoundary:
      "Supplied accounting events, not independent qualification. Link policy decisions and receipts in entry evidence; unknown costs remain unknown.",
    identities: [...identities].sort(),
    candidateToValid: ratio(valid.length, entries.length),
    validToPromising: ratio(promising.length, valid.length),
    qualificationYield: ratio(qualified.length, valid.length),
    invalidExecution: ratio(
      agentAttempts.filter((a) => a.outcome === "invalid").length,
      agentAttempts.length,
    ),
    costs,
    timeToValidMs: valid.map((e) => Date.parse(e.validAt as string) - Date.parse(e.enteredAt)),
    timeToDiagnosisMs: entries
      .filter((e) => e.diagnosisAt && e.outcomeAt)
      .map((e) => Date.parse(e.diagnosisAt as string) - Date.parse(e.outcomeAt as string)),
    reworkHours: {
      knownSum: entries.reduce((n, e) => n + (e.reworkHours ?? 0), 0),
      unknownEntries: entries.filter((e) => e.reworkHours === null).length,
    },
    duplicateAdjustedQualified: {
      knownClusters: new Set(qualified.flatMap((e) => (e.solutionCluster ? [e.solutionCluster] : []))).size,
      unreviewedPackages: qualified.filter((e) => e.solutionCluster === null).length,
    },
    forecast: null,
  };
}
