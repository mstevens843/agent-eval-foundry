import { rigIntegrity } from "../screens/rig-integrity.js";
import { phase16CandidateContracts } from "./contracts.js";

export const PHASE16_PROBE_CANDIDATES = [
  "restore-proven-backup-orchestrator",
  "cell-capacity-removal-planner",
  "bgp-route-scope-patch-validator",
  "multi-name-caa-revalidation-reconciler",
] as const;

export type Phase16ProbeCandidateId = (typeof PHASE16_PROBE_CANDIDATES)[number];

interface ProbeSubjectRun {
  readonly failures: readonly string[];
  readonly mechanismActivated: boolean;
  readonly subjectView: unknown;
  readonly subjectResult: unknown;
  readonly observations: Readonly<Record<string, number | string | boolean>>;
}

export interface Phase16ExecutedProbe {
  readonly candidateId: Phase16ProbeCandidateId;
  readonly probeId: string;
  readonly status: "survived" | "killed";
  readonly reason: string;
  readonly expectedMutantFailures: readonly string[];
  readonly observedMutantFailures: readonly string[];
  readonly b6: {
    readonly sameInvocation: true;
    readonly usable: boolean;
    readonly knownGoodPassed: boolean;
    readonly knownBadFailed: boolean;
    readonly malformedInputRefused: boolean;
    readonly nondegenerate: boolean;
  };
  readonly mechanismActivated: boolean;
  readonly witnessIsolated: boolean;
  readonly deterministicReplay: boolean;
  readonly challengeNonleakage: boolean;
  readonly observations: Readonly<Record<string, number | string | boolean>>;
}

const PRIVATE_SENTINEL = "phase16-private-authority-7f31";

const sorted = (values: readonly string[]): readonly string[] => [...new Set(values)].sort();

const sameStrings = (left: readonly string[], right: readonly string[]): boolean =>
  JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));

const malformedRefused = (grade: (value: unknown) => readonly string[]): boolean => {
  try {
    grade({ status: "UNDECLARED", privateAuthority: PRIVATE_SENTINEL });
    return false;
  } catch {
    return true;
  }
};

const finishProbe = (
  root: string,
  candidateId: Phase16ProbeCandidateId,
  reference: ProbeSubjectRun,
  referenceReplay: ProbeSubjectRun,
  mutant: ProbeSubjectRun,
  malformedWasRefused: boolean,
): Phase16ExecutedProbe => {
  const contract = phase16CandidateContracts(root).find((row) => row.candidateId === candidateId);
  if (contract === undefined) throw new Error(`${candidateId}: probe contract missing`);
  const declaredMutant = contract.validation.narrowMutants[0];
  if (declaredMutant === undefined) throw new Error(`${candidateId}: declared mutant missing`);
  const expected = sorted(declaredMutant.expectedFailedChecks);
  const observed = sorted(mutant.failures);
  const knownGoodPassed = reference.failures.length === 0;
  const knownBadFailed = observed.length > 0;
  const integrity = rigIntegrity(
    `phase16-${candidateId}-probe`,
    [
      { id: "reference", expect: "pass", observedFailures: reference.failures },
      { id: declaredMutant.id, expect: "fail", observedFailures: mutant.failures },
    ],
    [reference.failures, mutant.failures],
  );
  const deterministicReplay = JSON.stringify(reference) === JSON.stringify(referenceReplay);
  const visibleBytes = JSON.stringify([
    reference.subjectView,
    reference.subjectResult,
    mutant.subjectView,
    mutant.subjectResult,
  ]);
  const witnessIsolated = !visibleBytes.includes(PRIVATE_SENTINEL);
  const publicBytes = JSON.stringify({
    publicContract: contract.publicContract,
    grading: contract.grading,
    hiddenInstanceEnvelope: contract.hiddenInstanceEnvelope,
    subjectInterface: contract.subjectInterface,
  });
  const challengeNonleakage = !publicBytes.includes(PRIVATE_SENTINEL);
  const expectedFatality = sameStrings(expected, observed);
  const usable =
    integrity.usable && malformedWasRefused && deterministicReplay && witnessIsolated && challengeNonleakage;
  const survived = usable && mutant.mechanismActivated && expectedFatality;
  const reasons = [
    ...(usable ? [] : ["one or more B6, replay, isolation, or nonleakage controls failed"]),
    ...(mutant.mechanismActivated ? [] : ["the declared mutant mechanism did not activate"]),
    ...(expectedFatality
      ? []
      : [`declared mutant profile ${expected.join(",")} differed from observed ${observed.join(",")}`]),
  ];
  return {
    candidateId,
    probeId: contract.validation.cheapProbe.id,
    status: survived ? "survived" : "killed",
    reason: survived
      ? "All registered probe controls and the exact narrow-mutant profile held."
      : reasons.join("; "),
    expectedMutantFailures: expected,
    observedMutantFailures: observed,
    b6: {
      sameInvocation: true,
      usable,
      knownGoodPassed,
      knownBadFailed,
      malformedInputRefused: malformedWasRefused,
      nondegenerate: !integrity.degenerate,
    },
    mechanismActivated: mutant.mechanismActivated,
    witnessIsolated,
    deterministicReplay,
    challengeNonleakage,
    observations: mutant.observations,
  };
};

