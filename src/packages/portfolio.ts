import { randomUUID } from "node:crypto";
import {
  constants,
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  type AssemblyPlan,
  assemblePackage,
  copySnapshot,
  materializeAssembly,
  verifyAssembly,
} from "./assembly.js";
import {
  type AssuranceOperation,
  type AssuranceResult,
  assertAssuranceCoverage,
  runAssurance,
} from "./assurance.js";
import {
  checkerToken,
  completeVerdicts,
  namesObservedFailure,
  positiveVariantKeys,
} from "./checker-contract.js";
import { hashFile, localProcess } from "./local-process.js";
import { decidePackage } from "./policy.js";
import {
  COMPONENTS,
  type Component,
  type PackageInput,
  type PackageSnapshot,
  canonicalJson,
  readSnapshotFile,
  resolvePackage,
  safePackagePath,
  sha256,
} from "./record.js";
import { readPackageTree } from "./source.js";
import { assertStorageHeadroom, copyRuntimeArchive } from "./storage.js";

/** Professional descendants have independent versions; these are not additional generic families. */
export const PORTFOLIO_PACKAGES = {
  "incremental-build-repair": "incremental-build-provenance",
  "event-window-repair": "event-time-window-finalization",
  "staged-allocation-repair": "staged-resource-allocation",
  "diagnostic-transport-repair": "diagnostic-stream-normalization",
  "issued-report-repair": "issued-report-amendment",
  "document-export-repair": "structure-preserving-document-export",
  "analytical-reconciliation-repair": "cross-system-analytical-reconciliation",
  "recurring-calendar-repair": "recurring-calendar-reconciliation",
  "variant-cache-repair": "multi-tier-variant-cache",
  "workflow-authority-repair": "revocation-aware-workflow-broker",
  "snapshot-recovery-repair": "restore-proven-backup-orchestrator",
  "verified-installation-repair": "layered-artifact-installation",
  "capacity-maintenance-repair": "cell-capacity-removal-planner",
  "route-policy-repair": "bgp-route-scope-patch-validator",
  "rule-index-repair": "waf-semantic-complexity-repair",
  "browser-replay-repair": "ui-replay-browser-backed",
  "persistent-knowledge-repair": "prompt-injection-memory-poisoning",
  "delegated-budget-repair": "delegated-wallet-scope-reconciliation",
  "compatible-rollout-repair": "deployment-model-alias-rollout-drift",
  "partition-index-repair": "worker-rebalance-partition-callback-dedup",
  "causal-replica-repair": "replica-lag-stale-read-reconciliation",
  "partial-release-repair": "deployment-rollback-partial-effects",
  "ticket-consolidation-repair": "stale-crm-ticket-automation",
  "temporal-capacity-repair": "audit-truth-financial-workflow",
} as const;
export type PortfolioId = keyof typeof PORTFOLIO_PACKAGES;
type InputFile = PackageInput["files"][Component][number];
interface Scenario {
  id: string;
  [key: string]: unknown;
}
interface Control {
  id: string;
  overlay: Record<string, string>;
  check: string;
  clean?: string;
  isolation?: boolean;
}
interface Cell {
  scenarioId: string;
  status: "semantic-pass" | "semantic-fail" | "invalid";
  failures?: string[];
  checks?: Record<string, boolean>;
  error?: string;
  browserTrace?: string;
  browserTraceArtifact?: { path: string; sha256: string; bytes: number };
  executions?: { diagnostics: { stdoutTail: string } }[];
}
interface Execution {
  schemaVersion: 1;
  privateReadable: boolean;
  cells: Cell[];
  providerCallsMade: 0;
}
interface Pointer {
  schemaVersion: 1;
  packageDigest: string;
}
interface Runtime {
  image: string;
  platform: string;
  node: string;
  browser: string;
  archive: { sha256: string; size: number };
}
const json = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
function write(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${canonicalJson(value)}\n`, { flag: "wx" });
}
function fresh(path: string) {
  if (existsSync(path)) throw Error(`OUTPUT_EXISTS: ${path}`);
  mkdirSync(path, { recursive: true });
}
const docker = (args: readonly string[], options: Parameters<typeof localProcess>[2] = {}) =>
  localProcess("docker", args, options);
const ROUTE = "professional-multifile/authority-process@1";
const get = <T>(s: PackageSnapshot, component: Component, path: string): T =>
  JSON.parse(Buffer.from(readSnapshotFile(s, component, path)).toString()) as T;
const snapshotAt = (directory: string) =>
  resolvePackage(join(directory, "store"), json<Pointer>(join(directory, "package.json")).packageDigest);
const classify = (path: string): Component =>
  path.startsWith("tooling/")
    ? "adapters"
    : path.startsWith("public/")
      ? /instruction\.md$|SEMANTICS\.md$/.test(path)
        ? "contract"
        : "workspace"
      : path.startsWith("private/reference/") ||
          path.startsWith("private/alternative/") ||
          path.startsWith("private/variants/")
        ? "reference"
        : path.includes("controls/") || path.endsWith("control-manifest.json")
          ? "controls"
          : path.includes("scenarios")
            ? "scenarios"
            : "verifier";

/** One runtime archive per portfolio, reused by digest. No implicit downloads during validation. */
export async function preparePortfolioRuntime(root: string, output: string): Promise<Runtime> {
  fresh(output);
  // Dependency setup is explicit and batched before construction. An offline cache miss
  // must not silently contact a registry during a package validation.
  if (!existsSync(join(root, "tasks/portfolio-runtime/Dockerfile"))) throw Error("RUNTIME_RECIPE_MISSING");
  const image = (
    await docker(["inspect", "foundry-portfolio-runtime:v1", "--format", "{{.Id}}"])
  ).stdout.trim();
  const platform = (await docker(["inspect", image, "--format", "{{.Os}}/{{.Architecture}}"])).stdout.trim();
  const versions = (
    await docker([
      "run",
      "--rm",
      "--network",
      "none",
      image,
      "node",
      "-e",
      "console.log(JSON.stringify({node:process.version,browser:require('/opt/browser-runtime/node_modules/playwright/package.json').version}))",
    ])
  ).stdout;
  const { node, browser } = JSON.parse(versions) as { node: string; browser: string };
  const imageBytes = Number((await docker(["inspect", image, "--format", "{{.Size}}"])).stdout.trim());
  assertStorageHeadroom(output, Math.ceil(imageBytes * 1.1));
  await docker(["image", "save", "--output", join(output, "runtime.tar"), image], { timeoutMs: 300000 });
  const runtime = {
    image,
    platform,
    node,
    browser,
    archive: {
      sha256: await hashFile(join(output, "runtime.tar")),
      size: lstatSync(join(output, "runtime.tar")).size,
    },
  };
  write(join(output, "runtime.json"), runtime);
  return runtime;
}
export async function buildPortfolioPackage(
  root: string,
  id: PortfolioId,
  output: string,
  runtimeDirectory: string,
) {
  if (!Object.hasOwn(PORTFOLIO_PACKAGES, id)) throw Error("PORTFOLIO_UNKNOWN_PACKAGE");
  fresh(output);
  const runtime = json<Runtime>(join(runtimeDirectory, "runtime.json"));
  if (
    !/^sha256:[a-f0-9]{64}$/.test(runtime.image) ||
    (await hashFile(join(runtimeDirectory, "runtime.tar"))) !== runtime.archive.sha256
  )
    throw Error("PORTFOLIO_RUNTIME_BYTES");
  const directory = join(root, "tasks", id);
  const tree = readPackageTree(directory, "", true);
  tree.push({ path: "tooling/local-cli.mjs", bytes: readFileSync(join(root, "dist/packages/local-cli.js")) });
  const generator = (await import(pathToFileURL(join(directory, "private/scenarios.mjs")).href)) as {
    scenarios(): Scenario[];
    checkIds: string[];
  };
  const scenarios = generator.scenarios();
  if (!scenarios.length || new Set(scenarios.map((s) => s.id)).size !== scenarios.length)
    throw Error("PORTFOLIO_SCENARIO_IDENTITY");
  tree.push({ path: "private/scenarios.json", bytes: Buffer.from(canonicalJson(scenarios)) });
  const shared = readPackageTree(join(root, "tasks/portfolio-runtime")).filter((f) =>
    f.path.endsWith(".mjs"),
  );
  for (const name of ["authority-engine.mjs", "cell-entry.mjs", "protocol.mjs"])
    shared.push({ path: name, bytes: readFileSync(join(root, "scripts/secure", name)) });
  for (const f of shared) tree.push({ ...f, path: `runtime/${f.path}` });
  const files = Object.fromEntries(COMPONENTS.map((c) => [c, []])) as unknown as Record<
    Component,
    InputFile[]
  >;
  const part = (path: string) => (path.startsWith("runtime/") ? "collector" : classify(path));
  for (const f of tree) files[part(f.path)].push(f);
  const checkerRequiredMarker = join(directory, "private/checker-required.json");
  const checkerRequired = existsSync(checkerRequiredMarker)
    ? json<{ required: boolean }>(checkerRequiredMarker).required === true
    : false;
  files.scenarios.push(
    { path: "scenario-ids.json", bytes: Buffer.from(canonicalJson(scenarios.map((s) => s.id))) },
    { path: "check-ids.json", bytes: Buffer.from(canonicalJson(generator.checkIds)) },
    { path: "checker-required.json", bytes: Buffer.from(canonicalJson({ required: checkerRequired })) },
  );
  files.dependencies.push({ path: "runtime.json", bytes: Buffer.from(canonicalJson(runtime)) });
  files.policy.push(
    { path: "producer.ts", bytes: readFileSync(join(root, "src/packages/portfolio.ts")) },
    { path: "policy.ts", bytes: readFileSync(join(root, "src/packages/policy.ts")) },
  );
  const plan: AssemblyPlan = {
    schemaVersion: 1,
    target: id,
    entries: tree.map((f) => ({
      path: f.path,
      source: f.path,
      component: part(f.path),
      audience: f.path.startsWith("public/") ? "subject" : "recipient-only",
    })),
    required: [
      "public/instruction.md",
      "public/SEMANTICS.md",
      "public/entry.mjs",
      "private/domain.mjs",
      "private/scenarios.json",
      "private/control-manifest.json",
      "runtime/bootstrap.mjs",
    ].map((path) => ({ path })),
  };
  const snapshot = assemblePackage(
    join(output, "store"),
    {
      id,
      familyId: PORTFOLIO_PACKAGES[id],
      version: "professional-v3",
      kind: "professional-package",
      dependencies: { strategy: "conservative-repository-closure", unresolved: [] },
      files,
    },
    plan,
  );
  materializeAssembly(snapshot, join(output, "package"));
  materializeAssembly(snapshot, join(output, "visible"), "subject");
  write(join(output, "package.json"), { schemaVersion: 1, packageDigest: snapshot.record.digest });
  copyRuntimeArchive(join(runtimeDirectory, "runtime.tar"), join(output, "runtime.tar"));
  return snapshot.record;
}

/** Capture only bounded regular source files, once. No symlink/hardlink/FIFO import. */
export function stagePortfolioSubmission(source: string, target: string): string {
  fresh(target);
  let bytes = 0;
  let count = 0;
  let directories = 0;
  const walk = (relative: string) => {
    const path = join(source, relative);
    const st = lstatSync(path);
    if (st.isSymbolicLink() || (!st.isFile() && !st.isDirectory()) || (st.isFile() && st.nlink !== 1))
      throw Error("PORTFOLIO_ARTIFACT_TYPE");
    if (st.isDirectory()) {
      if (++directories > 256 || relative.split("/").length > 16) throw Error("PORTFOLIO_DIRECTORY_LIMIT");
      for (const name of readdirSync(path)) walk(relative ? `${relative}/${name}` : name);
      return;
    }
    safePackagePath(relative);
    bytes += st.size;
    if (++count > 128 || bytes > 8 * 1024 * 1024) throw Error("PORTFOLIO_ARTIFACT_LIMIT");
    const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    let f: Buffer;
    try {
      const opened = fstatSync(fd);
      if (
        !opened.isFile() ||
        opened.nlink !== 1 ||
        opened.ino !== st.ino ||
        opened.dev !== st.dev ||
        opened.size !== st.size
      )
        throw Error("PORTFOLIO_ARTIFACT_CHANGED");
      f = readFileSync(fd);
      const after = fstatSync(fd);
      if (f.length !== st.size || after.size !== st.size || after.mtimeMs !== opened.mtimeMs)
        throw Error("PORTFOLIO_ARTIFACT_CHANGED");
    } finally {
      closeSync(fd);
    }
    mkdirSync(dirname(join(target, relative)), { recursive: true });
    writeFileSync(join(target, relative), f, { flag: "wx" });
  };
  walk("");
  if (!existsSync(join(target, "entry.mjs"))) throw Error("PORTFOLIO_ENTRY_MISSING");
  return sha256(canonicalJson(readPackageTree(target).map((f) => ({ path: f.path, hash: sha256(f.bytes) }))));
}

export async function runPortfolioSubmission(
  directory: string,
  submission: string,
  output: string,
  scenarioIds?: readonly string[],
) {
  const snapshot = snapshotAt(directory);
  verifyAssembly(snapshot, join(directory, "package"));
  const runtime = get<Runtime>(snapshot, "dependencies", "runtime.json");
  fresh(output);
  const staged = join(output, "submission");
  const artifactDigest = stagePortfolioSubmission(submission, staged);
  const all = get<Scenario[]>(snapshot, "scenarios", "private/scenarios.json");
  const scenarios = scenarioIds ? all.filter((s) => scenarioIds.includes(s.id)) : all;
  if (!scenarios.length || (scenarioIds && scenarios.length !== new Set(scenarioIds).size))
    throw Error("PORTFOLIO_SCENARIO_SELECTION");
  const files = [...snapshot.record.components.collector.files, ...snapshot.record.components.verifier.files]
    .filter((f) => f.path.endsWith(".mjs") && !f.path.endsWith("bootstrap.mjs"))
    .map((f) => ({
      path: f.path.replace(/^(runtime|private)\//, ""),
      text: Buffer.from(
        readSnapshotFile(snapshot, f.path.startsWith("runtime/") ? "collector" : "verifier", f.path),
      ).toString(),
    }));
  const bootstrap = Buffer.from(readSnapshotFile(snapshot, "collector", "runtime/bootstrap.mjs")).toString();
  const name = `foundry-portfolio-${randomUUID()}`;
  const start = performance.now();
  try {
    const result = await docker(
      [
        "run",
        "--name",
        name,
        "--network",
        "none",
        "--read-only",
        "--tmpfs",
        "/tmp:rw,size=512m",
        "--tmpfs",
        "/work:rw,size=128m",
        "--shm-size",
        "256m",
        "--cpus",
        "2",
        "--memory",
        "2g",
        "--pids-limit",
        "256",
        "--cap-drop",
        "ALL",
        "--cap-add",
        "SETUID",
        "--cap-add",
        "SETGID",
        "--cap-add",
        "KILL",
        "--cap-add",
        "CHOWN",
        "--security-opt",
        "no-new-privileges",
        "--mount",
        `type=bind,src=${resolve(staged)},dst=/submission,readonly`,
        "-i",
        runtime.image,
        "node",
        "--input-type=module",
        "-e",
        bootstrap,
      ],
      {
        input: JSON.stringify({ files, scenarios }),
        timeoutMs: 300000,
        limitBytes: 16 * 1024 * 1024,
        log: join(output, "process.log"),
      },
    );
    const parsed = JSON.parse(result.stdout) as Execution;
    validatePortfolioExecution(
      parsed,
      scenarios.map((s) => s.id),
      get<string[]>(snapshot, "scenarios", "check-ids.json"),
    );
    for (const [index, cell] of parsed.cells.entries())
      if (cell.browserTrace) {
        const bytes = Buffer.from(cell.browserTrace, "base64");
        if (bytes.length > 2 * 1024 * 1024) throw Error("PORTFOLIO_TRACE_LIMIT");
        const path = `browser/${sha256(cell.scenarioId).slice(0, 20)}.zip`;
        mkdirSync(join(output, "browser"), { recursive: true });
        writeFileSync(join(output, path), bytes, { flag: "wx" });
        const { browserTrace: _transientBase64, ...retained } = cell;
        parsed.cells[index] = {
          ...retained,
          browserTraceArtifact: { path, sha256: sha256(bytes), bytes: bytes.length },
        };
      }
    const receipt = {
      packageDigest: snapshot.record.digest,
      artifactDigest,
      route: ROUTE,
      image: runtime.image,
      milliseconds: performance.now() - start,
      ...parsed,
    };
    write(join(output, "result.json"), receipt);
    return receipt;
  } finally {
    await docker(["rm", "-f", name]).catch(() => undefined);
  }
}

/** Extra genuinely-correct, differently-shaped positive candidates beyond "reference" and
 * "alternative", named `variant-<key>` and stored under `private/variants/<key>/`. Optional: a
 * package with none of these directories behaves exactly as before. See the `variantKeys`
 * discovery in `gradeChecker` for why this exists — a checker tested against only two correct
 * shapes can overfit to "looks like reference or alternative" rather than the actual rule. */
const NAMED_VARIANT_PREFIX = "variant-";
const namedVariantFilePrefix = (key: string) => `private/variants/${key}/`;

function variantFiles(snapshot: PackageSnapshot, name: string, control?: Control) {
  const files = new Map<string, Uint8Array>();
  for (const part of ["contract", "workspace"] as const)
    for (const f of snapshot.record.components[part].files)
      if (f.path.startsWith("public/")) files.set(f.path.slice(7), readSnapshotFile(snapshot, part, f.path));
  if (name !== "starter") {
    const prefix =
      name === "alternative"
        ? "private/alternative/"
        : name.startsWith(NAMED_VARIANT_PREFIX)
          ? namedVariantFilePrefix(name.slice(NAMED_VARIANT_PREFIX.length))
          : "private/reference/";
    if (
      name.startsWith(NAMED_VARIANT_PREFIX) &&
      !snapshot.record.components.reference.files.some((f) => f.path.startsWith(prefix))
    )
      throw Error(`PORTFOLIO_POSITIVE_VARIANT_MISSING:${name}`);
    for (const f of snapshot.record.components.reference.files)
      if (f.path.startsWith(prefix))
        files.set(f.path.slice(prefix.length), readSnapshotFile(snapshot, "reference", f.path));
  }
  for (const [target, source] of Object.entries(control?.overlay ?? {}))
    files.set(
      safePackagePath(target),
      readSnapshotFile(snapshot, "controls", `private/${safePackagePath(source)}`),
    );
  return files;
}
function variant(snapshot: PackageSnapshot, path: string, name: string, control?: Control) {
  fresh(path);
  const files = variantFiles(snapshot, name, control);
  for (const [p, bytes] of files) {
    mkdirSync(dirname(join(path, p)), { recursive: true });
    writeFileSync(join(path, p), bytes, { flag: "wx" });
  }
}

const variantDigest = (snapshot: PackageSnapshot, name: string, control?: Control) =>
  sha256(
    canonicalJson(
      [...variantFiles(snapshot, name, control)]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([path, bytes]) => ({ path, hash: sha256(bytes) })),
    ),
  );

/** Materializes any named candidate — "starter" (public/src only), "reference", "alternative", or
 * a specific `private/controls/*` mutant by id — into a fresh directory shaped like a submission.
 * For checker-required grading: the same known-good/known-bad candidates already used to validate
 * this package's own verifier, made available to run through the ordinary submission execution
 * path (`runPortfolioSubmission`) so a submitted checker can be graded against real, observed
 * behavior rather than against a description of what the behavior should be. */
export function materializeCandidate(directory: string, path: string, name: string, controlId?: string) {
  const snapshot = snapshotAt(directory);
  let control: Control | undefined;
  if (controlId) {
    const controls = get<Control[]>(snapshot, "controls", "private/control-manifest.json");
    control = controls.find((c) => c.id === controlId);
    if (!control) throw Error(`PORTFOLIO_CONTROL_UNKNOWN:${controlId}`);
  }
  variant(snapshot, path, name, control);
}

export function listPortfolioControls(directory: string): readonly { id: string; check: string }[] {
  const snapshot = snapshotAt(directory);
  return get<Control[]>(snapshot, "controls", "private/control-manifest.json").map((c) => ({
    id: c.id,
    check: c.check,
  }));
}

export interface CheckerGradeDetail {
  readonly candidateId: string;
  readonly expectedFailingCheck: string | null;
  readonly observedFailingChecks?: readonly string[];
  readonly outcome:
    | "correct-accept"
    | "correct-reject-named"
    | "correct-reject-unnamed"
    | "false-positive"
    | "missed";
}
export interface CheckerGradeResult {
  readonly reasonPolicy?: "any-observed-public-obligation" | "diagnostic-only";
  readonly present: boolean;
  readonly deterministic: boolean;
  readonly total: number;
  readonly correct: number;
  readonly falsePositives: number;
  readonly missed: number;
  readonly namedRightCheck: number;
  readonly details: readonly CheckerGradeDetail[];
  /** Complete deterministic classification is required. Legacy packages also grade obligation names. */
  readonly pass: boolean;
}

/** Deterministic string shuffle so token order carries no positional signal a checker could
 * exploit (e.g. "candidate-A is always the reference"), yet is reproducible for regrading. */
function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let s = [...seed].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const rand = () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return s / 0xffffffff;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const temp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = temp;
  }
  return out;
}

