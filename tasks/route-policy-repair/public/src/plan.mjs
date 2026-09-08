import { specialize } from "./specialize.mjs";
export function plan(view) {
  return {
    ...structuredClone(view.config),
    policies: specialize(view.config.policies, view.request.preference),
  };
}
