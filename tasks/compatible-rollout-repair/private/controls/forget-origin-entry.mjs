import { rollout } from './src/controller.mjs';
export const subject={async run(view,api) {
  try {return await rollout(view,api);} catch {return {job:view.job,results:[]};}
}};
