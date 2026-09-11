import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { equal, verdicts } from "./checker-utils.mjs";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
function layer(a, d) {
  for (const encoded of [a.cache[d.url], a.blobs[d.digest]]) {
    if (typeof encoded !== "string") continue;
    try {
      const compressed = Buffer.from(encoded, "base64");
      if (compressed.length !== d.size || sha(compressed) !== d.digest) continue;
      const plain = gunzipSync(compressed, { maxOutputLength: 1048576 });
      if (sha(plain) !== d.plainDigest) continue;
      return JSON.parse(plain).entries;
    } catch {
      /* The other source can still be available. */
    }
  }
  return null;
}
// Required tree for ONE attempt's own descriptors/blobs/cache, independently re-derived from
// only the raw per-attempt problem input -- mirrors domain.mjs's expected() without trusting it.
function requiredTree(a) {
  const tree = new Map();
  const erase = (path, include) => {
    for (const name of tree.keys()) if ((include && name === path) || name.startsWith(path + "/")) tree.delete(name);
  };
  for (const descriptor of a.descriptors) {
    const entries = layer(a, descriptor);
    if (entries === null) return null;
    for (const e of entries) if (e.kind === "remove" || e.kind === "opaque") erase(e.path, e.kind === "remove");
    for (const e of entries) {
      if (e.kind !== "file" && e.kind !== "dir") continue;
      const path = e.path.split("/");
      for (let length = 1; length < path.length; length++) {
        const parent = path.slice(0, length).join("/");
        if (tree.get(parent)?.kind !== "dir") {
          erase(parent, true);
          tree.set(parent, { kind: "dir", mode: 493 });
        }
      }
      if (e.kind === "file" || tree.get(e.path)?.kind !== "dir") erase(e.path, true);
      tree.set(e.path, e.kind === "file" ? { kind: "file", mode: e.mode, data: e.data } : { kind: "dir", mode: e.mode });
    }
  }
  return Object.fromEntries(tree);
}
function legalObservations(observations) {
  let closed = false;
  for (const o of observations ?? []) {
    if (!["remove", "write", "finish"].includes(o.method)) continue;
    if (closed) return false;
    if (o.method === "finish" && o.value?.ok === true) closed = true;
  }
  return true;
}
function check(c) {
  if (!Array.isArray(c.attempts) || c.attempts.length === 0 || !Array.isArray(c.finishes)) return false;
  const verified = new Map(), installed = new Set();
  if (c.initialRelease !== null) installed.add(c.initialRelease);
  let active = c.initialRelease, tree = c.attempts[0].initial, staged = null;
  for (const [index, a] of c.attempts.entries()) {
    if (a.attemptIndex !== index || !equal(a.initial, tree) ||
        !equal(a.initialStatus, {active, staged}) || !legalObservations(a.observations)) return false;
    const local = requiredTree(a);
    if (local !== null) verified.set(a.release, local);
    const satisfied = active === a.release && staged === null;
    const required = verified.get(a.release) ?? (satisfied ? a.initial : null);
    const finishCalls = a.observations.filter(o => o.method === 'finish' && o.value?.ok === true);
    const landed = c.finishes.filter(f => f.attemptIndex === index);
    if (satisfied) {
      if (landed.length || a.interruption || a.observations.some(o => ['write','remove','finish'].includes(o.method)) ||
          !equal(a.staging, tree) || !equal(tree, required)) return false;
      continue;
    }
    if (finishCalls.length !== 1) return false;
    const call = finishCalls[0], interrupted = a.interruption;
    if (interrupted && (interrupted.method !== 'finish' || interrupted.seq !== call.seq ||
        !call.interrupted || !['before','after'].includes(interrupted.boundary))) return false;
    if (call.request.status !== (required === null ? 'unavailable' : 'installed')) return false;
    if (call.request.status === 'installed' && !equal(call.request.digests, a.descriptors.map(d => d.digest))) return false;
    if (interrupted?.boundary === 'before') {
      if (landed.length) return false;
      staged = call.request.status === 'installed' ? a.release : null;
      if (staged !== null && !equal(a.staging, required)) return false;
    } else {
      if (landed.length !== 1) return false;
      const f = landed[0];
      if (f.release !== a.release || f.status !== call.request.status || !equal(f.digests, call.request.digests)) return false;
      if (f.status === 'installed') {
        if (installed.has(f.release) || !equal(f.tree, required)) return false;
        installed.add(f.release); active = f.release; tree = f.tree;
      } else if (!equal(f.tree, tree)) return false;
      staged = null;
      if (!equal(a.staging, tree)) return false;
    }
  }
  return c.finishes.every(f => Number.isInteger(f.attemptIndex) && f.attemptIndex >= 0 && f.attemptIndex < c.attempts.length) && equal(c.actual, tree);
}
export const run = ({ cases }) => verdicts(cases, check);
