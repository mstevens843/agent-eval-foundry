import {run} from './src/service.mjs';export const subject={run:(v,a)=>run(v,{...a,ack:async()=>({stored:true})})};
