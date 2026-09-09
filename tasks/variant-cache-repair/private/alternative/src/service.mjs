import { resolve } from "./resolve.mjs";
import { purge } from "./store.mjs";
export async function run(view, api) {
  for (;;) {
    const step = await api.next({});
    if (step.done) break;
    if (step.error) throw Error(step.error);
    const e = step.event;
    if (e.kind === "purge") {
      await purge(api, e);
      await api.acknowledge({});
    } else {
      const entry = await resolve(api, e);
      await api.deliver({ response: { body: entry.body, etag: entry.etag } });
    }
  }
  return { complete: true };
}
