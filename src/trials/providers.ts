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
import type { TrialUsage } from "./types.js";

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

/**
 * How much of the run was preserved.
 *
 * `thin` — the agent's final message only. Every trial captured before Phase 7 is thin, because the
 * provider commands requested `--output-format json` (one closing object) and only the graded
 * `submission/` directory was collected. Self-check coverage is NOT computable on a thin trial: the
 * transcript records the agent asserting it verified its work, and contains no evidence either way.
 *
 * `full` — streamed per-event trajectory plus every file the agent wrote outside the graded
 * directory.
 *
 * This is recorded rather than inferred, and it is deliberately NOT part of the verifier hash.
 * `HARNESS_PATHS` excludes `providers.ts` on the stated grounds that how the agent is invoked
 * "changes neither what the model saw nor how its artifact was graded", and that holds here: grading
 * still reads `submission/` and the model still sees the same instruction. Rotating the hash would
 * invalidate the grading of thirty counted trials over a change that touches no grading, which is
 * the exact failure mode that comment warns produces a hash people learn to ignore.
 */
export type CaptureLevel = "thin" | "full";

export interface ProviderRunResult {
  readonly transcript: string;
  readonly submission: readonly { readonly path: string; readonly content: string }[];
  /** Everything the agent wrote outside `challenge/` and `submission/`: its scratch and its tests. */
  readonly workspace: readonly { readonly path: string; readonly content: string }[];
  readonly captureLevel: CaptureLevel;
  /** Classified before any judgement about whether the run counts. */
  readonly classification: "completed" | "refused" | "timeout" | "infrastructure_error" | "crashed";
  readonly detail: string;
  readonly runtimeSeconds: number;
  readonly sandbox: string;
  /** Read out of the CLI's own end-of-run report. Null when it reported none. */
  readonly usage: TrialUsage | null;
  /** The argv template actually executed, including any usage-reporting flag added to it. */
  readonly command: readonly string[];
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

  // A provider that could not authenticate is INFRASTRUCTURE, not a crash and certainly not a
  // failure. The distinction arrived with the first cross-provider campaign: the Gemini CLI exited
  // non-zero in three seconds with `IneligibleTierError` — an account-tier problem, nothing to do
  // with the task — and "crashed" would have filed it beside a model whose code threw.
  const lower = transcript.toLowerCase();
  const authMarker = AUTH_MARKERS.find((m) => lower.includes(m));
  if (authMarker !== undefined) {
    return {
      classification: "infrastructure_error",
      detail: `provider could not authenticate or is not entitled ("${authMarker}"); no attempt was made`,
    };
  }
  if (crashed)
    return { classification: "crashed", detail: "runner exited non-zero and produced no artifact" };
  const marker = REFUSAL_MARKERS.find((m) => lower.includes(m));
  if (marker !== undefined) {
    return {
      classification: "refused",
      detail: `no artifact and the transcript matches a refusal marker ("${marker}")`,
    };
  }
  return { classification: "infrastructure_error", detail: "no artifact and no refusal signal" };
}

/**
 * Transcript markers that mean the provider never got as far as the task.
 *
 * Deliberately about ENTITLEMENT and CREDENTIALS rather than about errors in general: a model whose
 * own code throws is a different thing from a CLI that could not log in, and only the second is
 * infrastructure. Every marker here was observed in a real transcript.
 */
export const AUTH_MARKERS: readonly string[] = [
  "not logged in",
  "ineligibletiererror",
  "error authenticating",
  "no longer supported for",
  "authentication failed",
  "invalid api key",
  "unauthorized",
  "please run `login`",
  "please login",
  "quota exceeded",
  "rate limit exceeded",
];

/**
 * Read a provider CLI's own usage report out of its output.
 *
 * Both formats below are quoted from preserved transcripts in `trials/`, not from documentation.
 *
 *   Codex   `trials/durable-approval-outbox/cc267-codex-1/transcript.txt`, last JSONL line:
 *           {"type":"turn.completed","usage":{"input_tokens":4311721,"cached_input_tokens":4165376,
 *            "cache_write_input_tokens":0,"output_tokens":62134,"reasoning_output_tokens":35512}}
 *           `input_tokens` is the total with `cached_input_tokens` inside it, and there is NO price
 *           anywhere in the stream — hence `costUsd: null` and a source string that says so.
 *
 *   Claude  `trials/durable-approval-outbox/cc267-claude-1/transcript.txt`, the `result` event:
 *           {"type":"result",...,"total_cost_usd":13.805058500000003,"usage":{"input_tokens":182,
 *            "cache_creation_input_tokens":222912,"cache_read_input_tokens":15184357,
 *            "output_tokens":159314,...}}
 *           Here the three input figures are disjoint, so the billed input is their sum.
 *
 * Scanning every line and keeping the LAST match handles both `--output-format json` (one object)
 * and `--output-format stream-json` / `codex exec --json` (an event per line) without caring which
 * one the caller asked for.
 */
