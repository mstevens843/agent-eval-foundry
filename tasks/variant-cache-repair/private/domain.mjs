import { session, checks, equal, canonical } from "./adapter.mjs";
const tiers = ["edge-a", "edge-b", "shield"];
const fits = (e, r) =>
  e.path === r.path &&
  !e.vary.includes("*") &&
  e.vary.every((k) => (e.headers[k] ?? "") === (r.headers[k] ?? ""));
const age = (e, r) => e.age + r.now - e.storedAt;
const sort = (xs) => [...xs].sort((a, b) => canonical(a).localeCompare(canonical(b)));
export function responseFor(s, e, tag) {
  const lang = e.headers["accept-language"] ?? "",
    edition = e.headers["x-edition"] ?? "",
    version = e.path === "/asset" || e.now < 8 ? 1 : 2;
  const body = [s.seed, e.path, lang, edition, version, "🟦"].join("|"),
    etag = Buffer.from(body).toString("base64");
  return {
    status: tag === etag ? 304 : 200,
    ...(tag === etag ? {} : { body }),
    etag,
    vary: e.path === "/asset" ? [] : e.path === "/wildcard" ? ["*"] : ["accept-language", "x-edition"],
    maxAge: e.path === "/revalidate" ? 0 : e.path === "/asset" ? 100 : e.now < 4 ? 5 : 20,
    age: e.path === "/asset" ? 0 : 1,
    noStore: e.path === "/private",
  };
}
export async function runScenario(s, execute, storage) {
  const observations = [],
    reports = [],
    cache = Object.fromEntries(tiers.map((t) => [t, []])),
    deliveries = [];
  let index = 0,
    active = null,
    before = null,
    facts = [],
    calls = 0,
    bytes = 0,
    correct = true,
    provenance = true,
    purge = true,
    noStore = true;
  const eligible = () => [...(before?.[active.tier] ?? []), ...(before?.shield ?? [])];
  await execute(
    session(
      { limits: s.limits, storage },
      {
        next: () => {
          if (active) return { error: "unfinished" };
          if (index === s.events.length) return { done: true };
          active = s.events[index];
          before = structuredClone(cache);
          facts = [];
          // Return a defensive copy, never the live event object `active` itself: `active` is
          // read again later by acknowledge() (invalidation_scope) and other handlers in this
          // same closure. Any code path that shares this JS heap directly with the authority
          // (rather than crossing a real serialization boundary, as the production Docker/JSON
          // transport always does) must not be able to corrupt the authority's own expectations
          // by mutating what next() handed back (e.g. a purge event's `tiers`).
          return { event: structuredClone(active) };
        },
        read: ({ tier }) => (Object.hasOwn(cache, tier) ? { entries: cache[tier] } : { error: "shape" }),
        write: ({ tier, entries }) => {
          const fields = [
            "path",
            "headers",
            "vary",
            "etag",
            "body",
            "maxAge",
            "age",
            "storedAt",
            "noStore",
          ].sort();
          if (
            !active ||
            !tiers.includes(tier) ||
            !Array.isArray(entries) ||
            entries.length > 40 ||
            entries.some(
              (e) =>
                !e ||
                !equal(Object.keys(e).sort(), fields) ||
                typeof e.path !== "string" ||
                typeof e.body !== "string" ||
                !Array.isArray(e.vary) ||
                !e.headers ||
                !["maxAge", "age", "storedAt"].every((k) => Number.isFinite(e[k])),
            )
          )
            return { error: "shape" };
          if (active.kind === "get") {
            const permitted = [...Object.values(before).flat(), ...facts];
            for (const e of entries) if (!permitted.some((f) => equal(e, f))) provenance = false;
            if (entries.some((e) => e.noStore)) noStore = false;
            const unrelated = before[tier].filter((e) => !fits(e, active));
            if (!unrelated.every((e) => entries.some((x) => equal(x, e)))) provenance = false;
          }
          cache[tier] = structuredClone(entries);
          return { stored: true };
        },
        origin: ({ ifNoneMatch }) => {
          if (active?.kind !== "get") return { error: "event" };
          if (++calls > 100) throw Error("origin execution bound");
          const r = responseFor(s, active, ifNoneMatch);
          if (r.body !== undefined) bytes += Buffer.byteLength(r.body);
          const old = [...eligible(), ...facts].find((e) => fits(e, active) && e.etag === r.etag);
          if (r.status === 200 || old) {
            facts.push({
              path: active.path,
              headers: active.headers,
              vary: r.vary,
              etag: r.etag,
              body: r.status === 200 ? r.body : old.body,
              maxAge: r.maxAge,
              age: r.age,
              storedAt: active.now,
              noStore: r.noStore,
            });
          }
          return r;
        },
        deliver: ({ response }) => {
          if (active?.kind !== "get") return { error: "event" };
          const allowed = [
            ...facts,
            ...(active.headers["cache-control"] === "no-cache"
              ? []
              : eligible().filter((e) => !e.noStore && fits(e, active) && age(e, active) < e.maxAge)),
          ];
          if (!allowed.some((e) => response && equal(response, { body: e.body, etag: e.etag })))
            correct = false;
          // Deliberately not recorded: `allowed` (the oracle's own precomputed legal-answer set
          // for representation) is the grader's private verdict machinery, not observed candidate
          // behavior. It must never be exposed to anything grading this trace independently.
          deliveries.push({ id: active.id, response });
          active = null;
          index++;
          return { stored: true };
        },
        acknowledge: () => {
          if (active?.kind !== "purge") return { error: "event" };
          for (const tier of tiers) {
            const want = active.tiers.includes(tier)
              ? before[tier].filter((e) => e.path !== active.path)
              : before[tier];
            if (!equal(sort(cache[tier]), sort(want))) purge = false;
          }
          active = null;
          index++;
          return { stored: true };
        },
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  return {
    ...checks({
      completion: index === s.events.length && active === null,
      representation: correct,
      cache_provenance: provenance,
      invalidation_scope: purge,
      origin_load: calls <= s.limits.maxOriginRequests && bytes <= s.limits.maxOriginBytes,
      no_store: noStore,
    }),
    actual: { cache, deliveries, originRequests: calls, originBytes: bytes },
    input: { events: s.events, initial: Object.fromEntries(tiers.map((tier) => [tier, []])) },
    // `limits` is public (== view.limits, already handed to the subject) and genuinely needed to
    // judge origin_load; it lives at the top level, never inside `expected`, so it survives
    // ground-truth stripping. `expected` itself carries only verdict-adjacent scenario shape and
    // is intentionally still removed wholesale by that stripping.
    limits: s.limits,
    expected: { limits: s.limits, eventCount: s.events.length },
    observations,
    reports,
  };
}
