import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import { finished } from "node:stream/promises";
import { StringDecoder } from "node:string_decoder";

export async function hashFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

/** Trusted build/validation tools, never agent CLIs. Bounded logs with explicit errors. */
export async function localProcess(
  command: string,
  args: readonly string[],
  options: {
    cwd?: string;
    timeoutMs?: number;
    limitBytes?: number;
    log?: string;
    /** Bounded host-owned input for local collectors. Never a provider prompt. */
    input?: string;
  } = {},
): Promise<{ stdout: string; stderr: string; milliseconds: number }> {
  const start = performance.now();
  const limit = options.limitBytes ?? 2 * 1024 * 1024;
  const timeout = options.timeoutMs ?? 120000;
  if (!Number.isSafeInteger(limit) || limit <= 0 || !Number.isFinite(timeout) || timeout <= 0)
    throw new Error("LOCAL_PROCESS_INVALID_LIMIT");
  if (options.input && Buffer.byteLength(options.input) > 16 * 1024 * 1024)
    throw new Error("LOCAL_PROCESS_INPUT_LIMIT");
  if (options.log) mkdirSync(dirname(options.log), { recursive: true });
  const log = options.log ? createWriteStream(options.log, { flags: "wx" }) : undefined;
  // Attach rejection handling immediately; resolve only after all evidence bytes have flushed.
  const logFinished = log ? finished(log).catch((error: unknown) => error) : Promise.resolve(undefined);
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      detached: true,
    });
    let stdout = "";
    let stderr = "";
    const decoders = { stdout: new StringDecoder("utf8"), stderr: new StringDecoder("utf8") };
    let count = 0;
    let failure = "";
    child.stdin?.on("error", (error) => {
      failure = `input: ${String(error)}`;
    });
    if (options.input !== undefined) child.stdin?.end(options.input);
    const kill = () => {
      try {
        if (child.pid) process.kill(-child.pid, "SIGKILL");
      } catch {
        /* already reaped */
      }
    };
    const timer = setTimeout(() => {
      failure = "timeout";
      kill();
    }, timeout);
    const consume = (stream: "stdout" | "stderr", chunk: Buffer) => {
      count += chunk.length;
      if (count > limit) {
        failure = "output-limit";
        kill();
        return;
      }
      if (log && !log.write(chunk)) {
        child[stream]?.pause();
        log.once("drain", () => child[stream]?.resume());
      }
      if (stream === "stdout") stdout += decoders.stdout.write(chunk);
      else stderr += decoders.stderr.write(chunk);
    };
    child.stdout?.on("data", (chunk) => consume("stdout", chunk));
    child.stderr?.on("data", (chunk) => consume("stderr", chunk));
    child.on("error", (error) => {
      failure = String(error);
    });
    child.on("close", async (code) => {
      clearTimeout(timer);
      stdout += decoders.stdout.end();
      stderr += decoders.stderr.end();
      kill();
      log?.end();
      const logError = await logFinished;
      if (logError) failure = String(logError);
      if (failure || code !== 0)
        reject(
          new Error(
            `LOCAL_PROCESS ${command}: ${failure || `exit ${code}`}\n${stderr.slice(-3000)}\n${stdout.slice(-1000)}`,
          ),
        );
      else resolve({ stdout, stderr, milliseconds: performance.now() - start });
    });
    log?.on("error", (error) => {
      failure = String(error);
      kill();
    });
  });
}
