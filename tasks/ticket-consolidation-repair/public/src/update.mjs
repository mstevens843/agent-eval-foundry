export function settle(row, v, api) {
  const owner = api.resolve({ tenant: row.tenant, team: v.team }).owner;
  const patch = { owner, labels: [...new Set([...row.labels, v.marker])] };
  api.batch({ updates: [{ tenant: row.tenant, id: row.id, revision: row.revision, patch }] });
}
