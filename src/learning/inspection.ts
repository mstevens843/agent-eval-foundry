import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { regularTree, verifyEvidence } from "../execution/artifacts.js";
import {
  type ExecutionProfile,
  type ProfileObservation,
  exactProfileProblems,
  profileDigest,
} from "../execution/profiles.js";
import { verifyAssembly } from "../packages/assembly.js";
import { inspectTrialEvidence } from "../packages/evidence.js";
import { validatePortfolioExecution } from "../packages/portfolio.js";
import {
  type PackageSnapshot,
  canonicalJson,
  readSnapshotFile,
  resolvePackage,
  sha256,
} from "../packages/record.js";
import { extractCheckers, profileRun } from "../reports/self-check.js";
import { evaluateOutcome } from "../trials/outcome.js";
import { parseRootCause, unlabelledRootCause } from "../trials/root-cause.js";
import type { RootCauseRecord } from "../trials/root-cause.js";

export const INSPECTION_VERSION = "trial-inspection@1";
export const object = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
export const string = (v: unknown): string | null => (typeof v === "string" ? v : null);
export interface EvidencePointer {
  path: string;
  sha256: string;
  locator: string;
}
export interface TimelineEvent {
  order: number;
  kind: "command" | "edit" | "output" | "statement" | "lifecycle" | "unparsed";
  basis: "recorded" | "reconstructed";
  timestamp: string | null;
  source: EvidencePointer;
  text: string;
  truncated: boolean;
  relatedId: string | null;
}
export interface FailureLink {
  check: string;
  scenarioId: string;
  observation: EvidencePointer;
  witnesses: EvidencePointer[];
  submittedCode: EvidencePointer[];
  visibleClauses: EvidencePointer[];
  checking: EvidencePointer[];
  linkBasis: "heuristic-search-not-causal-attribution";
  missing: string[];
}
export interface TrialView {
  schemaVersion: 1;
  inspector: typeof INSPECTION_VERSION;
  directory: string;
  runId: string;
  familyId: string | null;
  kind: "legacy-trial" | "execution" | "regrade";
  sourceDigest: string;
  files: ReturnType<typeof regularTree>;
  identity: {
    packageDigest: string | null;
    publicDigest: string | null;
    evaluatorDigest: string | null;
    submissionDigest: string | null;
    fullPackageVerified: boolean;
    current: boolean | null;
    profileDigest: string | null;
    requested: unknown;
    observed: unknown;
  };
  observation: {
    status: string;
    reward: number | null;
    failedScenarios: number;
    failedChecks: string[];
    newAgentAttempts: number;
    evidenceClass: string;
    semanticComplete: boolean;
  };
  adjudication: RootCauseRecord;
  eligibility: { capability: boolean; exactTarget: boolean; blockers: string[] };
  timeline: TimelineEvent[];
  checkers: {
    name: string;
    source: string;
    sha256: string;
    origin: EvidencePointer;
    adequacy: "not-assessed";
  }[];
  selfCheck: ReturnType<typeof profileRun>;
  failures: FailureLink[];
  missing: string[];
}

