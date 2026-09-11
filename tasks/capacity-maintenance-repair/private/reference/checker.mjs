import { equal, verdicts } from "./checker-utils.mjs";
const placement = (rows) =>
  rows
    .map((p) => [p.host, p.service, p.phase])
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]) || a[2].localeCompare(b[2]));
const pairs = (rows) =>
  rows.map((p) => [p.host, p.service]).sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
const state = (s) => ({ placement: placement(s.placement), done: [...s.done].sort() });

// Capacity/eligibility apply to a placement in EITHER phase; availability (min/max) and perZone
// are counted from ACTIVE placements only -- independently re-derived from the raw rows, never
// trusted from any precomputed verdict.
function safe(v, rows) {
  if (new Set(rows.map((p) => JSON.stringify([p.host, p.service]))).size !== rows.length) return false;
  if (rows.some((p) => !v.hosts.some((h) => h.id === p.host) || !v.services.some((s) => s.id === p.service)))
    return false;
  if (rows.some((p) => p.phase !== "active" && p.phase !== "provisioning")) return false;
  for (const host of v.hosts) {
    const load = rows
      .filter((p) => p.host === host.id)
      .reduce((n, p) => n + v.services.find((s) => s.id === p.service).size, 0);
    if (load > host.capacity) return false;
  }
  if (rows.some((p) => !v.services.find((s) => s.id === p.service).eligible.includes(p.host))) return false;
  for (const service of v.services) {
    const active = rows.filter((p) => p.service === service.id && p.phase === "active");
    if (active.length < service.min || active.length > service.max) return false;
    const zones = new Map();
    for (const p of active) {
      const zone = v.hosts.find((h) => h.id === p.host).zone;
      zones.set(zone, (zones.get(zone) ?? 0) + 1);
    }
    if ([...zones.values()].some((n) => n > service.perZone)) return false;
  }
  return true;
}
function check(c) {
  const v = c.view;
  let rows = structuredClone(v.placement).map((p) => ({ host: p.host, service: p.service, phase: "active" })),
    done = [],
    closed = false;
  const history = [];
  if (!safe(v, rows)) return false;
  for (const o of c.observations) {
    const { method, request: x, value } = o;
    if (method === "state") continue;
    if (closed || value?.ok !== true) return false;
    if (method === "add" || method === "remove" || method === "activate") {
      if (!v.hosts.some((h) => h.id === x.host) || !v.services.some((s) => s.id === x.service)) return false;
      if (method === "add") {
        if (rows.some((p) => p.host === x.host && p.service === x.service)) return false;
        rows = [...rows, { host: x.host, service: x.service, phase: "provisioning" }];
      } else if (method === "remove") {
        if (!rows.some((p) => p.host === x.host && p.service === x.service)) return false;
        rows = rows.filter((p) => p.host !== x.host || p.service !== x.service);
      } else {
        const row = rows.find((p) => p.host === x.host && p.service === x.service);
        if (!row || row.phase !== "provisioning") return false;
        rows = rows.map((p) => (p.host === x.host && p.service === x.service ? { ...p, phase: "active" } : p));
      }
    } else if (method === "maintain") {
      if (
        !v.hosts.some((h) => h.id === x.host) ||
        !v.requests.includes(x.host) ||
        done.includes(x.host) ||
        rows.some((p) => p.host === x.host)
      )
        return false;
      if (v.dependencies.some((d) => d.after === x.host && !done.includes(d.before))) return false;
      done = [...done, x.host];
    } else if (method === "finish") closed = true;
    else return false;
    if (!safe(v, rows)) return false;
    history.push(state({ placement: rows, done }));
  }
  return (
    closed &&
    equal([...done].sort(), [...v.requests].sort()) &&
    equal(pairs(rows), pairs(v.placement)) &&
    rows.every((p) => p.phase === "active") &&
    equal(state(c.actual), state({ placement: rows, done })) &&
    equal(c.history.map(state), history)
  );
}
export const run = ({ cases }) => verdicts(cases, check);
