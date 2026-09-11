import { collect } from './pages.mjs';

// Wrong directory-key interpretations. Every decision uses public strings,
// never a scenario ID; ordinary tenant populations remain clean witnesses.
export async function probe(mode, view, api) {
  const alternate = tenant => {
    if (mode === 'paired') return JSON.stringify([tenant, view.team]);
    if (mode === 'case-folded') return tenant.toLowerCase();
    if (mode === 'trimmed') return tenant.trim();
    if (mode === 'numeric' && /^\d+$/.test(tenant)) return String(Number(tenant));
    return tenant;
  };
  const aliases = new Map(view.tenants.map(tenant => [tenant, alternate(tenant)])
    .filter(([tenant, alias]) => alias !== tenant && view.tenants.includes(alias)));
  if (!aliases.size) return;
  const selected = new Map((await collect(api))
    .filter(row => aliases.has(row.tenant) && row.status === 'open')
    .map(row => [JSON.stringify([row.tenant, row.id]), row]));
  for (const original of selected.values()) {
    const owner = (await api.resolve({ tenant: aliases.get(original.tenant), team: view.team })).owner;
    let applied = false;
    for (let retry = 0; retry < 4; retry++) {
      const row = await api.read({ tenant: original.tenant, id: original.id });
      const response = await api.batch({ updates: [{ tenant: row.tenant, id: row.id,
        revision: row.revision, patch: { owner, labels: [...row.labels] } }] });
      if (response.results[0].status === 'APPLIED') { applied = true; break; }
    }
    if (!applied) throw Error('directory probe failed to settle within the conflict bound');
  }
}
