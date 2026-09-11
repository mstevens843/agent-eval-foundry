import { coordinate } from "./src/coordinator.mjs";
export const subject = { run(v, api) { return coordinate(v, {...api, finish: async x => {
  const p = v.placement.find(p => v.services.find(s=>s.id===p.service).min < v.placement.filter(q=>q.service===p.service).length);
  if (p) { await api.remove(p); await api.add(p); }
  return api.finish(x);
}}); }};
