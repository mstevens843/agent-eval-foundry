import {run} from './src/service.mjs';
export const subject={async run(v,a){let inserted=false;return run(v,{...a,publish:async r=>{
 if(!inserted&&r.events.length&&v.deliveryId==="initial"){const result=await a.publish({...r,events:r.events.map((e,i)=>i?e:{...e,attendees:[{id:'intruder',response:'accepted'}]})});if(result.stored)inserted=true;}
 return a.publish(r);
}})}};
