// Sorting followed by first occurrence is a valid alternative to incremental comparison.
export const subject = {
  async run(view, api) {
    const seen = new Set(), rows = [];
    for (const row of view.records.toSorted((a, b) => b.revision - a.revision)) {
      if (seen.has(row.key)) continue;
      seen.add(row.key);
      rows.push(row);
    }
    await api.publish({ rows: rows.reverse() });
    return {};
  },
};
