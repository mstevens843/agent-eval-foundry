import { principal } from "./context.mjs";
import { admit } from "./admission.mjs";
export async function dispatch(view, api, delivery) {
  const job = view.jobs.find((j) => j.id === delivery.jobId),
    receipt = await api.receipt({ jobId: job.id });
  const decision = receipt.decision ?? (await admit(api, job, principal(job, view.jobs)));
  const result = await api.finish({ deliveryId: delivery.id, decisionId: decision.id });
  if (result.error) throw Error(result.error);
}
