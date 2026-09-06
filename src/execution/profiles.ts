import { canonicalJson, sha256 } from "../packages/record.js";

export const TB3_REVISION = "83c7a6172d629c6575b785ab12c8db787bb2e323";
/** Requested settings, not a receipt identifying a backend or a future CI revision. */
export const TARGETS = {
  codex: { provider: "openai", model: "openai/gpt-5.6-sol", effort: "xhigh", scaffold: "codex", env: {} },
  claude: {
    provider: "anthropic",
    model: "anthropic/claude-opus-5",
    effort: "max",
    scaffold: "claude-code",
    env: { CLAUDE_CODE_MAX_OUTPUT_TOKENS: "128000" },
  },
} as const;
export type Target = keyof typeof TARGETS;
export interface ExecutionProfile {
  schemaVersion: 1;
  target: Target;
  requested: { provider: string; model: string; effort: string; scaffold: string };
  provenance: { revision: string; source: string };
  adapter: { id: string; version: string; scaffoldVersion: string | null };
  authoring: {
    image: string;
    network: "none" | "bridge";
    tools: readonly string[];
    credentials: "none" | "broker";
  };
  gradingRoute: string;
  context: { handling: "scaffold-default-unobserved"; outputTokens: number | null };
  limits: {
    wallMs: number;
    outputBytes: number;
    artifactBytes: number;
    memoryMiB: number;
    cpus: number;
    pids: number;
  };
}
export function profileFor(target: Target, image: string, gradingRoute: string): ExecutionProfile {
  const { env: _env, ...requested } = TARGETS[target];
  return {
    schemaVersion: 1,
    target,
    requested,
    provenance: { revision: TB3_REVISION, source: `.github/harbor-run-defaults.yml@${TB3_REVISION}` },
    adapter: { id: "foundry-isolated-execution", version: "1", scaffoldVersion: null },
    authoring: { image, network: "none", tools: ["node", "shell"], credentials: "none" },
    gradingRoute,
    context: { handling: "scaffold-default-unobserved", outputTokens: target === "claude" ? 128000 : null },
    limits: {
      wallMs: 7200000,
      outputBytes: 32 * 1024 * 1024,
      artifactBytes: 8 * 1024 * 1024,
      memoryMiB: gradingRoute.startsWith("native-caa") ? 4096 : 2048,
      cpus: 2,
      pids: 256,
    },
  };
}
export function profileDigest(p: ExecutionProfile): string {
  if (p.schemaVersion !== 1 || !TARGETS[p.target] || !/^sha256:[a-f0-9]{64}$/.test(p.authoring.image))
    throw Error("PROFILE_INVALID");
  const target = TARGETS[p.target];
  if (
    ["provider", "model", "effort", "scaffold"].some(
      (k) => p.requested[k as keyof typeof p.requested] !== target[k as keyof typeof p.requested],
    )
  )
    throw Error("PROFILE_TARGET_MISMATCH");
  if (
    Object.values(p.limits).some((v) => !Number.isSafeInteger(v) || v <= 0) ||
    p.limits.outputBytes > 256 * 1024 * 1024 ||
    p.limits.artifactBytes > 64 * 1024 * 1024 ||
    p.limits.wallMs > 18000000
  )
    throw Error("PROFILE_LIMITS");
  if (
    !["none", "bridge"].includes(p.authoring.network) ||
    !["none", "broker"].includes(p.authoring.credentials) ||
    !p.gradingRoute ||
    p.provenance.revision !== TB3_REVISION
  )
    throw Error("PROFILE_POLICY");
  return sha256(canonicalJson(p));
}
export interface Observation {
  value: string | null;
  source: string;
  status: "observed" | "requested" | "unobservable";
}
export interface ProfileObservation {
  model: Observation;
  effort: Observation;
  scaffoldVersion: Observation;
  fallback: boolean | null;
  evidenceClass: "real-provider" | "simulation" | "historical-import";
}
export function unobservedProfile(evidenceClass: ProfileObservation["evidenceClass"]): ProfileObservation {
  const unknown = (): Observation => ({
    value: null,
    source: "no trusted runtime observation",
    status: "unobservable",
  });
  return { model: unknown(), effort: unknown(), scaffoldVersion: unknown(), fallback: null, evidenceClass };
}
export function exactProfileProblems(p: ExecutionProfile, observed: ProfileObservation): string[] {
  profileDigest(p);
  const problems: string[] = [];
  if (observed.evidenceClass !== "real-provider") problems.push("not-real-provider");
  if (observed.fallback !== false) problems.push("fallback-unknown-or-used");
  for (const [field, expected] of [
    ["model", p.requested.model],
    ["effort", p.requested.effort],
    ["scaffoldVersion", p.adapter.scaffoldVersion],
  ] as const) {
    const actual = observed[field];
    if (!expected || actual.status !== "observed" || actual.value !== expected || !actual.source)
      problems.push(`unattested-or-mismatched-${field}`);
  }
  return problems;
}
/** Descriptive acceptance policy, not a scheduled campaign. */
export const QUALIFICATION_POLICY = {
  version: "owner-six-plus-two@1",
  revision: TB3_REVISION,
  standardPerTarget: 3,
  adversarialPerTarget: 1,
  promisingFailures: 5,
  fullFailures: 6,
  requiredAdjudication: "capability",
  simulationEligible: false,
} as const;
export interface QualificationEvidence {
  runId: string;
  slot: string;
  attempt: number;
  packageDigest: string;
  profileDigest: string;
  target: Target;
  operation: "standard" | "adversarial";
  outcome: string;
  adjudication: string;
  substantive: boolean;
  observation: ProfileObservation;
  evidenceClass: "real-provider" | "simulation" | "historical-import";
  retryOf?: string | null;
  retryReason?: string;
  retryAuthorized?: boolean;
}
export function qualify(
  packageDigest: string,
  profiles: Record<Target, ExecutionProfile>,
  records: readonly QualificationEvidence[],
) {
  const problems: string[] = [];
  const standardProblems: string[] = [];
  const ids = new Set<string>();
  const grouped = new Map<string, QualificationEvidence[]>();
  for (const r of records) {
    const key = `${r.target}/${r.operation}/${r.slot}`;
    const group = grouped.get(key) ?? [];
    group.push(r);
    grouped.set(key, group);
    if (!r.runId || ids.has(r.runId)) {
      problems.push(`duplicate-id:${r.runId}`);
      standardProblems.push(`duplicate-id:${r.runId}`);
    }
    ids.add(r.runId);
  }
  const selected: QualificationEvidence[] = [];
  let invalidPriorAttempts = 0;
  for (const [key, group] of grouped) {
    group.sort((a, b) => a.attempt - b.attempt);
    const invalid = group.some(
      (r, i) =>
        r.attempt !== i + 1 ||
        !r.slot ||
        r.packageDigest !== packageDigest ||
        r.evidenceClass !== "real-provider" ||
        !profiles[r.target] ||
        r.profileDigest !== profileDigest(profiles[r.target]) ||
        (i === 0 && r.retryOf != null) ||
        (i > 0 &&
          (group[i - 1]?.outcome !== "invalid-execution" ||
            r.retryOf !== group[i - 1]?.runId ||
            !r.retryReason?.trim() ||
            r.retryAuthorized !== true)),
    );
    if (invalid) {
      problems.push(`invalid-or-selected-retry:${key}`);
      if (group[0]?.operation === "standard") standardProblems.push(`invalid-or-selected-retry:${key}`);
      continue;
    }
    invalidPriorAttempts += group.length - 1;
    const last = group[group.length - 1];
    if (last) selected.push(last);
  }
  let failures = 0;
  let standards = 0;
  let audits = 0;
  for (const r of selected) {
    const reject = (message: string) => {
      problems.push(message);
      if (r.operation === "standard") standardProblems.push(message);
    };
    const profile = profiles[r.target];
    if (
      !profile ||
      r.evidenceClass !== "real-provider" ||
      r.packageDigest !== packageDigest ||
      r.profileDigest !== profileDigest(profile) ||
      exactProfileProblems(profile, r.observation).length ||
      !r.substantive
    ) {
      reject(`ineligible:${r.runId}`);
      continue;
    }
    if (r.operation === "standard") {
      standards++;
      if (r.outcome === "semantic-fail" && r.adjudication === "capability") failures++;
      else if (r.outcome !== "semantic-pass") reject(`invalid-standard:${r.runId}`);
    } else if (r.operation === "adversarial" && r.outcome === "semantic-fail") audits++;
    else problems.push(`adversarial-not-substantive-zero:${r.runId}`);
  }
  for (const target of ["codex", "claude"] as const) {
    if (selected.filter((r) => r.target === target && r.operation === "standard").length !== 3) {
      problems.push(`standard-count:${target}`);
      standardProblems.push(`standard-count:${target}`);
    }
    if (selected.filter((r) => r.target === target && r.operation === "adversarial").length !== 1)
      problems.push(`adversarial-count:${target}`);
  }
  return {
    policy: QUALIFICATION_POLICY.version,
    problems,
    genuineFailures: failures,
    invalidPriorAttempts,
    promising: !standardProblems.length && standards === 6 && failures >= 5,
    standardComplete: !standardProblems.length && standards === 6 && failures === 6,
    complete: !problems.length && failures === 6 && audits === 2,
  };
}
