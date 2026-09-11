import { migrate } from './src/service.mjs';

export const subject = {
  run(view, api) {
    return migrate(view, { ...api, batch(request) {
      return api.batch({ ...request, updates: request.updates.map(update => ({
        auditTag: { tenant: update.tenant, id: update.id }, ...update
      })) });
    } });
  }
};
