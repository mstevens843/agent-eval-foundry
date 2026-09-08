export function progress() {
  const positions = new Map();
  return {
    finish(e, api) {
      const previous = positions.get(e.partition) ?? -1;
      const offset = Math.max(previous, e.offset);
      positions.set(e.partition, offset);
      api.commit({ partition: e.partition, generation: e.generation, offset });
    },
  };
}
