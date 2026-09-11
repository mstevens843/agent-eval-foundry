export async function settle(initial, v, api) {
  const owner = (await api.resolve({ tenant: initial.tenant, team: v.team })).owner;
  let row = await api.read({ tenant: initial.tenant, id: initial.id });
  for (let attempt = 0; attempt < 3; attempt++) {
    if (row.owner === owner && row.labels.includes(v.marker)) return;
    const update = {
      tenant: row.tenant,
      id: row.id,
      revision: row.revision,
      patch: { owner, labels: [...new Set([...row.labels, v.marker])] },
    };
    const response = await api.batch({ updates: [update] });
    const result = response.results.find((r) => r.tenant === row.tenant && r.id === row.id);
    if (result?.status === "APPLIED") return;
    if (result?.status !== "CONFLICT") throw Error("ticket missing");
    row = await api.read({ tenant: row.tenant, id: row.id });
  }
  throw Error("ticket unresolved");
}
