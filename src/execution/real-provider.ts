import {
  chmodSync,
  closeSync,
  cpSync,
  existsSync,
  fsyncSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { verifyAssembly } from "../packages/assembly.js";
import { localProcess } from "../packages/local-process.js";
import { type PackagePolicyInput, assertPackageStage } from "../packages/policy.js";
import { refreshSnapshot, resolvePackage, sha256 } from "../packages/record.js";
import { copyArtifactTree, regularTree, writeEvidence } from "./artifacts.js";
import { startAuthoringDiagnostics } from "./authoring-diagnostics.js";
import { type CaptureResult, captureProcess } from "./capture.js";
import { driveReservedJob, executionSourceIdentity } from "./execute.js";
import { type ExecutionPackage, gradeExecutionPackage, prepareExecutionPackage } from "./package-route.js";
import {
  type ExecutionProfile,
  type Observation,
  type ProfileObservation,
  profileDigest,
} from "./profiles.js";
import type { Job, JobRequest, JobStore } from "./store.js";

/**
 * Real dispatch through the same reserved-job lifecycle the inert fixture uses
 * (`ReservedExecutionServices.dispatch`, called from `driveReservedJob`). No new
 * runner, no legacy shell bypass: this only supplies the low-level adapter the
 * lifecycle already expects, for the `real-provider` realm instead of `simulation`.
 *
 * Sandboxing mirrors `runInertAuthor`'s known-good container plan (read-only root,
 * dropped capabilities, no-new-privileges, uid 1000, tmpfs scratch, pinned image,
 * no `--pull`) with two real-dispatch-specific differences: the task workspace is
 * bind-mounted **writable** (the solver edits it in place; the inert fixture's
 * `/public` mount is read-only because it never edits anything), and the network
 * policy is `bridge` (the CLI must reach its provider's API; the inert fixture is
 * offline by construction).
 */
export type ProviderTarget = "codex" | "claude";

export interface ProviderCredential {
  readonly codex?: { readonly authJsonPath: string };
  readonly claude?: { readonly oauthTokenEnvValue: string };
}

/** Copies only the Codex OAuth credential file, never sessions/history/config. Caller deletes the
 * returned directory when done; never reused across unrelated hosts. */
export function stageCodexCredential(
  source = join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "auth.json"),
): string {
  if (!existsSync(source)) throw Error(`REAL_PROVIDER_CODEX_CREDENTIAL_MISSING:${source}`);
  const dir = mkdtempSync(join(tmpdir(), "foundry-codex-credential-"));
  chmodSync(dir, 0o700);
  cpSync(source, join(dir, "auth.json"));
  chmodSync(join(dir, "auth.json"), 0o600);
  return dir;
}