const CHECKER_BOOTSTRAP = `
import { readFileSync } from "node:fs";
const encode = JSON.stringify.bind(JSON), decode = JSON.parse.bind(JSON);
const freeze = Object.freeze, values = Object.values;
function immutable(x) { if (x && typeof x === "object") { for (const v of values(x)) immutable(v); freeze(x); } return x; }
const { cases } = JSON.parse(readFileSync("/cases/cases.json", "utf8"));
immutable(cases);
const before = encode(cases);
const { run } = await import("/checker/checker.mjs");
const first = await run({ cases });
const firstJSON = encode(first);
const second = await run({ cases });
process.stdout.write(encode({ first: decode(firstJSON), second, mutated: before !== encode(cases) }));
`;

/** Removes any key literally named "expected", "truth" or "groundTruth" from the TOP LEVEL of a
 * cell only — deliberately not recursive. These are the grader's own independently-computed
 * answer, and every confirmed leak of this shape across every package has been exactly that: a
 * direct top-level property of what a package's own domain.mjs `runScenario()` returns (nested
 * sub-fields of a stripped `expected` object are removed for free once the whole key is gone).
 * Recursing into every surviving field's own substructure was too broad: candidate- or
 * scenario-controlled application data is free-form (e.g. an untyped `payload: unknown`) and can
 * legitimately use one of these exact words for its own unrelated purpose — a real field
 * silently deleted because it happens to share a name with the grader's verdict is itself an
 * unfairness bug, and was reproduced concretely by external review. A genuine PACKAGE-SPECIFIC
 * leak that isn't literally one of these three top-level words (e.g. a precomputed verdict
 * boolean nested inside `actual`) is not this function's job to catch — it must be fixed at the
 * source, in that package's own domain.mjs, exactly as done for several packages this session
 * (actual.publications[].validAtPublication, actual.deliveries[].allowed, and so on). */
