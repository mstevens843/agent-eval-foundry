import {run} from './src/service.mjs';
export const subject={run:(v,a)=>run(v,{...a,admit:async r=>{await a.admit(r);return a.admit(r)},dispatch:async r=>{const x=await a.dispatch(r);await a.dispatch(r);return x}},{reverse:true,recover:true})};