function agentCommand(
  target: ProviderTarget,
  requested: ExecutionProfile["requested"],
  instruction: string,
): string[] {
  if (target === "claude")
    return [
      "claude",
      "--model",
      requested.model.replace(/^anthropic\//, ""),
      "--effort",
      requested.effort,
      "--output-format",
      "stream-json",
      "--verbose",
      "-p",
      instruction,
      "--permission-mode",
      "bypassPermissions",
    ];
  return [
    "codex-with-credential",
    "exec",
    "--json",
    "--dangerously-bypass-approvals-and-sandbox",
    "--skip-git-repo-check",
    "-c",
    `model="${requested.model.replace(/^openai\//, "")}"`,
    "-c",
    `model_reasoning_effort="${requested.effort}"`,
    instruction,
  ];
}

/** The lower-level dispatch seam rechecks the durable fence and binding, exactly like
 * `runInertAuthor`. No arbitrary shell command or inherited host credential can substitute
 * for the pinned, sandboxed provider-agent image and its one mediated credential channel. */
export async function runRealProviderAuthor(
  store: JobStore,
  job: Job,
  profile: ExecutionProfile,
  options: {
    publicDir: string;
    directory: string;
    target: ProviderTarget;
    native: boolean;
    instruction: string;
    credential: ProviderCredential;
    submissionMaxBytes?: number;
    signal?: AbortSignal;
  },
): Promise<CaptureResult> {
  const current = store.get(job.id);
  const authority = (
    store.authorizationEvidence(current.authorization) as {
      payload: { billingMode?: string };
    }
  ).payload;
  if (authority.billingMode !== "subscription-only")
    throw Error("REAL_PROVIDER_REQUIRES_SUBSCRIPTION_AUTHORITY");
  if (
    current.realm !== "real-provider" ||
    current.state !== "dispatching" ||
    current.fence !== job.fence ||
    Date.now() >= current.leaseUntil ||
    current.profileDigest !== profileDigest(profile) ||
    profile.target !== options.target
  )
    throw Error("REAL_PROVIDER_DISPATCH_DENIED");
  const expectedStage = join(store.root, "real-provider", ".incomplete", job.id);
  if (
    resolve(options.directory) !== expectedStage ||
    resolve(options.publicDir) !== join(expectedStage, "public") ||
    [options.publicDir].some((p) => /[,\r\n]/.test(p))
  )
    throw Error("REAL_PROVIDER_WORKSPACE_BINDING");
  verifyAssembly(
    resolvePackage(join(expectedStage, "package-store"), job.packageDigest),
    options.publicDir,
    "subject",
  );
  if (profile.authoring.credentials !== "broker") throw Error("REAL_PROVIDER_CREDENTIAL_MODE");
  if (profile.authoring.network !== "bridge") throw Error("REAL_PROVIDER_NETWORK_MODE");
  const codexCredential = options.credential.codex;
  const claudeCredential = options.credential.claude;
  if ((options.target === "codex" && !codexCredential) || (options.target === "claude" && !claudeCredential))
    throw Error("REAL_PROVIDER_CREDENTIAL_MISSING");
  if (options.target === "codex") {
    if (!codexCredential) throw Error("REAL_PROVIDER_CREDENTIAL_MISSING");
    const auth = JSON.parse(readFileSync(codexCredential.authJsonPath, "utf8"));
    if (auth.auth_mode !== "chatgpt" || auth.OPENAI_API_KEY || !auth.tokens?.access_token)
      throw Error("REAL_PROVIDER_SUBSCRIPTION_CREDENTIAL_REQUIRED");
  }
  // A dispatch receipt is exclusive even if this lower-level API is somehow called twice.
  const receipt = openSync(join(options.directory, "dispatch.started"), "wx", 0o600);
  fsyncSync(receipt);
  closeSync(receipt);
  // The container writes into this bind mount directly (unlike the read-only inert fixture),
  // so the solver's uid (1000) needs write access to a tree the host process just created.
  const chmodTree = (dir: string) => {
    chmodSync(dir, 0o777);
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) chmodTree(p);
      else chmodSync(p, 0o666);
    }
  };
  chmodTree(options.publicDir);
  // `materializeAssembly`'s "subject" entries keep each package's own source-tree
  // relative paths (e.g. `environment/app/certd/...` for the native CAA task,
  // `public/entry.mjs` for the professional-multifile tasks) — not a flattened
  // `stage/public/<file>` layout. The container (and the final submission copy)
  // must use the exact subdirectory a solver is meant to treat as its workspace
  // root, not `stage/public` itself.
  const subjectRoot = options.native
    ? join(options.publicDir, "environment", "app", "certd")
    : join(options.publicDir, "public");
  const targetPath = options.native ? "/app/certd" : "/work/task";
  const name = `foundry-real-${job.id}-${job.fence.slice(0, 8)}`;
  const args = [
    "run",
    "--pull=never",
    "--name",
    name,
    "--init",
    "--read-only",
    "--network=bridge",
    `--cpus=${profile.limits.cpus}`,
    `--memory=${profile.limits.memoryMiB}m`,
    `--pids-limit=${profile.limits.pids}`,
    "--user=1000:1000",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--ulimit=core=0",
    "--env-file=/dev/null",
    "--tmpfs",
    "/tmp:rw,exec,size=512m,mode=1777",
    "--tmpfs",
    "/home/provider:rw,exec,size=256m,mode=1777",
    "--env",
    "HOME=/home/provider",
    ...(options.target === "claude"
      ? ["--env", "CLAUDE_CODE_OAUTH_TOKEN", "--env", "CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000"]
      : [
          "--mount",
          `type=bind,src=${resolve(codexCredential?.authJsonPath ?? "")},dst=/run/foundry-credential/auth.json,readonly`,
        ]),
    "--mount",
    `type=bind,src=${resolve(subjectRoot)},dst=${targetPath}`,
    "-w",
    targetPath,
    "-i",
    profile.authoring.image,
    ...agentCommand(options.target, profile.requested, options.instruction),
  ];
  writeEvidence(join(options.directory, "authoring-environment.json"), {
    schemaVersion: 1,
    container: name,
    command: [
      "docker",
      ...args.map((a) => (a === options.credential.codex?.authJsonPath ? "<redacted-credential-path>" : a)),
    ],
    requested: profile.authoring,
    limits: profile.limits,
    credentialChannel:
      options.target === "codex"
        ? "mounted-file:/run/foundry-credential/auth.json"
        : "env:CLAUDE_CODE_OAUTH_TOKEN",
    credentialValuesProvided: true,
  });
  let observedModel: Observation = {
    value: null,
    source: "no trusted runtime observation",
    status: "unobservable",
  };
  const events: Record<string, unknown>[] = [];
  const diagnostics = startAuthoringDiagnostics(name, join(options.directory, "authoring-resources.jsonl"));
  let capture: CaptureResult;
  try {
    capture = await captureProcess("docker", args, {
      directory: join(options.directory, "capture"),
      timeoutMs: profile.limits.wallMs,
      maxBytes: profile.limits.outputBytes,
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        ...(options.target === "claude" && claudeCredential
          ? { CLAUDE_CODE_OAUTH_TOKEN: claudeCredential.oauthTokenEnvValue }
          : {}),
      },
      jsonEvents: true,
      ...(options.signal ? { signal: options.signal } : {}),
      cleanup: async () => {
        const resourceDiagnostics = await diagnostics.stop();
        try {
          const inspected = await localProcess(
            "docker",
            ["inspect", "--format", '{"state":{{json .State}},"image":{{json .Image}}}', name],
            { timeoutMs: 15000, limitBytes: 65536 },
          );
          writeEvidence(join(options.directory, "authoring-runtime.json"), {
            ...JSON.parse(inspected.stdout),
            resourceDiagnostics,
          });
        } finally {
          await localProcess("docker", ["rm", "-f", name], { timeoutMs: 15000 });
        }
      },
      onEvent: (event) => {
        if (events.length < 4096) events.push(event);
        const model =
          (event as { model?: unknown }).model ??
          (event as { message?: { model?: unknown } }).message?.model ??
          (event as { session?: { model?: unknown } }).session?.model;
        if (typeof model === "string" && model.trim())
          observedModel = {
            value: model,
            source: `runtime event type=${String(event.type)}`,
            status: "observed",
          };
      },
    });
  } finally {
    await diagnostics.stop();
  }
  writeEvidence(join(options.directory, "observed-events-sample.json"), events.slice(0, 64));
  writeEvidence(join(options.directory, "observation.json"), {
    model: observedModel,
    effort: { value: null, source: "not exposed by either CLI's event stream", status: "unobservable" },
    scaffoldVersion: {
      value: null,
      source: "not exposed by either CLI's event stream",
      status: "unobservable",
    },
    fallback: null,
    evidenceClass: "real-provider",
  } satisfies ProfileObservation);
  if (capture.status !== "completed") return capture;
  const submission = join(options.directory, "submission");
  const files = regularTree(subjectRoot, options.submissionMaxBytes ?? 8 * 1024 * 1024);
  copyArtifactTree(subjectRoot, submission, options.submissionMaxBytes ?? 8 * 1024 * 1024);
  writeEvidence(join(options.directory, "submission-manifest.json"), { files: files.length });
  return capture;
}

