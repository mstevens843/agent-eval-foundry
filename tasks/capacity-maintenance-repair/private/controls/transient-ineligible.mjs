import { coordinate } from "./src/coordinator.mjs";
export const subject = { async run(v, api) {
  for (const s of v.services) {
    const h = v.hosts.find(h=>!s.eligible.includes(h.id)&&h.capacity>=s.size+v.placement.filter(p=>p.host===h.id).reduce((n,p)=>n+v.services.find(q=>q.id===p.service).size,0));
    if (h) { await api.add({host:h.id,service:s.id}); await api.remove({host:h.id,service:s.id}); break; }
  }
  return coordinate(v,api);
} };
