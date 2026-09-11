import {run} from './src/replay.mjs';export const subject={async run(v,a){const r=await run(v,a);r.steps[0].status='pending';return r}};
