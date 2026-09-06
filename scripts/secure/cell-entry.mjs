#!/usr/bin/env node
// Untrusted RPC client; replacing this code grants no access to authority-owned observations.
import { readSync, writeSync } from "node:fs";
import { pathToFileURL } from "node:url";
const rawRead = readSync;
const rawWrite = writeSync;
const encode = JSON.stringify;
const decode = JSON.parse;
const pause = () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1);
let seq = 0;
let buffer = Buffer.alloc(0);
const rpc = (kind, ...args) => {
  const id = ++seq;
  const output = Buffer.from(`${encode({ seq: id, kind, args })}\n`);
  let offset = 0;
  while (offset < output.length) {
    try {
      offset += rawWrite(3, output, offset);
    } catch (error) {
      if (error.code !== "EAGAIN") throw error;
      pause();
    }
  }
  while (!buffer.includes(10)) {
    const chunk = Buffer.alloc(8192);
    try {
      const count = rawRead(3, chunk, 0, chunk.length, null);
      if (count === 0) throw new Error("authority channel closed");
      buffer = Buffer.concat([buffer, chunk.subarray(0, count)]);
      if (buffer.length > 65536) throw new Error("authority response too large");
    } catch (error) {
      if (error.code !== "EAGAIN") throw error;
      pause();
    }
  }
  const end = buffer.indexOf(10);
  const response = decode(buffer.subarray(0, end).toString("utf8"));
  buffer = buffer.slice(end + 1);
  if (response.seq !== id) throw new Error("authority response sequence mismatch");
  if (response.result?.caseApiError) {
    const error = new Error(response.result.message);
    error.code = response.result.caseApiError;
    throw error;
  }
  return response.result;
};
try {
  const module = await import(pathToFileURL(process.argv[2]).href);
  const subject = module.subject ?? module.default;
  let checker;
  // Object identity is a published memory-facade guarantee across sessions.
  const facadeGroups = new Map();
  let remaining;
  do {
    const frame = rpc("begin");
    const key = frame.facades.map((d) => d.name).join("|");
    if (!facadeGroups.has(key))
      facadeGroups.set(
        key,
        frame.facades.map((description) =>
          Object.freeze({
            ...description.properties,
            ...Object.fromEntries(
              description.methods.map((method) => [
                method,
                (...args) => rpc("call", `${description.name}.${method}`, args),
              ]),
            ),
          }),
        ),
      );
    const facades = facadeGroups.get(key);
    if (frame.module === "checker" && !checker) {
      const loaded = await import(new URL("./checker.mjs", pathToFileURL(process.argv[2])).href);
      checker = loaded.checker ?? loaded.default;
    }
    const target = frame.module === "checker" ? checker : subject;
    const report = frame.mergeView
      ? await target[frame.method]({ ...frame.view, ...facades[0] })
      : await target[frame.method](frame.view, ...facades);
    ({ remaining } = rpc("report", report));
  } while (remaining > 0);
  rpc("finish");
} catch (error) {
  rawWrite(2, String(error?.stack ?? error).slice(0, 2000));
  process.exit(1);
}
process.exit(0);
