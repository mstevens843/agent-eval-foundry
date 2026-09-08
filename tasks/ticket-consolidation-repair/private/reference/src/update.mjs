export function settle(initial, v, api) {
  const owner = api.resolve({ tenant: initial.tenant, team: v.team }).owner;
  let row = api.read({ tenant: initial.tenant, id: initial.id });
  for (let attempt = 0; attempt < 3; attempt++) {
    if (row.owner === owner && row.labels.includes(v.marker)) return;
    const update = {
      tenant: row.tenant,
      id: row.id,
      revision: row.revision,
      patch: { owner, labels: [...new Set([...row.labels, v.marker])] },
    };
    const result = api
      .batch({ updates: [update] })
      .results.find((r) => r.tenant === row.tenant && r.id === row.id);
    if (result?.status === "APPLIED") return;
    if (result?.status !== "CONFLICT") throw Error("ticket missing");
    row = api.read({ tenant: row.tenant, id: row.id });
  }
  throw Error("ticket unresolved");
}
