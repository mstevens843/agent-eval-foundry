export const subject = {
  run(v, api) {
    const generations = Object.fromEntries(v.partitions.map((p) => [p, 0])),
      completed = Object.fromEntries(v.partitions.map((p) => [p, []])),
      checkpoints = Object.fromEntries(v.partitions.map((p) => [p, -1]));
    for (let e; (e = api.next({})) !== null; ) {
      if (!v.partitions.includes(e.partition)) continue;
      if (e.kind === "assignment") {
        generations[e.partition] = e.generation;
        continue;
      }
      if (generations[e.partition] !== e.generation) continue;
      const current = api.read({ partition: e.partition, entity: e.record.entity });
      if (current === null || current.version < e.record.version)
        api.put({ partition: e.partition, generation: e.generation, ...e.record });
      api.complete({
        partition: e.partition,
        generation: e.generation,
        offset: e.offset,
        eventId: e.eventId,
      });
      if (!completed[e.partition].includes(e.offset)) completed[e.partition].push(e.offset);
    }
    // Batch end commits instead of maintaining incremental prefix state.
    for (const p of v.partitions) {
      const sorted = completed[p].sort((a, b) => a - b);
      let prefix = -1;
      for (const n of sorted) {
        if (n === prefix + 1) prefix = n;
        else break;
      }
      if (prefix >= 0) api.commit({ partition: p, generation: generations[p], offset: prefix });
    }
    return { done: true };
  },
};
