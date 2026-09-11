import {plan} from './src/plan.mjs';
export const subject={async run(v,a){const c=plan(v);for(const rows of Object.values(c.egresses))for(const r of rows)if(r.action.decision==='reject')r.action.preference=997;return a.publish({config:c})}};
