import { session, checks, equal } from "./adapter.mjs";

// A placement row is {host, service, phase} where phase is "provisioning" or "active".
// The ORIGINAL scenario placement (s.placement / view.placement) is a bare {host,service}
// topology description -- it is what the final state must match, and every one of its rows
// starts life already "active" (pre-existing, already serving traffic before maintenance
// begins). Only rows the candidate creates via api.add start "provisioning".
const canonicalPairs = (rows) =>
  [...rows]
    .map((p) => ({ host: p.host, service: p.service }))
    .sort((a, b) => a.host.localeCompare(b.host) || a.service.localeCompare(b.service));
const canonicalPhased = (rows) =>
  [...rows].sort(
    (a, b) => a.host.localeCompare(b.host) || a.service.localeCompare(b.service) || a.phase.localeCompare(b.phase),
  );

// Capacity and eligibility are consumed/required by a placement in EITHER phase -- a
// provisioning instance already physically occupies the host and could never legitimately
// serve from an ineligible host, it just isn't counted as serving yet. Availability (min/max)
// and perZone are counted from ACTIVE placements ONLY: a provisioning placement does not yet
// help satisfy a service's floor/ceiling or a zone's occupancy limit.
export function invariants(v, rows) {
  const loads = Object.fromEntries(v.hosts.map((h) => [h.id, 0])),
    activeCounts = Object.create(null),
    zones = Object.create(null);
  let eligibility = true;
  for (const p of rows) {
    const service = v.services.find((s) => s.id === p.service),
      host = v.hosts.find((h) => h.id === p.host);
    if (!service || !host) return { capacity: false, availability: false, placement: false };
    loads[host.id] += service.size;
    eligibility &&= service.eligible.includes(host.id);
    if (p.phase === "active") {
      activeCounts[service.id] = (activeCounts[service.id] ?? 0) + 1;
      const k = JSON.stringify([service.id, host.zone]);
      zones[k] = (zones[k] ?? 0) + 1;
    }
  }
  return {
    capacity: v.hosts.every((h) => loads[h.id] <= h.capacity),
    availability: v.services.every(
      (s) => (activeCounts[s.id] ?? 0) >= s.min && (activeCounts[s.id] ?? 0) <= s.max,
    ),
    placement:
      eligibility &&
      v.services.every((s) => v.hosts.every((h) => (zones[JSON.stringify([s.id, h.zone])] ?? 0) <= s.perZone)),
  };
}

export async function runScenario(s, execute, storage) {
  let rows = structuredClone(s.placement).map((p) => ({ host: p.host, service: p.service, phase: "active" })),
    done = [],
    closed = false,
    legal = true;
  const observations = [],
    history = [],
    reports = [];
  const truth = { placement: canonicalPairs(s.placement), done: [...s.requests].sort() };
  const op = (fn) => (x) => {
    if (closed) {
      legal = false;
      return { ok: false, error: "finished" };
    }
    try {
      fn(x);
      history.push({ placement: structuredClone(rows), done: [...done], safety: invariants(s, rows) });
      return { ok: true };
    } catch (e) {
      legal = false;
      return { ok: false, error: String(e.message) };
    }
  };
  const identity = (host, service) => {
    if (!s.hosts.some((h) => h.id === host) || !s.services.some((x) => x.id === service))
      throw Error("unknown identity");
  };
  const add = op(({ host, service }) => {
    identity(host, service);
    if (rows.some((p) => p.host === host && p.service === service)) throw Error("placement precondition");
    rows.push({ host, service, phase: "provisioning" });
  });
  const remove = op(({ host, service }) => {
    identity(host, service);
    if (!rows.some((p) => p.host === host && p.service === service)) throw Error("placement precondition");
    rows = rows.filter((p) => !(p.host === host && p.service === service));
  });
  const activate = op(({ host, service }) => {
    identity(host, service);
    const row = rows.find((p) => p.host === host && p.service === service);
    if (!row || row.phase !== "provisioning") throw Error("activation precondition");
    row.phase = "active";
  });
  const maintain = op(({ host }) => {
    if (
      !s.requests.includes(host) ||
      done.includes(host) ||
      rows.some((p) => p.host === host) ||
      s.dependencies.filter((d) => d.after === host).some((d) => !done.includes(d.before))
    )
      throw Error("maintenance precondition");
    done.push(host);
  });
  await execute(
    session(
      { ...s, storage, id: undefined },
      {
        state: () => ({ placement: structuredClone(rows), done: [...done] }),
        add,
        remove,
        activate,
        maintain,
        finish: op(() => {
          closed = true;
        }),
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  return {
    ...checks({
      completion: closed && equal([...done].sort(), truth.done),
      capacity: history.every((h) => h.safety.capacity),
      availability: history.every((h) => h.safety.availability),
      placement: history.every((h) => h.safety.placement),
      restoration: equal(canonicalPairs(rows), truth.placement),
      readiness: rows.every((p) => p.phase === "active"),
      legal_operations: legal,
    }),
    actual: { placement: canonicalPhased(rows), done },
    expected: truth,
    history: history.map(({ placement, done }) => ({ placement, done })),
    observations,
    reports,
    // Legitimate PROBLEM input, not the answer: {hosts, services, placement, requests,
    // dependencies} is exactly what entry.mjs already receives as `view` (session() spreads
    // `s` -- minus storage/id -- into the candidate's own view), so a solver already has all of
    // it. It is not echoed back anywhere else in this return value. Without it, an
    // independently-written checker has no way to recompute the capacity/availability/placement
    // invariants itself (SEMANTICS.md's weighted-capacity / min-max / perZone / eligibility /
    // phase rules) and would be forced to trust `history`'s precomputed booleans -- which are a
    // grader-only verdict, not something a candidate's own execution trace demonstrates. Adding
    // it lets a checker replay the candidate's own successful add/remove/activate/maintain
    // observations and re-derive those invariants at every step, exactly as SEMANTICS.md requires
    // ("violations are independently graded at EVERY step, not just after maintenance").
    view: { hosts: s.hosts, services: s.services, placement: s.placement, requests: s.requests, dependencies: s.dependencies },
  };
}
