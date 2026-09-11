// Ignores view.storage entirely and, on every delivery (including a redelivery after the
// crash boundary), walks pagination from scratch and unconditionally resettles every selected
// row with a full, fixed three-round attempt loop — never checking whether a row already
// landed correctly on a prior delivery before redoing its full settlement. Each individual
// write stays valid (revision-guarded, monotonic labels), so this is not wrong on an
// unconstrained budget; it is simply far more expensive than necessary after a crash, and on a
// scenario that also imposes a tight operation budget spanning both deliveries it exhausts that
// budget before finishing every row, leaving some selected rows unmigrated (`completion`).
export const subject = {
  async run(v, api) {
    let cursor = null;
    const selected = new Map();
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
      const owner = (await api.resolve({ tenant: initial.tenant, team: v.team })).owner;
      // BUG: always three full rounds, with no read-before-write short circuit for a row that
      // is already correct (e.g. because a prior, crashed delivery already migrated it).
      for (let attempt = 0; attempt < 3; attempt++) {
        const row = await api.read({ tenant: initial.tenant, id: initial.id });
        await api.batch({
          updates: [
            {
              tenant: row.tenant,
              id: row.id,
              revision: row.revision,
              patch: { owner, labels: [...new Set([...row.labels, v.marker])] },
            },
          ],
        });
      }
    }
    return { done: true };
  },
};
