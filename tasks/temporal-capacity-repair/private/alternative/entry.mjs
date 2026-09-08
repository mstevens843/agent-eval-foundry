export const subject = {
  run(view, api) {
    const all = [];
    let c = null;
    do {
      const p = api.fetch({ cursor: c });
      all.push(...p.rows);
      c = p.next;
    } while (c !== null);
    for (const q of view.queries) {
      // Independently use reverse revision ordering and discrete integration over bounded integer ticks.
      const seen = new Set(),
        chosen = [];
      for (const r of [...all].sort((a, b) => b.revision - a.revision)) {
        const key = JSON.stringify([r.series, r.key]);
        if (r.series !== q.series || r.knownAt > q.knownAt || seen.has(key)) continue;
        seen.add(key);
        chosen.push(r);
      }
      let total = 0n;
      for (let t = q.from; t < q.to; t++)
        for (const r of chosen) if (r.value !== null && r.from <= t && t < r.to) total += BigInt(r.value);
      api.record({ id: q.id, total: String(total) });
    }
    return { complete: true };
  },
};
