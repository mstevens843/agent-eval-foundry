export const subject = {
  async run(view, api) {
    const latest = new Map();
    for (const row of view.records) {
      const previous = latest.get(row.key);
      if (!previous || row.revision > previous.revision) latest.set(row.key, row);
    }
    await api.publish({ rows: [...latest.values()] });
    return {};
  },
};
