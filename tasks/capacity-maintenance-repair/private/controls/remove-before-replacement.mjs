import { plan } from "./src/planner.mjs";
export const subject = {
  async run(v, api) {
    // The safe order for a relocation is: add (provisioning) -> activate (new becomes active,
    // temporarily doubling the service's active count) -> remove (old, now safe since the
    // replacement already serves). This bug moves the removal of the OLD active placement to
    // occur BEFORE the replacement is activated instead of after, so the service's active count
    // genuinely dips below min for one step -- the correct plan's own ordering guarantees the
    // first "activate" for a service is always followed, somewhere later, by a "remove" of that
    // same service at a different host (the old placement being vacated).
    const actions = plan(v, await api.state({}));
    const i = actions.findIndex((a) => a.kind === "activate");
    if (i >= 0) {
      const j = actions.findIndex(
        (a, idx) => idx > i && a.kind === "remove" && a.service === actions[i].service && a.host !== actions[i].host,
      );
      if (j >= 0) {
        const [removeStep] = actions.splice(j, 1);
        actions.splice(i, 0, removeStep);
      }
    }
    for (const { kind, ...x } of actions) await api[kind](x);
    return api.finish({});
  },
};
