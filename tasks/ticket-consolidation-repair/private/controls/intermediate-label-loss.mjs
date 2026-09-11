import { migrate } from './src/service.mjs';
import { collect } from './src/pages.mjs';
import { select } from './src/selection.mjs';
export const subject = {
  async run(view, api) {
    const result = await migrate(view, api);
    if (view.tenants.length < 2 || view.operationBudget < 100) return result;
    const chosen = select(await collect(api), view)[0];
    if (!chosen) return result;
    const before = await api.read({ tenant: chosen.tenant, id: chosen.id });
    await api.batch({
      updates: [
        {
          tenant: before.tenant,
          id: before.id,
          revision: before.revision,
          patch: { owner: before.owner, labels: [view.marker] },
        },
      ],
    });
    const after = await api.read({ tenant: before.tenant, id: before.id });
    await api.batch({
      updates: [
        {
          tenant: after.tenant,
          id: after.id,
          revision: after.revision,
          patch: { owner: before.owner, labels: before.labels },
        },
      ],
    });
    return result;
  },
};
