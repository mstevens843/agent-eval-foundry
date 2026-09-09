import { principal } from "./context.mjs";
import { admit } from "./admission.mjs";
export async function dispatch(view, api, delivery) {
  const job = view.jobs.find((j) => j.id === delivery.jobId);
  const decision = await admit(api, job, principal(job, view.jobs));
  await api.finish({ deliveryId: delivery.id, decisionId: decision.id });
}
