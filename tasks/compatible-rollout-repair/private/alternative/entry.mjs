import { trackProgress } from "./src/progress.mjs";
import { origin } from "./src/origin.mjs";
import { plan, finalize } from "./src/controller.mjs";
import { cleanup } from "./src/cleanup.mjs";
// Two passes over the request list: every request is planned (target chosen, supersession
// checked, staged) before any request is finalized (health confirmed, rolled back if needed,
// published) — a batched shape, structurally distinct from reference's single per-request pass,
// backed by its own per-job storage format (src/origin.mjs).
export const subject = {
  async run(view, api) {
    api = trackProgress(view, api);
    const saved = await origin(view, api),
      inventory = new Map(saved.services.map((s) => [s.id, s])),
      plans = [];
    for (const request of view.requests) plans.push(await plan(request, inventory, api));
    const results = [];
    for (const item of plans) results.push(await finalize(item, api));
    await cleanup(saved.stages, api);
    return { job: view.job, results };
  },
};
