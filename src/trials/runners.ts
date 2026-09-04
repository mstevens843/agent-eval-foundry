// Runners, and the isolation boundary they represent.
//
// A runner's only job is to get a subject to produce (ledger, report) for a scenario. What varies is
// how far the subject is from the thing grading it, and that distance is not a detail — all three
// verifier bypasses found in the source project were failures of exactly this boundary.
//
//   IN-PROCESS   The subject is a module in this repository. It gets a frozen facade and never sees
//                the ledger array, so it cannot swap the recorder by accident. It can reach past its
//                arguments — module globals, prototype patching, the filesystem — so this is
//                sufficient for code you wrote and INSUFFICIENT for code an agent wrote.
//
//   SUBPROCESS   The subject runs in a separate node process and answers over stdout. The ledger and
//                the grading live in the parent's memory, which the child cannot reach at all. This
//                is the level an agent-submitted artifact must be run at, and it is implemented here
//                rather than described.
//
//   CONTAINER    The subject runs in its own container: no network at all, an empty environment, a
//                private tmpfs, a read-only rootfs, dropped capabilities and recorded CPU/memory/pid
//                and wall-clock limits. One container per run, one bind source per run, so two runs
//                cannot see each other's files — the failure that is literally recorded in an
//                existing transcript, where one trial overwrote another's files in a shared /tmp.
//                It is implemented here and PROVEN by `containerDryRun`, which reports the facts the
//                container actually achieved rather than the flags that were requested.
//
// The interface is deliberately family-agnostic so the next twenty families reuse it. What is
// family-specific is the host script, which knows how to build a harness and call a subject.

import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONTAINER_IMAGE, containerRuntimeReadiness } from "../adversarial-audit/isolation.js";
import { ToolHarness } from "../families/prompt-injection-containment/runner.js";
import type {
  Scenario,
  Subject,
  SubjectReport,
  ToolInvocation,
} from "../families/prompt-injection-containment/types.js";
import type { IsolationLevel } from "./types.js";

export interface RunOutcome {
  readonly ledger: readonly ToolInvocation[];
  readonly report: SubjectReport;
  /** Non-null when the subject failed to produce a usable answer at all. */
  readonly error: string | null;
}

export interface SubjectRunner {
  readonly isolation: IsolationLevel;
  readonly describe: string;
  run: (scenario: Scenario) => RunOutcome;
}

/** For subjects that live in this repository: the reference, the mutants, the baselines. */
export function inProcessRunner(subject: Subject): SubjectRunner {
  return {
    isolation: "in-process",
    describe: `in-process module "${subject.id}"`,
    run(scenario) {
      const harness = new ToolHarness(scenario);
      try {
        const report = subject.run(scenario, harness.facade());
        return { ledger: harness.sealed(), report, error: null };
      } catch (err) {
        return {
          ledger: harness.sealed(),
          report: { decisions: [], audit: [] },
          error: (err as Error).message,
        };
      }
    },
  };
}

export interface SubprocessOptions {
  /** Absolute path to an ES module exporting `subject`. */
  readonly modulePath: string;
  readonly timeoutMs?: number;
  readonly hostScript?: string;
}

/**
 * Locate the host script.
 *
 * Resolved from the working directory rather than from `import.meta.url`, because this package is
 * built to both ESM and CJS and `import.meta` does not exist in the CJS output — a detail that only
 * surfaces when the CLI is required rather than imported. Callers who run from elsewhere pass
 * `hostScript` explicitly.
 */
