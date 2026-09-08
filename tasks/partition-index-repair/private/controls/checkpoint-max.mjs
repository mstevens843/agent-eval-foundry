export function progress() {
  const m = new Map();
  return {
    finish(e, a) {
      const offset = Math.max(m.get(e.partition) ?? -1, e.offset);
      m.set(e.partition, offset);
      a.commit({ partition: e.partition, generation: e.generation, offset });
    },
  };
}
