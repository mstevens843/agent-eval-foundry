// Phase 20 secure-execution protocol: a signed, framed, one-way event channel from an untrusted
// "cell" process to the trusted "authority" process that spawned it.
//
// WHY SIGNED, GIVEN THE PROCESSES ARE ALREADY SEPARATE
//
// Process separation alone stops the untrusted module from touching the authority's memory. It does
// NOT stop the untrusted module from writing directly to the pipe file descriptor the cell's own
// trusted wrapper code uses to report events (fd numbers are not secret), so a submission that
// discovers "fd 3 carries the ledger" could try to inject forged frames onto it directly. The HMAC
// closes that: the signing key is generated fresh by the authority for this one run, handed to the
// cell ONLY through an environment variable the cell's wrapper reads and deletes before importing
// anything untrusted, and never referenced again except through a closure captured before that
// import. A forged frame without the key's signature is rejected; the key itself is never reachable
// from code that runs after the import, because JavaScript closures are not reflectively inspectable.
//
// This module is imported by both sides. It captures the builtins it needs at load time so that
// whichever side imports it first — cell-entry (before the untrusted module) or authority-entry
// (which never touches untrusted code at all) — gets the pristine versions.
//
// One captured reference is NOT enough on its own, and Phase 20 testing found the specific gap:
// `JSON.stringify` looks up and calls a `.toJSON()` method on every value it serialises, including
// nested ones, as part of the language spec — a captured reference to the original function still
// does this lookup, so a submission that sets `Object.prototype.toJSON` can corrupt what even a
// pristine `JSON.stringify` produces for ANY plain object, frame wrapper included. Capturing the
// function does not prevent that. What actually holds the line is downstream of this file: the
// authority's frame parser demands an exact key set (`kind,payload,seq,sig`) and a matching HMAC
// before trusting anything, so a `toJSON`-corrupted frame fails "unexpected keys" or "signature
// mismatch" and the run fails closed — verified empirically, not assumed. See
// reports/PHASE-20-VERIFIER-TRUST-BOUNDARY.md for the reproduction.

import { createHmac } from "node:crypto";

const rawStringify = JSON.stringify;

export const MAX_FRAME_BYTES = 64 * 1024;
export const MAX_TOTAL_BYTES = 16 * 1024 * 1024;
export const MAX_FRAMES = 4000;

/** Canonical, order-stable serialisation of exactly the fields a signature covers. */
const canonical = (seq, kind, payload) => rawStringify({ seq, kind, payload });

export function makeSigner(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("refusing to sign with a short or missing secret");
  }
  return {
    /** Build one line of the wire format: a signed, newline-terminated JSON frame. */
    encode(seq, kind, payload) {
      const body = canonical(seq, kind, payload);
      const sig = createHmac("sha256", secret).update(body).digest("hex");
      return `${rawStringify({ seq, kind, payload, sig })}\n`;
    },
  };
}

export function makeVerifier(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("refusing to verify with a short or missing secret");
  }
  let expectedSeq = 1;
  return {
    /**
     * Parse and verify one line. Returns `{ok:true, frame}` or `{ok:false, reason}`.
     * `expectedSeq` state means replay, reordering and gaps are rejected, not merely bad signatures.
     */
    verifyLine(line) {
      if (line.length === 0) return { ok: false, reason: "empty line" };
      if (Buffer.byteLength(line, "utf8") > MAX_FRAME_BYTES) {
        return { ok: false, reason: `frame exceeds ${MAX_FRAME_BYTES} bytes` };
      }
      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch {
        return { ok: false, reason: "frame is not valid JSON" };
      }
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, reason: "frame is not a JSON object" };
      }
      const keys = Object.keys(parsed).sort();
      if (keys.join(",") !== "kind,payload,seq,sig") {
        return { ok: false, reason: `frame has unexpected keys: ${keys.join(",")}` };
      }
      const { seq, kind, payload, sig } = parsed;
      if (typeof seq !== "number" || !Number.isInteger(seq)) {
        return { ok: false, reason: "seq is not an integer" };
      }
      if (typeof kind !== "string" || kind.length === 0 || kind.length > 64) {
        return { ok: false, reason: "kind is not a valid string" };
      }
      if (typeof sig !== "string" || sig.length !== 64) {
        return { ok: false, reason: "sig is not a 64-char hex digest" };
      }
      const expectedSig = createHmac("sha256", secret).update(canonical(seq, kind, payload)).digest("hex");
      if (sig !== expectedSig) return { ok: false, reason: "signature mismatch" };
      if (seq !== expectedSeq) {
        return { ok: false, reason: `out-of-order seq: expected ${expectedSeq}, got ${seq}` };
      }
      expectedSeq += 1;
      return { ok: true, frame: { seq, kind, payload } };
    },
  };
}

/** The frame kinds the protocol recognises. Anything else is a protocol violation, not data. */
export const FRAME_KINDS = Object.freeze({
  CALL: "call", // one facade invocation the adapter recorded, in the order it happened
  REPORT: "report", // the subject's final claimed return value — a CLAIM, never authoritative
  DONE: "done", // the adapter finished driving the subject without throwing
  CRASH: "crash", // the subject or adapter threw; carries a truncated message only
});
