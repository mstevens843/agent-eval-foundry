import { install } from "./src/install.mjs";
export const subject = { run(v,api) { return install(v,{...api,finish:async x=> {
  const result=await api.finish(x);await api.remove({path:"app"});return result;
}}); } };
