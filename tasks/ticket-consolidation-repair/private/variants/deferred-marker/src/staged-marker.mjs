import { collect } from './pages.mjs';
import { select } from './selection.mjs';

// A legal first phase: settle ownership while preserving the current labels.
// The caller determines whether the required marker is added before completion.
export async function stageOwners(view, api) {
  for (const original of select(await collect(api), view)) {
    const owner = (await api.resolve({ tenant: original.tenant, team: view.team })).owner;
    let settled = false;
    for (let retry = 0; retry < 4; retry++) {
      const row = await api.read({ tenant: original.tenant, id: original.id });
      if (!row) throw Error('selected ticket disappeared');
      const response = await api.batch({ updates: [{ tenant: row.tenant, id: row.id,
        revision: row.revision, patch: { owner, labels: [...row.labels] } }] });
      if (response.results[0].status === 'APPLIED') { settled = true; break; }
    }
    if (!settled) throw Error('ownership did not settle within the conflict bound');
  }
}