type BackupReport = {
  readonly status: "VERIFIED" | "FAILED";
  readonly artifactId: string | null;
  readonly restoreId: string | null;
  readonly clientMajor: 92 | 96 | null;
};

const gradeBackup = (value: unknown): readonly string[] => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("malformed");
  const row = value as Record<string, unknown>;
  if (
    (row.status !== "VERIFIED" && row.status !== "FAILED") ||
    !(typeof row.artifactId === "string" || row.artifactId === null) ||
    !(typeof row.restoreId === "string" || row.restoreId === null) ||
    !(row.clientMajor === 92 || row.clientMajor === 96 || row.clientMajor === null)
  ) {
    throw new Error("malformed");
  }
  return [];
};

const runBackup = (subject: "reference" | "mutant"): ProbeSubjectRun => {
  const view = {
    sourceSnapshotId: "snap-7",
    sourceEngineMajor: 96 as const,
    availableClientMajors: [92, 96] as const,
    restoreTargetId: "restore-4",
    expectedObjectCount: 12,
  };
  const artifactCondition = "truncated" as const;
  const ledger: { creates: number[]; restores: string[]; compared: boolean } = {
    creates: [],
    restores: [],
    compared: false,
  };
  const authority = { sourceDigest: PRIVATE_SENTINEL, restoredDigest: "truncated-state" };
  const create = (clientMajor: 92 | 96): string | null => {
    ledger.creates.push(clientMajor);
    return clientMajor === view.sourceEngineMajor ? "artifact-8" : null;
  };
  const restore = (artifactId: string): boolean => {
    ledger.restores.push(artifactId);
    return artifactId === "artifact-8";
  };
  const compareState = (): boolean => {
    ledger.compared = true;
    return authority.sourceDigest === authority.restoredDigest;
  };
  const matching = view.availableClientMajors.find((major) => major === view.sourceEngineMajor) ?? null;
  let report: BackupReport;
  if (matching === null) {
    report = { status: "FAILED", artifactId: null, restoreId: null, clientMajor: null };
  } else {
    const artifactId = create(matching);
    if (artifactId === null) {
      report = { status: "FAILED", artifactId: null, restoreId: null, clientMajor: matching };
    } else if (subject === "mutant") {
      report = {
        status: "VERIFIED",
        artifactId,
        restoreId: view.restoreTargetId,
        clientMajor: matching,
      };
    } else {
      const restored = restore(artifactId);
      const equal = restored && compareState();
      report = {
        status: equal ? "VERIFIED" : "FAILED",
        artifactId,
        restoreId: restored ? view.restoreTargetId : null,
        clientMajor: matching,
      };
    }
  }
  gradeBackup(report);
  const failures = [
    ...(report.status === "VERIFIED" && !ledger.compared ? ["check-backup-restoration-proof"] : []),
    ...(matching !== null && ledger.restores.length === 0 ? ["check-backup-positive-work"] : []),
  ];
  return {
    failures,
    mechanismActivated:
      subject === "mutant" && report.status === "VERIFIED" && artifactCondition === "truncated",
    subjectView: view,
    subjectResult: report,
    observations: {
      createCalls: ledger.creates.length,
      restoreCalls: ledger.restores.length,
      compared: ledger.compared,
      artifactCondition,
    },
  };
};

type CapacityReport = {
  readonly status: "COMPLETED" | "REFUSED" | "PARTIAL";
  readonly acceptedBatches: readonly (readonly number[])[];
  readonly removed: number;
};

const gradeCapacity = (value: unknown): readonly string[] => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("malformed");
  const row = value as Record<string, unknown>;
  if (
    !["COMPLETED", "REFUSED", "PARTIAL"].includes(String(row.status)) ||
    !Array.isArray(row.acceptedBatches) ||
    typeof row.removed !== "number"
  ) {
    throw new Error("malformed");
  }
  return [];
};

