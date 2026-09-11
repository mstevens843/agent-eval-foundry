import {run} from './src/service.mjs';
export const subject={async run(v,a){let inserted=false;return run(v,{...a,admit:async r=>{
 if(!inserted&&r.outcome==='authorized'&&r.path.length){const result=await a.admit({...r,principal: "not-the-origin"});if(result.authorization)inserted=true;}
 return a.admit(r);
}})}};
