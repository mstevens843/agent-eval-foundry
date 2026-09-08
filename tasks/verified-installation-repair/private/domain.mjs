import { session, checks, equal } from "./adapter.mjs";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  lstatSync,
  chmodSync,
  rmSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
const sha = (b) => createHash("sha256").update(b).digest("hex");
export function expected(s) {
  let rows = [];
  for (const d of s.descriptors) {
    let plain = null;
    for (const encoded of [s.blobs[d.digest], s.cache[d.url]]) {
      if (!encoded) continue;
      try {
        const raw = Buffer.from(encoded, "base64");
        if (raw.length !== d.size || sha(raw) !== d.digest) continue;
        const decoded = gunzipSync(raw, { maxOutputLength: 1048576 });
        if (sha(decoded) === d.plainDigest) {
          plain = decoded;
          break;
        }
      } catch {
        /* This copy is unavailable; another source may still be usable. */
      }
    }
    if (!plain) return null;
    const entries = JSON.parse(plain).entries;
    rows = rows.filter(
      (old) =>
        !entries.some(
          (e) =>
            (e.kind === "remove" && (old.path === e.path || old.path.startsWith(e.path + "/"))) ||
            (e.kind === "opaque" && old.path.startsWith(e.path + "/")),
        ),
    );
    for (const e of entries) {
      if (e.kind !== "dir" && e.kind !== "file") continue;
      const segments = e.path.split("/");
      for (let n = 1; n < segments.length; n++) {
        const path = segments.slice(0, n).join("/");
        if (!rows.some((x) => x.path === path && x.kind === "dir")) {
          rows = rows.filter((x) => x.path !== path && !x.path.startsWith(path + "/"));
          rows.push({ path, kind: "dir", mode: 493 });
        }
      }
      const sameDirectory = e.kind === "dir" && rows.some((x) => x.path === e.path && x.kind === "dir");
      rows = rows.filter((x) => x.path !== e.path && (sameDirectory || !x.path.startsWith(e.path + "/")));
      rows.push({ ...e });
    }
  }
  return Object.fromEntries(rows.map(({ path, ...entry }) => [path, entry]));
}
function readTree(root, relative = "") {
  const result = {};
  for (const name of readdirSync(join(root, relative))) {
    const p = relative ? relative + "/" + name : name,
      st = lstatSync(join(root, p));
    if (st.isSymbolicLink() || (!st.isFile() && !st.isDirectory())) throw Error("unexpected filesystem node");
    result[p] = st.isDirectory()
      ? { kind: "dir", mode: st.mode & 511 }
      : { kind: "file", mode: st.mode & 511, data: readFileSync(join(root, p)).toString("base64") };
    if (st.isDirectory()) Object.assign(result, readTree(root, p));
  }
  return result;
}
export async function runScenario(s, execute, storage) {
  const root = mkdtempSync(join(tmpdir(), "foundry-install-")),
    staging = join(root, "stage");
  mkdirSync(staging);
  const initial = structuredClone(s.initial),
    truth = expected(s),
    observations = [],
    reports = [],
    finishes = [];
  let legal = true,
    active = structuredClone(initial),
    closed = false;
  const valid = (p) =>
    typeof p === "string" &&
    p.length < 512 &&
    p.split("/").every((x) => /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(x) && x !== "." && x !== "..");
  const write = ({ path, entry }) => {
    if (
      !valid(path) ||
      !entry ||
      !["file", "dir"].includes(entry.kind) ||
      !Number.isInteger(entry.mode) ||
      entry.mode < 384 ||
      entry.mode > 493
    )
      throw Error("node schema");
    if (Object.keys(entry).sort().join() !== (entry.kind === "file" ? "data,kind,mode" : "kind,mode"))
      throw Error("node fields");
    const existing = readTree(staging),
      parts = path.split("/");
    if (parts.slice(0, -1).some((_, i) => existing[parts.slice(0, i + 1).join("/")]?.kind === "file"))
      throw Error("type conflict");
    if (existing[path] && existing[path].kind !== entry.kind) throw Error("type conflict");
    if (entry.kind === "file" && (typeof entry.data !== "string" || entry.data.length > 1400000))
      throw Error("file size");
    mkdirSync(dirname(join(staging, path)), { recursive: true, mode: 493 });
    if (entry.kind === "dir") mkdirSync(join(staging, path), { recursive: true });
    else writeFileSync(join(staging, path), Buffer.from(entry.data, "base64"));
    chmodSync(join(staging, path), entry.mode);
  };
  for (const [path, entry] of Object.entries(initial)) write({ path, entry });
  const op = (fn) => (x) => {
    if (closed) {
      legal = false;
      return { ok: false, error: "finished" };
    }
    try {
      fn(x);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e.message) };
    }
  };
  try {
    await execute(
      session(
        { release: s.release, descriptors: s.descriptors, initial, storage },
        {
          cache: ({ url }) => (s.cache[url] ? { bytes: s.cache[url] } : null),
          fetch: ({ url, digest }) =>
            s.descriptors.some((d) => d.url === url && d.digest === digest) && s.blobs[digest]
              ? { bytes: s.blobs[digest] }
              : null,
          list: () => readTree(staging),
          remove: op(({ path }) => {
            if (!valid(path)) throw Error("path");
            rmSync(join(staging, path), { recursive: true, force: true });
          }),
          write: op(write),
          finish: op(({ status, digests }) => {
            if (!["installed", "unavailable"].includes(status) || !Array.isArray(digests))
              throw Error("finish schema");
            if (status === "installed") active = readTree(staging);
            finishes.push({ status, digests, tree: structuredClone(active) });
            closed = true;
          }),
        },
        (r) => reports.push(r),
        observations,
      ),
    );
    return {
      ...checks({
        completion: finishes.length === 1,
        availability: finishes.length === 1 && finishes[0].status === (truth ? "installed" : "unavailable"),
        contents: equal(active, truth ?? initial),
        commitment:
          finishes.length === 1 &&
          (finishes[0].status !== "installed" ||
            equal(
              finishes[0].digests,
              s.descriptors.map((d) => d.digest),
            )),
        atomicity: truth !== null || equal(active, initial),
        legal_operations: legal,
      }),
      actual: active,
      expected: truth ?? initial,
      finishes,
      observations,
      reports,
      // Legitimate PROBLEM input, not the answer: this is exactly the same `descriptors` array
      // (url/digest/size/plainDigest per layer, in declared order) already handed to entry.mjs
      // via view.descriptors -- a solver already has it. It is not echoed back anywhere else in
      // this return value, so without it an independently-written checker has no way to verify
      // digest/gunzip/plainDigest itself, or to know true descriptor order (a compliant
      // candidate may legitimately query fetch/cache in a different order than declared, e.g.
      // cache-first for everything). Adding it lets a checker recompute `commitment` (declared
      // order, not observed query order) and independently re-derive `expected()`-equivalent
      // content from the CANDIDATE's own observed fetch/cache bytes, instead of from any
      // grader-only field.
      descriptors: s.descriptors,
      initial,
      // Raw available artifact sources let a checker assess availability even when a
      // candidate omits a fetch. These are inputs, not the computed installation tree.
      blobs: s.blobs,
      cache: s.cache,
    };
  } finally {
    rmSync(root, { recursive: true });
  }
}