const runCapacity = (subject: "reference" | "mutant"): ProbeSubjectRun => {
  const view = {
    requestId: "request-4",
    targetCell: "cell-a",
    removeCount: 2,
    maxBatch: 1,
    subsystems: [
      { id: "index", current: 3, minimum: 2, cells: ["cell-a"] },
      { id: "metadata", current: 2, minimum: 1, cells: ["cell-a"] },
    ],
  };
  const authority = { marker: PRIVATE_SENTINEL, current: view.subsystems.map((row) => row.current) };
  const attempts: number[][] = [];
  const accepted: number[][] = [];
  const remove = (indexes: number[]): boolean => {
    attempts.push([...indexes]);
    const withinBatch = indexes.length <= view.maxBatch;
    const withinFloors = authority.current.every(
      (current, index) => current - indexes.length >= (view.subsystems[index]?.minimum ?? 0),
    );
    if (!withinBatch || !withinFloors) return false;
    authority.current = authority.current.map((current) => current - indexes.length);
    accepted.push([...indexes]);
    return true;
  };
  let report: CapacityReport;
  if (subject === "mutant") {
    const indexes = [0, 1];
    const ok = remove(indexes);
    report = {
      status: ok ? "COMPLETED" : "REFUSED",
      acceptedBatches: ok ? [indexes] : [],
      removed: ok ? indexes.length : 0,
    };
  } else {
    for (let index = 0; index < view.removeCount; index += 1) {
      if (!remove([index])) break;
    }
    report = {
      status:
        accepted.length === view.removeCount ? "COMPLETED" : accepted.length === 0 ? "REFUSED" : "PARTIAL",
      acceptedBatches: accepted,
      removed: accepted.flat().length,
    };
  }
  gradeCapacity(report);
  const crossedFloor = authority.current.some(
    (current, index) => current < (view.subsystems[index]?.minimum ?? 0),
  );
  const failures = [
    ...(crossedFloor ? ["check-capacity-safety-floor"] : []),
    ...(attempts.some((batch) => batch.length > view.maxBatch) ? ["check-capacity-batch-bound"] : []),
    ...(accepted.length === 0 ? ["check-capacity-positive-progress"] : []),
  ];
  return {
    failures,
    mechanismActivated: subject === "mutant" && attempts.some((batch) => batch.length > view.maxBatch),
    subjectView: view,
    subjectResult: report,
    observations: {
      attemptedCalls: attempts.length,
      acceptedCalls: accepted.length,
      largestAttempt: Math.max(...attempts.map((batch) => batch.length)),
      crossedFloor,
    },
  };
};

type RoutePatch = {
  readonly termActive: boolean;
  readonly prefixListActive: boolean;
  readonly prefixes: readonly string[];
  readonly policyLocalPreference: number;
  readonly decision: "APPLY" | "REFUSE";
};

const gradeRoute = (value: unknown): readonly string[] => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("malformed");
  const row = value as Record<string, unknown>;
  if (
    typeof row.termActive !== "boolean" ||
    typeof row.prefixListActive !== "boolean" ||
    !Array.isArray(row.prefixes) ||
    typeof row.policyLocalPreference !== "number" ||
    (row.decision !== "APPLY" && row.decision !== "REFUSE")
  ) {
    throw new Error("malformed");
  }
  return [];
};

const runRoute = (subject: "reference" | "mutant"): ProbeSubjectRun => {
  const view = {
    requestId: "route-3",
    intent: "remove-target-from-backbone" as const,
    targetSite: "ATL",
    policy: {
      termActive: true,
      prefixListActive: true,
      prefixes: ["10.1.0.0/16"],
      localPreference: 200,
    },
    localPreference: 100,
    maximumPrefixes: 1,
  };
  const authority = { marker: PRIVATE_SENTINEL, routeUniverse: 4, applied: false };
  let simulations = 0;
  const draft = {
    termActive: subject === "mutant",
    prefixListActive: subject !== "mutant",
    prefixes: [...view.policy.prefixes],
    policyLocalPreference: view.policy.localPreference,
  };
  const advertisedPrefixes = !draft.termActive ? 0 : draft.prefixListActive ? draft.prefixes.length : 4;
  const localityViolations =
    draft.termActive && draft.policyLocalPreference > view.localPreference ? authority.routeUniverse - 1 : 0;
  simulations += 1;
  const safe = advertisedPrefixes <= view.maximumPrefixes && localityViolations === 0;
  if (safe) authority.applied = true;
  const report: RoutePatch = { ...draft, decision: safe ? "APPLY" : "REFUSE" };
  gradeRoute(report);
  const failures = [
    ...(draft.termActive || !draft.prefixListActive || draft.prefixes.join() !== view.policy.prefixes.join()
      ? ["check-route-prefix-scope"]
      : []),
    ...(authority.applied && !safe ? ["check-route-safe-application"] : []),
    ...(simulations === 0 ? ["check-route-positive-simulation"] : []),
  ];
  return {
    failures,
    mechanismActivated: subject === "mutant" && advertisedPrefixes > view.policy.prefixes.length,
    subjectView: view,
    subjectResult: report,
    observations: { simulations, advertisedPrefixes, localityViolations, applied: authority.applied },
  };
};

