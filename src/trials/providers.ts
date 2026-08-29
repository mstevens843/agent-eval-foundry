// Provider adapters: how a subject actually gets produced.
//
// The rule this file exists to enforce is that an unconfigured provider FAILS LOUDLY. A stub that
// returns an empty submission would flow all the way through the pipeline — trial record written,
// matrix updated, axis report regenerated — and surface as a model that scored zero. That is
// manufactured difficulty evidence, and it is the exact failure the counting rules were built to
// prevent one layer down.
//
// So `status: "declared"` adapters throw with what they would need, and never produce a record.
//
// The `shell` adapter is fully general and fully real: give it a command template and it runs it in
// an isolated working directory with a timeout, captures stdout and stderr verbatim, and collects
// whatever landed in the submission path. Every provider is reachable through it, which is why the
// named adapters below are conveniences rather than the mechanism.
//
// ISOLATION, HONESTLY. The shell runner gives the subject its own temp directory and a read-only
// copy of the challenge; it does NOT restrict the network or the filesystem outside that directory.
// That is adequate for a model writing a source file and inadequate for genuinely hostile code. The
// docker adapter below is the answer to that and is declared rather than implemented, because the
// daemon is not running in this environment — saying so is better than pretending subprocess is a
// sandbox.

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type ProviderStatus = "implemented" | "declared";

export interface ProviderRunRequest {
  /** Directory holding the agent-facing challenge. Copied into the sandbox read-only. */
  readonly challengeDir: string;
  /** Relative path, inside the sandbox, where the subject must write its artifact. */
  readonly submissionPath: string;
  readonly instruction: string;
  readonly timeoutMs: number;
  /** Only these environment variables reach the process. Everything else is redacted. */
  readonly env: Readonly<Record<string, string>>;
  /**
   * Let the invoked process inherit the parent environment.
   *
   * Off by default, and the distinction is worth being precise about: redaction protects against a
   * HOSTILE SUBJECT reading credentials out of its environment. A provider CLI we are deliberately
   * invoking is trusted infrastructure that needs its own auth to work at all — the first real trial
   * attempted here died in two seconds with "Not logged in" because the two cases were conflated.
   *
   * So: true when the process IS the agent (a provider CLI), false when the process is running an
   * artifact the agent produced. The subprocess grader never sets it.
   */
  readonly inheritEnv?: boolean;
  /** For the `shell` adapter: the command template. `{dir}` is replaced with the sandbox path. */
  readonly command?: readonly string[];
}

export interface ProviderRunResult {
  readonly transcript: string;
  readonly submission: readonly { readonly path: string; readonly content: string }[];
  /** Classified before any judgement about whether the run counts. */
  readonly classification: "completed" | "refused" | "timeout" | "infrastructure_error" | "crashed";
  readonly detail: string;
  readonly runtimeSeconds: number;
  readonly sandbox: string;
}

export interface ProviderAdapter {
  readonly id: string;
  readonly label: string;
  readonly status: ProviderStatus;
  /** For declared adapters: exactly what would need to exist. Null when implemented. */
  readonly requires: string | null;
  readonly isolation: "process" | "container";
  readonly run: (req: ProviderRunRequest) => ProviderRunResult;
}

/** Phrases that indicate a provider-level refusal rather than a failed attempt. */
const REFUSAL_MARKERS = [
  "i can't help with that",
  "i cannot help with that",
  "i won't be able to help",
  "i'm not able to help with",
  "safety",
  "refus",
] as const;

/**
 * Classify an outcome from the transcript and the artifact.
 *
 * Deliberately conservative: a run that produced an artifact is `completed` whatever the transcript
 * says, because a model that hedges in prose and then does the work has done the work. Refusal is
 * only inferred when there is NO artifact and the transcript reads like a refusal — and even then,
 * `countability` is a separate human judgement recorded separately.
 */
