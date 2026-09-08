import { order } from "./graph.mjs";
import { payload, changed } from "./payload.mjs";
import { audience } from "./audience.mjs";
export async function run(view, api) {
  for (let step; (step = await api.next({})) !== null; ) {
    const s = await api.snapshot({}),
      readings = new Map(s.readings.map((r) => [r.id, r])),
      current = new Map(),
      history = [...s.history],
      receipts = [...s.receipts];
    for (const r of history)
      if (!current.has(r.report) || current.get(r.report).version < r.version) current.set(r.report, r);
    for (const d of order(s.definitions)) {
      const p = payload(d, readings, current),
        old = current.get(d.id),
        isNew = !old || changed(p, old.payload);
      let record = old;
      if (isNew) {
        record = {
          report: d.id,
          version: (old?.version ?? 0) + 1,
          supersedes: old?.version ?? null,
          payload: p,
        };
        await api.publish({ record });
        current.set(d.id, record);
        history.push(record);
      }
      for (const recipient of audience(d.id, step.requests, receipts, isNew)) {
        if (
          receipts.some((r) => r.report === d.id && r.version === record.version && r.recipient === recipient)
        )
          continue;
        const kind = receipts.some((r) => r.report === d.id && r.recipient === recipient)
          ? "correction"
          : "initial";
        await api.deliver({ report: d.id, version: record.version, recipient, kind });
        receipts.push({ ...record, recipient, kind });
      }
    }
    for (const query of step.queries)
      await api.answer({
        id: query.id,
        payload: history.find((r) => r.report === query.report && r.version === query.version).payload,
      });
  }
  return { complete: true };
}