function stripGroundTruth<T extends Record<string, unknown>>(value: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (k === "expected" || k === "truth" || k === "groundTruth") continue;
    out[k] = v;
  }
  return out as T;
}

const stripCells = (cells: unknown) =>
  (cells as unknown as Record<string, unknown>[]).map(
    ({ checks: _checks, status: _status, failures: _failures, ...rest }) => stripGroundTruth(rest),
  );

/** Runs one candidate for real against exactly `scenarioIds` and returns its stripped,
 * verdict-free trace, keyed by scenarioId so callers can compare across different scenario sets
 * without caring about result order. */
async function candidateTrace(
  directory: string,
  output: string,
  candidateId: string,
  base: "reference" | "alternative" | "starter" | `variant-${string}`,
  controlId: string | undefined,
  scenarioIds: readonly string[],
) {
  const candidateDir = join(output, `candidate-${candidateId}-${scenarioIds.length}`);
  materializeCandidate(directory, candidateDir, base, controlId);
  const runOutput = join(output, `run-${candidateId}-${scenarioIds.length}`);
  const result = await runPortfolioSubmission(directory, candidateDir, runOutput, [...scenarioIds]);
  if (result.cells.some((cell) => cell.status === "invalid"))
    throw Error(`CHECKER_CANDIDATE_EXECUTION_INVALID: ${candidateId}`);
  return {
    cells: stripCells(result.cells),
    observedFailingChecks: [...new Set(result.cells.flatMap((cell) => cell.failures ?? []))].sort(),
  };
}

