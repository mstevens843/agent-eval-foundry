// Self-contained per-host strategy, deliberately shaped differently from the reference's single
// joint BFS over (placement x done): for each requested host, in dependency order, run a LOCAL
// search that only needs the target host to go empty (ignoring "done" entirely), execute it,
// call maintain, then run a SECOND local search back to the exact original topology (every
// original row present and ACTIVE) before moving to the next host. No src/ helper modules are
// shared with the reference implementation.
export const subject = {
  async run(v, api) {
    const services = new Map(v.services.map((s) => [s.id, s])),
      hosts = new Map(v.hosts.map((h) => [h.id, h]));
    const encode = (rows) =>
      JSON.stringify(
        [...rows]
          .map((p) => [p.host, p.service, p.phase])
          .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])),
      );
    // A state is valid when capacity/eligibility hold for every placement (either phase) and
    // availability/perZone hold for ACTIVE placements only -- the same rules the service itself
    // grades at every step, re-derived here independently so this solver can plan safely.
    const valid = (rows) => {
      for (const h of v.hosts) {
        let load = 0;
        for (const p of rows) if (p.host === h.id) load += services.get(p.service).size;
        if (load > h.capacity) return false;
      }
      for (const p of rows) if (!services.get(p.service).eligible.includes(p.host)) return false;
      for (const service of v.services) {
        const active = rows.filter((p) => p.service === service.id && p.phase === "active");
        if (active.length < service.min || active.length > service.max) return false;
        const zones = Object.create(null);
        for (const p of active) {
          const z = hosts.get(p.host).zone;
          zones[z] = (zones[z] ?? 0) + 1;
        }
        if (Object.values(zones).some((n) => n > service.perZone)) return false;
      }
      return true;
    };
    const neighbors = (rows) => {
      const out = [];
      for (const h of v.hosts)
        for (const service of v.services) {
          const row = rows.find((p) => p.host === h.id && p.service === service.id);
          if (!row)
            out.push({
              action: { kind: "add", host: h.id, service: service.id },
              rows: [...rows, { host: h.id, service: service.id, phase: "provisioning" }],
            });
          else {
            out.push({
              action: { kind: "remove", host: h.id, service: service.id },
              rows: rows.filter((p) => p !== row),
            });
            if (row.phase === "provisioning")
              out.push({
                action: { kind: "activate", host: h.id, service: service.id },
                rows: rows.map((p) => (p === row ? { ...p, phase: "active" } : p)),
              });
          }
        }
      return out;
    };
    const search = (startRows, isGoal) => {
      const queue = [{ rows: startRows, path: [] }],
        seen = new Set([encode(startRows)]);
      for (let i = 0; i < queue.length; i++) {
        const q = queue[i];
        if (isGoal(q.rows)) return q.path;
        for (const { action, rows } of neighbors(q.rows)) {
          const k = encode(rows);
          if (!seen.has(k) && valid(rows)) {
            seen.add(k);
            queue.push({ rows, path: [...q.path, action] });
          }
        }
      }
      return null;
    };
    const initial = await api.state({});
    const target = encode(initial.placement);
    const done = [];
    while (done.length < v.requests.length) {
      const host = v.requests.find(
        (h) => !done.includes(h) && v.dependencies.filter((d) => d.after === h).every((d) => done.includes(d.before)),
      );
      const before = (await api.state({})).placement;
      const evacuation = search(before, (rows) => !rows.some((p) => p.host === host));
      if (!evacuation) throw Error("evacuation unavailable");
      for (const { kind, ...x } of evacuation) await api[kind](x);
      const maintained = await api.maintain({ host });
      if (!maintained.ok) throw Error(maintained.error);
      const after = (await api.state({})).placement;
      const restoration = search(after, (rows) => encode(rows) === target);
      if (!restoration) throw Error("restoration unavailable");
      for (const { kind, ...x } of restoration) await api[kind](x);
      done.push(host);
    }
    return await api.finish({});
  },
};
