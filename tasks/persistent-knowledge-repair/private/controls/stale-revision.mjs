export function ingest(records, updates) {
  for (const record of updates) records[record.id] ??= { ...record };
}