/** Runs one control (reference base + its overlay) against exactly `scenarioIds` and returns
 * whether it AUTHORITATIVELY fails its own declared check — the same semantic-fail-plus-
 * failures-includes-check test `controlPass()`/`validatePortfolioPackage` already use to certify
 * a control as valid in the first place. This is deliberately NOT "does the raw observable trace
 * differ from the reference somehow" — two real packages demonstrated a control's raw trace can
 * differ from the reference's for reasons entirely UNRELATED to its planted defect, which let a
 * raw-trace version of this check report "distinguishable" on a scenario window where the
 * control's actual bug was never exercised at all. Checking the authoritative status/failures
 * signal directly is the correct, non-spurious test for "is this scenario window sufficient." */
async function controlAuthoritativelyFails(
  directory: string,
  output: string,
  control: Control,
  scenarioIds: readonly string[],
): Promise<boolean> {
  const candidateDir = join(output, `authoritative-${control.id}-${scenarioIds.length}`);
  materializeCandidate(directory, candidateDir, "reference", control.id);
  const runOutput = join(output, `authoritative-run-${control.id}-${scenarioIds.length}`);
  const result = await runPortfolioSubmission(directory, candidateDir, runOutput, [...scenarioIds]);
  return result.cells.some((c) => c.status === "semantic-fail" && (c.failures ?? []).includes(control.check));
}

/** Prefix sampling over a bit-flag-indexed scenario space silently biases toward the all-zero
 * corner and can select a subset where a real defect is genuinely undetectable — not merely
 * unlikely to be found, but never actually triggered by any scenario in the window. Rather than
 * trust a fixed subset size, this shuffles the full declared space once (seeded on the package
 * digest, reproducible) and grows the graded window until every control AUTHORITATIVELY fails its
 * own declared check somewhere in the window (see `controlAuthoritativelyFails`), or the full
 * space is exhausted. A control that remains undetected across the ENTIRE declared space is a
 * real scenario-coverage defect, surfaced as an error rather than silently graded as if fine. */
