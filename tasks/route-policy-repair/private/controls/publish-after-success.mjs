import {plan} from './src/plan.mjs';
export const subject={async run(v,a){const config=plan(v);await a.publish({config});return a.publish({config})}};
