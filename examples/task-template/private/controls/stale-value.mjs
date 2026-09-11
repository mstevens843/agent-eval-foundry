export const subject = {
  async run(view, api) {
    const rows = new Map();
    for (const r of view.records) if (!rows.has(r.key) || r.revision < rows.get(r.key).revision) rows.set(r.key, r);
    await api.publish({ rows: [...rows.values()] });
    return {};
  },
};