export function providerAgentImage(kind: "native" | "portfolio"): string {
  const env =
    kind === "native" ? "FOUNDRY_PROVIDER_AGENT_NATIVE_IMAGE" : "FOUNDRY_PROVIDER_AGENT_PORTFOLIO_IMAGE";
  const value = process.env[env];
  if (!value || !/^sha256:[a-f0-9]{64}$/.test(value)) throw Error(`REAL_PROVIDER_IMAGE_UNPINNED:${env}`);
  return value;
}

export function cleanupCredentialStaging(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

export interface RealProviderContext {
  readonly store: JobStore;
  readonly package: ExecutionPackage;
  readonly profile: ExecutionProfile;
  readonly policy: PackagePolicyInput;
  readonly request: JobRequest;
  readonly authorization: string;
  readonly owner: string;
  readonly target: ProviderTarget;
  readonly instruction: string;
  readonly credential: ProviderCredential;
  readonly signal?: AbortSignal;
}

/** Real-provider counterpart to `executeSimulation`. Same reservation/binding/publication
 * discipline, same `driveReservedJob` core; only `prepare`/`dispatch` differ, and dispatch here
 * is `runRealProviderAuthor` instead of the inert fixture. Requires `trial-eligible` package
 * policy (not merely `local-valid`) and lets `driveReservedJob` itself enforce `trial-authorized`
 * for the `real-provider` realm via the active signed reservation. */
export async function executeRealProvider(context: RealProviderContext, resume?: Job) {
  const { store, package: pkg, profile, request } = context;
  refreshSnapshot(pkg.snapshot);
  if (
    request.realm !== "real-provider" ||
    request.packageDigest !== pkg.snapshot.record.digest ||
    request.profileDigest !== profileDigest(profile) ||
    profile.gradingRoute !== pkg.route ||
    profile.target !== context.target ||
    request.memoryMiB !== profile.limits.memoryMiB ||
    request.cpus !== profile.limits.cpus ||
    request.outputBytes !== profile.limits.outputBytes
  )
    throw Error("REAL_PROVIDER_PACKAGE_PROFILE_MISMATCH");
  // `context.policy` itself must already carry `snapshot` (and ideally
  // `expectedFamilyId`) — this call is a local sanity-check, not a place that fixes
  // up a caller-supplied policy missing `snapshot`. `driveReservedJob` below uses
  // `context.policy` as-is, exactly like `executeSimulation` does.
  assertPackageStage(
    { ...context.policy, snapshot: pkg.snapshot, expectedFamilyId: pkg.snapshot.record.familyId },
    "trial-eligible",
  );
  let job = resume ?? store.reserve(request, context.authorization, context.owner);
  if (
    job.id !== request.id ||
    job.packageDigest !== request.packageDigest ||
    job.profileDigest !== request.profileDigest ||
    job.realm !== "real-provider"
  )
    throw Error("REAL_PROVIDER_RESUME_BINDING");
  job = store.bindPlan(job.id, job.fence, {
    profile,
    target: context.target,
    instructionSha256: sha256(context.instruction),
  });
  return driveReservedJob(
    store,
    job,
    {
      prepare: (stage) => {
        prepareExecutionPackage(pkg, stage);
        writeEvidence(join(stage, "profile.json"), profile);
        writeEvidence(join(stage, "adapter.json"), {
          id: "real-provider-cli-v1",
          target: context.target,
          credentialChannel: context.target === "codex" ? "mounted-file" : "env-passthrough",
        });
      },
      dispatch: (current, stage) =>
        runRealProviderAuthor(store, current, profile, {
          publicDir: join(stage, "public"),
          directory: stage,
          target: context.target,
          native: pkg.native,
          instruction: context.instruction,
          credential: context.credential,
          ...(context.signal ? { signal: context.signal } : {}),
        }),
      grade: (stage) => gradeExecutionPackage(pkg, join(stage, "submission"), join(stage, "grading")),
    },
    context.policy,
  );
}
