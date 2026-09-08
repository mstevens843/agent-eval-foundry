export const subject = {
  run(v, a) {
    const selected = new Map();
    let cursor = null;
    do {
      const page = a.page({ cursor });
      if (page.status === "EXPIRED") {
        cursor = page.resume;
        continue;
      }
      for (const r of page.rows)
        if (v.tenants.includes(r.tenant) && r.status === "open")
          selected.set(JSON.stringify([r.tenant, r.id]), r);
      cursor = page.next;
    } while (cursor !== null);
    let pending = [...selected.values()];
    for (let round = 0; round < 3 && pending.length; round++) {
      const updates = pending
        .map((r) => a.read({ tenant: r.tenant, id: r.id }))
        .map((r) => ({
          tenant: r.tenant,
          id: r.id,
          revision: r.revision,
          patch: {
            owner: a.resolve({ tenant: r.tenant, team: v.team }).owner,
            labels: [...new Set([...r.labels, v.marker])],
          },
        }));
      const response = a.batch({ updates });
      pending = pending.filter((r, i) => response.results[i].status !== "APPLIED");
    }
    return { complete: true };
  },
};
