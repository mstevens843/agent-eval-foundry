import {run} from './src/dispatcher.mjs';
export const subject={run:(v,a)=>run(v,{...a,snapshot:async()=>{const s=await a.snapshot({});s.reservations.reverse();s.settlements.reverse();return s},resolve:async r=>{const x=await a.resolve(r);if(x.status==='UNKNOWN'){await a.resolve(r);await a.lookup({id:r.request.id});await a.resolve(r)}return x}},{recover:true})};
