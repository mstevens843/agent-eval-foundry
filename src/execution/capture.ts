import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import { join } from "node:path";
import { finished } from "node:stream/promises";
import { parseProviderUsage } from "../trials/providers.js";

export interface CaptureResult {
  status:
    | "completed"
    | "timeout"
    | "cancelled"
    | "output-limit"
    | "malformed-events"
    | "process-error"
    | "capture-error";
  exitCode: number | null;
  signal: string | null;
  bytesSeen: number;
  bytesRetained: number;
  eventCount: number;
  stdoutTail: string;
  stderrTail: string;
  milliseconds: number;
  truncated: boolean;
  lastUsage: unknown;
  error: string | null;
}
/** Streaming subprocess primitive for trusted adapters/tools. Not a provider-dispatch API.
 * Total retained stdout+stderr+events is bounded; only short tails and one JSON line stay in RAM. */
export async function captureProcess(
  command: string,
  args: readonly string[],
  options: {
    directory: string;
    timeoutMs: number;
    maxBytes: number;
    env: Record<string, string>;
    cwd?: string;
    input?: string;
    signal?: AbortSignal;
    jsonEvents?: boolean;
    cleanup?: () => Promise<void>;
    onEvent?: (event: Record<string, unknown>) => void;
  },
): Promise<CaptureResult> {
  if (
    ![options.timeoutMs, options.maxBytes].every((n) => Number.isSafeInteger(n) && n > 0) ||
    (options.input && Buffer.byteLength(options.input) > 16 * 1024 * 1024)
  )
    throw Error("CAPTURE_LIMIT_INVALID");
  mkdirSync(options.directory, { recursive: true, mode: 0o700 });
  const streams = {
    stdout: createWriteStream(join(options.directory, "stdout.log"), { flags: "wx", mode: 0o600 }),
    stderr: createWriteStream(join(options.directory, "stderr.log"), { flags: "wx", mode: 0o600 }),
    events: createWriteStream(join(options.directory, "events.jsonl"), { flags: "wx", mode: 0o600 }),
  };
  const pending = Object.values(streams).map((s) => finished(s).catch((e: unknown) => e));
  const start = Date.now();
  const result: CaptureResult = {
    status: "completed",
    exitCode: null,
    signal: null,
    bytesSeen: 0,
    bytesRetained: 0,
    eventCount: 0,
    stdoutTail: "",
    stderrTail: "",
    milliseconds: 0,
    truncated: false,
    lastUsage: null,
    error: null,
  };
  const child = spawn(command, [...args], {
    cwd: options.cwd,
    env: options.env,
    stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    detached: true,
  });
  const kill = () => {
    try {
      if (child.pid) process.kill(-child.pid, "SIGKILL");
    } catch {
      /* already gone */
    }
  };
  const fail = (status: CaptureResult["status"], error: string) => {
    if (result.status === "completed") {
      result.status = status;
      result.error = error;
    }
    kill();
  };
  for (const s of Object.values(streams)) s.on("error", (e) => fail("capture-error", String(e)));
  child.on("error", (e) => fail("process-error", String(e)));
  child.stdin?.on("error", (e) => fail("process-error", String(e)));
  let line = Buffer.alloc(0);
  const write = (stream: keyof typeof streams, bytes: Buffer): boolean => {
    const room = options.maxBytes - result.bytesRetained;
    const retained = bytes.subarray(0, Math.max(0, room));
    result.bytesRetained += retained.length;
    const ready = streams[stream].write(retained);
    if (retained.length < bytes.length) {
      result.truncated = true;
      fail("output-limit", "combined stdout/stderr/event byte quota exceeded");
    }
    return ready;
  };
  const eventLine = (bytes: Buffer) => {
    if (!bytes.length || result.status !== "completed") return;
    try {
      if (bytes.length > 65536) throw Error("event line limit");
      const e: unknown = JSON.parse(bytes.toString("utf8"));
      if (
        !e ||
        typeof e !== "object" ||
        Array.isArray(e) ||
        typeof (e as { type?: unknown }).type !== "string"
      )
        throw Error("event must be a typed object");
      const event = e as Record<string, unknown>;
      result.eventCount++;
      if (event.type === "usage") result.lastUsage = event.usage ?? null;
      if (event.type === "turn.completed" || event.type === "result")
        result.lastUsage = parseProviderUsage(bytes.toString("utf8")) ?? result.lastUsage;
      if (!write("events", Buffer.concat([bytes, Buffer.from("\n")]))) {
        child.stdout?.pause();
        streams.events.once("drain", () => child.stdout?.resume());
      }
      options.onEvent?.(event);
    } catch (e) {
      fail("malformed-events", String(e));
    }
  };
  for (const stream of ["stdout", "stderr"] as const)
    child[stream]?.on("data", (raw: Buffer) => {
      result.bytesSeen += raw.length;
      result[stream === "stdout" ? "stdoutTail" : "stderrTail"] = (
        result[stream === "stdout" ? "stdoutTail" : "stderrTail"] + raw.toString("utf8")
      ).slice(-4096);
      if (!write(stream, raw)) {
        child[stream]?.pause();
        streams[stream].once("drain", () => child[stream]?.resume());
      }
      if (stream === "stdout" && options.jsonEvents && result.status === "completed") {
        line = Buffer.concat([line, raw]);
        let newline = line.indexOf(10);
        while (newline >= 0 && result.status === "completed") {
          eventLine(line.subarray(0, newline));
          line = line.subarray(newline + 1);
          newline = line.indexOf(10);
        }
        if (line.length > 65536) fail("malformed-events", "unterminated oversized event");
      }
    });
  const cancel = () => fail("cancelled", "explicit cancellation");
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  const timer = setTimeout(() => fail("timeout", "wall-clock quota exceeded"), options.timeoutMs);
  if (options.input !== undefined) child.stdin?.end(options.input);
  await new Promise<void>((done) =>
    child.on("close", (code, signal) => {
      result.exitCode = code;
      result.signal = signal;
      done();
    }),
  );
  clearTimeout(timer);
  options.signal?.removeEventListener("abort", cancel);
  kill();
  if (line.length && options.jsonEvents) eventLine(line);
  if (result.status === "completed" && result.exitCode !== 0) {
    result.status = "process-error";
    result.error = `exit ${result.exitCode}, signal ${result.signal}`;
  }
  try {
    await options.cleanup?.();
  } catch (e) {
    result.status = "capture-error";
    result.error = `descendant cleanup failed: ${String(e)}`;
  }
  for (const s of Object.values(streams)) s.end();
  const errors = (await Promise.all(pending)).filter(Boolean);
  if (errors.length) {
    result.status = "capture-error";
    result.error = String(errors[0]);
  }
  result.milliseconds = Date.now() - start;
  return result;
}
