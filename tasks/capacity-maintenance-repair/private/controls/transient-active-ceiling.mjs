import { coordinate } from "./src/coordinator.mjs";
export const subject = { run(v, api) { return coordinate(v,{...api,finish:async request => {
  for (const s of v.services) {
    if (v.placement.filter(p=>p.service===s.id).length !== s.max) continue;
    const h=v.hosts.find(h=>s.eligible.includes(h.id)&&!v.placement.some(p=>p.host===h.id&&p.service===s.id)&&h.capacity>=s.size+v.placement.filter(p=>p.host===h.id).reduce((n,p)=>n+v.services.find(q=>q.id===p.service).size,0));
    if(h) { const x={host:h.id,service:s.id}; await api.add(x);await api.activate(x);await api.remove(x);break; }
  }
  return api.finish(request);
}}); } };
