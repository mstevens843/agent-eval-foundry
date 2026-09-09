import { equal, sorted, verdicts } from "./checker-utils.mjs";
function check(c) {
  const { definitions, initial, steps } = c.input;
  const readings = new Map(c.input.readings.map((r) => [r.id, r]));
  const history = [...initial.history], receipts = [...initial.receipts];
  const publications = [], deliveries = [], answers = [];
  for (const [after, step] of steps.entries()) {
    for (const reading of step.changes) readings.set(reading.id, reading);
    const current = new Map();
    for (const r of history)
      if (!current.has(r.report) || r.version > current.get(r.report).version) current.set(r.report, r);
    const pending = new Map(definitions.map((d) => [d.id, d]));
    const done = new Set(), changed = new Set();
    while (pending.size) {
      let progress = false;
      for (const [id, d] of pending) {
        if (d.inputs.some((s) => s.kind === "report" && !done.has(s.id))) continue;
        const resolved = d.inputs.map((s) => s.kind === "reading" ? readings.get(s.id) : current.get(s.id));
        const values = resolved.map((r, i) => d.inputs[i].kind === "reading" ? r.value : r.payload.value);
        const unavailable = values.includes(null);
        const payload = {
          status: unavailable ? "unavailable" : "available",
          value: unavailable ? null : d.op === "difference" ? values[0] - values[1] : values.reduce((a, b) => a + b, 0),
          sources: d.inputs.map((s, i) => ({ ...s, version: resolved[i].version })),
        };
        const old = current.get(id);
        if (!old || !equal(old.payload, payload)) {
          const record = { report: id, version: (old?.version ?? 0) + 1, supersedes: old?.version ?? null, payload };
          history.push(record); publications.push({ after, record }); current.set(id, record); changed.add(id);
        }
        pending.delete(id); done.add(id); progress = true;
      }
      if (!progress) return false;
    }
    for (const [report, record] of current) {
      const recipients = new Set(step.requests.filter((r) => r.report === report).map((r) => r.recipient));
      if (changed.has(report)) for (const r of receipts) if (r.report === report) recipients.add(r.recipient);
      for (const recipient of recipients) {
        if (receipts.some((r) => r.report === report && r.version === record.version && r.recipient === recipient)) continue;
        const kind = receipts.some((r) => r.report === report && r.recipient === recipient) ? "correction" : "initial";
        const receipt = { report, version: record.version, recipient, kind, payload: record.payload };
        receipts.push(receipt); deliveries.push({ after, receipt });
      }
    }
    for (const q of step.queries) answers.push({ after, id: q.id, payload: history.find((r) => r.report === q.report && r.version === q.version).payload });
  }
  const issued = new Set(initial.history.map((r) => JSON.stringify([r.report, r.version])));
  for (const o of c.observations) {
    if (o.method !== "publish" || o.value?.stored !== true) continue;
    const r = o.request.record;
    if (r.payload.sources.some((s) => s.kind === "report" && !issued.has(JSON.stringify([s.id, s.version])))) return false;
    issued.add(JSON.stringify([r.report, r.version]));
  }
  return c.observations.filter((o) => o.method === "next").length >= steps.length
    && equal(sorted(c.actual.publications), sorted(publications))
    && equal(sorted(c.actual.deliveries), sorted(deliveries))
    && equal(sorted(c.actual.answers), sorted(answers)) && equal(sorted(c.actual.history), sorted(history));
}
export const run = ({ cases }) => verdicts(cases, check);
