import {plan} from './src/plan.mjs';
export const subject={async run(v,a){const c=plan(v),e=Object.keys(c.egresses)[0];c.egresses[e].unshift({when:{all:[{prefix:'198.18.123.45/32'}],none:[]},action:{decision:'accept',preference:997,add:[],remove:[]}});return a.publish({config:c})}};
