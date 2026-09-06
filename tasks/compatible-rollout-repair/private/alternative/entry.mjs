// Two passes: stage all compatible consumers, then observe and publish each independently.
export const subject = {
  run(view, api) {
    const inventory = new Map(api.inventory({}).map((s) => [s.id, s])),
      retained = new Set(api.stages({}).map((x) => x.id)),
      plans = [];
    for (const request of view.requests) {
      const service = inventory.get(request.service),
        catalog = api.catalog({ model: request.model });
      let target = null;
      for (const candidate of catalog)
        if (candidate.abi === service.abi && (!target || candidate.rank > target.rank)) target = candidate;
      plans.push({
        service,
        target,
        deployment: target ? api.stage({ service: service.id, release: target.id }) : null,
      });
    }
    const results = [];
    for (const plan of plans) {
      const { service, target } = plan;
      let { deployment } = plan,
        status = "deployed";
      if (!target) {
        results.push({ service: service.id, status: "unavailable", release: service.deployment.release });
        continue;
      }
      const valid = () => {
        const rows = api
          .telemetry({ service: service.id })
          .filter(
            (s) =>
              s.service === service.id &&
              s.release === deployment.release &&
              s.generation === deployment.generation,
          )
          .sort((a, b) => a.sequence - b.sequence);
        return rows.length >= 2 && rows.slice(-2).every((s) => s.ok);
      };
      if (!valid()) {
        deployment = api.stage({ service: service.id, release: service.deployment.release });
        status = "rolled-back";
        if (!valid()) throw Error("rollback unavailable");
      }
      api.bind({ service: service.id, ...deployment });
      api.warm({ service: service.id, release: deployment.release, abi: service.abi });
      results.push({ service: service.id, status, release: deployment.release });
    }
    for (const item of api.stages({})) if (!retained.has(item.id)) api.cleanup({ id: item.id });
    return { job: view.job, results };
  },
};