export function parseProviderUsage(transcript: string): TrialUsage | null {
  const tok = (u: Record<string, unknown>, k: string): number => (typeof u[k] === "number" ? u[k] : 0);
  let found: TrialUsage | null = null;
  for (const line of transcript.split("\n")) {
    const text = line.trim();
    if (!text.startsWith("{") || !text.endsWith("}")) continue;
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(text) as Record<string, unknown>;
    } catch {
      continue;
    }
    const usage = event["usage"];
    if (typeof usage !== "object" || usage === null || Array.isArray(usage)) continue;
    const u = usage as Record<string, unknown>;
    if (event["type"] === "turn.completed") {
      found = {
        inputTokens: tok(u, "input_tokens"),
        cachedInputTokens: tok(u, "cached_input_tokens"),
        outputTokens: tok(u, "output_tokens"),
        costUsd: null,
        source: "codex `turn.completed` usage; the Codex CLI reports tokens and never a price",
      };
    } else if (event["type"] === "result") {
      const cached = tok(u, "cache_read_input_tokens");
      found = {
        inputTokens: tok(u, "input_tokens") + cached + tok(u, "cache_creation_input_tokens"),
        cachedInputTokens: cached,
        outputTokens: tok(u, "output_tokens"),
        costUsd: typeof event["total_cost_usd"] === "number" ? event["total_cost_usd"] : null,
        source: "claude `result` event `usage` and `total_cost_usd`",
      };
    }
  }
  return found;
}

/**
 * Ask a provider CLI to print the usage report it otherwise keeps to itself.
 *
 * Neither CLI volunteers token counts in its human-readable mode, which is why every `costUsd` this
 * repository wrote for a run it executed itself is null: the campaigns invoke `codex exec …` and
 * `claude -p …`, and those emit prose. One flag each turns on the stream carrying `usage`. The flag
 * is added HERE rather than edited into the checked-in campaign plans, because a plan is a
 * pre-registration and quietly rewriting one is the move `reconcile` exists to catch — and the
 * augmented argv comes back on the result, so the metadata records what ran, not what was planned.
 */
export function withUsageReporting(argv: readonly string[]): readonly string[] {
  const bin = (argv[0] ?? "").split("/").pop();
  if (bin === "codex" && argv[1] === "exec" && !argv.includes("--json")) {
    return [argv[0] as string, "exec", "--json", ...argv.slice(2)];
  }
  const printing = argv.includes("-p") || argv.includes("--print");
  if (bin === "claude" && printing && !argv.includes("--output-format")) {
    // `stream-json`, not `json`, and the difference is the whole of Phase 7's Lane B.
    //
    // `--output-format json` emits ONE object: the final result. That is enough to parse usage and
    // nothing else. Measured across this repository's own trials, it produced transcripts of 248
    // BYTES to 3.8KB -- the agent's closing message and no more -- while the six imported outbox
    // trials, captured elsewhere with a streaming format, are 180KB to 1.7MB of per-event JSONL.
    //
    // That gap is why "did the agent write a checker, and did its checker run green over a failing
    // submission?" has never been computable on a foundry-native trial. You cannot see whether an
    // agent verified its work from a transcript that contains only its claim that it did.
    //
    // `--verbose` is required: the CLI refuses `stream-json` with `-p` without it. `parseProviderUsage`
    // already reads both shapes -- it scans every line and keeps the last match -- so this is
    // backward compatible with every transcript already on disk.
    return [argv[0] as string, "--output-format", "stream-json", "--verbose", ...argv.slice(1)];
  }
  return argv;
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

/** Every file under a directory, path-relative and read as text. Missing directory means no files. */
export const readFileTree = (dir: string, rel = ""): { path: string; content: string }[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? readFileTree(join(dir, e.name), `${rel}${e.name}/`)
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

    const template = withUsageReporting(req.command);
    const argv = template.map((a) =>
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

    const submission = readFileTree(join(sandbox, "submission"));
    // Everything the agent wrote OUTSIDE the graded directory: scratch files, its own tests, the
    // fuzzers and checkers that decide whether it caught its own mistake.
    //
    // Until Phase 7 only `submission/` was collected, so an agent's verification work survived only
    // if it happened to write it inside the graded directory. Across 30 trials exactly four files
    // did -- `ui-sonnet-1/_test_harness.mjs`, `_test_edge.mjs`, `pic-sonnet-1/_test.mjs` -- and they
    // survived by accident of where the agent chose to put them, not by design.
    //
    // `challenge/` is excluded because it is already preserved and content-hashed; re-collecting it
    // would double every trial record with bytes that are known not to have changed.
    const workspace = readFileTree(sandbox).filter(
      (f) => !f.path.startsWith("challenge/") && !f.path.startsWith("submission/"),
    );
    const { classification, detail } = classifyRun(transcript, submission.length > 0, timedOut, crashed);
    return {
      transcript,
      submission,
      workspace,
      // Thin trials stay thin. A trial captured before Phase 7 has the agent's closing message and
      // nothing else, and no amount of later processing can recover a trajectory that was never
      // written down. Consumers of the self-check metric must be able to tell the two apart, so this
      // is recorded per run rather than inferred from a transcript's size.
      captureLevel: "full",
      classification,
      detail,
      runtimeSeconds: Math.round((Date.now() - started) / 1000),
      sandbox,
      // Parsed even on a timeout or a crash: a run that burned tokens and produced nothing still cost
      // money, and dropping its usage is how a budget ends up smaller than the bill.
      usage: parseProviderUsage(transcript),
      command: template,
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
