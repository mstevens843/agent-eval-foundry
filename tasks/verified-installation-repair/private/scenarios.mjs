import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
export const checkIds = [
  "completion",
  "availability",
  "contents",
  "commitment",
  "atomicity",
  "legal_operations",
  "supersession",
];

// One shared descriptor/blob/cache builder used by both the legacy single-attempt generator
// and the new durable multi-attempt cases below.
function layerBuilder() {
  const blobs = {},
    cache = {},
    descriptors = [];
  const file = (path, text, mode = 420) => ({
    kind: "file",
    path,
    data: Buffer.from(text).toString("base64"),
    mode,
  });
  const layer = (entries, url) => {
    const plain = Buffer.from(JSON.stringify({ entries })),
      raw = gzipSync(plain),
      hash = (b) => createHash("sha256").update(b).digest("hex");
    const d = { url, digest: hash(raw), size: raw.length, plainDigest: hash(plain) };
    blobs[d.digest] = raw.toString("base64");
    descriptors.push(d);
    return d;
  };
  return { blobs, cache, descriptors, file, layer };
}
const PLACEHOLDER_INITIAL = {
  "old-release": { kind: "file", mode: 420, data: Buffer.from("keep-on-failure").toString("base64") },
};
// Every legacy single-attempt case, wrapped as a one-attempt durable scenario (crash: null,
// initialRelease: null). Content/logic below is UNCHANGED from the original generator -- this
// preserves the full dual-source digest/gunzip/plainDigest verification chain and the exact
// two-pass remove/opaque-then-regular layer merge coverage byte-for-byte.
function legacyCases() {
  const cases = Array.from({ length: 33 }, (_, i) => {
    const n = i === 32 ? 0 : i + 1,
      { blobs, cache, descriptors, file, layer } = layerBuilder();
    const first = layer(
      [
        { kind: "dir", path: "etc", mode: 493 },
        file("etc/old", "retire"),
        file("app", "v1"),
        file("replace", "lower"),
      ],
      "repo/shared",
    );
    if (n) {
      const entries = [
        file("etc/current", "release-" + n, 448),
        { kind: "opaque", path: "etc" },
        file("replace", "new"),
        { kind: "remove", path: "replace" },
      ];
      if (n & 1) entries.reverse();
      if (n & 2) entries.push({ kind: "dir", path: "app", mode: 448 }, file("app/start", "exec", 493));
      else entries.push(file("app", "new-app", 448));
      if (n & 4) entries.push({ kind: "dir", path: "etc", mode: 448 });
      const second = layer(entries, n & 8 ? "repo/shared" : "repo/next");
      if (n & 8) cache[second.url] = blobs[first.digest];
      if (n & 16) blobs[second.digest] = n & 1 ? null : blobs[first.digest];
    }
    return {
      id: "case-" + String(i).padStart(3, "0"),
      release: createHash("sha256")
        .update("meridian-release-" + n)
        .digest("hex")
        .slice(0, 16),
      descriptors,
      blobs,
      cache,
      initial: PLACEHOLDER_INITIAL,
    };
  });
  for (const index of [32, 32, 8]) {
    const scenario = structuredClone(cases[index]),
      d = scenario.descriptors.at(-1);
    scenario.id = "case-" + String(cases.length).padStart(3, "0");
    scenario.cache[d.url] = scenario.blobs[d.digest];
    const corrupted = Buffer.from(scenario.cache[d.url], "base64");
    corrupted[0] ^= 255;
    scenario.blobs[d.digest] = cases.length === 34 ? corrupted.toString("base64") : null;
    cases.push(scenario);
  }
  // More origin-failure edge cases, purely additive (the 33 base + 3 above are untouched).
  // checker-required grading (gradeChecker) resolves its graded scenario subset dynamically: it
  // grows only until every private/controls/* mutant's raw observable trace differs from the
  // reference SOMEHOW, not necessarily via the specific check.mjs violation it plants. Two of
  // this package's controls (origin-only-availability, accept-unavailable) plant a defect that
  // is only OBSERVABLE when some descriptor's origin content actually fails to verify -- but the
  // reference implementation (public/src/content.mjs, cache-first) also emits extra, harmless
  // cache probe calls in EVERY scenario regardless of outcome, which is enough of a raw-trace
  // difference on its own to satisfy that dynamic resolver long before an origin-failure
  // scenario is ever reached. The only 3 origin-failure cases previously in the declared space
  // (the loop above) are a small enough fraction of the whole 36-scenario pool that a
  // digest-seeded shuffle can plausibly miss all of them within the modest window the resolver
  // actually settles on. Broadening how many declared scenarios exercise a genuine origin
  // failure (independent of the specific source indices/corruption byte above) makes it far more
  // likely that whatever window the resolver settles on for OTHER controls' sake also happens to
  // contain one, without weakening or changing any existing scenario's semantics.
  for (const { source, mode } of [
    { source: 0, mode: "null" },
    { source: 3, mode: "corrupt" },
    { source: 6, mode: "null" },
    { source: 10, mode: "corrupt" },
    { source: 14, mode: "null" },
    { source: 19, mode: "corrupt" },
    { source: 23, mode: "null" },
    { source: 27, mode: "corrupt" },
  ]) {
    const scenario = structuredClone(cases[source]),
      d = scenario.descriptors.at(-1);
    scenario.id = "case-" + String(cases.length).padStart(3, "0");
    scenario.cache[d.url] = scenario.blobs[d.digest];
    if (mode === "corrupt") {
      const corrupted = Buffer.from(scenario.cache[d.url], "base64");
      corrupted[0] ^= 255;
      scenario.blobs[d.digest] = corrupted.toString("base64");
    } else {
      scenario.blobs[d.digest] = null;
    }
    cases.push(scenario);
  }
  // Publicly legal filenames include JavaScript-reserved-looking names like "constructor" and
  // "__proto__" (the path rule only restricts characters). A grading harness that tracks staged
  // files with a plain object literal as a path->entry map would spuriously reject "constructor"
  // as already existing (Object.prototype.constructor is inherited and truthy before it is ever
  // written) and would silently lose a write to "__proto__" (plain assignment reassigns the
  // object's own prototype instead of storing an entry) -- a real, reproduced grading-adapter
  // bug, not a candidate defect. This scenario writes an initial file, then a layer that adds
  // "constructor" and "__proto__" as ordinary new files alongside a normal path, so any
  // recurrence of that bug surfaces as a real, isolated completion/contents failure.
  {
    const { blobs, cache, descriptors, file, layer } = layerBuilder();
    layer([file("keep", "first-layer")], "repo/base");
    layer(
      [file("constructor", "reserved-name-one"), file("__proto__", "reserved-name-two"), file("normal", "ordinary")],
      "repo/reserved-names",
    );
    cases.push({
      id: "case-" + String(cases.length).padStart(3, "0"),
      release: createHash("sha256").update("meridian-release-reserved-names").digest("hex").slice(0, 16),
      descriptors,
      blobs,
      cache,
      initial: PLACEHOLDER_INITIAL,
    });
  }
  return cases.map((c) => ({
    id: c.id,
    initial: c.initial,
    initialRelease: null,
    attempts: [{ release: c.release, descriptors: c.descriptors, blobs: c.blobs, cache: c.cache, crash: null }],
  }));
}

