import {run} from './src/dispatcher.mjs';
export const subject={async run(v,a){const r=await run(v,a);if(r.decisions.length)r.decisions[0]={...r.decisions[0],receipt:{invented:true}};return r}};
