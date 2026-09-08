export const subject = {
  async run(view, api) {
    const origins = {};
    function root(id) {
      if (Object.hasOwn(origins, id)) return origins[id];
      const j = view.jobs.find((x) => x.id === id);
      return (origins[id] = j.parent === null ? j.principal : root(j.parent));
    }
    for (;;) {
      const step = await api.take({});
      if (step.done) break;
      const delivery = step.delivery,
        job = view.jobs.find((j) => j.id === delivery.jobId);
      let { decision } = await api.receipt({ jobId: job.id });
      while (!decision) {
        const policy = await api.policy({}),
          origin = root(job.id),
          start = policy.owners[job.resource];
        function find(node, seen) {
          if (node === origin) return [];
          for (const edge of policy.grants.filter(
            (g) =>
              g.active &&
              g.from === node &&
              g.resources.includes(job.resource) &&
              g.actions.includes(job.action),
          )) {
            if (seen.has(edge.to)) continue;
            const rest = find(edge.to, new Set([...seen, edge.to]));
            if (rest !== null) return [edge.id, ...rest];
          }
          return null;
        }
        const path = find(start, new Set([start]));
        const response = await api.decide({
          jobId: job.id,
          revision: policy.revision,
          principal: origin,
          resource: job.resource,
          action: job.action,
          payload: job.payload,
          outcome: path === null ? "denied" : "executed",
          path: path ?? [],
        });
        if (response.stale) continue;
        if (response.error) throw Error(response.error);
        decision = response.decision;
      }
      await api.finish({ deliveryId: delivery.id, decisionId: decision.id });
    }
    return { complete: true };
  },
};
