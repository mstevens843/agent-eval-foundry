import { session, checks, equal } from "./adapter.mjs";
const canonical = (rows) =>
  [...rows].sort((a, b) => a.host.localeCompare(b.host) || a.service.localeCompare(b.service));
export function invariants(v, rows) {
  const loads = Object.fromEntries(v.hosts.map((h) => [h.id, 0])),
    counts = Object.create(null),
    zones = Object.create(null);
  let eligibility = true;
  for (const p of rows) {
    const service = v.services.find((s) => s.id === p.service),
      host = v.hosts.find((h) => h.id === p.host);
    if (!service || !host) return { capacity: false, availability: false, placement: false };
    loads[host.id] += service.size;
    counts[service.id] = (counts[service.id] ?? 0) + 1;
    const k = JSON.stringify([service.id, host.zone]);
    zones[k] = (zones[k] ?? 0) + 1;
    eligibility &&= service.eligible.includes(host.id);
  }
  return {
    capacity: v.hosts.every((h) => loads[h.id] <= h.capacity),
    availability: v.services.every((s) => (counts[s.id] ?? 0) >= s.min && (counts[s.id] ?? 0) <= s.max),
    placement:
      eligibility &&
      v.services.every((s) => v.hosts.every((h) => (zones[JSON.stringify([s.id, h.zone])] ?? 0) <= s.perZone)),
  };
}
export async function runScenario(s, execute, storage) {
  let rows = structuredClone(s.placement),
    done = [],
    closed = false,
    legal = true;
  const observations = [],
    history = [],
    reports = [];
  const truth = { placement: canonical(s.placement), done: [...s.requests].sort() };
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
  const mutation =
    (add) =>
    ({ host, service }) => {
      if (!s.hosts.some((h) => h.id === host) || !s.services.some((x) => x.id === service))
        throw Error("unknown identity");
      const exists = rows.some((p) => p.host === host && p.service === service);
      if (exists === add) throw Error("placement precondition");
      if (add) rows.push({ host, service });
      else rows = rows.filter((p) => !(p.host === host && p.service === service));
    };
  await execute(
    session(
      { ...s, storage, id: undefined },
      {
        state: () => ({ placement: structuredClone(rows), done: [...done] }),
        add: op(mutation(true)),
        remove: op(mutation(false)),
        maintain: op(({ host }) => {
          if (
            !s.requests.includes(host) ||
            done.includes(host) ||
            rows.some((p) => p.host === host) ||
            s.dependencies.filter((d) => d.after === host).some((d) => !done.includes(d.before))
          )
            throw Error("maintenance precondition");
          done.push(host);
        }),
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
      restoration: equal(canonical(rows), truth.placement),
      legal_operations: legal,
    }),
    actual: { placement: canonical(rows), done },
    expected: truth,
    history: history.map(({ placement, done }) => ({ placement, done })),
    observations,
    reports,
    // Legitimate PROBLEM input, not the answer: {hosts, services, placement, requests,
    // dependencies} is exactly what entry.mjs already receives as `view` (session() spreads
    // `s` -- minus storage/id -- into the candidate's own view), so a solver already has all of
    // it. It is not echoed back anywhere else in this return value. Without it, an
    // independently-written checker has no way to recompute the capacity/availability/placement
    // invariants itself (SEMANTICS.md's weighted-capacity / min-max / perZone / eligibility
    // rules) and would be forced to trust `history`'s precomputed booleans -- which are a
    // grader-only verdict, not something a candidate's own execution trace demonstrates. Adding
    // it lets a checker replay the candidate's own successful add/remove/maintain observations
    // and re-derive those invariants at every step, exactly as SEMANTICS.md requires ("violations
    // are independently graded at EVERY step, not just after maintenance").
    view: { hosts: s.hosts, services: s.services, placement: s.placement, requests: s.requests, dependencies: s.dependencies },
  };
}
