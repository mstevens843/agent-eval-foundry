import { rollout } from './src/controller.mjs';
export const subject={run(view,api) {
  try {return rollout(view,api);} catch {return {job:view.job,results:[]};}
}};
