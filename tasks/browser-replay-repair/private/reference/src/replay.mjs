import { normalize } from "./recording.mjs";
import { resolveTarget } from "./resolver.mjs";
import { submitForm } from "./form.mjs";
export function replay(view, api) {
  const steps = [];
  for (const event of normalize(view)) {
    const completed = api.receipts({}).find((r) => r.traceId === view.traceId && r.step === event.step);
    if (!completed) {
      const node = resolveTarget(event, api);
      if (!submitForm(node, event, api)) throw Error("submission incomplete");
    }
    if (
      !api
        .receipts({})
        .some(
          (r) =>
            r.step === event.step &&
            r.entity === event.entity &&
            r.field === event.field &&
            r.value === event.value,
        )
    )
      throw Error("missing receipt");
    steps.push({ step: event.step, status: "completed" });
  }
  return { traceId: view.traceId, steps };
}
