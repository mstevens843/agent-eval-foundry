// Otherwise-correct migration that additionally re-reads each candidate row live right before
// settling it and, if the CURRENT status is no longer "open", treats it as disqualified and
// never issues a batch call for it. Membership is frozen at snapshot (page) time, not decided
// by a live read, so this incorrectly drops any row whose status concurrently drifted after
// selection — trips `membership` (the row is never touched) and, as a direct consequence,
// `completion` (the row never ends up migrated) on any scenario with a concurrent status flip.
export const subject = {
  async run(v, api) {
    const selected = new Map();
    let cursor = null;
    do {
      const page = await api.page({ cursor });
      if (page.status === "EXPIRED") {
        cursor = page.resume;
        continue;
      }
      for (const r of page.rows)
        if (v.tenants.includes(r.tenant) && r.status === "open") selected.set(JSON.stringify([r.tenant, r.id]), r);
      cursor = page.next;
    } while (cursor !== null);
    for (const initial of selected.values()) {
      const current = await api.read({ tenant: initial.tenant, id: initial.id });
      // BUG: a live status re-check is used to decide membership, contradicting the frozen
      // snapshot-time selection above.
      if (!current || current.status !== "open") continue;
      const owner = (await api.resolve({ tenant: initial.tenant, team: v.team })).owner;
      let row = current;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (row.owner === owner && row.labels.includes(v.marker)) break;
        const update = {
          tenant: row.tenant,
          id: row.id,
          revision: row.revision,
          patch: { owner, labels: [...new Set([...row.labels, v.marker])] },
        };
        const response = await api.batch({ updates: [update] });
        const result = response.results.find((x) => x.tenant === row.tenant && x.id === row.id);
        if (result?.status === "APPLIED") break;
        if (result?.status !== "CONFLICT") break;
        row = await api.read({ tenant: row.tenant, id: row.id });
      }
    }
    return { done: true };
  },
};