/** Reads bytes only. No import of submitted code, browser, provider, replay or grader entry points. */
export function inspectRun(
  directory: string,
  options: { store?: string; current?: PackageSnapshot } = {},
): TrialView {
  const dir = resolve(directory);
  const files = regularTree(dir);
  const byPath = new Map(files.map((f) => [f.path, f]));
  const missing: string[] = [];
  const textCache = new Map<string, string>();
  let cachedBytes = 0;
  const read = (path: string, limit = 16 * 1024 * 1024): string | null => {
    const entry = byPath.get(path);
    if (!entry) return null;
    if (entry.size > limit) {
      missing.push(`not-parsed-byte-limit:${path}`);
      return null;
    }
    const cached = textCache.get(path);
    if (cached !== undefined) return cached;
    const bytes = readFileSync(join(dir, path));
    if (sha256(bytes) !== entry.sha256) throw Error("INSPECTION_SOURCE_CHANGED");
    const text = bytes.toString("utf8");
    if (cachedBytes + bytes.length <= 32 * 1024 * 1024) {
      textCache.set(path, text);
      cachedBytes += bytes.length;
    }
    return text;
  };
  const json = (path: string): Record<string, unknown> => {
    const text = read(path);
    if (text === null) return {};
    try {
      return object(JSON.parse(text));
    } catch {
      missing.push(`malformed-json:${path}`);
      return {};
    }
  };
  const pointer = (path: string, locator = ""): EvidencePointer => {
    const f = byPath.get(path);
    if (!f) throw Error(`INSPECTION_MISSING_POINTER:${path}`);
    return { path, sha256: f.sha256, locator };
  };
  if (!byPath.has("result.json")) throw Error("INSPECTION_RESULT_MISSING");
  const result = json("result.json");
  const meta = json("metadata.json");
  const linked =
    result.kind === "linked-regrade" ||
    result.originalRunId !== undefined ||
    result.originalCompletionDigest !== undefined;
  const kind = linked ? "regrade" : byPath.has("countability.json") ? "legacy-trial" : "execution";
  const runId =
    string(result.runId) ??
    string(result.id) ??
    string(result.originalRunId) ??
    dir.split("/").pop() ??
    "unknown";
  let familyId = string(result.familyId) ?? string(meta.familyId);
  let fullPackageVerified = false;
  let semanticComplete = false;
  let packageDigest =
    string(result.packageDigest) ?? string(result.targetPackageDigest) ?? string(meta.packageDigest);
  let publicDigest: string | null = null;
  let evaluatorDigest: string | null = null;
  let current: boolean | null = null;
  const problems: string[] = [];
  let adjudication = unlabelledRootCause(runId, familyId ?? "unknown");
  if (byPath.has("root-cause.json")) adjudication = parseRootCause(json("root-cause.json"));
  let grade =
    kind === "regrade" ? result : json(kind === "legacy-trial" ? "verifier-output.json" : "grade.json");
  if (kind === "legacy-trial") {
    const inspected = inspectTrialEvidence(dir, options);
    publicDigest = inspected.identity.publicHash;
    packageDigest = inspected.identity.packageDigest;
    fullPackageVerified = inspected.identity.scope === "complete-package-v1";
    semanticComplete =
      inspected.evaluation?.complete ??
      (result.status === "completed" && Array.isArray(result.cells) && result.cells.length > 0);
    current = options.current ? inspected.identity.current : null;
    problems.push(...inspected.identity.problems);
    adjudication = inspected.original.rootCause;
    if (fullPackageVerified && options.store && packageDigest)
      evaluatorDigest = resolvePackage(options.store, packageDigest).record.components.verifier.digest;
  } else {
    let snapshot: PackageSnapshot | null = null;
    if (!byPath.has("completion.json")) problems.push("completion-manifest-missing");
    else verifyEvidence(dir);
    if (packageDigest && existsSync(join(dir, "package-store"))) {
      snapshot = resolvePackage(join(dir, "package-store"), packageDigest);
      familyId = snapshot.record.familyId;
      if (adjudication.labelledBy.id === "absent-sidecar-default")
        adjudication = unlabelledRootCause(runId, familyId);
      fullPackageVerified = true;
      evaluatorDigest = snapshot.record.components.verifier.digest;
      publicDigest = snapshot.record.components.contract.digest;
      current = options.current ? options.current.record.digest === packageDigest : null;
    } else problems.push("retained-full-package-unavailable");
    const detailed = json("grading/result.json");
    const native = snapshot?.record.id === "caa-revalidation-repair";
    const raw = native ? object(detailed.evaluation) : detailed;
    if (Array.isArray(raw.cells)) {
      grade = {
        ...grade,
        cells: native
          ? raw.cells.map((c) => ({
              ...object(c),
              failed: Array.isArray(object(c).failures)
                ? (object(c).failures as unknown[]).map((f) => object(f).check)
                : null,
            }))
          : raw.cells,
      };
    }
    semanticComplete = object(grade.evaluation).complete === true;
    // Recompute completeness against retained package bytes, never trust a green summary flag.
    if (kind === "execution") {
      semanticComplete = false;
      if (snapshot)
        try {
          verifyAssembly(snapshot, join(dir, "public"), "subject");
          const component = (path: string) =>
            JSON.parse(Buffer.from(readSnapshotFile(snapshot, "scenarios", path)).toString());
          const manifest = native ? object(component("native-manifest.json")) : null;
          const ids = native
            ? manifest?.scenarioIds
            : component("private/scenarios.json").map((s: { id: string }) => s.id);
          const checks = native ? manifest?.checkIds : component("check-ids.json");
          if (!native) validatePortfolioExecution(detailed, ids as string[], checks as string[]);
          const cells = Array.isArray(grade.cells)
            ? grade.cells.map((c) => ({
                scenarioId: object(c).scenarioId,
                failed: object(c).failed ?? object(c).failures,
              }))
            : [];
          const outcome = evaluateOutcome({
            providerStatus: String(json("capture.json").status),
            expectedIds: ids as string[],
            expectedCheckIds: checks as string[],
            artifactPresent: files.some((f) => f.path.startsWith("submission/")),
            hostErrors: native
              ? raw.complete === true && Array.isArray(raw.errors) && raw.errors.length === 0
                ? 0
                : 1
              : Array.isArray(detailed.cells) && detailed.cells.every((c) => object(c).status !== "invalid")
                ? 0
                : 1,
            cells,
          });
          semanticComplete =
            outcome.complete &&
            canonicalJson(outcome) === canonicalJson(grade.evaluation) &&
            grade.reward === (outcome.status === "semantic-pass" ? 1 : 0) &&
            result.outcome === outcome.status;
          if (!semanticComplete) problems.push("retained-grade-accounting-conflict");
        } catch (e) {
          problems.push(`retained-grade-validation:${String(e)}`);
        }
    }
  }
  if (adjudication.runId !== runId || adjudication.familyId !== (familyId ?? "unknown"))
    throw Error("INSPECTION_ADJUDICATION_MISMATCH");
  const profile = json("profile.json");
  const observed = result.observation ?? meta.profileObservation ?? null;
  const requested = Object.keys(profile).length
    ? profile.requested
    : {
        model: meta.model ?? result.model ?? null,
        effort: meta.effort ?? result.effort ?? null,
        scaffold: meta.agent ?? null,
        scaffoldVersion: meta.agentVersion ?? null,
      };
  const declarations = [
    result.evidenceClass,
    result.realm,
    meta.evidenceClass,
    meta.executionMode,
    object(observed).evidenceClass,
  ];
  const evidenceClass = declarations.some((x) => x === "simulation" || x === "inert-test")
    ? "simulation"
    : kind === "legacy-trial"
      ? "historical-import"
      : declarations.includes("real-provider")
        ? "real-provider"
        : "unknown";
  const rawStatus =
    string(result.outcome) ??
    string(result.status) ??
    (kind === "regrade" ? string(object(result.evaluation).status) : null) ??
    "unknown";
  const status =
    ["completed", "semantic-pass", "semantic-fail"].includes(rawStatus) && semanticComplete
      ? rawStatus
      : rawStatus === "refused"
        ? "refused"
        : "invalid-execution";
  const rawCells = Array.isArray(grade.cells) ? grade.cells : Array.isArray(result.cells) ? result.cells : [];
  const cells = rawCells.map(object);
  const failed = (cell: Record<string, unknown>): string[] =>
    (Array.isArray(cell.failed) ? cell.failed : Array.isArray(cell.failures) ? cell.failures : []).filter(
      (v): v is string => typeof v === "string",
    );
  const failedChecks = [...new Set(cells.flatMap(failed))].sort();
  const exactProblems: string[] = [];
  if (Object.keys(profile).length && observed) {
    try {
      exactProblems.push(
        ...exactProfileProblems(profile as unknown as ExecutionProfile, observed as ProfileObservation),
      );
      if (profileDigest(profile as unknown as ExecutionProfile) !== result.profileDigest)
        exactProblems.push("profile-digest-mismatch");
    } catch {
      exactProblems.push("invalid-profile-envelope");
    }
  } else exactProblems.push("historical-settings-are-not-effective-profile-attestation");
  if (!fullPackageVerified) problems.push("complete-package-and-evaluator-identity-unverified");
  if (!semanticComplete || status === "invalid-execution" || status === "refused")
    problems.push("not-complete-semantic-attempt");
  if (!failedChecks.length || grade.reward !== 0) problems.push("not-semantic-failure");
  if (adjudication.label !== "capability") problems.push(`adjudication:${adjudication.label}`);
  if (kind === "regrade") problems.push("regrade-is-not-new-agent-attempt");
  if (evidenceClass !== "real-provider") problems.push(`evidence-class:${evidenceClass}`);
  if (current === false) problems.push("not-current-package");

  const transcriptPath = byPath.has("transcript.txt")
    ? "transcript.txt"
    : byPath.has("events.jsonl")
      ? "events.jsonl"
      : byPath.has("stdout.txt")
        ? "stdout.txt"
        : null;
  const transcript = transcriptPath ? read(transcriptPath) : null;
  if (transcript === null) missing.push("transcript-unavailable-or-too-large");
  const sources = files
    .filter(
      (f) => /^(submission|workspace)\//.test(f.path) && /\.(?:py|[cm]?js|ts|go|sh|txt|md)$/.test(f.path),
    )
    .flatMap((f) => {
      const source = read(f.path, 2 * 1024 * 1024);
      return source === null ? [] : [{ name: f.path, source }];
    });
  const shipped = sources
    .filter((s) => s.name.startsWith("submission/"))
    .map((s) => ({ name: s.name.slice(11), source: s.source }));
  const selfCheck = profileRun({
    runId,
    familyId: familyId ?? "unknown",
    subjectId: string(result.subjectId) ?? "unknown",
    providerFamily: string(object(requested).model)?.split("/")[0] ?? "unknown",
    state: current === false ? "superseded" : "not-run",
    scenariosFailed: cells.filter((c) => failed(c).length).length,
    submissionFiles: shipped,
    transcript,
    gradedArtifact: null,
    harness: string(meta.agent),
  });
  const checkers =
    transcript && transcriptPath
      ? extractCheckers(
          transcript,
          shipped.map((s) => s.name),
        ).map((c) => ({
          ...c,
          sha256: sha256(c.source),
          origin: pointer(transcriptPath, `extracted:${c.name}`),
          adequacy: "not-assessed" as const,
        }))
      : [];
  for (const s of sources.filter((s) => s.name.startsWith("workspace/")))
    checkers.push({
      name: s.name,
      source: s.source,
      sha256: sha256(s.source),
      origin: pointer(s.name),
      adequacy: "not-assessed",
    });
  const timeline: TimelineEvent[] = [];
  if (transcript && transcriptPath) {
    const add = (
      kind: TimelineEvent["kind"],
      text: string,
      line: number,
      obj: Record<string, unknown>,
      locator: string,
    ) => {
      if (timeline.length >= 20000) throw Error("INSPECTION_EVENT_LIMIT");
      timeline.push({
        order: timeline.length,
        kind,
        basis: "recorded",
        timestamp: string(obj.timestamp),
        source: pointer(transcriptPath, `line:${line}${locator}`),
        text: text.slice(0, 4096),
        truncated: text.length > 4096,
        relatedId: string(obj.id) ?? string(obj.tool_use_id),
      });
    };
    const walk = (v: unknown, line: number, locator: string, depth = 0): void => {
      if (depth > 32) {
        missing.push(`timeline-depth-limit:line:${line}`);
        return;
      }
      if (Array.isArray(v)) {
        v.forEach((x, i) => walk(x, line, `${locator}/${i}`, depth + 1));
        return;
      }
      const obj = object(v);
      if (["thinking", "redacted_thinking", "reasoning"].includes(String(obj.type))) return;
      if (typeof obj.command === "string") add("command", obj.command, line, obj, locator);
      if (typeof obj.file_path === "string" && typeof obj.content === "string")
        add("edit", `${obj.file_path}\n${obj.content}`, line, obj, locator);
      if (typeof obj.aggregated_output === "string" && obj.aggregated_output)
        add("output", obj.aggregated_output, line, obj, locator);
      if (obj.type === "tool_result" && typeof obj.content === "string")
        add("output", obj.content, line, obj, locator);
      if (["agent_message", "text"].includes(String(obj.type)) && typeof obj.text === "string")
        add("statement", obj.text, line, obj, locator);
      for (const [k, x] of Object.entries(obj))
        if (x !== null && typeof x === "object") walk(x, line, `${locator}/${k}`, depth + 1);
    };
    transcript.split("\n").forEach((line, i) => {
      if (!line.trim()) return;
      try {
        walk(JSON.parse(line), i + 1, "");
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        add("unparsed", line, i + 1, {}, "");
      }
    });
  }
  // Search links are navigation aids, explicitly not explanations of an agent's hidden reasoning.
  const searchCache = new Map<string, EvidencePointer[]>();
  const search = (prefix: string, terms: string[]): EvidencePointer[] => {
    const key = canonicalJson([prefix, terms]);
    const cached = searchCache.get(key);
    if (cached) return cached;
    const matches = files
      .filter((f) => f.path.startsWith(prefix) && /\.(?:md|py|[cm]?js|ts|go|json|txt)$/.test(f.path))
      .flatMap((f) => {
        const text = read(f.path, 2 * 1024 * 1024);
        if (text === null) return [];
        const i = text.split("\n").findIndex((line) => terms.some((t) => line.toLowerCase().includes(t)));
        return i < 0 ? [] : [pointer(f.path, `line:${i + 1}`)];
      })
      .slice(0, 8);
    searchCache.set(key, matches);
    return matches;
  };
  const gradePath =
    kind === "legacy-trial"
      ? "verifier-output.json"
      : byPath.has("grading/result.json")
        ? "grading/result.json"
        : kind === "regrade"
          ? "result.json"
          : "grade.json";
  const cellsLocator = Array.isArray(object(json(gradePath).evaluation).cells)
    ? "/evaluation/cells"
    : "/cells";
  const failures = cells.flatMap((cell, i) =>
    failed(cell).map((check) => {
      const scenarioId = string(cell.scenarioId) ?? "unknown";
      const terms = [
        check.toLowerCase(),
        ...check
          .toLowerCase()
          .split("_")
          .filter((t) => t.length > 3),
        ...(check === "completion" ? ["finish", "progress"] : []),
      ];
      const witnessFiles = files.filter(
        (f) => f.path.includes(scenarioId) && /witness|observation|trace|ledger/.test(f.path),
      );
      return {
        check,
        scenarioId,
        observation: pointer(gradePath, `${cellsLocator}/${i}`),
        witnesses: witnessFiles.map((f) => pointer(f.path)),
        submittedCode: search("submission/", terms),
        visibleClauses: [...search("challenge/spec/", terms), ...search("public/", terms)].slice(0, 8),
        checking: checkers
          .filter((c) => terms.some((t) => c.source.toLowerCase().includes(t)))
          .map((c) => c.origin)
          .slice(0, 8),
        linkBasis: "heuristic-search-not-causal-attribution" as const,
        missing: witnessFiles.length
          ? []
          : [
              "raw-independent-event-witness-not-retained-or-not-mapped; graded cell and adjudication remain available",
            ],
      };
    }),
  );
  if (!files.some((f) => f.path.startsWith("workspace/")))
    missing.push("scratch-files-not-retained-separately; inline-source-may-still-exist");
  if (!fullPackageVerified)
    missing.push("legacy evaluator/runtime bytes unavailable; never derived from current code");
  const treeDigest = (prefix: string) => {
    const subset = files.filter((f) => f.path.startsWith(prefix));
    return subset.length
      ? sha256(canonicalJson(subset.map((f) => ({ ...f, path: f.path.slice(prefix.length) }))))
      : null;
  };
  return {
    schemaVersion: 1,
    inspector: INSPECTION_VERSION,
    directory: dir,
    runId,
    familyId,
    kind,
    sourceDigest: sha256(canonicalJson(files)),
    files,
    identity: {
      packageDigest,
      publicDigest,
      evaluatorDigest,
      submissionDigest: treeDigest("submission/"),
      fullPackageVerified,
      current,
      profileDigest: string(result.profileDigest) ?? string(meta.profileDigest),
      requested,
      observed,
    },
    observation: {
      status,
      reward: typeof grade.reward === "number" ? grade.reward : null,
      failedScenarios: cells.filter((c) => failed(c).length).length,
      failedChecks,
      newAgentAttempts: kind === "regrade" || evidenceClass === "simulation" ? 0 : 1,
      evidenceClass,
      semanticComplete,
    },
    adjudication,
    eligibility: {
      capability: problems.length === 0,
      exactTarget: problems.length === 0 && exactProblems.length === 0,
      blockers: [...new Set([...problems, ...exactProblems])],
    },
    timeline,
    checkers,
    selfCheck,
    failures,
    missing: [...new Set(missing)],
  };
}

/** Each row is inspected read-only and bounded per run. Broken rows stay visible, not counted. */
export function evidenceIndex(root: string, directories: readonly string[]) {
  const seen = new Set<string>();
  return directories.map((directory) => {
    const path = resolve(root, directory);
    if (seen.has(path)) throw Error("INSPECTION_DUPLICATE_DIRECTORY");
    seen.add(path);
    try {
      const view = inspectRun(path);
      return {
        directory,
        runId: view.runId,
        familyId: view.familyId,
        sourceDigest: view.sourceDigest,
        identity: view.identity,
        observation: view.observation,
        eligibility: view.eligibility,
        adjudication: view.adjudication.label,
        missing: view.missing,
      };
    } catch (e) {
      return {
        directory,
        error: String(e),
        eligibility: { capability: false, exactTarget: false, blockers: ["source-unavailable"] },
      };
    }
  });
}
