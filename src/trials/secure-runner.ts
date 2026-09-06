// Container grading with an authority-owned operation ledger. The authority imports the family
// adapter; a uid-1000 child imports the submitted code. Only public views and facade responses cross
// into that child. No hidden scenario or signing key does. Subject messages are operation requests
// or untrusted reports, never evidence entries. Grader errors are not model-capability results.

import { execFileSync } from "node:child_process";
import {
  constants,
  closeSync,
  existsSync,
  fstatSync,
  openSync,
  readFileSync,
  readSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { CONTAINER_IMAGE, containerRuntimeReadiness } from "../adversarial-audit/isolation.js";
import { assertCurrentAuthorityBundle } from "./authority-build.js";
import {
  CONTAINER_LIMITS,
  type ContainerLimits,
  containerFlags,
  containerName,
  forceRemove,
  stageFile,
  stagingDir,
} from "./runners.js";

const secureScriptDir = (): string => {
  const candidates = [
    join(process.cwd(), "scripts", "secure"),
    join(process.cwd(), "..", "scripts", "secure"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0] ?? "scripts/secure";
};

export interface SecureHostOptions {
  /** Absolute path to the untrusted submitted ES module. */
  readonly modulePath: string;
  /** Family id; dispatches inside the private compiled operation-authority bundle. */
  readonly familyId: string;
  readonly image?: string;
  readonly limits?: ContainerLimits;
  readonly timeoutMs?: number;
}

export interface SecureHostResult {
  readonly execution?: {
    readonly expectedAttempts: number;
    readonly reportedAttempts: number;
    readonly completed: boolean;
    readonly requests: number;
    readonly requestBytes: number;
    readonly responseBytes: number;
    readonly diagnosticBytes: number;
  };
  readonly channels: Readonly<Record<string, readonly unknown[]>>;
  readonly report: unknown;
  readonly diagnostics: { readonly stdoutTail: string; readonly stderrTail: string };
  readonly error: string | null;
  readonly errorKind?: "setup" | "protocol" | "resource" | "artifact" | null;
}

/** Families with a shipped authority-side adapter. Anything else has no secure route yet. */
export const SECURELY_MIGRATED_FAMILIES: readonly string[] = [
  "prompt-injection-memory-poisoning",
  "caa-revalidation",
  "prompt-injection-containment",
  "ui-action-record-replay",
  "ui-replay-live-dom",
  "access-token-scope-expansion",
  "delegated-wallet-scope-reconciliation",
  "deployment-model-alias-rollout-drift",
  "dao-descendant",
  "trading-reconciliation-recompute",
  "deployment-rollback-recompute",
  "checker-required-memory-poisoning",
];

/** One private, self-contained adapter bundle; no family-specific script fallback. */
const adapterScriptFor = (): string =>
  join(secureScriptDir(), "..", "..", "dist", "trials", "operation-authority.js");

/** Capture a bounded regular artifact once, without following its final symlink or blocking on a
 * FIFO. The child sees only these captured bytes, not a mutable source path. */
export function stageSubmissionArtifact(source: string, target: string): void {
  const fd = openSync(source, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > 8 * 1024 * 1024)
      throw Error("submission must be a regular module at most 8 MiB");
    const bytes = Buffer.alloc(Math.min(stat.size + 1, 8 * 1024 * 1024 + 1));
    let offset = 0;
    while (offset < bytes.length) {
      const count = readSync(fd, bytes, offset, bytes.length - offset, null);
      if (!count) break;
      offset += count;
    }
    if (offset !== stat.size || fstatSync(fd).size !== stat.size)
      throw Error("submission changed during capture");
    writeFileSync(target, bytes.subarray(0, offset), { mode: 0o644, flag: "wx" });
  } finally {
    closeSync(fd);
  }
}

/**
 * Run a family's secure adapter in a no-network container, with the submission and the ledger-owning
 * authority in separate OS processes. Never falls back to a weaker path: if the container cannot
 * start, or the authority process reports a protocol violation, the result carries `error` and the
 * caller must treat it exactly like a host failure — never a pass.
 */
export function runSecureContainerHost(options: SecureHostOptions, payload: unknown): SecureHostResult {
  const image = options.image ?? CONTAINER_IMAGE;
  const limits = options.limits ?? CONTAINER_LIMITS;
  const timeout = options.timeoutMs ?? limits.wallClockMs;
  const adapterScript = adapterScriptFor();
  const empty = { stdoutTail: "", stderrTail: "" };
  if (!SECURELY_MIGRATED_FAMILIES.includes(options.familyId) || !existsSync(adapterScript)) {
    return {
      channels: {},
      report: null,
      diagnostics: empty,
      error: `no built secure adapter for family "${options.familyId}"; run pnpm build`,
      errorKind: "setup",
    };
  }
  const readiness = containerRuntimeReadiness();
  if (!readiness.available) {
    return {
      channels: {},
      report: null,
      diagnostics: empty,
      error: `container runtime unavailable: ${readiness.detail}`,
      errorKind: "setup",
    };
  }
  const name = containerName("secure-host");
  const stage = stagingDir("foundry-secure-host-");
  const scriptDir = secureScriptDir();
  try {
    const adapterSource = readFileSync(adapterScript, "utf8");
    assertCurrentAuthorityBundle(join(scriptDir, "..", ".."), adapterSource);
    stageFile(join(scriptDir, "authority-entry.mjs"), join(stage, "authority-entry.mjs"));
    stageFile(join(scriptDir, "authority-engine.mjs"), join(stage, "authority-engine.mjs"));
    stageFile(join(scriptDir, "cell-entry.mjs"), join(stage, "cell-entry.mjs"));
    stageFile(join(scriptDir, "protocol.mjs"), join(stage, "protocol.mjs"));
    stageSubmissionArtifact(options.modulePath, join(stage, "subject.mjs"));
    if (options.familyId === "checker-required-memory-poisoning") {
      stageSubmissionArtifact(join(dirname(options.modulePath), "checker.mjs"), join(stage, "checker.mjs"));
    }
    const stdout = execFileSync(
      "docker",
      [
        // Only the authority runs as root. SETUID/SETGID launch an unprivileged child and KILL
        // permits cleanup across that UID boundary. No writable root filesystem or network is added.
        ...containerFlags(name, stage, "none", limits).filter((flag) => flag !== "--user=1000:1000"),
        "--user=0:0",
        "--cap-add=SETUID",
        "--cap-add=SETGID",
        "--cap-add=KILL",
        "--interactive",
        image,
        "node",
        "/work/authority-entry.mjs",
        "/work/cell-entry.mjs",
        "/work/subject.mjs",
      ],
      {
        input: JSON.stringify({
          adapterSource,
          input: { ...(payload as object), familyId: options.familyId },
        }),
        encoding: "utf8",
        timeout,
        maxBuffer: 64 * 1024 * 1024,
        env: { PATH: process.env["PATH"] ?? "", HOME: process.env["HOME"] ?? "" },
      },
    );
    const parsed: unknown = JSON.parse(stdout);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        channels: {},
        report: null,
        diagnostics: empty,
        error: "secure host returned non-object JSON",
        errorKind: "protocol",
      };
    }
    const rec = parsed as Record<string, unknown>;
    const execution = rec["execution"] as Record<string, unknown> | undefined;
    if (
      !(rec["error"] === null || typeof rec["error"] === "string") ||
      rec["channels"] === null ||
      typeof rec["channels"] !== "object" ||
      Array.isArray(rec["channels"]) ||
      !Object.values(rec["channels"] as object).every(Array.isArray) ||
      !("report" in rec) ||
      (rec["error"] === null &&
        (!execution ||
          execution["completed"] !== true ||
          execution["reportedAttempts"] !== execution["expectedAttempts"] ||
          ![
            "expectedAttempts",
            "reportedAttempts",
            "requests",
            "requestBytes",
            "responseBytes",
            "diagnosticBytes",
          ].every((k) => Number.isSafeInteger(execution[k]) && (execution[k] as number) >= 0)))
    ) {
      return {
        channels: {},
        report: null,
        diagnostics: empty,
        error: "secure host returned incomplete result envelope",
        errorKind: "protocol",
      };
    }
    return {
      channels: (rec["channels"] as Record<string, readonly unknown[]>) ?? {},
      ...(execution ? { execution: execution as unknown as NonNullable<SecureHostResult["execution"]> } : {}),
      errorKind:
        rec["error"] === null
          ? null
          : ["protocol", "resource", "artifact"].includes(String(rec["errorKind"]))
            ? (rec["errorKind"] as "protocol" | "resource" | "artifact")
            : "setup",
      report: rec["report"] ?? null,
      diagnostics: (rec["diagnostics"] as { stdoutTail: string; stderrTail: string }) ?? empty,
      error: typeof rec["error"] === "string" ? rec["error"] : null,
    };
  } catch (err) {
    forceRemove(name);
    return {
      channels: {},
      report: null,
      diagnostics: empty,
      error: `secure container host failed: ${(err as Error).message.slice(0, 300)}`,
      errorKind: (err as NodeJS.ErrnoException).code === "ETIMEDOUT" ? "resource" : "artifact",
    };
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}