// A small, simple, self-contained release: one layer, two files. Used by the new durable
// multi-attempt cases below, where the point under test is the LIFECYCLE across invocations,
// not layer-merge complexity (that is already exhaustively covered by the legacy cases above).
function makeRelease(seed) {
  const { blobs, cache, descriptors, file, layer } = layerBuilder();
  layer(
    [file("app", "release-" + seed), { kind: "dir", path: "cfg", mode: 493 }, file("cfg/note", "seed-" + seed)],
    "repo/" + seed,
  );
  return {
    release: createHash("sha256").update("meridian-durable-" + seed).digest("hex").slice(0, 16),
    descriptors,
    blobsFull: blobs,
    cache,
  };
}
function corruptedRelease(seed) {
  const r = makeRelease(seed),
    d = r.descriptors[0],
    bad = Buffer.from(r.blobsFull[d.digest], "base64");
  bad[0] ^= 255;
  return { ...r, blobsFull: { [d.digest]: bad.toString("base64") } };
}
function attempt(r, { available = true, crash = null } = {}) {
  return {
    release: r.release,
    descriptors: r.descriptors,
    blobs: available ? r.blobsFull : {},
    cache: {},
    crash,
  };
}
// New durable, multi-invocation lifecycle cases. Each chains 2 (occasionally 3) execute() calls
// against the SAME durable storage line (domain.runScenario keeps one real temp-fs root alive
// across the whole `attempts` array). "sources vanish on redelivery" (available:false on a
// later attempt reusing an earlier attempt's release) is what makes durability genuinely
// load-bearing rather than a nice-to-have: a candidate that always re-verifies from scratch,
// ignoring api.status()/durable staged bytes, cannot possibly succeed once the origin/cache
// copies it would need are simply gone.
function durableCases() {
  const A = makeRelease("alpha"),
    B = makeRelease("bravo"),
    C = corruptedRelease("broken");
  const scenario = (id, attempts) => ({ id, initial: PLACEHOLDER_INITIAL, initialRelease: null, attempts });
  return [
    // Redelivery after the FIRST attempt's finish landed for real but its ack was lost.
    // Sources still available on redelivery -- either re-deriving or trusting durable state
    // is fine; the redelivery must not become a SECOND real "installed" landing for A.
    scenario("case-045", [attempt(A, { crash: "after" }), attempt(A, { crash: null })]),
    // Same, but A's sources are GONE by the time the redelivery arrives: the candidate can
    // only succeed by recognizing (via api.status()) that A is already durably active.
    scenario("case-046", [attempt(A, { crash: "after" }), attempt(A, { available: false, crash: null })]),
    // A genuinely NEW release B arrives after A already landed; A's activation must be left
    // alone (not corrupted) and B must be freshly, independently verified and installed.
    scenario("case-047", [attempt(A, { crash: "after" }), attempt(B, { crash: null })]),
    // A's finish() never lands (interrupted before commit) -- fully staged, durable, but
    // uncommitted. Redelivery with sources still available: re-deriving or trusting the
    // durable staged bytes are both legitimate.
    scenario("case-048", [attempt(A, { crash: "before" }), attempt(A, { crash: null })]),
    // Same, but A's sources are GONE on redelivery: the only way to legitimately finish
    // "installed" is to trust the durably staged bytes api.status().staged already points at.
    scenario("case-049", [attempt(A, { crash: "before" }), attempt(A, { available: false, crash: null })]),
    // A's staging is left durably uncommitted, then a genuinely NEW release B arrives. B's
    // own descriptors must be freshly verified and installed; A's stale staged leftovers must
    // never be what actually gets activated under B's name.
    scenario("case-050", [attempt(A, { crash: "before" }), attempt(B, { crash: null })]),
    // Three-invocation chain: staged-but-uncommitted, then landed-but-ack-lost (same release),
    // then a plain redelivery with sources gone -- must resolve to a clean no-op completion.
    scenario("case-051", [
      attempt(A, { crash: "before" }),
      attempt(A, { crash: "after" }),
      attempt(A, { available: false, crash: null }),
    ]),
    // A lands for real, then a later, DIFFERENT release fails verification entirely (corrupt
    // origin, no cache). The already-active generation (A) must be left completely untouched.
    scenario("case-052", [attempt(A, { crash: "after" }), attempt(C, { crash: null })]),
  ];
}
export function scenarios() {
  const cases = [...legacyCases(), ...durableCases()];
  const sequential = structuredClone(cases.find(c => c.id === "case-047"));
  sequential.id = "case-sequential-completions";
  sequential.attempts[0].crash = null;
  cases.push(sequential);
  const same = makeRelease("equal");
  cases.push({id:"case-same-bytes-unactivated", initialRelease:null,
    initial: {app:{kind:"file",mode:420,data:Buffer.from("release-equal").toString("base64")},
      cfg:{kind:"dir",mode:493}, "cfg/note":{kind:"file",mode:420,data:Buffer.from("seed-equal").toString("base64")}},
    attempts:[attempt(same)]});
  return cases;
}