async function resolveDistinguishingScenarios(
  directory: string,
  output: string,
  controls: readonly Control[],
  allScenarios: readonly Scenario[],
  digest: string,
): Promise<{ scenarioIds: readonly string[]; undetectable: readonly string[] }> {
  const shuffledIds = seededShuffle(allScenarios, digest).map((s) => s.id);
  let size = Math.min(2, shuffledIds.length);
  let stillTied = controls;
  let scenarioIds: readonly string[] = shuffledIds.slice(0, size);
  for (;;) {
    const nextTied: Control[] = [];
    for (const control of stillTied) {
      const fails = await controlAuthoritativelyFails(directory, output, control, scenarioIds);
      if (!fails) nextTied.push(control);
    }
    stillTied = nextTied;
    if (!stillTied.length || size >= shuffledIds.length) break;
    size = Math.min(shuffledIds.length, size * 2);
    scenarioIds = shuffledIds.slice(0, size);
  }
  return { scenarioIds, undetectable: stillTied.map((c) => c.id) };
}

/** Grade independent checker outputs on observed executions, accepting explanatory
 * check-name suffixes without weakening obligation attribution. Process failures propagate. */
export async function gradeChecker(
  directory: string,
  submission: string,
  output: string,
): Promise<CheckerGradeResult> {
  fresh(output);
  const checkerPath = join(submission, "checker.mjs");
  if (!existsSync(checkerPath))
    return {
      present: false,
      deterministic: false,
      total: 0,
      correct: 0,
      falsePositives: 0,
      missed: 0,
      namedRightCheck: 0,
      details: [],
      pass: false,
    };

  const snapshot = snapshotAt(directory);
  const checkerConfigFile = snapshot.record.components.verifier.files.find(
    (f) => f.path === "private/checker-required.json",
  );
  const checkerConfig = checkerConfigFile
    ? get<{
        reasonPolicy?: string;
        submissionModules?: string;
        scenarioCoverage?: string;
        tokenCoverage?: string;
      }>(snapshot, "verifier", checkerConfigFile.path)
    : {};
  const diagnosticReasons = checkerConfig.reasonPolicy === "diagnostic-only";
  const controls = get<Control[]>(snapshot, "controls", "private/control-manifest.json");
  const allScenarios = get<Scenario[]>(snapshot, "scenarios", "private/scenarios.json");
  const selection = await resolveDistinguishingScenarios(
    directory,
    join(output, "resolve"),
    controls,
    allScenarios,
    snapshot.record.digest,
  );
  const { undetectable } = selection;
  const scenarioIds =
    checkerConfig.scenarioCoverage === "all" ? allScenarios.map((s) => s.id) : selection.scenarioIds;
  if (undetectable.length)
    throw Error(
      `PORTFOLIO_CONTROL_UNDETECTABLE: ${undetectable.join(", ")} produce no observable difference from the reference anywhere in the declared scenario space — this is a scenario-coverage defect in the package, not a sampling issue, and must be fixed before checker grading is meaningful.`,
    );

  // "reference" and "alternative" are BOTH genuinely correct, differently-shaped implementations.
  // Testing only one risks a checker that has learned one specific correct shape rather than the
  // actual rule — exactly what "zero false positives" should mean is acceptance of *any* correct
  // behavior, not just the one the checker's author happened to compare against. A real trial
  // batch confirmed this is not hypothetical: across five packages, submitted checkers went 48/48
  // on rejecting negative controls but only 9/10 on accepting the two positive shapes on offer —
  // every package's positive bank was just reference + alternative, never enough implementation
  // diversity to pressure-test the "accept" side the way the negative-control bank pressure-tests
  // the "reject" side. `private/variants/<key>/` (see `NAMED_VARIANT_PREFIX` above) is the
  // generalization: any number of additional genuinely-correct, differently-shaped candidates a
  // package chooses to author, each graded exactly like "alternative" is today.
  // materializeCandidate/variantFiles does NOT throw when a package has no private/alternative/*
  // (or private/variants/*/) files — an absent overlay just silently falls back to starter-shaped
  // code, which would then get graded as if it were a genuinely correct candidate and could
  // spuriously false-positive a perfectly good checker. So each of these is only included when the
  // snapshot actually has files under its own prefix, checked directly rather than inferred from a
  // caught exception.
  const hasAlternative = snapshot.record.components.reference.files.some((f) =>
    f.path.startsWith("private/alternative/"),
  );
  const variantKeys = positiveVariantKeys(snapshot.record.components.reference.files.map((f) => f.path));
  const candidates: {
    id: string;
    base: "reference" | "alternative" | "starter" | `variant-${string}`;
    expectedFailingCheck: string | null;
  }[] = [
    { id: "reference", base: "reference", expectedFailingCheck: null },
    ...(hasAlternative
      ? [{ id: "alternative", base: "alternative" as const, expectedFailingCheck: null }]
      : []),
    ...variantKeys.map((key) => ({
      id: `variant-${key}`,
      base: `variant-${key}` as const,
      expectedFailingCheck: null,
    })),
    // Controls overlay onto REFERENCE, not starter — matching validatePortfolioPackage's own,
    // pre-existing convention (its `names` array passes each control's own id straight to
    // `variant()`, which merges in private/reference/* for any name other than "starter" before
    // applying the control overlay). Every control's `check` field was authored and calibrated
    // against that reference-based shape; overlaying onto starter instead would let starter's own,
    // unrelated pre-existing bugs mask or relabel what a control's own defect actually violates.
    ...controls.map((c) => ({ id: c.id, base: "reference" as const, expectedFailingCheck: c.check })),
  ];

  const cases: { token: string; cells: unknown[] }[] = [];
  const groundTruth = new Map<
    string,
    { candidateId: string; expectedFailingCheck: string | null; observedFailingChecks: string[] }
  >();
  const order = seededShuffle(candidates, snapshot.record.digest);
  let index = 0;
  for (const candidate of order) {
    const { cells, observedFailingChecks } = await candidateTrace(
      directory,
      output,
      candidate.id,
      candidate.base,
      // Every positive candidate (reference, alternative, a named variant) stands alone with no
      // control overlay; only a genuine negative control — recognizable by having a non-null
      // expectedFailingCheck — passes its own id through as the overlay's controlId. Driven by
      // that intent rather than by matching against the growing list of positive-candidate id
      // shapes, so a new candidate kind never has to remember to update this condition too.
      candidate.expectedFailingCheck === null ? undefined : candidate.id,
      scenarioIds,
    );
    if (
      candidate.expectedFailingCheck === null
        ? observedFailingChecks.length > 0
        : !observedFailingChecks.includes(candidate.expectedFailingCheck)
    )
      throw Error(`CHECKER_CANDIDATE_TRUTH_MISMATCH: ${candidate.id}`);
    const token = checkerToken(index, checkerConfig.tokenCoverage);
    index += 1;
    cases.push({ token, cells });
    groundTruth.set(token, {
      candidateId: candidate.id,
      expectedFailingCheck: candidate.expectedFailingCheck,
      observedFailingChecks,
    });
  }

  const casesPath = join(output, "cases");
  mkdirSync(casesPath, { recursive: true });
  writeFileSync(join(casesPath, "cases.json"), JSON.stringify({ cases }));
  const checkerStagePath = join(output, "checker-stage");
  if (checkerConfig.submissionModules === "workspace") stagePortfolioSubmission(submission, checkerStagePath);
  else {
    mkdirSync(checkerStagePath, { recursive: true });
    writeFileSync(join(checkerStagePath, "checker.mjs"), readFileSync(checkerPath));
  }

  const runtime = get<Runtime>(snapshot, "dependencies", "runtime.json");
  const name = `foundry-checker-${randomUUID()}`;
  let stdout: string;
  try {
    const result = await docker(
      [
        "run",
        "--name",
        name,
        "--network",
        "none",
        "--read-only",
        "--tmpfs",
        "/tmp:rw,size=256m",
        "--cpus",
        "1",
        "--memory",
        "1g",
        "--pids-limit",
        "128",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges",
        "--mount",
        `type=bind,src=${resolve(casesPath)},dst=/cases,readonly`,
        "--mount",
        `type=bind,src=${resolve(checkerStagePath)},dst=/checker,readonly`,
        "-i",
        runtime.image,
        "node",
        "--input-type=module",
        "-e",
        CHECKER_BOOTSTRAP,
      ],
      { timeoutMs: 60000, limitBytes: 8 * 1024 * 1024, log: join(output, "checker-process.log") },
    );
    stdout = result.stdout;
  } catch (err) {
    // A failed checker process is invalid execution, not a measured semantic rejection.
    throw new Error("CHECKER_EXECUTION_INVALID", { cause: err });
  }

  let parsed: {
    first: { verdicts: Record<string, { ok: boolean; reasons?: string[] }> };
    second: { verdicts: Record<string, { ok: boolean }> };
    mutated?: boolean;
  };
  try {
    parsed = JSON.parse(stdout);
    if (
      !parsed ||
      !completeVerdicts(
        parsed.first,
        cases.map((c) => c.token),
      ) ||
      !completeVerdicts(
        parsed.second,
        cases.map((c) => c.token),
      )
    )
      throw new Error("CHECKER_OUTPUT_SHAPE");
  } catch {
    return {
      present: true,
      deterministic: false,
      total: cases.length,
      correct: 0,
      falsePositives: 0,
      missed: cases.length,
      namedRightCheck: 0,
      details: [],
      pass: false,
    };
  }
  const deterministic =
    parsed.mutated !== true &&
    (diagnosticReasons
      ? cases.every(({ token }) => parsed.first.verdicts[token]?.ok === parsed.second.verdicts[token]?.ok)
      : canonicalJson(parsed.first) === canonicalJson(parsed.second));

  let correct = 0;
  let falsePositives = 0;
  let missed = 0;
  let namedRightCheck = 0;
  const details: CheckerGradeDetail[] = [];
  for (const [token, truth] of groundTruth) {
    const verdict = parsed.first.verdicts?.[token];
    const isOk = verdict?.ok === true;
    const shouldBeOk = truth.expectedFailingCheck === null;
    let outcome: CheckerGradeDetail["outcome"];
    if (shouldBeOk && isOk) {
      correct++;
      outcome = "correct-accept";
    } else if (shouldBeOk && !isOk) {
      falsePositives++;
      outcome = "false-positive";
    } else if (!shouldBeOk && !isOk) {
      correct++;
      const named = namesObservedFailure(verdict?.reasons, truth.observedFailingChecks);
      if (named) namedRightCheck++;
      outcome = named ? "correct-reject-named" : "correct-reject-unnamed";
    } else {
      missed++;
      outcome = "missed";
    }
    details.push({
      candidateId: truth.candidateId,
      expectedFailingCheck: truth.expectedFailingCheck,
      observedFailingChecks: truth.observedFailingChecks,
      outcome,
    });
  }

  const grade: CheckerGradeResult = {
    reasonPolicy: diagnosticReasons ? "diagnostic-only" : "any-observed-public-obligation",
    present: true,
    deterministic,
    total: cases.length,
    correct,
    falsePositives,
    missed,
    namedRightCheck,
    details,
    pass:
      deterministic &&
      falsePositives === 0 &&
      missed === 0 &&
      (diagnosticReasons || namedRightCheck === controls.length),
  };
  // Retain the exact private grading policy and authoritative failures. None are
  // included in cases.json or mounted into the checker process.
  writeFileSync(join(output, "grade-summary.json"), `${JSON.stringify(grade, null, 2)}\n`, { flag: "wx" });
  return grade;
}

