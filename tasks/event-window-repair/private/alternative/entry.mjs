export const subject = {
  async run(v, api) {
    const input = [],
      emitted = new Set(),
      lateSent = new Set();
    for (let event; (event = await api.next({})) !== null; ) {
      input.push(event);
      const status = Object.fromEntries(v.partitions.map((p) => [p, { w: -1000, idle: false, end: false }]));
      const seen = new Set(),
        accepted = [],
        late = [];
      let frontier = -1000;
      for (const e of input) {
        const p = status[e.partition];
        if (e.kind === "data") {
          const id = JSON.stringify([e.partition, e.id]);
          if (seen.has(id)) continue;
          seen.add(id);
          if ((Math.floor(e.time / v.width) + 1) * v.width + v.lateness <= frontier) late.push(e);
          else accepted.push(e);
        } else {
          if (e.kind === "watermark") p.w = e.value;
          if (e.kind === "idle") p.idle = true;
          if (e.kind === "resume") p.idle = false;
          if (e.kind === "end") p.end = true;
          const live = Object.values(status).filter((p) => !p.end);
          if (!live.length) frontier = Infinity;
          else {
            const active = live.filter((p) => !p.idle);
            if (active.length) frontier = Math.max(frontier, Math.min(...active.map((p) => p.w)));
          }
        }
      }
      for (const e of late) {
        const id = JSON.stringify([e.partition, e.id]);
        if (!lateSent.has(id)) {
          await api.late({ event: e });
          lateSent.add(id);
        }
      }
      const groups = new Map();
      for (const e of accepted) {
        const start = Math.floor(e.time / v.width) * v.width,
          k = JSON.stringify([start, e.key]);
        const r = groups.get(k) ?? { start, key: e.key, total: 0, count: 0 };
        r.total += e.delta;
        r.count++;
        groups.set(k, r);
      }
      for (const [k, row] of groups)
        if (row.start + v.width + v.lateness <= frontier && !emitted.has(k)) {
          await api.emit({ row });
          emitted.add(k);
        }
    }
    return { completed: true };
  },
};
