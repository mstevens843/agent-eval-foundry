export function update(e, api) {
  api.put({ partition: e.partition, generation: e.generation, ...e.record });
}