export function validatePortfolioExecution(
  value: unknown,
  ids: readonly string[],
  checkIds: readonly string[],
): asserts value is Execution {
  const parsed = value as Execution;
  if (
    !parsed ||
    parsed.schemaVersion !== 1 ||
    parsed.providerCallsMade !== 0 ||
    typeof parsed.privateReadable !== "boolean" ||
    !Array.isArray(parsed.cells) ||
    parsed.cells.length !== ids.length ||
    !ids.length ||
    new Set(ids).size !== ids.length ||
    !checkIds.length
  )
    throw Error("PORTFOLIO_RESULT_POPULATION");
  for (const [i, c] of parsed.cells.entries()) {
    if (c.scenarioId !== ids[i] || !["semantic-pass", "semantic-fail", "invalid"].includes(c.status))
      throw Error("PORTFOLIO_RESULT_POPULATION");
    if (c.status === "invalid") {
      if (!c.error) throw Error("PORTFOLIO_INVALID_WITHOUT_CAUSE");
      continue;
    }
    if (
      !Array.isArray(c.executions) ||
      !c.executions.length ||
      !c.checks ||
      Object.keys(c.checks).sort().join() !== [...checkIds].sort().join() ||
      Object.values(c.checks).some((v) => typeof v !== "boolean") ||
      !Array.isArray(c.failures) ||
      canonicalJson([...c.failures].sort()) !==
        canonicalJson(
          Object.keys(c.checks)
            .filter((k) => !c.checks?.[k])
            .sort(),
        ) ||
      (c.status === "semantic-pass") !== (c.failures.length === 0)
    )
      throw Error("PORTFOLIO_RESULT_CHECKS");
  }
}

function controlPass(result: Execution, name: string, control?: Control): boolean {
  const valid = result.cells.every((c) => c.status !== "invalid");
  const semantic =
    name === "reference" ||
    name === "alternative" ||
    name === "reference-repeat" ||
    (!control && name.startsWith(NAMED_VARIANT_PREFIX))
      ? valid && result.cells.every((c) => c.status === "semantic-pass")
      : valid &&
        result.cells.some(
          (c) => c.status === "semantic-fail" && (!control || c.failures?.includes(control.check)),
        ) &&
        (!control?.clean ||
          result.cells.find((c) => c.scenarioId === control.clean)?.status === "semantic-pass");
  const isolation =
    !control?.isolation ||
    (result.privateReadable &&
      result.cells.every(
        (c) =>
          !!c.executions?.length &&
          c.executions.every((e) =>
            e.diagnostics?.stdoutTail?.includes('"isolation":["denied","denied","denied"]'),
          ),
      ));
  return semantic && isolation;
}

