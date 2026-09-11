import { migrate } from './src/service.mjs';

export const subject = {
  run(view, api) {
    return migrate(view, { ...api, batch(request) {
      return api.batch({ ...request, updates: request.updates.map(update => ({
        status: 'open', owner: 'historical', labels: [], note: 'request-only', ...update
      })) });
    } });
  }
};
