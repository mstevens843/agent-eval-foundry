export function update(e, api) {
  const existing = api.read({ partition: e.partition, entity: e.record.entity });
  if (!existing || existing.version < e.record.version)
    api.put({ partition: e.partition, generation: e.generation, ...e.record });
}
