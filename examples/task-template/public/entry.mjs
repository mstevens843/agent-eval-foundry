// Starter defect: last in input order is not necessarily the latest revision.
export const subject = {
  async run(view, api) {
    const rows = new Map();
    for (const record of view.records) rows.set(record.key, record);
    await api.publish({ rows: [...rows.values()] });
    return {};
  },
};
