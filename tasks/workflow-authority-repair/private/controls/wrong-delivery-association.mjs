import {run} from './src/service.mjs';
export const subject={run:(v,a)=>run(v,{...a,finish:r=>a.finish({...r,decisionId:'not-issued'})})};
