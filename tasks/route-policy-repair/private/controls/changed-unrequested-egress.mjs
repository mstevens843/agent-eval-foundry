import {plan} from './src/plan.mjs';
export const subject={async run(v,a){const c=plan(v),e=Object.keys(c.egresses).find(e=>!v.request.egresses.includes(e));if(e)c.egresses[e]=[];return a.publish({config:c})}};
