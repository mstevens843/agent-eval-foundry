function join(a, b) {
  const same = (x, y) => x.site === y.site && x.n === y.n;
  const kept = a.values.filter((v) => b.values.some((w) => same(v, w)) || (b.context[v.site] ?? 0) < v.n);
  for (const v of b.values)
    if (!kept.some((w) => same(v, w)) && (a.values.some((w) => same(v, w)) || (a.context[v.site] ?? 0) < v.n))
      kept.push(v);
  const context = { ...a.context };
  for (const [s, n] of Object.entries(b.context)) context[s] = Math.max(context[s] ?? 0, n);
  return { context, values: kept };
}
function canonical(state) {
  return JSON.stringify({
    context: Object.entries(state.context).filter(([, n]) => n !== 0).sort(([a], [b]) => a.localeCompare(b)),
    values: [...state.values].sort((a, b) => a.site.localeCompare(b.site) || a.n - b.n),
  });
}
export const subject = {
  run(v, api) {
    const snapshots = v.replicas.map((replica) => api.read({ replica }).documents);
    for (const document of v.documents) {
      const state = snapshots.reduce((a, s) => join(a, s[document] ?? { context: {}, values: [] }), {
        context: {},
        values: [],
      });
      for (const [i, replica] of v.replicas.entries())
        if (canonical(snapshots[i][document] ?? { context: {}, values: [] }) !== canonical(state))
          api.replace({ replica, document, state });
    }
    return { done: true };
  },
};
