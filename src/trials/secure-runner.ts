// Container grading with an authority-owned operation ledger. The authority imports the family
// adapter; a uid-1000 child imports the submitted code. Only public views and facade responses cross
// into that child. No hidden scenario or signing key does. Subject messages are operation requests
// or untrusted reports, never evidence entries. Grader errors are not model-capability results.

import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { CONTAINER_IMAGE, containerRuntimeReadiness } from "../adversarial-audit/isolation.js";
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
  /** Family id; resolves to `scripts/secure/adapters/<familyId>.mjs`. */
  readonly familyId: string;
  readonly image?: string;
  readonly limits?: ContainerLimits;
  readonly timeoutMs?: number;
}

export interface SecureHostResult {
  readonly channels: Readonly<Record<string, readonly unknown[]>>;
  readonly report: unknown;
  readonly diagnostics: { readonly stdoutTail: string; readonly stderrTail: string };
  readonly error: string | null;
}

/** Families with a shipped authority-side adapter. Anything else has no secure route yet. */
export const SECURELY_MIGRATED_FAMILIES: readonly string[] = [
  "prompt-injection-memory-poisoning",
  "caa-revalidation",
];

/**
 * Family id -> adapter filename. Kept explicit rather than assumed equal to the family id, because
 * this family's source directory (`src/families/memory-poisoning/`) already uses a shorter name than
 * its routed family id (`prompt-injection-memory-poisoning`) and silently assuming they match is
 * exactly the kind of drift `hostPath()` in `router.ts` was written to avoid for host scripts.
 */
const ADAPTER_FILENAMES: Readonly<Record<string, string>> = {
  "prompt-injection-memory-poisoning": "memory-poisoning.mjs",
  "caa-revalidation": "caa-revalidation.mjs",
};

const adapterScriptFor = (familyId: string): string =>
  join(secureScriptDir(), "adapters", ADAPTER_FILENAMES[familyId] ?? `${familyId}.mjs`);

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
  const adapterScript = adapterScriptFor(options.familyId);
  const empty = { stdoutTail: "", stderrTail: "" };
  if (!existsSync(adapterScript)) {
    return {
      channels: {},
      report: null,
      diagnostics: empty,
      error: `no secure adapter shipped for family "${options.familyId}"`,
    };
  }
  const readiness = containerRuntimeReadiness();
  if (!readiness.available) {
    return {
      channels: {},
      report: null,
      diagnostics: empty,
      error: `container runtime unavailable: ${readiness.detail}`,
    };
  }
  const name = containerName("secure-host");
  const stage = stagingDir("foundry-secure-host-");
  const scriptDir = secureScriptDir();
  try {
    stageFile(join(scriptDir, "authority-entry.mjs"), join(stage, "authority-entry.mjs"));
    stageFile(join(scriptDir, "cell-entry.mjs"), join(stage, "cell-entry.mjs"));
    stageFile(join(scriptDir, "protocol.mjs"), join(stage, "protocol.mjs"));
    stageFile(adapterScript, join(stage, "adapter.mjs"));
    stageFile(options.modulePath, join(stage, "subject.mjs"));
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
        "/work/adapter.mjs",
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
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        channels: {},
        report: null,
        diagnostics: empty,
        error: "secure host returned non-object JSON",
      };
    }
    const rec = parsed as Record<string, unknown>;
    if (
      !(rec["error"] === null || typeof rec["error"] === "string") ||
      rec["channels"] === null ||
      typeof rec["channels"] !== "object" ||
      Array.isArray(rec["channels"]) ||
      !Object.values(rec["channels"] as object).every(Array.isArray) ||
      !("report" in rec)
    ) {
      return {
        channels: {},
        report: null,
        diagnostics: empty,
        error: "secure host returned incomplete result envelope",
      };
    }
    return {
      channels: (rec["channels"] as Record<string, readonly unknown[]>) ?? {},
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
    };
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}