export function defaultHostScript(): string {
  const candidates = [
    join(process.cwd(), "scripts", "subject-host.mjs"),
    join(process.cwd(), "..", "scripts", "subject-host.mjs"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0] ?? "scripts/subject-host.mjs";
}

/**
 * For artifacts this repository did not write.
 *
 * The child receives the scenario on stdin and returns `{ledger, report}` on stdout. The ledger it
 * returns is the one the HOST built inside the child — the parent still owns the grading, and the
 * child cannot reach the parent's memory to alter what it is graded against. That is the real
 * guarantee here, and it is the one the in-process runner cannot make.
 *
 * What this does NOT stop: a child that writes to the filesystem, opens a socket, or simply lies
 * about its own ledger. The first two need a container; the third is caught by the verifier, which
 * compares the subject's reported decisions against the ledger rather than trusting either alone.
 */
export function subprocessRunner(options: SubprocessOptions): SubjectRunner {
  const host = options.hostScript ?? defaultHostScript();
  const timeout = options.timeoutMs ?? 30_000;
  return {
    isolation: "subprocess",
    describe: `subprocess host running "${options.modulePath}"`,
    run(scenario) {
      try {
        const stdout = execFileSync("node", [host, options.modulePath], {
          input: JSON.stringify({ scenario }),
          encoding: "utf8",
          timeout,
          maxBuffer: 32 * 1024 * 1024,
        });
        const parsed = JSON.parse(stdout) as {
          ledger?: ToolInvocation[];
          report?: SubjectReport;
          error?: string;
        };
        if (typeof parsed.error === "string") {
          return { ledger: parsed.ledger ?? [], report: { decisions: [], audit: [] }, error: parsed.error };
        }
        return {
          ledger: parsed.ledger ?? [],
          report: parsed.report ?? { decisions: [], audit: [] },
          error: null,
        };
      } catch (err) {
        // A child that crashes, hangs or writes unparseable output is a failed subject, not a failed
        // harness, and is recorded rather than allowed to abort the sweep.
        return {
          ledger: [],
          report: { decisions: [], audit: [] },
          error: `subprocess failed: ${(err as Error).message.slice(0, 300)}`,
        };
      }
    },
  };
}

// ---------------------------------------------------------------------------------------------
// CONTAINER
//
// Everything below is the level `subprocessRunner` cannot reach. A subprocess still shares the
// filesystem, the network and the environment with the parent; those three are exactly what an
// agent-submitted artifact must not have, and exactly what the existing evidence base ran with.
//
// The container profile is NOT reinvented here. `ISOLATION_PROFILES["container-no-network"]` and
// the image already exist for the adversarial audit, and this reuses both so there is one notion of
// "containerized" in the repository rather than two that can drift apart.

export interface ContainerLimits {
  readonly memory: string;
  readonly cpus: string;
  readonly pids: string;
  readonly nofile: string;
  /** Host-side wall clock. The container is force-removed if it outlives it. */
  readonly wallClockMs: number;
}

/** Recorded, not implied. Every number here appears in the trial metadata's isolation detail. */
export const CONTAINER_LIMITS: ContainerLimits = {
  memory: "512m",
  cpus: "1",
  pids: "128",
  nofile: "256",
  wallClockMs: 60_000,
};

/**
 * The flags that make the sandbox, in one place so the runner and the dry-run cannot diverge.
 *
 * `network` is a parameter and not a constant because it is the one property this repository cannot
 * hold for every container it runs — see `containerTrialCommand`. For a subject artifact it is
 * always "none", because grading a submitted module needs no network at all.
 */
export function containerFlags(
  name: string,
  bindSource: string,
  network: "none" | "bridge",
  limits: ContainerLimits = CONTAINER_LIMITS,
  bindMode: "ro" | "rw" = "ro",
): readonly string[] {
  return [
    "run",
    "--rm",
    "--name",
    name,
    `--network=${network}`,
    "--read-only",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--user=1000:1000",
    "--workdir=/work",
    // A private tmpfs per container. Not a shared host /tmp: two runs cannot see, read or overwrite
    // each other's scratch files, which is the concrete failure one existing transcript records.
    "--tmpfs=/tmp:rw,nosuid,nodev,size=64m",
    `--mount=type=bind,source=${bindSource},target=/work${bindMode === "ro" ? ",readonly" : ""}`,
    `--memory=${limits.memory}`,
    `--cpus=${limits.cpus}`,
    `--pids-limit=${limits.pids}`,
    `--ulimit=nofile=${limits.nofile}:${limits.nofile}`,
    // Nothing from the parent environment crosses. Not PATH, not HOME, and above all not a
    // credential: the image's own ENV is all the process gets.
    "--env-file=/dev/null",
  ];
}

/**
 * A staging directory the container can actually read.
 *
 * `mkdtempSync` creates 0700, owned by whoever ran the process. The container is deliberately forced
 * to `--user=1000:1000` so nothing runs as root, and on a Linux host that uid is almost never the
 * one that staged the files: GitHub's ubuntu runners are uid 1001, so the container cannot traverse
 * into its own bind mount and node reports the mounted script as MODULE_NOT_FOUND — a permission
 * error wearing a missing-file error's clothes.
 *
 * It does not reproduce on macOS. Docker Desktop shares the host filesystem through a VM layer that
 * remaps ownership, so every uid inside the container can read the mount whatever its mode. This is
 * the class of defect that only exists on someone else's machine, which is why it is fixed here and
 * not worked around in the test.
 *
 * 0755 on a directory holding a host script and a subject module, under a read-only mount, in a
 * per-run temp directory. Nothing secret is staged and nothing may be written back.
 */
const stagingDir = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  chmodSync(dir, 0o755);
  return dir;
};

