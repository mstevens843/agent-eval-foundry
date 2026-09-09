import { order } from "./src/graph.mjs";
import { payload, changed } from "./src/payload.mjs";
import { audience } from "./src/audience.mjs";
// Every report's payload is still computed in correct dependency order (using a local
// `current` map exactly like the reference), so every recorded status/value/sources is
// fully correct and matches what a correct implementation would compute. The only
// defect: the actual publish({record}) calls for reports computed in this step are
// issued in the REVERSE of that order, so a dependent's api.publish() lands before its
// own parent's api.publish() whenever this step creates a new version of both. Each
// report's OWN payload.sources still correctly names its parent's version -- that
// version just doesn't exist in the published history YET when this call is made,
// violating SEMANTICS.md's "reconcile ALL definitions in dependency order" without
// touching any computed value, delivery or answer.
async function run(_view, api) {
  for (let step; (step = await api.next({})) !== null; ) {
    const s = await api.snapshot({}),
      readings = new Map(s.readings.map((r) => [r.id, r])),
      current = new Map(),
      history = [...s.history],
      receipts = [...s.receipts];
    for (const r of history)
      if (!current.has(r.report) || current.get(r.report).version < r.version) current.set(r.report, r);
    const toPublish = [];
    for (const d of order(s.definitions)) {
      const p = payload(d, readings, current),
        old = current.get(d.id),
        isNew = !old || changed(p, old.payload);
      let record = old;
      if (isNew) {
        record = { report: d.id, version: (old?.version ?? 0) + 1, supersedes: old?.version ?? null, payload: p };
        toPublish.push(record);
        current.set(d.id, record);
      }
    }
    for (const record of [...toPublish].reverse()) {
      await api.publish({ record });
      history.push(record);
    }
    for (const record of toPublish) {
      for (const recipient of audience(record.report, step.requests, receipts, true)) {
        if (receipts.some((r) => r.report === record.report && r.version === record.version && r.recipient === recipient))
          continue;
        const kind = receipts.some((r) => r.report === record.report && r.recipient === recipient)
          ? "correction"
          : "initial";
        await api.deliver({ report: record.report, version: record.version, recipient, kind });
        receipts.push({ ...record, recipient, kind });
      }
    }
    for (const d of s.definitions) {
      const record = current.get(d.id);
      if (!record || toPublish.includes(record)) continue;
      for (const recipient of audience(d.id, step.requests, receipts, false)) {
        if (receipts.some((r) => r.report === d.id && r.version === record.version && r.recipient === recipient))
          continue;
        const kind = receipts.some((r) => r.report === d.id && r.recipient === recipient) ? "correction" : "initial";
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
export const subject = { run };
