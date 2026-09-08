function match(e, r) {
  if (e.path !== r.path || e.vary.includes("*")) return false;
  for (const h of e.vary) if ((e.headers[h] ?? "") !== (r.headers[h] ?? "")) return false;
  return true;
}
export const subject = {
  async run(view, api) {
    while (true) {
      const next = await api.next({});
      if (next.done) break;
      const r = next.event;
      const tiers = ["edge-a", "edge-b", "shield"],
        state = {};
      for (const t of tiers) state[t] = (await api.read({ tier: t })).entries;
      if (r.kind === "purge") {
        for (const t of r.tiers)
          await api.write({ tier: t, entries: state[t].filter((e) => e.path !== r.path) });
        await api.acknowledge({});
        continue;
      }
      const options = [...state[r.tier], ...state.shield].filter((e) => match(e, r));
      let chosen =
        r.headers["cache-control"] === "no-cache"
          ? null
          : options.find((e) => !e.noStore && e.storedAt + e.maxAge - e.age > r.now);
      if (!chosen) {
        const old = options.sort((a, b) => b.storedAt - a.storedAt)[0];
        const response = await api.origin(old ? { ifNoneMatch: old.etag } : {});
        chosen = {
          path: r.path,
          headers: r.headers,
          vary: response.vary,
          etag: response.etag,
          body: response.status === 304 ? old.body : response.body,
          maxAge: response.maxAge,
          age: response.age,
          storedAt: r.now,
          noStore: response.noStore,
        };
        const entries = state.shield.filter((e) => !match(e, r));
        if (!chosen.noStore && !chosen.vary.includes("*")) entries.unshift(chosen);
        await api.write({ tier: "shield", entries });
      }
      const entries = state[r.tier].filter((e) => !match(e, r));
      if (!chosen.noStore && !chosen.vary.includes("*")) entries.unshift(chosen);
      await api.write({ tier: r.tier, entries });
      await api.deliver({ response: { body: chosen.body, etag: chosen.etag } });
    }
    return { complete: true };
  },
};
