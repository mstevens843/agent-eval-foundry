import { migrate } from "./src/service.mjs";
import { collect } from "./src/pages.mjs";
export const subject = { async run(v, api) {
  await migrate(v,api);
  if (v.operationBudget < 100) return {};
  for (const initial of await collect(api)) if (v.tenants.includes(initial.tenant) && initial.status === "open") {
    const row = await api.read({tenant:initial.tenant,id:initial.id});
    await api.batch({updates:[{tenant:row.tenant,id:row.id,revision:row.revision,patch:{owner:row.owner,labels:row.labels}}]});
  }
  return {};
} };
