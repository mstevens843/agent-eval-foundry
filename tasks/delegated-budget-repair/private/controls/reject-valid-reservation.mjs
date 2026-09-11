import {run} from './src/dispatcher.mjs';
export const subject={run:(v,a)=>run(v,{...a,resolve:r=>a.resolve({...r,outcome:(r.request.id==='reserve-A')?'rejected':r.outcome})})};
