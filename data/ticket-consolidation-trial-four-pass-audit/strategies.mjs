// New audit candidates. No reference or submitted implementation is imported.
const key = row => JSON.stringify([row.tenant, row.id]);
export async function collect(api) {
  const rows = new Map(); let cursor = null;
  for (;;) {
    const page = await api.page({ cursor });
    if (page.status === 'EXPIRED') { cursor = page.resume; continue; }
    for (const row of page.rows) rows.set(key(row), row);
    if (page.next === null) return [...rows.values()]; cursor = page.next;
  }
}
async function repair(view, api, mode = 'normal') {
  const rows = await collect(api), owners = new Map();
  const selected = rows.filter(r => view.tenants.includes(r.tenant) && r.status === 'open');
  for (const original of selected) {
    if (!owners.has(original.tenant)) owners.set(original.tenant, (await api.resolve({ tenant: original.tenant, team: view.team })).owner);
    const owner = owners.get(original.tenant);
    for (let retry = 0; retry < 5; retry++) {
      const row = await api.read({ tenant: original.tenant, id: original.id });
      if (mode === 'live-membership' && row.status !== 'open') break;
      if (row.owner === owner && new Set(row.labels).size === row.labels.length && row.labels.includes(view.marker)) break;
      const patch = { owner, labels: [...new Set([...row.labels, view.marker])].sort() };
      if (mode === 'wrong-owner') patch.owner += '-wrong';
      if (mode === 'missing-marker') patch.labels = row.labels.filter(x => x !== view.marker);
      const result = (await api.batch({ updates: [{ tenant: row.tenant, id: row.id, revision: row.revision, patch }] })).results[0];
      if (result.status === 'APPLIED') break;
      if (result.status !== 'CONFLICT') throw Error('unexpected missing selected row');
    }
  }
  return { rows, selected, owners };
}
export const names = [
  'sequential', 'two-stage', 'redundant', 'conflict-valid-patch', 'stale-valid-labels',
  'closed-conflict', 'outside-conflict', 'outside-missing',
  'conflict-forbidden-note', 'conflict-forbidden-status', 'conflict-forbidden-revision',
  'conflict-invalid-owner', 'conflict-invalid-labels',
  'applied-forbidden-note', 'applied-label-loss-then-restore', 'closed-applied',
  'wrong-owner', 'missing-marker', 'live-membership', 'complete-then-throw', 'complete-then-budget',
  'temporary-owner',
];
export function strategy(name) {
  return { async run(view, api) {
    if (['wrong-owner', 'missing-marker', 'live-membership'].includes(name)) return repair(view, api, name);
    if (name === 'two-stage') {
      const selected = (await collect(api)).filter(r => view.tenants.includes(r.tenant) && r.status === 'open');
      for (const original of selected) for (let retry = 0; retry < 4; retry++) {
        const row = await api.read({ tenant: original.tenant, id: original.id });
        const owner = (await api.resolve({ tenant: row.tenant, team: view.team })).owner;
        const status = (await api.batch({ updates: [{ tenant: row.tenant, id: row.id, revision: row.revision, patch: { owner, labels: row.labels } }] })).results[0].status;
        if (status === 'APPLIED') break;
      }
      return repair(view, api);
    }
    const context = await repair(view, api);
    if (name === 'sequential') return { complete: false };
    if (name === 'complete-then-throw') throw Error('audit error after complete migration');
    if (name === 'complete-then-budget') { for (let i = 0; i <= view.operationBudget; i++) await api.page({ cursor: null }); return; }
    const chosen = name.startsWith('closed-') ? context.rows.find(r => view.tenants.includes(r.tenant) && r.status === 'closed')
      : name === 'outside-conflict' ? context.rows.find(r => !view.tenants.includes(r.tenant)) : context.selected[0];
    if (!chosen) throw Error('audit fixture lacks target row');
    const row = await api.read({ tenant: chosen.tenant, id: chosen.id });
    const patch = { owner: row.owner, labels: [...row.labels] };
    const update = { tenant: row.tenant, id: row.id, revision: row.revision, patch };
    if (name === 'outside-missing') { update.tenant = 'unrelated-missing-tenant'; update.id = 'missing-ticket'; }
    if (name.includes('conflict') || name === 'stale-valid-labels') update.revision = row.revision - 1;
    if (name === 'conflict-forbidden-note' || name === 'applied-forbidden-note') patch.note = 'forbidden';
    if (name === 'conflict-forbidden-status') patch.status = 'closed';
    if (name === 'conflict-forbidden-revision') patch.revision = 999;
    if (name === 'conflict-invalid-owner') patch.owner = 42;
    if (name === 'conflict-invalid-labels') patch.labels = 'not-an-array';
    if (name === 'stale-valid-labels') patch.labels = [];
    if (name === 'applied-label-loss-then-restore') patch.labels = [];
    if (name === 'temporary-owner') patch.owner = 'temporary-owner';
    await api.batch({ updates: [update] });
    if (name === 'applied-label-loss-then-restore' || name === 'temporary-owner') {
      const now = await api.read({ tenant: row.tenant, id: row.id });
      await api.batch({ updates: [{ tenant: row.tenant, id: row.id, revision: now.revision, patch: { owner: row.owner, labels: row.labels } }] });
    }
    return { complete: true };
  } };
}
