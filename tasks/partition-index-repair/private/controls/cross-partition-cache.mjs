const versions = new Map();
export function update(e, a) {
  if ((versions.get(e.record.entity) ?? 0) < e.record.version) {
    a.put({ partition: e.partition, generation: e.generation, ...e.record });
    versions.set(e.record.entity, e.record.version);
  }
}
