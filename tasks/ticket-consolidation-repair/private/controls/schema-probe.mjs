import { migrate } from './service.mjs';
import { collect } from './pages.mjs';
import { select } from './selection.mjs';

export async function probe(view, api, mode) {
  await migrate(view, api);
  // The tight public budget remains a clean witness for this schema-only fault.
  if (view.operationBudget < 100) return;
  const chosen = select(await collect(api), view)[0];
  if (!chosen) return;
  const row = await api.read({ tenant: chosen.tenant, id: chosen.id });
  const patch = { owner: row.owner, labels: [...row.labels] };
  if (mode === 'number') patch.labels = [42];
  if (mode === 'object') patch.labels = [{ label: 'invalid' }];
  if (mode === 'note') patch.note = 'forbidden';
  await api.batch({ updates: [{ tenant: row.tenant, id: row.id,
    revision: row.revision - 1, ...(mode === 'note' ? { auditTag: { purpose: 'request-metadata' } } : {}), patch }] });
}