export async function validatePortfolioPackage(directory: string, output: string) {
  fresh(output);
  const snapshot = snapshotAt(directory);
  const controls = get<Control[]>(snapshot, "controls", "private/control-manifest.json");
  const operations: AssuranceOperation[] = [];
  const positiveVariants = positiveVariantKeys(
    snapshot.record.components.reference.files.map((f) => f.path),
  ).map((key) => `${NAMED_VARIANT_PREFIX}${key}`);
  if (controls.some((c) => c.id.startsWith(NAMED_VARIANT_PREFIX)))
    throw Error("PORTFOLIO_CANDIDATE_NAME_COLLISION");
  const names = ["reference", "alternative", ...positiveVariants, "starter", ...controls.map((c) => c.id)];
  for (const name of names) {
    const control = controls.find((c) => c.id === name);
    const submission = join(output, "variants", name);
    variant(snapshot, submission, name, control);
    const digest = variantDigest(snapshot, name, control);
    operations.push({
      id: name,
      route: ROUTE,
      evidenceClass: "local-execution" as const,
      artifactDigest: digest,
      run: async () => {
        const result = await runPortfolioSubmission(directory, submission, join(output, "runs", name));
        return {
          passed: controlPass(result, name, control),
          detail: {
            path: `runs/${name}/result.json`,
            statuses: result.cells.map((c) => ({
              id: c.scenarioId,
              status: c.status,
              failures: c.failures ?? [],
              error: c.error ?? null,
            })),
          },
        };
      },
    });
  }
  const runtime = get<Runtime>(snapshot, "dependencies", "runtime.json");
  operations.push({
    id: "visible-workspace-smoke",
    route: ROUTE,
    evidenceClass: "local-execution" as const,
    artifactDigest: snapshot.record.components.workspace.digest,
    run: async () => {
      const observations = [];
      // Visible checks are part of the contract too. A fixture that rejects a legitimate
      // solution is a packaging defect even when protected grading accepts that solution.
      for (const name of ["starter", "reference", "alternative", ...positiveVariants]) {
        const publicPath = join(output, "variants", name);
        const tests = readPackageTree(publicPath)
          .filter((f) => /^test\/.*\.test\.mjs$/.test(f.path))
          .map((f) => `/submission/${f.path}`);
        if (!tests.length) {
          observations.push({ name, tests, status: "not-supplied" });
          continue;
        }
        const result = await docker(
          [
            "run",
            "--rm",
            "--network",
            "none",
            "--read-only",
            "--user",
            "1000:1000",
            "--cap-drop",
            "ALL",
            "--security-opt",
            "no-new-privileges",
            "--tmpfs",
            "/tmp:rw,size=64m",
            "--cpus",
            "2",
            "--memory",
            "2g",
            "--pids-limit",
            "128",
            "--mount",
            `type=bind,src=${resolve(publicPath)},dst=/submission,readonly`,
            runtime.image,
            "node",
            "-e",
            // Test failures are expected on a skeleton. Spawn/timeout errors remain errors.
            `const {spawnSync}=require('node:child_process');const r=spawnSync(process.execPath,['--test',...process.argv.slice(1)],{stdio:'inherit'});if(r.error||r.signal)process.exit(2);process.exit(${name === "starter" ? "r.status === 0 || r.status === 1 ? 0 : 2" : "r.status ?? 2"});`,
            ...tests,
          ],
          { timeoutMs: 60000, log: join(output, `visible-tests-${name}.log`) },
        );
        observations.push({ name, stdout: result.stdout, tests });
      }
      return { passed: true, detail: { observations } };
    },
  });
  operations.push({
    id: "reference-repeat",
    route: ROUTE,
    evidenceClass: "local-execution" as const,
    artifactDigest: variantDigest(snapshot, "reference"),
    run: async () => {
      const result = await runPortfolioSubmission(
        directory,
        join(output, "variants", "reference"),
        join(output, "runs", "reference-repeat"),
      );
      const prior = json<Execution>(join(output, "runs", "reference", "result.json"));
      const signature = (r: Execution) =>
        r.cells.map(({ scenarioId, status, checks, failures }) => ({
          scenarioId,
          status,
          checks: checks ?? null,
          failures: failures ?? null,
        }));
      return {
        passed:
          result.cells.every((c) => c.status === "semantic-pass") &&
          canonicalJson(signature(result)) === canonicalJson(signature(prior)),
        detail: {
          path: "runs/reference-repeat/result.json",
          semanticSignature: sha256(canonicalJson(signature(result))),
        },
      };
    },
  });
  const results = await runAssurance(snapshot, operations);
  const valid = results.every((r) => r.status === "pass");
  if (valid) assertAssuranceCoverage(snapshot, results, operations);
  const decision = decidePackage({
    snapshot,
    checks: {
      reference: valid,
      positiveWork: valid,
      nearMissControls: valid,
      contractReviewed: true,
      publicPackageComplete: true,
      protectedGrading: valid,
      localIntegrityControls: valid,
      boundedSolveEvidence: false,
      unresolvedAmbiguities: 0,
      unrepairedBypasses: 0,
    },
  });
  write(join(output, "assurance.json"), {
    packageDigest: snapshot.record.digest,
    results,
    decision,
    evidenceFiles: readPackageTree(output).map((f) => ({
      path: f.path,
      sha256: sha256(f.bytes),
      size: f.bytes.length,
    })),
    qualification: "Local controls only; final reviewer material, rubric and all model trials pending.",
  });
  return { results, decision };
}

