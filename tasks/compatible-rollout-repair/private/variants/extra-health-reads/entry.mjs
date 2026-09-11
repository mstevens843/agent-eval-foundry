import { rollout } from "./src/controller.mjs";
export const subject = { run(v,api) { return rollout(v,{...api,telemetry:async request=> {
  await api.telemetry(request); return api.telemetry(request);
}}); } };
