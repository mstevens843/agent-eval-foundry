import { spawn } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { MAX_FRAME_BYTES, MAX_FRAMES, MAX_TOTAL_BYTES } from "./protocol.mjs";

/** One lifecycle, one UID, in a task-owned container. Also reap descendants that create new sessions.
 * The outer container wall clock is a separate final bound. No trusted state is shared with cells. */
export function executeAuthority(adapter, { cellPath, modulePath, uid }) {
  return new Promise((resolve) => {
    const diagnostics = { stdoutTail: "", stderrTail: "" };
    const child = spawn(process.execPath, [cellPath, modulePath], {
      uid,
      gid: uid,
      detached: true,
      stdio: ["ignore", "pipe", "pipe", "pipe"],
      env: { PATH: "/usr/local/bin:/usr/bin:/bin", HOME: "/tmp" },
    });
    let error = null,
      buffer = Buffer.alloc(0),
      totalBytes = 0,
      responseBytes = 0,
      outputBytes = 0;
    let errorKind = null;
    let seq = 0,
      active = false,
      index = 0,
      completed = false,
      processing = Promise.resolve();
    const kill = () => {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        /* exited */
      }
      for (const pid of readdirSync("/proc").filter((p) => /^\d+$/.test(p))) {
        try {
          if (Number(/^Uid:\s+(\d+)/m.exec(readFileSync(`/proc/${pid}/status`, "utf8"))?.[1]) === uid)
            process.kill(Number(pid), "SIGKILL");
        } catch {
          /* exited during enumeration */
        }
      }
    };
    const refuse = (reason, kind = "protocol") => {
      error ??= reason;
      errorKind ??= kind;
      kill();
    };
    const timer = setTimeout(() => refuse("cell exceeded wall-clock timeout", "resource"), 45_000);
    for (const [stream, key] of [
      [child.stdout, "stdoutTail"],
      [child.stderr, "stderrTail"],
    ]) {
      stream.on("data", (chunk) => {
        outputBytes += chunk.length;
        diagnostics[key] = (diagnostics[key] + chunk.toString("utf8")).slice(-8192);
        if (outputBytes > MAX_TOTAL_BYTES) refuse("diagnostic output byte limit exceeded", "resource");
      });
    }
    const drain = async () => {
      while (error === null && buffer.includes(10)) {
        const end = buffer.indexOf(10);
        if (end > MAX_FRAME_BYTES) return refuse("request frame too large");
        const line = buffer.subarray(0, end);
        buffer = buffer.subarray(end + 1);
        try {
          const request = JSON.parse(line.toString("utf8"));
          if (
            !request ||
            completed ||
            ++seq > MAX_FRAMES ||
            request.seq !== seq ||
            Object.keys(request).sort().join(",") !== "args,kind,seq" ||
            !Array.isArray(request.args)
          ) {
            throw Error("invalid request sequence, envelope or terminal ordering");
          }
          let result;
          if (request.kind === "begin" && !active && index < adapter.count && !request.args.length) {
            active = true;
            result = await adapter.begin(index);
          } else if (
            request.kind === "call" &&
            active &&
            request.args.length === 2 &&
            typeof request.args[0] === "string"
          ) {
            try {
              result = await adapter.invoke(request.args[0], request.args[1]);
            } catch (err) {
              if (!["CASE_UNKNOWN", "CASE_PARAMS", "CASE_LIMIT"].includes(err?.code)) throw err;
              result = { caseApiError: err.code, message: err.message };
            }
          } else if (request.kind === "report" && active && request.args.length === 1) {
            await adapter.report(request.args[0]);
            active = false;
            index++;
            result = { remaining: adapter.count - index };
          } else if (
            request.kind === "finish" &&
            !active &&
            index === adapter.count &&
            !request.args.length
          ) {
            completed = true;
            result = null;
          } else throw Error("request not allowed in current execution state");
          const response = `${JSON.stringify({ seq, result })}\n`;
          responseBytes += Buffer.byteLength(response);
          if (Buffer.byteLength(response) > MAX_FRAME_BYTES || responseBytes > MAX_TOTAL_BYTES)
            throw Error("facade response too large");
          child.stdio[3].write(response);
        } catch (err) {
          return refuse(`request refused: ${String(err?.message ?? err)}`);
        }
      }
      if (buffer.length > MAX_FRAME_BYTES) refuse("unterminated request frame too large");
    };
    child.stdio[3].on("error", (err) => refuse(`request channel failed: ${err.message}`));
    child.stdio[3].on("data", (chunk) => {
      if (error !== null) return;
      totalBytes += chunk.length;
      if (totalBytes > MAX_TOTAL_BYTES) return refuse("request channel byte limit exceeded");
      buffer = Buffer.concat([buffer, chunk]);
      processing = processing.then(drain).catch((err) => refuse(String(err)));
    });
    child.on("error", (err) => refuse(`cell spawn failed: ${err.message}`, "artifact"));
    child.on("exit", kill);
    child.on("close", async (code, signal) => {
      await processing;
      clearTimeout(timer);
      if (buffer.length) error ??= "incomplete request frame";
      if (!completed || active || index !== adapter.count || code !== 0 || signal !== null) {
        error ??= `incomplete cell execution (code=${code}, signal=${signal})`;
        errorKind ??= "artifact";
      }
      try {
        const result = adapter.result();
        resolve({
          ...result,
          report: error === null ? result.report : null,
          error,
          errorKind,
          diagnostics,
          execution: {
            expectedAttempts: adapter.count,
            reportedAttempts: index,
            completed,
            requests: seq,
            requestBytes: totalBytes,
            responseBytes,
            diagnosticBytes: outputBytes,
          },
        });
      } catch (err) {
        resolve({
          channels: {},
          report: null,
          error: `authority result failed: ${String(err)}`,
          diagnostics,
        });
      }
    });
  });
}
