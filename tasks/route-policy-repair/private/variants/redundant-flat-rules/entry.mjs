import {plan} from './src/plan.mjs';
export const subject={async run(v,a){await a.publish({config:{}});const config=plan(v);for(const rows of Object.values(config.egresses)){for(const r of rows){r.action.add.reverse();r.action.remove.reverse()}rows.push({when:{all:[{}],none:[{}]},action:{decision:'reject',add:[],remove:[]}})}return a.publish({config})}};
