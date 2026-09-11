export async function settle(initial, v, a) {
  const owner = (await a.resolve({ tenant: initial.tenant, team: v.team })).owner;
  for (let i = 0; i < 3; i++) {
    const r = await a.read(initial);
    const out = await a.batch({
      updates: [
        {
          tenant: r.tenant,
          id: r.id,
          revision: r.revision,
          patch: { owner, labels: [...initial.labels, v.marker] },
        },
      ],
    });
    if (out.results[0].status === "APPLIED") return;
  }
}
