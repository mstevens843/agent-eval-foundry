import { run } from "./src/service.mjs";
export const subject = {
  run: async (view, api) => {
    const v = structuredClone(view);
    function walk(n) {
      const q = n.request;
      q.minZones = 1;
      n.children.forEach(walk);
    }
    walk(v.tree);
    return run(v, api);
  },
};
