export const checkIds = [
  "completion",
  "representation",
  "cache_provenance",
  "invalidation_scope",
  "origin_load",
  "no_store",
];
export function scenarios() {
  const rows = [];
  for (let seed = 0; seed < 20; seed++) {
    const events = [],
      add = (e) => events.push({ ...e, id: "request-" + events.length }),
      get = (tier, path, lang, now, extra = {}) =>
        add({
          kind: "get",
          tier,
          path,
          headers: { "accept-language": lang, "x-edition": "public", ...extra },
          now,
        });
    get("edge-a", "/asset", "en", 0);
    get("edge-a", "/doc", "en", 0);
    get("edge-b", "/doc", "en", 1);
    get("edge-a", "/doc", "fr", 2);
    get("edge-b", "/doc", "fr", 3);
    get("edge-a", "/doc", "en", 4);
    get("edge-b", "/doc", "en", 5);
    get("edge-b", "/doc", "fr", 6, { "cache-control": "no-cache" });
    add({ kind: "purge", path: "/doc", tiers: ["edge-a", "shield"], now: 7 });
    get("edge-a", "/doc", "en", 8);
    get("edge-b", "/doc", "en", 9);
    get("edge-a", "/asset", "en", 9);
    add({ kind: "purge", path: "/doc", tiers: ["edge-a", "edge-b", "shield"], now: 10 });
    get("edge-b", "/doc", "fr", 11);
    get("edge-a", "/doc", "fr", 12);
    get("edge-a", "/doc", "fr", 13, { "x-edition": "preview" });
    get("edge-b", "/doc", "fr", 14, { "x-edition": "preview" });
    get("edge-a", "/private", "en", 15);
    get("edge-b", "/private", "en", 16);
    // Two of the twenty otherwise content-salting-only seeds get a genuinely different event
    // topology: a late get for a representation (/doc fr@public, fetched at now=11 and never
    // purged again afterward) that has by now organically aged past its maxAge (20), forcing a
    // real conditional revalidation triggered by staleness rather than by an explicit
    // cache-control:no-cache header (a different code path than the no-cache event above already
    // covers). The re-fetched body/etag are identical (same seed/path/headers/version), so this
    // is answered by a 0-byte 304 and needs one extra origin call, not extra origin bytes — hence
    // maxOriginRequests below is bumped by exactly one for just these two seeds.
    if (seed === 2 || seed === 9) get("edge-a", "/doc", "fr", 35);
    const body = (path, lang, edition, version) => [seed, path, lang, edition, version, "🟦"].join("|");
    const full = [
      ["/asset", "en", "public", 1],
      ["/doc", "en", "public", 1],
      ["/doc", "fr", "public", 1],
      ["/doc", "en", "public", 2],
      ["/doc", "fr", "public", 2],
      ["/doc", "fr", "preview", 2],
      ["/private", "en", "public", 2],
      ["/private", "en", "public", 2],
    ];
    const bytes = full.reduce((n, args) => n + Buffer.byteLength(body(...args)), 0);
    rows.push({
      id: "case-" + String(seed).padStart(3, "0"),
      seed,
      events,
      limits: { maxOriginRequests: seed === 2 || seed === 9 ? 11 : 10, maxOriginBytes: bytes },
    });
  }
  rows.push({
    id: "case-020",
    seed: 20,
    events: [
      {
        id: "one",
        kind: "get",
        tier: "edge-a",
        path: "/asset",
        headers: { "accept-language": "en", "x-edition": "public" },
        now: 0,
      },
    ],
    limits: { maxOriginRequests: 1, maxOriginBytes: 1000 },
  });
  rows.push({ id: "case-021", seed: 21, events: [], limits: { maxOriginRequests: 0, maxOriginBytes: 0 } });
  for (const [n, path] of [
    [22, "/wildcard"],
    [23, "/revalidate"],
  ])
    rows.push({
      id: "case-" + String(n).padStart(3, "0"),
      seed: n,
      events: [0, 1, 2].map((i) => ({
        id: "extra-" + i,
        kind: "get",
        tier: i % 2 ? "edge-b" : "edge-a",
        path,
        headers: {},
        now: i,
      })),
      limits: { maxOriginRequests: 3, maxOriginBytes: 3000 },
    });
  // Every purge above (both in the seeded loop and case-021) always includes "shield" in its
  // scope, so a subject that over-purges by always flushing shield regardless of the requested
  // scope was never observably wrong: this is the one purge in the whole bank whose scope
  // deliberately EXCLUDES shield, with shield actually holding a matching entry at purge time, so
  // over-purging shield becomes detectable via the acknowledge-time "other tiers unchanged" check.
  rows.push({
    id: "case-024",
    seed: 24,
    events: [
      {
        id: "shield-scope-one",
        kind: "get",
        tier: "edge-a",
        path: "/doc",
        headers: { "accept-language": "en", "x-edition": "public" },
        now: 0,
      },
      {
        id: "shield-scope-two",
        kind: "get",
        tier: "edge-b",
        path: "/doc",
        headers: { "accept-language": "en", "x-edition": "public" },
        now: 1,
      },
      { id: "shield-scope-purge", kind: "purge", path: "/doc", tiers: ["edge-a"], now: 2 },
      {
        id: "shield-scope-three",
        kind: "get",
        tier: "edge-a",
        path: "/doc",
        headers: { "accept-language": "en", "x-edition": "public" },
        now: 3,
      },
    ],
    limits: { maxOriginRequests: 3, maxOriginBytes: 200 },
  });
  return rows;
}
