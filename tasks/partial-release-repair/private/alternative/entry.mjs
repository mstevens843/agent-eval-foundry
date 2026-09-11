const equivalent = (a, b) =>
  a &&
  b &&
  a.payload === b.payload &&
  a.parents.length === b.parents.length &&
  a.parents.every((p) => b.parents.includes(p));
export const subject = {
  async run(v, api) {
    // Recompute authoritative state after each step; no precomputed removal/create plan and no
    // receipt polling at all -- generation is present on every inspected resource but is never
    // read. This is the strategy the contract explicitly still has to accept: always confirm the
    // current, authoritative state via a fresh api.inspect before deciding anything, rather than
    // trusting any receipt's resolution as evidence about a resource's current incarnation.
    const wanted = new Map(v.target.map((r) => [r.id, r]));
    for (let step = 0; step < 400; step++) {
      const current = (await api.inspect({})).resources,
        map = new Map(current.map((r) => [r.id, r]));
      const wrong = new Set(
        current.filter((r) => v.scope.includes(r.id) && !equivalent(r, wanted.get(r.id))).map((r) => r.id),
      );
      for (let round = 0; round < current.length; round++)
        for (const r of current) if (r.parents.some((p) => wrong.has(p))) wrong.add(r.id);
      if (wrong.size) {
        const leaf = current.find((r) => wrong.has(r.id) && !current.some((c) => c.parents.includes(r.id)));
        if (!leaf || !v.scope.includes(leaf.id)) throw Error("infeasible");
        await api.remove({ id: leaf.id });
        continue;
      }
      const missing = v.target.find((r) => !map.has(r.id) && r.parents.every((p) => map.has(p)));
      if (missing) {
        await api.create({ resource: missing });
        continue;
      }
      return { complete: true };
    }
    throw Error("work bound");
  },
};
