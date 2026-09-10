import { subject as reference } from './reference-entry.mjs';

// Valid alternate strategy: warm the second edge with the first origin-derived
// asset while handling the first get. Both tiers start empty in this scenario.
// No unrelated entry is removed; copying preserves every metadata field.
export const subject = {
  async run(view, api) {
    let warmed = false;
    return reference.run(view, {
      ...api,
      async write(request) {
        const result = await api.write(request);
        if (!warmed && request.tier === 'edge-a' && request.entries.length) {
          warmed = true;
          await api.write({ tier: 'edge-b', entries: request.entries });
        }
        return result;
      },
    });
  },
};
