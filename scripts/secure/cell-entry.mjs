#!/usr/bin/env node
// The cell: the ONLY process that ever imports untrusted submission code.
//
// Everything this file needs from the platform — the signer, JSON serialisation, the raw write
// syscall — is captured into local `const`s BEFORE the family adapter or the submission module are
// imported. That ordering is the whole point: a submission that reassigns `process.stdout.write`,
// `JSON.stringify`, `Array.prototype.push` or any other mutable global affects only code that looks
// those names up AFTER the reassignment. Code that already holds the original function in a closure
// keeps calling the original, because a captured function value is not a live binding to the property
// it came from.
//
// This process is never the verifier and never constructs the graded result. It reports what
// happened, one signed frame at a time, over fd 3 — a channel the authority process treats as
// attacker-controlled input and verifies accordingly (see protocol.mjs). This file's own stdout and
// stderr (fd 1, fd 2) are left for whatever the submission or Node itself writes to them; the
// authority captures those as diagnostics and never parses them as data.

import { writeSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { makeSigner } from "./protocol.mjs";

const rawWriteSync = writeSync;

const secret = process.env.RPC_SECRET;
process.env.RPC_SECRET = undefined; // gone from process.env before any untrusted code can run
if (typeof secret !== "string" || secret.length < 32) {
  rawWriteSync(2, "cell: no signing secret supplied, refusing to start\n");
  process.exit(1);
}

const signer = makeSigner(secret);
let seq = 0;
/** The only way this process's account of events reaches the authority. Captured, not looked up. */
const emit = (kind, payload) => {
  seq += 1;
  rawWriteSync(3, signer.encode(seq, kind, payload));
};

const [modulePath, adapterPath, payloadPath] = process.argv.slice(2);
if (!modulePath || !adapterPath || !payloadPath) {
  emit("crash", { message: "cell invoked without modulePath, adapterPath and payloadPath" });
  process.exit(0);
}

let payload;
try {
  const { readFileSync } = await import("node:fs");
  payload = JSON.parse(readFileSync(payloadPath, "utf8"));
} catch (err) {
  emit("crash", { message: `could not read payload: ${String(err?.message ?? err)}` });
  process.exit(0);
}

// The adapter is trusted (authored alongside this file, never part of a submission) and is imported
// BEFORE the submission so any closures it builds close over pristine builtins too.
let adapter;
try {
  adapter = await import(pathToFileURL(adapterPath).href);
} catch (err) {
  emit("crash", { message: `could not import family adapter: ${String(err?.message ?? err)}` });
  process.exit(0);
}

let submissionModule;
try {
  submissionModule = await import(pathToFileURL(modulePath).href);
} catch (err) {
  emit("crash", { message: `could not import submission module: ${String(err?.message ?? err)}` });
  process.exit(0);
}

const subject = submissionModule.subject ?? submissionModule.default;
if (subject === undefined || subject === null || typeof subject !== "object") {
  emit("crash", { message: "module exports no subject" });
  process.exit(0);
}

try {
  await adapter.runCell({ subject, payload, emit });
  emit("done", { ok: true });
} catch (err) {
  emit("crash", { message: String(err?.message ?? err).slice(0, 2000) });
}
process.exit(0);
