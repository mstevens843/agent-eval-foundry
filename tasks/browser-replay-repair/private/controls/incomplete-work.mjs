import { resolveTarget } from "./src/resolver.mjs";
import { submitForm } from "./src/form.mjs";
export const subject = {
  run(view, api) {
    for (const event of view.events) {
      if (!api.receipts({}).some((r) => r.step === event.step))
        submitForm(resolveTarget(event, api), event, api);
    }
    return { traceId: view.traceId, steps: view.events.map((e) => ({ step: e.step, status: "completed" })) };
  },
};