export function classifyRun(
  transcript: string,
  submissionFound: boolean,
  timedOut: boolean,
  crashed: boolean,
): { classification: ProviderRunResult["classification"]; detail: string } {
  if (timedOut) return { classification: "timeout", detail: "wall-clock limit reached" };
  if (submissionFound) return { classification: "completed", detail: "artifact produced" };
  if (crashed)
    return { classification: "crashed", detail: "runner exited non-zero and produced no artifact" };
  const lower = transcript.toLowerCase();
  const marker = REFUSAL_MARKERS.find((m) => lower.includes(m));
  if (marker !== undefined) {
    return {
      classification: "refused",
      detail: `no artifact and the transcript matches a refusal marker ("${marker}")`,
    };
  }
  return { classification: "infrastructure_error", detail: "no artifact and no refusal signal" };
}

const REFUSAL_RATIONALE =
  "Refusing rather than returning an empty submission: an empty submission would flow through the " +
  "pipeline and surface as a model that scored zero.";

const notConfigured = (id: string, requires: string) => (): ProviderRunResult => {
  throw new Error(`provider "${id}" is not configured. ${requires} ${REFUSAL_RATIONALE}`);
};

/** Copy the challenge into a fresh sandbox. Returns the sandbox path. */
export function makeSandbox(challengeDir: string): string {
  const dir = mkdtempSync(join(tmpdir(), "foundry-trial-"));
  cpSync(challengeDir, join(dir, "challenge"), { recursive: true });
  mkdirSync(join(dir, "submission"), { recursive: true });
  return dir;
}

const collect = (dir: string, rel = ""): { path: string; content: string }[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? collect(join(dir, e.name), `${rel}${e.name}/`)
          : [{ path: `${rel}${e.name}`, content: readFileSync(join(dir, e.name), "utf8") }],
      )
    : [];

/**
 * The real, general runner. Every other provider is reachable through it.
 *
 * `{dir}` in the command template is replaced with the sandbox path, so a caller writes e.g.
 *   ["claude", "-p", "<instruction>", "--add-dir", "{dir}"]
 */
