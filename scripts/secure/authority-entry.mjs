#!/usr/bin/env node
// Authority-owned state and operations. The child submits requests and answers, never ledger facts.
// No secret or hidden scenario crosses this OS identity boundary.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { MAX_FRAME_BYTES, MAX_FRAMES, MAX_TOTAL_BYTES } from "./protocol.mjs";

const [cellPath, modulePath, adapterPath] = process.argv.slice(2);
const diagnostics = { stdoutTail: "", stderrTail: "" };
const finish = (result) => { process.stdout.write(JSON.stringify({ diagnostics, ...result })); process.exit(0); };
if (process.getuid?.() !== 0) finish({ error: "authority requires a separate privileged identity", channels: {}, report: null });
let adapter;
try {
  const payload = JSON.parse(readFileSync(0, "utf8"));
  const module = await import(pathToFileURL(adapterPath).href);
  adapter = module.createAuthority(payload);
} catch (error) {
  finish({ error: `authority setup failed: ${String(error?.message ?? error)}`, channels: {}, report: null });
}
const child = spawn(process.execPath, [cellPath, modulePath], {
  uid: 1000, gid: 1000, detached: true,
  stdio: ["ignore", "pipe", "pipe", "pipe"],
  env: { PATH: "/usr/local/bin:/usr/bin:/bin", HOME: "/tmp" },
});
let error = null;
let buffer = Buffer.alloc(0);
let totalBytes = 0;
let seq = 0;
let active = false;
let index = 0;
let completed = false;
const kill = () => { try { process.kill(-child.pid, "SIGKILL"); } catch { /* already exited */ } };
const refuse = (reason) => { error ??= reason; kill(); };
const timer = setTimeout(() => refuse("cell exceeded wall-clock timeout"), 45_000);
for (const [stream, key] of [[child.stdout, "stdoutTail"], [child.stderr, "stderrTail"]]) {
  stream.on("data", (chunk) => { diagnostics[key] = (diagnostics[key] + chunk.toString("utf8")).slice(-8192); });
}
child.stdio[3].on("error", (err) => refuse(`request channel failed: ${err.message}`));
child.stdio[3].on("data", (chunk) => {
  if (error !== null) return;
  totalBytes += chunk.length;
  if (totalBytes > MAX_TOTAL_BYTES) return refuse("request channel byte limit exceeded");
  buffer = Buffer.concat([buffer, chunk]);
  while (buffer.includes(10)) {
    const end = buffer.indexOf(10);
    if (end > MAX_FRAME_BYTES) return refuse("request frame too large");
    const line = buffer.subarray(0, end);
    buffer = buffer.subarray(end + 1);
    try {
      const request = JSON.parse(line.toString("utf8"));
      if (completed || ++seq > MAX_FRAMES || request.seq !== seq ||
        Object.keys(request).sort().join(",") !== "args,kind,seq" || !Array.isArray(request.args)) {
        throw new Error("invalid request sequence, envelope or terminal ordering");
      }
      let result;
      if (request.kind === "begin" && !active && index < adapter.count && request.args.length === 0) {
        active = true;
        result = adapter.begin(index);
      } else if (request.kind === "call" && active && request.args.length === 2) {
        result = adapter.invoke(request.args[0], request.args[1]);
      } else if (request.kind === "report" && active && request.args.length === 1) {
        adapter.report(request.args[0]);
        active = false;
        index += 1;
        result = { remaining: adapter.count - index };
      } else if (request.kind === "finish" && !active && index === adapter.count && request.args.length === 0) {
        completed = true;
        result = null;
      } else {
        throw new Error("request not allowed in current execution state");
      }
      const response = `${JSON.stringify({ seq, result })}\n`;
      if (Buffer.byteLength(response) > MAX_FRAME_BYTES) throw new Error("facade response too large");
      child.stdio[3].write(response);
    } catch (err) {
      return refuse(`request refused: ${String(err?.message ?? err)}`);
    }
  }
  if (buffer.length > MAX_FRAME_BYTES) refuse("unterminated request frame too large");
});
child.on("error", (err) => refuse(`cell spawn failed: ${err.message}`));
// exit can precede pipe drainage. Kill descendants, then wait for close before grading.
child.on("exit", () => kill());
child.on("close", (code, signal) => {
  clearTimeout(timer);
  if (buffer.length !== 0) error ??= "incomplete request frame";
  if (!completed || active || index !== adapter.count || code !== 0 || signal !== null) {
    error ??= `incomplete cell execution (code=${code}, signal=${signal})`;
  }
  const result = adapter.result();
  finish({ ...result, report: error === null ? result.report : null, error });
});
