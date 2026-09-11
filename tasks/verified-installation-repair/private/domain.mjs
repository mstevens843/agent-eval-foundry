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

// Pure, order-independent: the required tree for ONE attempt's own descriptors/blobs/cache,
// or null if that attempt's own sources cannot verify every layer. Identical merge algorithm
// to v1's expected() -- unchanged two-pass remove/opaque-then-regular, empty-tree base, dual
// cache-or-origin verification with neither source taking precedence.
export function expected(attempt) {
  let rows = [];
  for (const d of attempt.descriptors) {
    let plain = null;
    for (const encoded of [attempt.blobs[d.digest], attempt.cache[d.url]]) {
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
  const result = Object.create(null);
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

// Durable, multi-invocation installer lifecycle over a shared filesystem-backed staging area
// (view.storage identifies the line). A scenario supplies an ORDERED list of `attempts`, each
// one an independent `execute()` call (a fresh process/adapter) against the SAME durable root:
//   - attempt.crash === "before": this attempt's own finish() call is ACKed normally to the
//     solver (it believes it completed) but its effect never lands -- active is untouched and
//     whatever it staged is left sitting on disk, uncommitted, discoverable by later attempts
//     via api.list()/api.status(). Models a process that dies just before its commit fsyncs.
//   - attempt.crash === "after": finish()'s effect lands for REAL (active is atomically updated,
//     or staging is discarded back to active) but the acknowledgement is never delivered to the
//     solver -- its await api.finish(...) call throws instead, as if the process were killed
//     between the server recording the effect and the response arriving. The NEXT attempt in
//     the array (if any) is driven against a fresh adapter over the same durable root -- a
//     redelivery of the identical request when it shares the same release, or a legitimately
//     new install when it names a different one.
export async function runScenario(s, execute, storage) {
  const root = mkdtempSync(join(tmpdir(), "foundry-install-")),
    staging = join(root, "stage");
  mkdirSync(staging);
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
  const reconcileStagingTo = (tree) => {
    for (const name of readdirSync(staging)) rmSync(join(staging, name), { recursive: true, force: true });
    for (const [path, entry] of Object.entries(tree)) write({ path, entry });
  };

  const initial = structuredClone(s.initial);
  reconcileStagingTo(initial);
  let active = structuredClone(initial);
  let activeRelease = s.initialRelease ?? null;
  let stagedRelease = null; // release id of durable, uncommitted staged content, or null.
  const allFinishes = []; // every LANDED (server-side committed) finish, across all attempts.
  const attemptTraces = [], attemptLegality = [];
  try {
    for (let attemptIndex = 0; attemptIndex < s.attempts.length; attemptIndex++) {
      const attempt = s.attempts[attemptIndex];
      const initialForAttempt = structuredClone(active);
      const initialStatus = { active: activeRelease, staged: stagedRelease };
      let interruption = null;
      const observations = [],
        reports = [];
      let legal = true,
        closed = false,
        crashedThisAttempt = false;
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
      const finish = async (x) => {
        if (closed) {
          legal = false;
          return { ok: false, error: "finished" };
        }
        const { status, digests } = x ?? {};
        if (!["installed", "unavailable"].includes(status) || !Array.isArray(digests)) {
          return { ok: false, error: "finish schema" };
        }
        closed = true;
        if (attempt.crash === "before") {
          // Solver believes it completed; the durable effect never lands. Whatever it staged
          // (if anything) stays exactly as written -- a leftover for a later attempt to find.
          stagedRelease = status === "installed" ? attempt.release : null;
          return { ok: true };
        }
        if (status === "installed") {
          active = readTree(staging);
          activeRelease = attempt.release;
        } else {
          reconcileStagingTo(active);
        }
        stagedRelease = null;
        allFinishes.push({ attemptIndex, release: attempt.release, status, digests, tree: structuredClone(active) });
        return { ok: true };
      };
      try {
        const adapter = session(
            { release: attempt.release, descriptors: attempt.descriptors, initial: initialForAttempt, storage },
            {
              cache: ({ url }) => (attempt.cache[url] ? { bytes: attempt.cache[url] } : null),
              fetch: ({ url, digest }) =>
                attempt.descriptors.some((d) => d.url === url && d.digest === digest) && attempt.blobs[digest]
                  ? { bytes: attempt.blobs[digest] }
                  : null,
              list: () => readTree(staging),
              status: () => ({ active: activeRelease, staged: stagedRelease }),
              remove: op(({ path }) => {
                if (!valid(path)) throw Error("path");
                rmSync(join(staging, path), { recursive: true, force: true });
              }),
              write: op(write),
              finish,
            },
            (r) => reports.push(r),
            observations,
          );
        const invoke = adapter.invoke.bind(adapter);
        adapter.invoke = async (name, args) => {
          const value = await invoke(name, args);
          if (name === "api.finish" && value?.ok === true && attempt.crash && !crashedThisAttempt) {
            crashedThisAttempt = true;
            const record = observations.at(-1);
            record.interrupted = true;
            interruption = { method: "finish", seq: record.seq, boundary: attempt.crash };
            throw Error("installer-authority/lost-response");
          }
          return value;
        };
        await execute(adapter);
      } catch (err) {
        if (!crashedThisAttempt || !String(err).includes("installer-authority/lost-response")) throw err;
      }
      attemptLegality.push(legal);
      attemptTraces.push({
        attemptIndex,
        release: attempt.release,
        descriptors: attempt.descriptors,
        blobs: attempt.blobs,
        cache: attempt.cache,
        initial: initialForAttempt,
        observations,
        reports,
        initialStatus,
        interruption,
        staging: readTree(staging),
      });
    }
    // Judge each delivery in chronological order. A later success cannot repair an earlier
    // unavailable/incorrect commitment, and future sources cannot verify an earlier attempt.
    const verified = new Map(), activated = new Set();
    if (s.initialRelease !== null && s.initialRelease !== undefined) activated.add(s.initialRelease);
    let completion = true, availability = true, contents = true, commitment = true,
      atomicity = true, supersession = true;
    for (const a of attemptTraces) {
      const local = expected(a);
      if (local !== null) verified.set(a.release, local);
      const alreadyActive = a.initialStatus.active === a.release && a.initialStatus.staged === null;
      const truth = verified.get(a.release) ?? (alreadyActive ? a.initial : null);
      const available = truth !== null;
      const landed = allFinishes.filter(f => f.attemptIndex === a.attemptIndex);
      const attempts = a.observations.filter(o => o.method === "finish" && o.value?.ok === true);
      completion &&= alreadyActive ? attempts.length === 0 :
        attempts.length === 1 && (landed.length === 1 || a.interruption?.boundary === "before");
      if (alreadyActive) supersession &&= !a.observations.some(o => ["write", "remove", "finish"].includes(o.method));
      for (const o of attempts) {
        availability &&= o.request.status === (available ? "installed" : "unavailable");
        if (o.request.status === "installed") {
          commitment &&= equal(o.request.digests, a.descriptors.map(d => d.digest));
          // Even a lost pre-commit attempt must leave the verified staged bytes it claims.
          contents &&= available && equal(a.interruption?.boundary === "before" ? a.staging : landed[0]?.tree, truth);
        }
      }
      for (const f of landed) {
        if (f.status === "installed") {
          supersession &&= !activated.has(f.release);
          activated.add(f.release);
          contents &&= available && equal(f.tree, truth);
        } else atomicity &&= equal(f.tree, a.initial);
      }
      if (alreadyActive) contents &&= equal(a.initial, truth) && equal(a.staging, a.initial);
    }
    return {
      ...checks({
        completion,
        availability,
        contents,
        commitment,
        atomicity,
        legal_operations: attemptLegality.every(Boolean),
        supersession,
      }),
      actual: active,
      initialRelease: s.initialRelease ?? null,
      // Per-attempt PROBLEM input (release/descriptors/blobs/cache/initial -- what view.* the
      // candidate actually received, in declared order) plus its own observation trace. A
      // compliant candidate already had all of this; without it an independently-written
      // checker has no way to re-derive expected()-equivalent content per attempt, or to know
      // what was durably active entering each attempt (view.initial), or to re-check per-
      // attempt API-call legality from observations -- exactly analogous to why v1 exposed
      // descriptors/blobs/cache/initial at the top level.
      attempts: attemptTraces,
      // Host-authoritative record of every attempt whose finish() effect ACTUALLY landed
      // (committed), regardless of whether the acknowledgement ever reached that invocation's
      // solver process. This is a raw observable fact about the durable line, not a verdict:
      // a candidate that is redelivered a request it already durably completed can only tell
      // via api.status() during its OWN next invocation, never by inspecting this array.
      finishes: allFinishes,
    };
  } finally {
    rmSync(root, { recursive: true });
  }
}
