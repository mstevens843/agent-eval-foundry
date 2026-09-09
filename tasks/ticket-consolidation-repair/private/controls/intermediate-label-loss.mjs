import { migrate } from './src/service.mjs';
import { collect } from './src/pages.mjs';
import { select } from './src/selection.mjs';
export const subject = {run(view,api) {
  const result=migrate(view,api);
  if(view.tenants.length<2) return result;
  const chosen=select(collect(api),view)[0];
  if(!chosen) return result;
  const before=api.read({tenant:chosen.tenant,id:chosen.id});
  api.batch({updates:[{tenant:before.tenant,id:before.id,revision:before.revision,
    patch:{owner:before.owner,labels:[view.marker]}}]});
  const after=api.read({tenant:before.tenant,id:before.id});
  api.batch({updates:[{tenant:after.tenant,id:after.id,revision:after.revision,
    patch:{owner:before.owner,labels:before.labels}}]});
  return result;
}};
