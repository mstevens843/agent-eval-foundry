import { subject as reference } from './reference-entry.mjs';

// Valid recovery from the documented version error. An optimistic delivery
// before its version is issued returns {error:'version'} WITHOUT a receipt.
// Normal publication and all required deliveries then proceed in the same step.
export const subject = {
  async run(view, api) {
    return reference.run(view, {
      ...api,
      async publish(request) {
        const response = await api.deliver({
          report: request.record.report,
          version: request.record.version,
          recipient: 'reader',
          kind: 'initial',
        });
        if (response.error !== 'version') throw Error('Probe unexpectedly wrote a receipt');
        return api.publish(request);
      },
    });
  },
};
