import { principal } from "./context.mjs";
import { pathFor } from "./grants.mjs";
export async function run(view, api, { reverse = false, recover = false } = {}) {
  if (recover) await api.dispatch({ authorizationId: "missing", revision: -1 });
  for (;;) {
    const next = await api.take({});
    if (next.done) return { complete: true };
    const delivery = next.delivery,
      job = view.jobs.find((j) => j.id === delivery.jobId);
    let decision;
    for (;;) {
      const known = await api.outcome({ jobId: job.id });
      if (known.status === "TERMINAL") {
        decision = known.decision;
        break;
      }
      if (known.status === "PENDING") continue;
      const policy = await api.policy({});
      const p = principal(job, view.jobs),
        path = pathFor(reverse ? { ...policy, grants: [...policy.grants].reverse() } : policy, job, p);
      const admitted = await api.admit({
        jobId: job.id,
        revision: policy.revision,
        principal: p,
        resource: job.resource,
        action: job.action,
        payload: job.payload,
        outcome: path === null ? "denied" : "authorized",
        path: path ?? [],
      });
      if (admitted.decision) {
        decision = admitted.decision;
        break;
      }
      if (admitted.authorization)
        await api.dispatch({ authorizationId: admitted.authorization.id, revision: policy.revision });
    }
    await api.finish({ deliveryId: delivery.id, decisionId: decision.id });
  }
}
