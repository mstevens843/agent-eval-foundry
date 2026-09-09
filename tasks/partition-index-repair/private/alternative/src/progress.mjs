export function progress() {
  const parts = new Map();
  return {
    finish(e, api) {
      let p = parts.get(e.partition);
      if (!p) {
        p = { done: new Set(), offset: -1 };
        parts.set(e.partition, p);
      }
      p.done.add(e.offset);
      let next = p.offset;
      while (p.done.has(next + 1)) next++;
      if (next > p.offset) {
        p.offset = next;
        api.commit({ partition: e.partition, generation: e.generation, offset: next });
      }
    },
  };
}
