export function settle(row, v, a) {
  a.batch({
    updates: [
      {
        tenant: row.tenant,
        id: row.id,
        revision: row.revision,
        patch: {
          owner: a.resolve({ tenant: row.tenant, team: v.team }).owner,
          labels: [...new Set([...row.labels, v.marker])],
        },
      },
    ],
  });
}
