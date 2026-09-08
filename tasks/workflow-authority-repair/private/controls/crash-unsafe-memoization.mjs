// Avoids re-deciding a redelivered job using an in-memory Map instead of api.receipt(). This
// looks correct and passes every in-run duplicate delivery (the Map lives for the whole run), but
// the Map does not survive a real process crash: on resume, a fresh process starts with an empty
// Map, sees no reason not to decide the interrupted delivery again, and produces a second decision
// (and, for executed work, a second effect) for a job SEMANTICS.md already calls terminal once
// decided. Only a scenario that genuinely kills and restarts the process — not merely redelivers
// within one continuous run — can distinguish this from a correct receipt()-checking subject.
export const subject = {
  async run(view, api) {
    const seen = new Map();
    const byId = new Map(view.jobs.map((j) => [j.id, j]));
    function origin(job) {
      while (job.parent !== null) job = byId.get(job.parent);
      return job.principal;
    }
    function pathFor(policy, job, target) {
      const start = policy.owners[job.resource],
        queue = [{ principal: start, path: [], seen: new Set([start]) }];
      while (queue.length) {
        const current = queue.shift();
        if (current.principal === target) return current.path;
        for (const g of policy.grants)
          if (
            g.from === current.principal &&
            g.active &&
            g.resources.includes(job.resource) &&
            g.actions.includes(job.action) &&
            !current.seen.has(g.to)
          )
            queue.push({
              principal: g.to,
              path: [...current.path, g.id],
              seen: new Set([...current.seen, g.to]),
            });
      }
      return null;
    }
    for (;;) {
      const step = await api.take({});
      if (step.done) break;
      if (step.error) throw Error(step.error);
      const delivery = step.delivery,
        job = byId.get(delivery.jobId);
      let decision = seen.get(job.id);
      while (!decision) {
        const policy = await api.policy({}),
          principal = origin(job),
          path = pathFor(policy, job, principal);
        const result = await api.decide({
          jobId: job.id,
          revision: policy.revision,
          principal,
          resource: job.resource,
          action: job.action,
          payload: job.payload,
          outcome: path === null ? "denied" : "executed",
          path: path ?? [],
        });
        if (result.stale) continue;
        if (result.error) throw Error(result.error);
        decision = result.decision;
        seen.set(job.id, decision);
      }
      await api.finish({ deliveryId: delivery.id, decisionId: decision.id });
    }
    return { complete: true };
  },
};
