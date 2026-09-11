import { probe } from './src/schema-probe.mjs';
export const subject = { run: (view, api) => probe(view, api, 'note') };
