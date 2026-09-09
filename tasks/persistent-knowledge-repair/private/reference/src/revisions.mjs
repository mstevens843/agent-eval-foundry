export function ingest(records, updates) {
  for (const record of updates) if (!Object.hasOwn(records, record.id) || record.revision > records[record.id].revision) records[record.id] = structuredClone(record);
}
