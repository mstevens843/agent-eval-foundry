import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { equal, verdicts } from "./checker-utils.mjs";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
function layer(c, d) {
  for (const encoded of [c.cache[d.url], c.blobs[d.digest]]) {
    if (typeof encoded !== "string") continue;
    try {
      const compressed = Buffer.from(encoded, "base64");
      if (compressed.length !== d.size || sha(compressed) !== d.digest) continue;
      const plain = gunzipSync(compressed, { maxOutputLength: 1048576 });
      if (sha(plain) !== d.plainDigest) continue;
      return JSON.parse(plain).entries;
    } catch { /* The other source can still be available. */ }
  }
  return null;
}
function requiredTree(c) {
  const tree = new Map();
  const erase = (path, include) => {
    for (const name of tree.keys()) if ((include && name === path) || name.startsWith(path + "/")) tree.delete(name);
  };
  for (const descriptor of c.descriptors) {
    const entries = layer(c, descriptor);
    if (entries === null) return null;
    for (const e of entries) if (e.kind === "remove" || e.kind === "opaque") erase(e.path, e.kind === "remove");
    for (const e of entries) {
      if (e.kind !== "file" && e.kind !== "dir") continue;
      const path = e.path.split("/");
      for (let length = 1; length < path.length; length++) {
        const parent = path.slice(0, length).join("/");
        if (tree.get(parent)?.kind !== "dir") {
          erase(parent, true); tree.set(parent, { kind: "dir", mode: 493 });
        }
      }
      if (e.kind === "file" || tree.get(e.path)?.kind !== "dir") erase(e.path, true);
      tree.set(e.path, e.kind === "file" ? { kind: "file", mode: e.mode, data: e.data } : { kind: "dir", mode: e.mode });
    }
  }
  return Object.fromEntries(tree);
}
function check(c) {
  const target = requiredTree(c), status = target === null ? "unavailable" : "installed";
  if (c.finishes.length !== 1) return false;
  const finish = c.finishes[0];
  if (finish.status !== status || !equal(c.actual, target ?? c.initial) || !equal(finish.tree, target ?? c.initial)) return false;
  if (status === "installed" && !equal(finish.digests, c.descriptors.map(d => d.digest))) return false;
  let closed = false;
  for (const o of c.observations) {
    if (!["remove", "write", "finish"].includes(o.method)) continue;
    if (closed) return false;
    if (o.method === "finish" && o.value?.ok === true) closed = true;
  }
  return closed;
}
export const run = ({ cases }) => verdicts(cases, check);
