export function admissible(v, s) {
  const services = new Map(v.services.map((x) => [x.id, x]));
  if (s.placement.some((p) => !services.get(p.service).eligible.includes(p.host))) return false;
  if (
    v.hosts.some(
      (h) =>
        s.placement.filter((p) => p.host === h.id).reduce((n, p) => n + services.get(p.service).size, 0) >
        h.capacity,
    )
  )
    return false;
  // BUG: perZone is never checked at all.
  return v.services.every((service) => {
    const active = s.placement.filter((p) => p.service === service.id && p.phase === "active");
    return active.length >= service.min && active.length <= service.max;
  });
}