type CaaReport = {
  readonly decision: "ISSUE" | "REFUSE";
  readonly results: readonly {
    readonly fqdn: string;
    readonly caa: "ALLOW" | "DENY";
    readonly source: "CACHE" | "CURRENT";
  }[];
};

const gradeCaa = (value: unknown): readonly string[] => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("malformed");
  const row = value as Record<string, unknown>;
  if ((row.decision !== "ISSUE" && row.decision !== "REFUSE") || !Array.isArray(row.results)) {
    throw new Error("malformed");
  }
  return [];
};

const runCaa = (subject: "reference" | "mutant"): ProbeSubjectRun => {
  const view = {
    orderId: "order-9",
    nowHour: 20,
    names: [
      { fqdn: "a.example", validatedAtHour: 10, cachedCaa: "ALLOW" as const },
      { fqdn: "b.example", validatedAtHour: 9, cachedCaa: "ALLOW" as const },
    ],
  };
  const authority = new Map([
    ["a.example", "ALLOW" as const],
    ["b.example", "DENY" as const],
  ]);
  const marker = PRIVATE_SENTINEL;
  const queries: string[] = [];
  const current = (fqdn: string): "ALLOW" | "DENY" => {
    queries.push(fqdn);
    return authority.get(fqdn) ?? "DENY";
  };
  const firstStale = view.names.find((name) => view.nowHour - name.validatedAtHour > 8)?.fqdn;
  const results = view.names.map((name) => {
    const stale = view.nowHour - name.validatedAtHour > 8;
    if (!stale) return { fqdn: name.fqdn, caa: name.cachedCaa, source: "CACHE" as const };
    const queryName = subject === "mutant" ? (firstStale ?? name.fqdn) : name.fqdn;
    return { fqdn: name.fqdn, caa: current(queryName), source: "CURRENT" as const };
  });
  const report: CaaReport = {
    decision: results.every((result) => result.caa === "ALLOW") ? "ISSUE" : "REFUSE",
    results,
  };
  gradeCaa(report);
  const staleNames = view.names.filter((name) => view.nowHour - name.validatedAtHour > 8);
  const bindingMismatch = staleNames.some((name) => !queries.includes(name.fqdn));
  const unsafeIssue =
    report.decision === "ISSUE" && staleNames.some((name) => authority.get(name.fqdn) === "DENY");
  const failures = [
    ...(bindingMismatch ? ["check-caa-per-name-binding"] : []),
    ...(unsafeIssue ? ["check-caa-safe-issuance"] : []),
    ...(queries.length < staleNames.length ? ["check-caa-positive-query-work"] : []),
  ];
  return {
    failures,
    mechanismActivated: subject === "mutant" && new Set(queries).size < staleNames.length,
    subjectView: view,
    subjectResult: report,
    observations: {
      queryCount: queries.length,
      uniqueQueryCount: new Set(queries).size,
      staleNames: staleNames.length,
      unsafeIssue,
      authorityMarkerRetained: marker === PRIVATE_SENTINEL,
    },
  };
};

const IMPLEMENTATIONS: Readonly<
  Record<
    Phase16ProbeCandidateId,
    {
      readonly run: (subject: "reference" | "mutant") => ProbeSubjectRun;
      readonly grade: (value: unknown) => readonly string[];
    }
  >
> = {
  "restore-proven-backup-orchestrator": { run: runBackup, grade: gradeBackup },
  "cell-capacity-removal-planner": { run: runCapacity, grade: gradeCapacity },
  "bgp-route-scope-patch-validator": { run: runRoute, grade: gradeRoute },
  "multi-name-caa-revalidation-reconciler": { run: runCaa, grade: gradeCaa },
};

export function runPhase16Probe(root: string, candidateId: Phase16ProbeCandidateId): Phase16ExecutedProbe {
  const implementation = IMPLEMENTATIONS[candidateId];
  const reference = implementation.run("reference");
  const referenceReplay = implementation.run("reference");
  const mutant = implementation.run("mutant");
  return finishProbe(
    root,
    candidateId,
    reference,
    referenceReplay,
    mutant,
    malformedRefused(implementation.grade),
  );
}
