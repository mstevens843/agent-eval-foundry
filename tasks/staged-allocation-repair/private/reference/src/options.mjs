export function options(node, resources, used, past) {
  const q = node.request,
    out = [];
  function choose(at, chosen) {
    if (chosen.length === q.units) {
      if (new Set(chosen.map((r) => r.zone)).size < q.minZones) return;
      out.push(chosen.map((r) => r.id));
      return;
    }
    for (let i = at; i < resources.length; i++) {
      const r = resources[i];
      if ((used[r.id] ?? 0) >= r.capacity || !q.tags.every((t) => r.tags.includes(t))) continue;
      if (q.antiWith.some((id) => past[id]?.includes(r.id))) continue;
      if (
        q.shareZoneWith &&
        !past[q.shareZoneWith].some((id) => resources.find((r) => r.id === id).zone === r.zone)
      )
        continue;
      choose(i + 1, [...chosen, r]);
    }
  }
  choose(0, []);
  return out;
}
export function consume(used, choice) {
  const next = { ...used };
  for (const id of choice) next[id] = (next[id] ?? 0) + 1;
  return next;
}
