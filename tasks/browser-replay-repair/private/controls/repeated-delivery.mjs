import { resolveTarget } from "./resolver.mjs";
import { submitForm } from "./form.mjs";
export function replay(view, api) {
  for (const event of view.events) submitForm(resolveTarget(event, api), event, api);
  return { traceId: view.traceId, steps: view.events.map((e) => ({ step: e.step, status: "completed" })) };
}
