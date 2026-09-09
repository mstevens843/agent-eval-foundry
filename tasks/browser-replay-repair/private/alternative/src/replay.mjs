import { normalize } from "./recording.mjs";
import { resolveTarget } from "./resolver.mjs";
import { submitForm } from "./form.mjs";
import { journal } from "./journal.mjs";
export function replay(view, api) {
  const ledger = journal(view.storage);
  const steps = [];
  for (const event of normalize(view)) {
    const key = `${view.traceId}:${view.attempt}:${event.step}`;
    if (!ledger.has(key)) {
      const target = resolveTarget(event, api);
      if (!target || !submitForm(target, event, api)) break;
      ledger.mark(key);
    }
    steps.push({ step: event.step, status: "completed" });
  }
  return { traceId: view.traceId, steps };
}