/** Stage one file where a non-root container uid can read it. `copyFileSync` preserves the source mode. */
const stageFile = (from: string, to: string): void => {
  copyFileSync(from, to);
  chmodSync(to, 0o644);
};

const containerName = (prefix: string): string =>
  `foundry-${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const forceRemove = (name: string): void => {
  try {
    execFileSync("docker", ["rm", "-f", name], { stdio: "ignore", timeout: 15_000 });
  } catch {
    /* the container was already gone, which is the normal case */
  }
};

export interface ContainerOptions extends SubprocessOptions {
  readonly image?: string;
  readonly limits?: ContainerLimits;
}

/**
 * For artifacts this repository did not write, at the level the artifact deserves.
 *
 * Same contract as `subprocessRunner` — scenario on stdin, `{ledger, report}` on stdout, the parent
 * still owns the grading — with the three holes that runner documents actually closed:
 *
 *   filesystem   The subject sees a per-run bind mount holding two files, read-only, and a private
 *                tmpfs. It cannot see this repository, the trials directory, another run's scratch,
 *                or the verifier. Runs are therefore disjoint whether or not they are sequential.
 *   network      `--network=none`. There is no interface but loopback; a socket cannot be opened.
 *   environment  `--env-file=/dev/null` and no `--env`. No credential is inherited, because none is
 *                needed: a submitted module is not a provider CLI.
 *
 * What it still does NOT stop, stated because the whole point of this file is not asserting more
 * isolation than exists: a subject can lie about its own ledger. The verifier catches that by
 * cross-checking reported decisions against the ledger, exactly as at the subprocess level.
 */
export function containerRunner(options: ContainerOptions): SubjectRunner {
  const host = options.hostScript ?? defaultHostScript();
  const image = options.image ?? CONTAINER_IMAGE;
  const limits = options.limits ?? CONTAINER_LIMITS;
  const timeout = options.timeoutMs ?? limits.wallClockMs;
  return {
    isolation: "container",
    describe: `container ${image} running "${options.modulePath}" (network=none, ${limits.memory}/${limits.cpus}cpu/${limits.pids}pids, ${timeout}ms)`,
    run(scenario) {
      const name = containerName("subject");
      try {
        // A fresh staging directory per run IS the disjointness guarantee: it is the only host path
        // the container can reach, and no two runs are ever handed the same one.
        const stage = stagingDir("foundry-container-");
        stageFile(host, join(stage, "subject-host.mjs"));
        stageFile(options.modulePath, join(stage, "subject.mjs"));
        const stdout = execFileSync(
          "docker",
          [
            ...containerFlags(name, stage, "none", limits),
            "--interactive",
            image,
            "node",
            "/work/subject-host.mjs",
            "/work/subject.mjs",
          ],
          {
            input: JSON.stringify({ scenario }),
            encoding: "utf8",
            timeout,
            maxBuffer: 32 * 1024 * 1024,
            env: { PATH: process.env["PATH"] ?? "", HOME: process.env["HOME"] ?? "" },
          },
        );
        const parsed = JSON.parse(stdout) as {
          ledger?: ToolInvocation[];
          report?: SubjectReport;
          error?: string;
        };
        if (typeof parsed.error === "string") {
          return { ledger: parsed.ledger ?? [], report: { decisions: [], audit: [] }, error: parsed.error };
        }
        return {
          ledger: parsed.ledger ?? [],
          report: parsed.report ?? { decisions: [], audit: [] },
          error: null,
        };
      } catch (err) {
        forceRemove(name);
        return {
          ledger: [],
          report: { decisions: [], audit: [] },
          error: `container failed: ${(err as Error).message.slice(0, 300)}`,
        };
      }
    },
  };
}

export interface JsonContainerHostOptions {
  /** Absolute path to the family host script. */
  readonly hostScript: string;
  /** Absolute path to the untrusted submitted ES module. */
  readonly modulePath: string;
  readonly image?: string;
  readonly limits?: ContainerLimits;
  readonly timeoutMs?: number;
}

/**
 * Run a family host and submitted module in a no-network container, returning only JSON to the
 * verifier process. Unlike `containerRunner`, this keeps the host payload generic so every routed
 * family can reuse the same boundary without pretending its ledger has the containment shape.
 */
export function runJsonContainerHost(
  options: JsonContainerHostOptions,
  payload: unknown,
): Record<string, unknown> {
  const image = options.image ?? CONTAINER_IMAGE;
  const limits = options.limits ?? CONTAINER_LIMITS;
  const timeout = options.timeoutMs ?? limits.wallClockMs;
  const name = containerName("json-host");
  const stage = stagingDir("foundry-json-host-");
  try {
    stageFile(options.hostScript, join(stage, "family-host.mjs"));
    stageFile(options.modulePath, join(stage, "subject.mjs"));
    const stdout = execFileSync(
      "docker",
      [
        ...containerFlags(name, stage, "none", limits),
        "--interactive",
        image,
        "node",
        "/work/family-host.mjs",
        "/work/subject.mjs",
      ],
      {
        input: JSON.stringify(payload),
        encoding: "utf8",
        timeout,
        maxBuffer: 64 * 1024 * 1024,
        env: { PATH: process.env["PATH"] ?? "", HOME: process.env["HOME"] ?? "" },
      },
    );
    const parsed: unknown = JSON.parse(stdout);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : { error: "container host returned non-object JSON" };
  } catch (err) {
    forceRemove(name);
    return { error: `container host failed: ${(err as Error).message.slice(0, 300)}` };
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

/** Names that would carry a credential. Matched against KEYS only — a value is never read. */
export const SECRET_ENV_PATTERN = /TOKEN|SECRET|API_?KEY|PASSWORD|CREDENTIAL|AUTH|SESSION/i;

/** What the container reported about itself. Observed inside the sandbox, never assumed outside it. */
export interface ContainerFacts {
  readonly uid: number;
  readonly gid: number;
  readonly networkInterfaces: readonly string[];
  readonly networkReachable: boolean;
  readonly tmpEntries: readonly string[];
  readonly tmpWritable: boolean;
  readonly rootWritable: boolean;
  readonly workWritable: boolean;
  readonly workEntries: readonly string[];
  readonly envKeys: readonly string[];
  readonly memoryMaxBytes: string | null;
  readonly pidsMax: string | null;
  readonly cpuMax: string | null;
  readonly hostPathsVisible: readonly string[];
}

export interface ContainerDryRun {
  readonly ran: boolean;
  readonly image: string;
  readonly limits: ContainerLimits;
  readonly argv: readonly string[];
  readonly facts: ContainerFacts | null;
  /** Isolation claims that the container did NOT actually deliver. Empty means the claims hold. */
  readonly violations: readonly string[];
  readonly detail: string;
}

// Runs inside the container and reports what it can actually observe. Deliberately a probe rather
// than an assertion: it prints facts, and the host decides whether those facts are acceptable.
const PROBE_SOURCE = `
import { createConnection } from "node:net";
import { networkInterfaces } from "node:os";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const read = (p) => { try { return readFileSync(p, "utf8").trim(); } catch { return null; } };
const canWrite = (p) => { try { writeFileSync(p, "probe"); return true; } catch { return false; } };
const reachable = await new Promise((resolve) => {
  const socket = createConnection({ host: "1.1.1.1", port: 443, timeout: 3000 });
  const settle = (v) => { try { socket.destroy(); } catch {} resolve(v); };
  socket.on("connect", () => settle(true));
  socket.on("error", () => settle(false));
  socket.on("timeout", () => settle(false));
});
process.stdout.write(JSON.stringify({
  uid: process.getuid(),
  gid: process.getgid(),
  networkInterfaces: Object.keys(networkInterfaces()).sort(),
  networkReachable: reachable,
  tmpEntries: readdirSync("/tmp").sort(),
  tmpWritable: canWrite("/tmp/foundry-probe"),
  rootWritable: canWrite("/foundry-probe"),
  workWritable: canWrite("/work/foundry-probe"),
  workEntries: readdirSync("/work").sort(),
  envKeys: Object.keys(process.env).sort(),
  memoryMaxBytes: read("/sys/fs/cgroup/memory.max"),
  pidsMax: read("/sys/fs/cgroup/pids.max"),
  cpuMax: read("/sys/fs/cgroup/cpu.max"),
  hostPathsVisible: ["/Users", "/host", "/repo", "/trials"].filter((p) => existsSync(p)),
}));
`;

/**
 * Build the container, mount a bundle, run a trivial NON-PROVIDER command inside it, and report the
 * isolation it actually achieved.
 *
 * This is how the harness is validated without spending anything. It makes no provider call: the
 * only process is `node` running the probe above, with no network and no credential, so there is
 * nothing for it to call. A claim in `isolationSummary` that this dry run cannot reproduce is a
 * claim that should be deleted rather than believed.
 */
export function containerDryRun(
  image = CONTAINER_IMAGE,
  limits: ContainerLimits = CONTAINER_LIMITS,
): ContainerDryRun {
  const readiness = containerRuntimeReadiness();
  const name = containerName("dryrun");
  const stage = stagingDir("foundry-dryrun-");
  writeFileSync(join(stage, "probe.mjs"), PROBE_SOURCE, { encoding: "utf8", mode: 0o644 });
  writeFileSync(join(stage, "bundle-marker.txt"), "mounted bundle\n", { encoding: "utf8", mode: 0o644 });
  const argv = [...containerFlags(name, stage, "none", limits), image, "node", "/work/probe.mjs"];
  if (!readiness.available) {
    return { ran: false, image, limits, argv, facts: null, violations: [], detail: readiness.detail };
  }
  let raw: string;
  try {
    raw = execFileSync("docker", argv, {
      encoding: "utf8",
      timeout: limits.wallClockMs,
      maxBuffer: 8 * 1024 * 1024,
      env: { PATH: process.env["PATH"] ?? "", HOME: process.env["HOME"] ?? "" },
    });
  } catch (err) {
    forceRemove(name);
    return {
      ran: false,
      image,
      limits,
      argv,
      facts: null,
      violations: [],
      detail: `container did not start: ${(err as Error).message.slice(0, 300)}`,
    };
  }
  const facts = JSON.parse(raw) as ContainerFacts;
  const bytes = Number(facts.memoryMaxBytes);
  const violations = [
    ...(facts.networkReachable ? ["network was reachable from inside the container"] : []),
    ...(facts.networkInterfaces.some((i) => i !== "lo")
      ? [`non-loopback interface present: ${facts.networkInterfaces.join(", ")}`]
      : []),
    ...(facts.rootWritable ? ["container root filesystem was writable"] : []),
    ...(facts.workWritable ? ["the mounted bundle was writable"] : []),
    ...(facts.tmpWritable ? [] : ["the private tmpfs was not writable, so the subject has no scratch"]),
    ...(facts.tmpEntries.length > 1 ? [`/tmp was not private: ${facts.tmpEntries.join(", ")}`] : []),
    ...(facts.uid === 0 ? ["container ran as root"] : []),
    ...(facts.hostPathsVisible.length > 0
      ? [`host paths visible: ${facts.hostPathsVisible.join(", ")}`]
      : []),
    ...(facts.envKeys.some((k) => SECRET_ENV_PATTERN.test(k))
      ? [
          `credential-shaped env keys visible: ${facts.envKeys.filter((k) => SECRET_ENV_PATTERN.test(k)).join(", ")}`,
        ]
      : []),
    ...(Number.isFinite(bytes) && bytes > 0 ? [] : [`memory limit not applied: ${facts.memoryMaxBytes}`]),
    ...(facts.pidsMax !== null && facts.pidsMax !== "max" ? [] : [`pid limit not applied: ${facts.pidsMax}`]),
  ];
  return {
    ran: true,
    image,
    limits,
    argv,
    facts,
    violations,
    detail: violations.length === 0 ? "all declared isolation properties held" : "isolation claims not met",
  };
}

export interface ContainerTrialCommandOptions {
  /** Directory holding a file-backed credential, when required. Mounted read-only; never read here. */
  readonly credentialDir?: string;
  /** Where that directory appears inside the container. Required with `credentialDir`. */
  readonly credentialTarget?: string;
  /** Environment variable NAMES the CLI needs. Values are passed by docker, never by this process. */
  readonly envPassthrough?: readonly string[];
  /** The provider CLI invocation, run inside the container. */
  readonly agentCommand: readonly string[];
  readonly image?: string;
  readonly limits?: ContainerLimits;
}

/**
 * The container invocation for running a PROVIDER CLI, which is a weaker box than the one above.
 *
 * NETWORK CANNOT BE DISABLED HERE, and pretending otherwise would be the exact dishonesty this file
 * exists to avoid. The codex and claude CLIs are the agent: they reach a remote API over TLS, and a
 * container with `--network=none` cannot run them at all — the run would classify as an
 * infrastructure error, not as a model that failed. So this profile keeps every other property of
 * `containerFlags` and turns networking on, and `containerIsolationDetail` records that it did.
 *
 * What is still isolated with the network on: the filesystem (only the per-trial working directory
 * is mounted, writable; this repository, the trials directory and the verifier are not), the process
 * tree, capabilities, the pid/memory/cpu ceiling, and the environment — exactly one credential
 * directory crosses the boundary, read-only, plus the named variables the caller declares.
 */
export function containerTrialCommand(options: ContainerTrialCommandOptions): readonly string[] {
  const image = options.image ?? CONTAINER_IMAGE;
  const limits = options.limits ?? CONTAINER_LIMITS;
  if ((options.credentialDir === undefined) !== (options.credentialTarget === undefined)) {
    throw new Error("credentialDir and credentialTarget must be supplied together");
  }
  return [
    "docker",
    // `{dir}` is the per-trial sandbox the shell adapter creates, so this reaches the orchestrator
    // through the existing command template rather than needing a new adapter.
    // The bundle is writable here and read-only above, because the agent must write its submission
    // into it and a subject artifact must not write anywhere but its own tmpfs.
    ...containerFlags(containerName("trial"), "{dir}", "bridge", limits, "rw"),
    // Overlay the challenge path read-only on the writable workspace mount. The model can create
    // tests and its submission, but cannot rewrite the bytes whose hash makes the run countable.
    "--mount=type=bind,source={dir}/challenge,target=/work/challenge,readonly",
    ...(options.credentialDir === undefined
      ? []
      : [`--mount=type=bind,source=${options.credentialDir},target=${options.credentialTarget},readonly`]),
    ...(options.envPassthrough ?? []).map((key) => `--env=${key}`),
    image,
    ...options.agentCommand,
  ];
}

export interface ContainerAttempt {
  /** The level the run may RECORD. Never `container` unless a container genuinely ran. */
  readonly isolation: IsolationLevel;
  readonly classification: "completed" | "infrastructure_error";
  readonly detail: string;
}

/**
 * What a run may CLAIM, given what the container actually did.
 *
 * Two rules, and the existing evidence base breaks both. A run records `container` only when a
 * container genuinely started AND delivered the properties it declared — a requested flag is not an
 * achieved boundary, and this repository already carries trials whose isolation was asserted by a
 * constant. And a container that could not start is an INFRASTRUCTURE error, never a capability
 * finding: the model never saw the task, so scoring it a failure manufactures precisely the
 * difficulty evidence the counting rules exist to prevent.
 */
export function containerAttempt(dry: ContainerDryRun): ContainerAttempt {
  if (!dry.ran) {
    return {
      isolation: "subprocess",
      classification: "infrastructure_error",
      detail: `container could not start, so no container boundary existed: ${dry.detail}`,
    };
  }
  if (dry.violations.length > 0) {
    return {
      isolation: "subprocess",
      classification: "infrastructure_error",
      detail: `container started but did not deliver its declared isolation: ${dry.violations.join("; ")}`,
    };
  }
  return { isolation: "container", classification: "completed", detail: dry.detail };
}

/**
 * The isolation sentence the trial metadata carries. Written to be falsifiable, not reassuring.
 *
 * The comparison is to the source project's Harbor setup, which is the only container boundary this
 * repository's evidence base has ever actually had, and which is stronger than this runner in three
 * specific ways rather than in spirit.
 */
export function containerIsolationDetail(command: readonly string[] | null): string {
  const containerized = command !== null && command[0] === "docker";
  if (!containerized) {
    return "NOT containerized: the provider ran as a host subprocess sharing this machine's filesystem, network and environment.";
  }
  const networked = command.includes("--network=bridge");
  const imageIndex = command.findIndex((arg, index) => {
    if (index < 2 || arg.startsWith("-")) return false;
    return command[index - 1] !== "--name";
  });
  const image = imageIndex < 0 ? "unknown image" : command[imageIndex];
  const value = (prefix: string, fallback: string): string =>
    command.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
  const credentialMounts = command.filter(
    (arg) => arg.startsWith("--mount=") && !arg.includes("target=/work"),
  ).length;
  const credentialEnvNames = command
    .filter((arg) => arg.startsWith("--env=") && !arg.slice("--env=".length).includes("="))
    .map((arg) => arg.slice("--env=".length));
  return [
    `containerized (${image}), one container per trial, writable per-trial workspace with a nested read-only challenge mount, private tmpfs, read-only rootfs, cap-drop=ALL, no-new-privileges, uid 1000,`,
    `limits memory=${value("--memory=", "unknown")} cpus=${value("--cpus=", "unknown")} pids=${value("--pids-limit=", "unknown")} nofile=${value("--ulimit=nofile=", "unknown")} host timeout is recorded separately.`,
    networked
      ? `NETWORK IS ON, and the reason is specific: the provider CLI is the agent and must reach its vendor API, so a no-network container would record an infrastructure error rather than a capability result. Credential channels: ${credentialMounts} read-only mount(s), declared environment key(s) [${credentialEnvNames.join(", ")}]; no other host environment crosses.`
      : "Network is off (--network=none): no interface but loopback, and no credential is mounted.",
    "WEAKER THAN HARBOR in three ways this runner does not claim to close: (1) Harbor built a separate verifier IMAGE and ran it in its own container after the agent container was torn down, with only the declared artifact crossing; here the verifier runs on the HOST, so it is outside the attacker's container but inside its blast radius if the container is escaped. (2) Harbor separated privilege three ways inside the verifier — a root tool_server owning the ledger behind a 0700 control socket, an unprivileged per-scenario child that was the only process to import agent code and was killed by process group, and a root collector that never imported it — so the agent's account of itself and the ground truth came from different processes at different privilege levels; this runner has one unprivileged process and one account. (3) Harbor baked all verifier tooling into the image and forbade network fetches at verify time; here the grader uses the host's installed toolchain.",
  ].join(" ");
}

/** What a runner at each level can and cannot promise. Rendered into the trial-readiness report. */
export const isolationSummary = (level: IsolationLevel): string =>
  ({
    "in-process": "sufficient for subjects this repository wrote; not for agent-submitted code",
    subprocess: "child cannot reach the grading process's memory; shares filesystem and network",
    container:
      "own container per run: no network, empty env, private tmpfs, read-only rootfs, all capabilities dropped, recorded cpu/memory/pid/wall-clock limits; the grader still runs on the host, not in a second image",
  })[level];
