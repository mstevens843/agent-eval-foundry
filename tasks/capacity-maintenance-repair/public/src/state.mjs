export const key = (s) =>
  s.placement
    .map((p) => p.host + ":" + p.service)
    .sort()
    .join(",") +
  "|" +
  [...s.done].sort().join(",");
export function apply(s, a) {
  const n = structuredClone(s);
  if (a.kind === "add") n.placement.push({ host: a.host, service: a.service });
  if (a.kind === "remove")
    n.placement = n.placement.filter((p) => !(p.host === a.host && p.service === a.service));
  if (a.kind === "maintain") n.done.push(a.host);
  return n;
}
export function actions(v, s) {
  const result = [];
  for (const h of v.hosts)
    for (const service of v.services) {
      const present = s.placement.some((p) => p.host === h.id && p.service === service.id);
      result.push({ kind: present ? "remove" : "add", host: h.id, service: service.id });
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