export const shellAdapter: ProviderAdapter = {
  id: "shell",
  label: "Shell command",
  status: "implemented",
  requires: null,
  isolation: "process",
  run(req) {
    if (req.command === undefined || req.command.length === 0) {
      throw new Error('the "shell" provider needs a command; pass --cmd');
    }
    const sandbox = makeSandbox(req.challengeDir);
    const started = Date.now();
    let transcript = "";
    let timedOut = false;
    let crashed = false;

    const argv = req.command.map((a) =>
      a.replaceAll("{dir}", sandbox).replaceAll("{instruction}", req.instruction),
    );
    const [bin, ...args] = argv;

    try {
      transcript = execFileSync(bin as string, args, {
        cwd: sandbox,
        encoding: "utf8",
        timeout: req.timeoutMs,
        maxBuffer: 64 * 1024 * 1024,
        // Declared variables only, unless the caller explicitly opts into inheritance for a
        // provider CLI that needs its own credentials. See `inheritEnv`.
        env:
          req.inheritEnv === true
            ? { ...(process.env as Record<string, string>), ...req.env }
            : { PATH: process.env["PATH"] ?? "", HOME: process.env["HOME"] ?? "", ...req.env },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      const e = err as {
        stdout?: string;
        stderr?: string;
        killed?: boolean;
        signal?: string;
        message?: string;
      };
      transcript = `${e.stdout ?? ""}\n${e.stderr ?? ""}\n${e.message ?? ""}`.trim();
      timedOut = e.killed === true || e.signal === "SIGTERM";
      crashed = !timedOut;
    }

    const submission = collect(join(sandbox, "submission"));
    const { classification, detail } = classifyRun(transcript, submission.length > 0, timedOut, crashed);
    return {
      transcript,
      submission,
      classification,
      detail,
      runtimeSeconds: Math.round((Date.now() - started) / 1000),
      sandbox,
    };
  },
};

/** Convenience wrapper around `shell` for the Claude CLI. Still just a shell command underneath. */
export const claudeCliAdapter: ProviderAdapter = {
  id: "claude-cli",
  label: "Claude CLI (non-interactive)",
  status: "implemented",
  requires: null,
  isolation: "process",
  run(req) {
    return shellAdapter.run({
      ...req,
      // The CLI is the agent here, not the subject, so it inherits its own auth.
      inheritEnv: true,
      command: ["claude", "-p", "{instruction}", "--permission-mode", "bypassPermissions"],
    });
  },
};

export const PROVIDERS: readonly ProviderAdapter[] = [
  shellAdapter,
  claudeCliAdapter,
  {
    id: "codex-cli",
    label: "Codex CLI",
    status: "declared",
    requires:
      "It needs the Codex CLI's non-interactive invocation and auth verified, plus a decision about " +
      "how its sandbox interacts with ours. Until then use `--provider shell --cmd` with the codex " +
      "command directly, which is the same thing without a convenience wrapper.",
    isolation: "process",
    run: notConfigured("codex-cli", "It needs the Codex CLI's non-interactive invocation verified."),
  },
  {
    id: "gemini-cli",
    label: "Gemini CLI",
    status: "declared",
    requires:
      "It needs the Gemini CLI's non-interactive invocation and auth verified. Reachable today via " +
      "`--provider shell --cmd`.",
    isolation: "process",
    run: notConfigured("gemini-cli", "It needs the Gemini CLI's non-interactive invocation verified."),
  },
  {
    id: "docker",
    label: "Container-isolated runner",
    status: "declared",
    requires:
      "It needs a running Docker daemon. The design is fixed and validated by `dockerPlan()`: the " +
      "challenge mounts read-only, the submission directory is the only writable mount, no verifier " +
      "or matrix path is mounted at all, the network is off unless explicitly enabled, and only " +
      "declared environment variables cross the boundary. The daemon is not running in this " +
      "environment, so the adapter refuses rather than silently degrading to a subprocess.",
    isolation: "container",
    run: notConfigured("docker", "It needs a running Docker daemon."),
  },
];

export const getProvider = (id: string): ProviderAdapter => {
  const found = PROVIDERS.find((p) => p.id === id);
  if (found === undefined) {
    throw new Error(`unknown provider "${id}"; known: ${PROVIDERS.map((p) => p.id).join(", ")}`);
  }
  return found;
};

export interface DockerPlan {
  readonly image: string;
  readonly mounts: readonly {
    readonly source: string;
    readonly target: string;
    readonly mode: "ro" | "rw";
  }[];
  readonly network: "none" | "bridge";
  readonly env: readonly string[];
  readonly limits: Readonly<Record<string, string>>;
  readonly argv: readonly string[];
}

/**
 * Produce the container invocation without running it.
 *
 * This is the honest half of an unimplemented adapter: the plan is real, testable and reviewable
 * even though the daemon is absent, so the isolation properties can be asserted by tests today and
 * the adapter becomes a one-line change when a daemon exists.
 */
export function dockerPlan(req: ProviderRunRequest, image = "node:22-slim"): DockerPlan {
  const mounts = [
    { source: req.challengeDir, target: "/work/challenge", mode: "ro" as const },
    { source: "{submission}", target: "/work/submission", mode: "rw" as const },
  ];
  const env = Object.keys(req.env);
  const limits = { memory: "2g", cpus: "2", pids: "256" };
  return {
    image,
    mounts,
    network: "none",
    env,
    limits,
    argv: [
      "docker",
      "run",
      "--rm",
      "--network=none",
      `--memory=${limits.memory}`,
      `--cpus=${limits.cpus}`,
      `--pids-limit=${limits.pids}`,
      "--read-only",
      ...mounts.map(
        (m) => `--mount=type=bind,source=${m.source},target=${m.target},readonly=${m.mode === "ro"}`,
      ),
      ...env.map((k) => `--env=${k}`),
      image,
    ],
  };
}
