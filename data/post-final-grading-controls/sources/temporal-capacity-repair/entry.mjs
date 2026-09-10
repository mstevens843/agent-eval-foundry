import { subject as reference } from './reference-entry.mjs';

// Valid alternate traversal: read the first page, then restart from null and
// exhaust that complete traversal. The frozen host issues a fresh opaque cursor
// on each initial fetch. There is no one-fetch-per-page requirement.
export const subject = {
  async run(view, api) {
    api.fetch({ cursor: null });
    return reference.run(view, api);
  },
};