export async function verifyPortfolioReceipt(directory: string, receiptPath: string) {
  const snapshot = snapshotAt(directory);
  const receipt = json<{
    packageDigest: string;
    results: AssuranceResult[];
    evidenceFiles: { path: string; sha256: string; size: number }[];
  }>(receiptPath);
  const controls = get<Control[]>(snapshot, "controls", "private/control-manifest.json");
  const expected = [
    "reference",
    "alternative",
    "starter",
    ...positiveVariantKeys(snapshot.record.components.reference.files.map((f) => f.path)).map(
      (key) => `${NAMED_VARIANT_PREFIX}${key}`,
    ),
    ...controls.map((c) => c.id),
    "visible-workspace-smoke",
    "reference-repeat",
  ];
  if (
    receipt.packageDigest !== snapshot.record.digest ||
    receipt.results.length !== expected.length ||
    expected.some(
      (id) =>
        !receipt.results.some(
          (r) =>
            r.id === id &&
            r.status === "pass" &&
            r.packageDigest === snapshot.record.digest &&
            r.route === ROUTE,
        ),
    )
  )
    throw Error("PORTFOLIO_ASSURANCE_REQUIRED");
  assertAssuranceCoverage(
    snapshot,
    receipt.results,
    expected.map((id) => ({
      id,
      route: ROUTE,
      evidenceClass: "local-execution" as const,
      artifactDigest:
        id === "visible-workspace-smoke"
          ? snapshot.record.components.workspace.digest
          : variantDigest(
              snapshot,
              id === "reference-repeat" ? "reference" : id,
              controls.find((c) => c.id === id),
            ),
    })),
  );
  if (!Array.isArray(receipt.evidenceFiles) || !receipt.evidenceFiles.length)
    throw Error("PORTFOLIO_EVIDENCE_MISSING");
  if (snapshot.record.version === "professional-v2") {
    const visible = receipt.results.find((r) => r.id === "visible-workspace-smoke");
    const observations = (
      visible?.detail as { observations?: { name: string; tests: string[] }[] } | undefined
    )?.observations;
    if (
      !Array.isArray(observations) ||
      observations.length !== 3 ||
      ["starter", "reference", "alternative"].some(
        (name) => !observations.some((o) => o.name === name && Array.isArray(o.tests) && o.tests.length > 0),
      )
    )
      throw Error("PORTFOLIO_VISIBLE_PARITY_REQUIRED");
    for (const name of ["starter", "reference", "alternative"])
      if (!receipt.evidenceFiles.some((f) => f.path === `visible-tests-${name}.log`))
        throw Error("PORTFOLIO_VISIBLE_PARITY_REQUIRED");
  }
  if (snapshot.record.version === "professional-v3") {
    const names = [
      "starter",
      "reference",
      "alternative",
      ...expected.filter((id) => id.startsWith(NAMED_VARIANT_PREFIX)),
    ];
    const visible = receipt.results.find((r) => r.id === "visible-workspace-smoke");
    const observations = (
      visible?.detail as
        | {
            observations?: { name: string; tests: string[]; status?: string }[];
          }
        | undefined
    )?.observations;
    if (
      !Array.isArray(observations) ||
      observations.length !== names.length ||
      names.some((name) => {
        const row = observations.find((o) => o.name === name);
        if (!row || !Array.isArray(row.tests)) return true;
        return row.tests.length === 0
          ? row.status !== "not-supplied"
          : !receipt.evidenceFiles.some((f) => f.path === `visible-tests-${name}.log`);
      })
    )
      throw Error("PORTFOLIO_VISIBLE_PARITY_REQUIRED");
  }
  const evidence = readPackageTree(dirname(receiptPath)).filter((f) => f.path !== "assurance.json");
  if (
    canonicalJson(evidence.map((f) => ({ path: f.path, sha256: sha256(f.bytes), size: f.bytes.length }))) !==
    canonicalJson(receipt.evidenceFiles)
  )
    throw Error("PORTFOLIO_EVIDENCE_CHANGED");
  for (const id of expected.filter((x) => x !== "visible-workspace-smoke")) {
    const raw = json<Execution & { packageDigest: string; artifactDigest: string }>(
      join(dirname(receiptPath), "runs", id, "result.json"),
    );
    if (
      raw.packageDigest !== snapshot.record.digest ||
      raw.artifactDigest !==
        variantDigest(
          snapshot,
          id === "reference-repeat" ? "reference" : id,
          controls.find((c) => c.id === id),
        )
    )
      throw Error("PORTFOLIO_EXECUTION_BINDING");
    validatePortfolioExecution(
      raw,
      get<string[]>(snapshot, "scenarios", "scenario-ids.json"),
      get<string[]>(snapshot, "scenarios", "check-ids.json"),
    );
    if (
      !controlPass(
        raw,
        id,
        controls.find((c) => c.id === id),
      )
    )
      throw Error("PORTFOLIO_CONTROL_SEMANTICS");
  }
  const runtime = get<Runtime>(snapshot, "dependencies", "runtime.json");
  if ((await hashFile(join(directory, "runtime.tar"))) !== runtime.archive.sha256)
    throw Error("PORTFOLIO_RUNTIME_BYTES");
  return { snapshot, receipt, evidence };
}

export async function exportPortfolioPackage(directory: string, output: string, receiptPath: string) {
  const { snapshot, receipt, evidence } = await verifyPortfolioReceipt(directory, receiptPath);
  fresh(output);
  copySnapshot(snapshot, join(output, "store"));
  materializeAssembly(snapshot, join(output, "package"));
  materializeAssembly(snapshot, join(output, "visible"), "subject");
  copyRuntimeArchive(join(directory, "runtime.tar"), join(output, "runtime.tar"));
  write(join(output, "package.json"), { schemaVersion: 1, packageDigest: snapshot.record.digest });
  for (const f of evidence) {
    const path = join(output, "verification", f.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, f.bytes, { flag: "wx" });
  }
  write(join(output, "verification/assurance.json"), receipt);
  return { packageDigest: snapshot.record.digest, output };
}

export async function portfolioCommand(root: string, args: readonly string[]) {
  const [command, a, b, c, d] = args;
  if (command === "runtime" && a) return preparePortfolioRuntime(root, a);
  if (command === "inspect" && a) {
    const snapshot = snapshotAt(a);
    verifyAssembly(snapshot, join(a, "package"));
    verifyAssembly(snapshot, join(a, "visible"), "subject");
    const runtime = get<Runtime>(snapshot, "dependencies", "runtime.json");
    return {
      record: snapshot.record,
      runtime,
      qualification: "Consult matching executed assurance; no model or human qualification is implied.",
    };
  }
  if (command === "load-runtime" && a) {
    const snapshot = snapshotAt(a);
    const runtime = get<Runtime>(snapshot, "dependencies", "runtime.json");
    if ((await hashFile(join(a, "runtime.tar"))) !== runtime.archive.sha256)
      throw Error("PORTFOLIO_RUNTIME_BYTES");
    await docker(["image", "load", "--input", join(a, "runtime.tar")], { timeoutMs: 300000 });
    return { image: runtime.image };
  }
  if (command === "build" && a && b && c) {
    const r = await buildPortfolioPackage(root, a as PortfolioId, b, c);
    return { packageDigest: r.digest, id: r.id, output: b };
  }
  if (command === "validate" && a && b) {
    const r = await validatePortfolioPackage(a, b);
    if (r.results.some((x) => x.status !== "pass"))
      throw Error(`PORTFOLIO_LOCAL_ASSURANCE_FAILED: ${join(b, "assurance.json")}`);
    return {
      results: r.results.map(({ id, status }) => ({ id, status })),
      decision: r.decision,
      receipt: join(b, "assurance.json"),
    };
  }
  if (command === "grade" && a && b && c) return runPortfolioSubmission(a, b, c, d?.split(","));
  if (command === "export" && a && b && c) return exportPortfolioPackage(a, b, c);
  throw Error(
    "portfolio runtime OUTPUT | build ID OUTPUT RUNTIME | inspect BUILD | load-runtime BUILD | validate BUILD OUTPUT | grade BUILD SUBMISSION OUTPUT [IDS] | export BUILD OUTPUT RECEIPT",
  );
}
