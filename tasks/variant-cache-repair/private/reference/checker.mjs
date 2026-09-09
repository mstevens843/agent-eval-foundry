import { equal, sorted, verdicts } from "./checker-utils.mjs";
const matches = (entry, event) => entry.path === event.path && !entry.vary.includes("*")
  && entry.vary.every((key) => (entry.headers[key] ?? "") === (event.headers[key] ?? ""));
function check(c) {
  const caches = structuredClone(c.input.initial);
  let active = null, before, facts = [], completed = 0, calls = 0, bytes = 0;
  const deliveries = [];
  for (const o of c.observations) {
    const r = o.request, value = o.value;
    if (o.method === "next" && value?.event) {
      if (active || !equal(value.event, c.input.events[completed])) return false;
      active = value.event; before = structuredClone(caches); facts = [];
    } else if (o.method === "write" && value?.stored === true) {
      if (!active) return false;
      if (active.kind === "get") {
        const legal = [...Object.values(before).flat(), ...facts];
        if (r.entries.some((e) => e.noStore || !legal.some((x) => equal(x, e)))) return false;
        if (before[r.tier].filter((e) => !matches(e, active)).some((e) => !r.entries.some((x) => equal(x, e)))) return false;
      }
      caches[r.tier] = structuredClone(r.entries);
    } else if (o.method === "origin" && !value?.error) {
      if (active?.kind !== "get") return false;
      calls++;
      if (value.body !== undefined) bytes += Buffer.byteLength(value.body);
      const old = [...before[active.tier], ...before.shield, ...facts].find((e) => matches(e, active) && e.etag === value.etag);
      if (value.status === 200 || old) facts.push({
        path: active.path, headers: active.headers, vary: value.vary, etag: value.etag,
        body: value.status === 200 ? value.body : old.body, maxAge: value.maxAge,
        age: value.age, storedAt: active.now, noStore: value.noStore,
      });
    } else if (o.method === "deliver" && value?.stored === true) {
      if (active?.kind !== "get") return false;
      const reusable = active.headers["cache-control"] === "no-cache" ? []
        : [...before[active.tier], ...before.shield].filter((e) => !e.noStore && matches(e, active) && e.age + active.now - e.storedAt < e.maxAge);
      if (![...facts, ...reusable].some((e) => equal(r.response, { body: e.body, etag: e.etag }))) return false;
      deliveries.push({ id: active.id, response: r.response }); active = null; completed++;
    } else if (o.method === "acknowledge" && value?.stored === true) {
      if (active?.kind !== "purge") return false;
      for (const tier of Object.keys(caches)) {
        const wanted = active.tiers.includes(tier) ? before[tier].filter((e) => e.path !== active.path) : before[tier];
        if (!equal(sorted(caches[tier]), sorted(wanted))) return false;
      }
      active = null; completed++;
    }
  }
  return active === null && completed === c.input.events.length
    && calls <= c.limits.maxOriginRequests && bytes <= c.limits.maxOriginBytes
    && calls === c.actual.originRequests && bytes === c.actual.originBytes
    && equal(deliveries, c.actual.deliveries)
    && Object.keys(caches).every((tier) => equal(sorted(caches[tier]), sorted(c.actual.cache[tier])));
}
export const run = ({ cases }) => verdicts(cases, check);
