export function update(e, a) {
  a.put({ partition: e.partition, generation: e.generation, ...e.record });
}
