export const key = (s) =>
  JSON.stringify([
    s.placement
      .map((p) => [p.host, p.service, p.phase])
      .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])),
    [...s.done].sort(),
  ]);
export function apply(s, a) {
  const n = structuredClone(s);
  if (a.kind === "add") n.placement.push({ host: a.host, service: a.service, phase: "provisioning" });
  if (a.kind === "remove")
    n.placement = n.placement.filter((p) => !(p.host === a.host && p.service === a.service));
  if (a.kind === "activate")
    n.placement = n.placement.map((p) =>
      p.host === a.host && p.service === a.service ? { ...p, phase: "active" } : p,
    );
  if (a.kind === "maintain") n.done.push(a.host);
  return n;
}
export function actions(v, s) {
  const result = [];
  for (const h of v.hosts)
    for (const service of v.services) {
      const row = s.placement.find((p) => p.host === h.id && p.service === service.id);
      if (!row) result.push({ kind: "add", host: h.id, service: service.id });
      else {
        result.push({ kind: "remove", host: h.id, service: service.id });
        if (row.phase === "provisioning") result.push({ kind: "activate", host: h.id, service: service.id });
      }
    }
  for (const host of v.requests)
    if (
      !s.done.includes(host) &&
      !s.placement.some((p) => p.host === host) &&
      v.dependencies.filter((d) => d.after === host).every((d) => s.done.includes(d.before))
    )
      result.push({ kind: "maintain", host });
  return result;
}
