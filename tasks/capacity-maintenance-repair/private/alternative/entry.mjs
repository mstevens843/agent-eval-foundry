export const subject = {
  async run(v, api) {
    const initial = await api.state({});
    // Find a safe temporary placement independently for one upgrade, restore, then continue.
    const encoded = (rows) =>
      rows
        .map((p) => p.host + "/" + p.service)
        .sort()
        .join(",");
    const valid = (rows) => {
      for (const h of v.hosts) {
        let load = 0;
        for (const p of rows) if (p.host === h.id) load += v.services.find((s) => s.id === p.service).size;
        if (load > h.capacity) return false;
      }
      for (const service of v.services) {
        const r = rows.filter((p) => p.service === service.id);
        if (
          r.length < service.min ||
          r.length > service.max ||
          r.some((p) => !service.eligible.includes(p.host))
        )
          return false;
        for (const zone of new Set(v.hosts.map((h) => h.zone)))
          if (r.filter((p) => v.hosts.find((h) => h.id === p.host).zone === zone).length > service.perZone)
            return false;
      }
      return true;
    };
    const done = [];
    while (done.length < v.requests.length) {
      const host = v.requests.find(
        (h) =>
          !done.includes(h) &&
          v.dependencies.filter((d) => d.after === h).every((d) => done.includes(d.before)),
      );
      const queue = [{ rows: initial.placement, path: [] }],
        seen = new Set([encoded(initial.placement)]);
      let found;
      for (let i = 0; i < queue.length; i++) {
        const q = queue[i];
        if (!q.rows.some((p) => p.host === host)) {
          found = q.path;
          break;
        }
        for (const h of v.hosts)
          for (const s of v.services) {
            const present = q.rows.some((p) => p.host === h.id && p.service === s.id);
            const rows = present
                ? q.rows.filter((p) => !(p.host === h.id && p.service === s.id))
                : [...q.rows, { host: h.id, service: s.id }],
              k = encoded(rows);
            if (!seen.has(k) && valid(rows)) {
              seen.add(k);
              queue.push({
                rows,
                path: [...q.path, { kind: present ? "remove" : "add", host: h.id, service: s.id }],
              });
            }
          }
      }
      if (!found) throw Error("evacuation unavailable");
      for (const { kind, ...x } of found) await api[kind](x);
      await api.maintain({ host });
      // Reverse a valid placement path; all states are the same safe states in reverse order.
      for (const { kind, ...x } of [...found].reverse()) await api[kind === "add" ? "remove" : "add"](x);
      done.push(host);
    }
    return await api.finish({});
  },
};
