#!/usr/bin/env node
// The authority: trusted, family-agnostic, and NEVER imports submission code.
//
// This process is the container's entrypoint. It reads the scenario payload from its own stdin
// (exactly the contract `runJsonContainerHost` already used), stages that payload where the cell can
// read it, then spawns the cell as a separate child process holding a fresh per-run signing secret
// that is handed to the cell only through an environment variable and is never written anywhere else.
//
// Every event the cell reports arrives as a signed frame on fd 3, which this process verifies before
// trusting anything in it — an unsigned, malformed, replayed, oversized or excess frame is a protocol
// violation, and a protocol violation fails the whole run closed rather than grading a partial result.
// The cell's real stdout/stderr are captured only as truncated diagnostics; they are never parsed.
//
// This file has no per-family knowledge. It groups "call" frames by the `channel` name the family
// adapter chose (e.g. "ledger", "writes", "queries") and hands back `{channels, report, diagnostics,
// error}`. The TypeScript caller maps `channels` onto the exact shape each family's verifier expects.

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FRAME_KINDS, MAX_FRAMES, MAX_TOTAL_BYTES, makeVerifier } from "./protocol.mjs";

const DEFAULT_TIMEOUT_MS = 45_000;
const DIAGNOSTIC_CAP_BYTES = 8192;

const [cellScriptPath, modulePath, adapterPath] = process.argv.slice(2);

const finish = (result) => {
  process.stdout.write(JSON.stringify(result));
  process.exit(0);
};

if (!cellScriptPath || !modulePath || !adapterPath) {
  finish({ error: "authority invoked without cellScriptPath, modulePath and adapterPath" });
}

let stdinRaw;
try {
  stdinRaw = readFileSync(0, "utf8");
} catch (err) {
  finish({ error: `authority could not read stdin: ${String(err?.message ?? err)}` });
}

let payload;
try {
  payload = JSON.parse(stdinRaw);
} catch (err) {
  finish({ error: `authority stdin was not valid JSON: ${String(err?.message ?? err)}` });
}

const workDir = mkdtempSync(join(tmpdir(), "foundry-cell-"));
const payloadPath = join(workDir, "payload.json");
writeFileSync(payloadPath, JSON.stringify(payload), { encoding: "utf8", mode: 0o600 });

const secret = randomBytes(32).toString("hex");
const verifier = makeVerifier(secret);

const child = spawn(process.execPath, [cellScriptPath, modulePath, adapterPath, payloadPath], {
  stdio: ["ignore", "pipe", "pipe", "pipe"],
  env: { RPC_SECRET: secret },
  detached: true,
});

const channels = new Map();
let report = null;
let reportSeen = false;
let doneSeen = false;
let crash = null;
let violation = null;
let totalBytes = 0;
let frameCount = 0;
let fd3Buffer = "";
let stdoutTail = "";
let stderrTail = "";

const recordDiagnostic = (buf, current) => (current + buf.toString("utf8")).slice(-DIAGNOSTIC_CAP_BYTES);

const killChild = () => {
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    /* already gone */
  }
};

const noteViolation = (reason) => {
  if (violation === null) violation = reason;
  killChild();
};

child.stdout.on("data", (buf) => {
  stdoutTail = recordDiagnostic(buf, stdoutTail);
});
child.stderr.on("data", (buf) => {
  stderrTail = recordDiagnostic(buf, stderrTail);
});

child.stdio[3].on("data", (buf) => {
  if (violation !== null) return; // already failing closed; ignore further bytes
  totalBytes += buf.length;
  if (totalBytes > MAX_TOTAL_BYTES) {
    noteViolation(`cell event channel exceeded ${MAX_TOTAL_BYTES} total bytes`);
    return;
  }
  fd3Buffer += buf.toString("utf8");
  let idx;
  // eslint-disable-next-line no-cond-assign
  while ((idx = fd3Buffer.indexOf("\n")) >= 0) {
    const line = fd3Buffer.slice(0, idx);
    fd3Buffer = fd3Buffer.slice(idx + 1);
    if (line.length === 0) continue;
    frameCount += 1;
    if (frameCount > MAX_FRAMES) {
      noteViolation(`cell emitted more than ${MAX_FRAMES} frames`);
      return;
    }
    const verdict = verifier.verifyLine(line);
    if (!verdict.ok) {
      noteViolation(`unverifiable frame: ${verdict.reason}`);
      return;
    }
    const { kind, payload: framePayload } = verdict.frame;
    if (kind === FRAME_KINDS.CALL) {
      const channel = framePayload && typeof framePayload.channel === "string" ? framePayload.channel : null;
      if (channel === null || !("entry" in (framePayload ?? {}))) {
        noteViolation("call frame missing channel/entry");
        return;
      }
      if (!channels.has(channel)) channels.set(channel, []);
      channels.get(channel).push(framePayload.entry);
    } else if (kind === FRAME_KINDS.REPORT) {
      if (reportSeen) {
        noteViolation("more than one report frame");
        return;
      }
      reportSeen = true;
      report = framePayload;
    } else if (kind === FRAME_KINDS.DONE) {
      doneSeen = true;
    } else if (kind === FRAME_KINDS.CRASH) {
      crash =
        framePayload && typeof framePayload.message === "string" ? framePayload.message : "cell crashed";
    } else {
      noteViolation(`unknown frame kind: ${kind}`);
      return;
    }
  }
});

const timer = setTimeout(
  () => {
    noteViolation(`cell exceeded wall-clock timeout of ${DEFAULT_TIMEOUT_MS}ms`);
  },
  Number(process.env.CELL_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS),
);

child.on("error", (err) => {
  noteViolation(`cell process failed to start: ${String(err?.message ?? err)}`);
});

child.on("exit", (code, signal) => {
  clearTimeout(timer);
  rmSync(workDir, { recursive: true, force: true });
  const channelsOut = Object.fromEntries(channels);
  if (violation !== null) {
    finish({ channels: channelsOut, report, diagnostics: { stdoutTail, stderrTail }, error: violation });
  }
  if (crash !== null) {
    finish({
      channels: channelsOut,
      report,
      diagnostics: { stdoutTail, stderrTail },
      error: `subject threw: ${crash}`,
    });
  }
  if (!doneSeen) {
    finish({
      channels: channelsOut,
      report,
      diagnostics: { stdoutTail, stderrTail },
      error: `cell exited (code=${code}, signal=${signal}) without signalling completion`,
    });
  }
  finish({ channels: channelsOut, report, diagnostics: { stdoutTail, stderrTail }, error: null });
});
