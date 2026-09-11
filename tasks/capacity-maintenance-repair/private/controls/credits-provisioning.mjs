// BUG: counts a placement toward availability/perZone regardless of phase, instead of ACTIVE
// placements only -- so the planner believes a just-added provisioning replacement already
// satisfies a service's floor and its zone's ceiling, and never bothers to activate it before
// removing the old placement it was meant to replace.
export function admissible(v, s) {
  const services = new Map(v.services.map((x) => [x.id, x])),
    hosts = new Map(v.hosts.map((x) => [x.id, x]));
  if (s.placement.some((p) => !services.get(p.service).eligible.includes(p.host))) return false;
  if (
    v.hosts.some(
      (h) =>
        s.placement.filter((p) => p.host === h.id).reduce((n, p) => n + services.get(p.service).size, 0) >
        h.capacity,
    )
  )
    return false;
  return v.services.every((service) => {
    const rows = s.placement.filter((p) => p.service === service.id),
      zones = Object.create(null);
    for (const p of rows) {
      const z = hosts.get(p.host).zone;
      zones[z] = (zones[z] ?? 0) + 1;
    }
    return (
      rows.length >= service.min &&
      rows.length <= service.max &&
      Object.values(zones).every((n) => n <= service.perZone)
    );
  });
}
