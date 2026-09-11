import { install } from "./src/install.mjs";
export const subject = { async run(v, api) {
  const status = await api.status({});
  if (status.active !== v.release || status.staged !== null) {
    const failed = await api.write({path:"../invalid",entry:{kind:"file",mode:420,data:""}});
    if (failed.ok) throw Error("invalid path unexpectedly accepted");
  }
  return install(v,api);
} };
