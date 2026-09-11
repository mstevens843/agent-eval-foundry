// Exercise request rules after a correct migration. Decisions use public data only.
export async function probe(mode, view, api) {
  // Leave tight execution envelopes to the original migration and its budget controls.
  if (view.operationBudget < 100) return;
  const rows = new Map();
  let cursor = null;
  do {
    const page = await api.page({ cursor });
    if (page.status === 'EXPIRED') { cursor = page.resume; continue; }
    for (const row of page.rows) rows.set(JSON.stringify([row.tenant, row.id]), row);
    cursor = page.next;
  } while (cursor !== null);
  const population = [...rows.values()];
  const selected = row => view.tenants.includes(row.tenant) && row.status === 'open';
  const chosen = mode === 'closed-conflict'
    ? population.find(row => view.tenants.includes(row.tenant) && row.status === 'closed')
    : mode === 'outside-conflict'
      ? population.find(row => !view.tenants.includes(row.tenant))
      : population.find(selected);
  if (!chosen) return;
  const row = await api.read({ tenant: chosen.tenant, id: chosen.id });
  if (mode === 'temporary-owner') {
    const target = (await api.resolve({ tenant: row.tenant, team: view.team })).owner;
    let temporary = 'intermediate-owner';
    while (temporary === target || temporary === row.owner) temporary += '-other';
    for (const owner of [temporary, target]) {
      let settled = false;
      for (let attempt = 0; attempt < 4; attempt++) {
        const current = await api.read({ tenant: row.tenant, id: row.id });
        const result = await api.batch({ updates: [{ tenant: row.tenant, id: row.id,
          revision: current.revision, patch: { owner, labels: [...current.labels] } }] });
        if (result.results[0].status === 'APPLIED') { settled = true; break; }
      }
      if (!settled) throw Error('temporary owner could not settle within the conflict bound');
    }
    return;
  }
  const patch = { owner: row.owner, labels: [...row.labels] };
  const request = { tenant: row.tenant, id: row.id, revision: row.revision - 1, patch };
  if (mode === 'outside-missing') {
    let tenant = 'absent-tenant';
    while (view.tenants.includes(tenant) || population.some(item => item.tenant === tenant)) tenant += '-other';
    request.tenant = tenant;
    request.id = 'absent-ticket';
  }
  if (mode === 'conflict-forbidden-note') patch.note = 'forbidden';
  if (mode === 'conflict-forbidden-status') patch.status = 'closed';
  if (mode === 'conflict-forbidden-revision') patch.revision = 999;
  if (mode === 'conflict-invalid-owner') patch.owner = 42;
  if (mode === 'conflict-invalid-labels') patch.labels = 'not-an-array';
  // This request is legal when it conflicts: it has no label-removal effect.
  if (mode === 'stale-selected-conflict') patch.labels = [];
  await api.batch({ updates: [request] });
}
