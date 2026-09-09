import { equal, verdicts } from "./checker-utils.mjs";
function check(cell) {
  const { decisions, effects, finished } = cell.actual;
  const jobs = new Map(cell.view.jobs.map((j) => [j.id, j]));
  const encountered = new Set(cell.deliveries.map((d) => d.jobId));
  if (decisions.length !== encountered.size || new Set(decisions.map((d) => d.jobId)).size !== decisions.length) return false;
  if (cell.admissionPolicies.length !== decisions.length || finished.length !== cell.deliveries.length) return false;
  const expectedEffects = [];
  for (const [index, decision] of decisions.entries()) {
    if (!encountered.has(decision.jobId)) return false;
    const job = jobs.get(decision.jobId);
    let root = job;
    while (root.parent !== null) root = jobs.get(root.parent);
    if (decision.principal !== root.principal || decision.resource !== job.resource || decision.action !== job.action || !equal(decision.payload, job.payload)) return false;
    const admission = cell.admissionPolicies[index], policy = admission.policy;
    if (admission.jobId !== job.id || admission.revision !== decision.revision || policy.revision !== decision.revision) return false;
    const owner = policy.owners[job.resource];
    const edges = policy.grants.filter((g) => g.active && g.resources.includes(job.resource) && g.actions.includes(job.action));
    const queue = [owner], seen = new Set(queue);
    for (let at = 0; at < queue.length; at++) for (const grant of edges) {
      if (grant.from === queue[at] && !seen.has(grant.to)) { seen.add(grant.to); queue.push(grant.to); }
    }
    const allowed = seen.has(root.principal);
    if (decision.outcome !== (allowed ? "executed" : "denied") || !Array.isArray(decision.path)) return false;
    if (!allowed && decision.path.length) return false;
    if (allowed) {
      let node = owner;
      const visited = new Set([node]);
      for (const id of decision.path) {
        const edge = edges.find((e) => e.id === id);
        if (!edge || edge.from !== node || visited.has(edge.to)) return false;
        node = edge.to; visited.add(node);
      }
      if (node !== root.principal) return false;
      expectedEffects.push({ jobId: job.id, principal: root.principal, resource: job.resource,
        action: job.action, payload: job.payload, decisionId: decision.id });
    }
  }
  return equal(effects, expectedEffects) && finished.every((f, i) => f.deliveryId === cell.deliveries[i].id
    && f.jobId === cell.deliveries[i].jobId && decisions.some((d) => d.jobId === f.jobId && d.id === f.decisionId));
}
export const run = ({ cases }) => verdicts(cases, check);
