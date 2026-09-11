import { pathFor } from "./grants.mjs";
export async function admit(api, job, origin) {
  for (;;) {
    const policy = await api.policy({}),
      path = pathFor(policy, job, origin);
    const result = await api.decide({
      jobId: job.id,
      revision: policy.revision,
      principal: origin,
      resource: job.resource,
      action: job.action,
      payload: job.payload,
      outcome: path === null ? "denied" : "executed",
      path: path ?? [],
    });
    if (result.stale) continue;
    if (result.error) throw Error(result.error);
    return result.decision;
  }
}
