import { equal, verdicts } from "./checker-utils.mjs";
function valid(cell) {
  const { authorizations, decisions, effects, finished } = cell.actual,
    jobs = new Map(cell.view.jobs.map((j) => [j.id, j]));
  const encountered = new Set(cell.deliveries.map((d) => d.jobId));
  function allowed(record, policy) {
    const job = jobs.get(record.jobId);
    if (!job) return false;
    let root = job;
    while (root.parent !== null) root = jobs.get(root.parent);
    if (
      record.principal !== root.principal ||
      record.resource !== job.resource ||
      record.action !== job.action ||
      !equal(record.payload, job.payload) ||
      record.revision !== policy.revision
    )
      return false;
    const edges = policy.grants.filter(
      (g) => g.active && g.resources.includes(job.resource) && g.actions.includes(job.action),
    );
    const reached = new Set([policy.owners[job.resource]]),
      queue = [...reached];
    for (const p of queue)
      for (const g of edges)
        if (g.from === p && !reached.has(g.to)) {
          reached.add(g.to);
          queue.push(g.to);
        }
    if (record.outcome === "denied") return !reached.has(root.principal) && record.path.length === 0;
    let at = policy.owners[job.resource];
    const seen = new Set([at]);
    for (const id of record.path) {
      const g = edges.find((g) => g.id === id);
      if (!g || g.from !== at || seen.has(g.to)) return false;
      at = g.to;
      seen.add(at);
    }
    return at === root.principal;
  }
  if (
    decisions.length !== encountered.size ||
    new Set(decisions.map((d) => d.jobId)).size !== decisions.length ||
    finished.length !== cell.deliveries.length
  )
    return false;
  for (const a of authorizations) {
    const b = cell.boundaries.find((b) => b.kind === "admission" && b.id === a.id);
    if (!b || !allowed(a, b.policy)) return false;
  }
  for (const d of decisions) {
    const a = authorizations.find((a) => a.id === d.authorizationId);
    if (!a || a.jobId !== d.jobId || !encountered.has(d.jobId)) return false;
    if (
      !equal(
        {
          ...a,
          id: d.id,
          authorizationId: a.id,
          outcome: a.outcome === "authorized" ? "executed" : "denied",
        },
        d,
      )
    )
      return false;
    const matching = effects.filter((e) => e.decisionId === d.id);
    if (d.outcome === "denied") {
      if (matching.length) return false;
    } else {
      const b = cell.boundaries.find((b) => b.kind === "dispatch" && b.id === a.id);
      if (
        !b ||
        !allowed(a, b.policy) ||
        matching.length !== 1 ||
        !equal(matching[0], {
          jobId: a.jobId,
          principal: a.principal,
          resource: a.resource,
          action: a.action,
          payload: a.payload,
          decisionId: d.id,
          authorizationId: a.id,
          revision: b.policy.revision,
        })
      )
        return false;
    }
  }
  return (
    effects.length === decisions.filter((d) => d.outcome === "executed").length &&
    finished.every(
      (f, i) =>
        f.deliveryId === cell.deliveries[i].id &&
        f.jobId === cell.deliveries[i].jobId &&
        decisions.some((d) => d.id === f.decisionId && d.jobId === f.jobId),
    )
  );
}
export const run = ({ cases }) => verdicts(cases, valid);
