import { rollout } from "./src/controller.mjs";
export const subject = { run(v,api) { return rollout(v,{...api,stage:async request=> {
  const d=await api.stage(request);
  await api.bind({service:request.service,...d});
  return d;
}}); } };
