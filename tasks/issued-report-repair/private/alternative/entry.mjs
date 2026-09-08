export const subject = {
  async run(v, api) {
    for (let step; (step = await api.next({})) !== null; ) {
      const s = await api.snapshot({}),
        history = [...s.history],
        receipts = [...s.receipts],
        ready = new Map(),
        remaining = [...s.definitions];
      while (remaining.length) {
        const i = remaining.findIndex((d) => d.inputs.every((r) => r.kind === "reading" || ready.has(r.id))),
          d = remaining.splice(i, 1)[0];
        const inputs = d.inputs.map((r) =>
          r.kind === "reading" ? s.readings.find((x) => x.id === r.id) : ready.get(r.id),
        );
        const values = inputs.map((r, i) => (d.inputs[i].kind === "reading" ? r.value : r.payload.value));
        const missing = values.includes(null),
          p = {
            status: missing ? "unavailable" : "available",
            value: missing
              ? null
              : d.op === "difference"
                ? values[0] - values[1]
                : values.reduce((a, b) => a + b, 0),
            sources: d.inputs.map((r, i) => ({ ...r, version: inputs[i].version })),
          };
        const old = history.filter((r) => r.report === d.id).sort((a, b) => b.version - a.version)[0];
        const changed =
          !old ||
          old.payload.status !== p.status ||
          old.payload.value !== p.value ||
          old.payload.sources.some((r, i) => r.version !== p.sources[i].version);
        const record = changed
          ? { report: d.id, version: (old?.version ?? 0) + 1, supersedes: old?.version ?? null, payload: p }
          : old;
        if (changed) {
          await api.publish({ record });
          history.push(record);
        }
        ready.set(d.id, record);
        const people = new Set(step.requests.filter((r) => r.report === d.id).map((r) => r.recipient));
        if (changed) for (const r of s.receipts) if (r.report === d.id) people.add(r.recipient);
        for (const recipient of people)
          if (
            !receipts.some(
              (r) => r.report === d.id && r.version === record.version && r.recipient === recipient,
            )
          ) {
            const kind = receipts.some((r) => r.report === d.id && r.recipient === recipient)
              ? "correction"
              : "initial";
            await api.deliver({ report: d.id, version: record.version, recipient, kind });
            receipts.push({ ...record, recipient, kind });
          }
      }
      for (const q of step.queries)
        await api.answer({
          id: q.id,
          payload: history.find((r) => r.report === q.report && r.version === q.version).payload,
        });
    }
    return { complete: true };
  },
};
