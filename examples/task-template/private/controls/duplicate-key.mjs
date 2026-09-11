export const subject = {
  async run(view, api) {
    const rows = new Map();
    for (const r of view.records) if (!rows.has(r.key) || r.revision > rows.get(r.key).revision) rows.set(r.key, r);
    const latest = [...rows.values()];
    await api.publish({ rows: [...latest, ...latest] });
    return {};
  },
};
