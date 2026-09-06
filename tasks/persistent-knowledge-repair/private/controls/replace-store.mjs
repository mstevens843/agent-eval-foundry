export function ingest(records, updates) {
  if (updates.length) {
    for (const id of Object.keys(records)) delete records[id];
    for (const record of updates) records[record.id] = { ...record };
  }
}
