export const subject = {
  async run(v, a) {
    const selected = new Map();
    let cursor = null;
    do {
      const page = await a.page({ cursor });
      if (page.status === "EXPIRED") {
        cursor = page.resume;
        continue;
      }
      for (const r of page.rows)
        if (v.tenants.includes(r.tenant) && r.status === "open") selected.set(JSON.stringify([r.tenant, r.id]), r);
      cursor = page.next;
    } while (cursor !== null);
    let pending = [...selected.values()];
    for (let round = 0; round < 3 && pending.length; round++) {
      const updates = [];
      for (const r of pending) {
        const current = await a.read({ tenant: r.tenant, id: r.id });
        updates.push({
          tenant: current.tenant,
          id: current.id,
          revision: current.revision,
          patch: {
            owner: (await a.resolve({ tenant: current.tenant, team: v.team })).owner,
            labels: [...new Set([...current.labels, v.marker])],
          },
        });
      }
      const response = await a.batch({ updates });
      // BUG: matches batch results to requests by array position instead of (tenant,id) identity,
      // even though results may be reordered.
      pending = pending.filter((r, i) => response.results[i].status !== "APPLIED");
    }
    return { complete: true };
  },
};
