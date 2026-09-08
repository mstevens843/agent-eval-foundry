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
  "browser-replay-repair": "ui-replay-browser-backed",
  "persistent-knowledge-repair": "prompt-injection-memory-poisoning",
  "delegated-budget-repair": "delegated-wallet-scope-reconciliation",
  "compatible-rollout-repair": "deployment-model-alias-rollout-drift",
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
      : path.startsWith("private/reference/") || path.startsWith("private/alternative/")
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
  files.scenarios.push(
    { path: "scenario-ids.json", bytes: Buffer.from(canonicalJson(scenarios.map((s) => s.id))) },
    { path: "check-ids.json", bytes: Buffer.from(canonicalJson(generator.checkIds)) },
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
      version: "professional-v2",
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

function variantFiles(snapshot: PackageSnapshot, name: string, control?: Control) {
  const files = new Map<string, Uint8Array>();
  for (const part of ["contract", "workspace"] as const)
    for (const f of snapshot.record.components[part].files)
      if (f.path.startsWith("public/")) files.set(f.path.slice(7), readSnapshotFile(snapshot, part, f.path));
  if (name !== "starter") {
    const prefix = name === "alternative" ? "private/alternative/" : "private/reference/";
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
    name === "reference" || name === "alternative" || name === "reference-repeat"
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
  const names = ["reference", "alternative", "starter", ...controls.map((c) => c.id)];
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
      for (const name of ["starter", "reference", "alternative"]) {
        const publicPath = join(output, "variants", name);
        const tests = readPackageTree(publicPath)
          .filter((f) => /^test\/.*\.test\.mjs$/.test(f.path))
          .map((f) => `/submission/${f.path}`);
        if (!tests.length) throw Error("VISIBLE_TESTS_MISSING");
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
            "--test",
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
    qualification: "Local controls only; independent human review and all model trials pending.",
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
