import { session, checks, equal, canonical } from "./adapter.mjs";
const sorted = (a) => [...a].sort((a, b) => canonical(a).localeCompare(canonical(b)));
export function reconcile(definitions, readings, history) {
  const done = new Map(),
    created = [];
  function visit(id) {
    if (done.has(id)) return done.get(id);
    const d = definitions.find((d) => d.id === id),
      sources = [],
      values = [];
    for (const input of d.inputs) {
      const fact = input.kind === "reading" ? readings.find((r) => r.id === input.id) : visit(input.id);
      sources.push({ ...input, version: fact.version });
      values.push(input.kind === "reading" ? fact.value : fact.payload.value);
    }
    const unavailable = values.some((v) => v === null),
      payload = {
        status: unavailable ? "unavailable" : "available",
        value: unavailable
          ? null
          : d.op === "difference"
            ? values[0] - values[1]
            : values.reduce((n, v) => n + v, 0),
        sources,
      };
    const old = history
      .filter((r) => r.report === id)
      .reduce((a, b) => (!a || a.version < b.version ? b : a), null);
    const record =
      old && equal(old.payload, payload)
        ? old
        : { report: id, version: (old?.version ?? 0) + 1, supersedes: old?.version ?? null, payload };
    if (record !== old) created.push(record);
    done.set(id, record);
    return record;
  }
  for (const d of definitions) visit(d.id);
  return { current: done, created };
}
export function initial(s) {
  const history = s.initialPublished ? reconcile(s.definitions, s.readings, []).created : [];
  const receipts = s.initialAudience.flatMap(({ report, recipient }) => {
    const r = history.find((r) => r.report === report);
    return [{ report, version: r.version, recipient, kind: "initial", payload: r.payload }];
  });
  return { history, receipts };
}
export function expected(s) {
  const state = initial(s),
    readings = structuredClone(s.readings),
    publications = [],
    deliveries = [],
    answers = [];
  for (let after = 0; after < s.steps.length; after++) {
    const step = s.steps[after];
    for (const c of step.changes)
      readings.splice(
        readings.findIndex((r) => r.id === c.id),
        1,
        c,
      );
    const next = reconcile(s.definitions, readings, state.history),
      created = new Set(next.created.map((r) => r.report));
    for (const record of next.created) {
      state.history.push(record);
      publications.push({ after, record });
    }
    for (const [report, r] of next.current) {
      const recipients = new Set(step.requests.filter((q) => q.report === report).map((q) => q.recipient));
      if (created.has(report))
        for (const receipt of state.receipts)
          if (receipt.report === report) recipients.add(receipt.recipient);
      for (const recipient of recipients) {
        if (
          state.receipts.some(
            (x) => x.report === report && x.version === r.version && x.recipient === recipient,
          )
        )
          continue;
        const kind = state.receipts.some((x) => x.report === report && x.recipient === recipient)
          ? "correction"
          : "initial";
        const receipt = { report, version: r.version, recipient, kind, payload: r.payload };
        state.receipts.push(receipt);
        deliveries.push({ after, receipt });
      }
    }
    for (const q of step.queries)
      answers.push({
        after,
        id: q.id,
        payload: state.history.find((r) => r.report === q.report && r.version === q.version).payload,
      });
  }
  return { publications, deliveries, answers, history: state.history };
}
export async function runScenario(s, execute, storage) {
  const { history, receipts } = structuredClone(initial(s)),
    readings = structuredClone(s.readings),
    publications = [],
    deliveries = [],
    answers = [],
    observations = [],
    reports = [];
  let index = -1;
  await execute(
    session(
      { storage },
      {
        next: () => {
          index++;
          const step = s.steps[index];
          if (!step) return null;
          for (const c of step.changes)
            readings.splice(
              readings.findIndex((r) => r.id === c.id),
              1,
              structuredClone(c),
            );
          return { id: step.id, requests: step.requests, queries: step.queries };
        },
        snapshot: () => ({ readings, definitions: s.definitions, history, receipts }),
        publish: ({ record }) => {
          if (!record || typeof record.report !== "string" || !record.payload) return { error: "shape" };
          history.push(record);
          publications.push({ after: index, record });
          return { stored: true };
        },
        deliver: ({ report, version, recipient, kind }) => {
          const r = history.find((r) => r.report === report && r.version === version);
          if (!r) return { error: "version" };
          const receipt = { report, version, recipient, kind, payload: structuredClone(r.payload) };
          receipts.push(receipt);
          deliveries.push({ after: index, receipt });
          return { stored: true };
        },
        answer: ({ id, payload }) => {
          if (typeof id !== "string" || !payload) return { error: "shape" };
          answers.push({ after: index, id, payload });
          return { stored: true };
        },
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  const want = expected(s);
  return {
    ...checks({
      completion:
        index >= s.steps.length &&
        publications.length === want.publications.length &&
        answers.length === want.answers.length &&
        deliveries.length === want.deliveries.length,
      amendment_content: equal(sorted(publications), sorted(want.publications)),
      issued_history: equal(sorted(history), sorted(want.history)),
      recipient_scope: equal(sorted(deliveries), sorted(want.deliveries)),
      historical_answers: equal(sorted(answers), sorted(want.answers)),
    }),
    actual: { publications, deliveries, answers, history },
    input: { definitions: s.definitions, readings: s.readings, initial: initial(s), steps: s.steps },
    expected: want,
    observations,
    reports,
  };
}
