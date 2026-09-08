export const subject = {
  run(v, api) {
    const selected = new Map();
    let cursor = null;
    do {
      const page = api.page({ cursor });
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
    // Independently batch all outstanding rows and match reordered per-row statuses by compound identity.
    for (let round = 0; round < 3 && pending.length; round++) {
      const updates = pending
        .map((r) => api.read({ tenant: r.tenant, id: r.id }))
        .map((r) => ({
          tenant: r.tenant,
          id: r.id,
          revision: r.revision,
          patch: {
            owner: api.resolve({ tenant: r.tenant, team: v.team }).owner,
            labels: [...new Set([v.marker, ...r.labels])],
          },
        }));
      const results = api.batch({ updates }).results;
      pending = pending.filter(
        (r) => !results.some((x) => x.tenant === r.tenant && x.id === r.id && x.status === "APPLIED"),
      );
    }
    if (pending.length) throw Error("incomplete migration");
    return { done: true };
  },
};
