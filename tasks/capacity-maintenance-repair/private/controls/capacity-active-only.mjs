// BUG: sums only ACTIVE placements' size toward a host's capacity, letting provisioning rows
// occupy a host for free -- so the planner will happily stack a provisioning replacement onto a
// host that has no REAL room for it, as long as that host's pre-existing ACTIVE load alone fits.
export function admissible(v, s) {
  const services = new Map(v.services.map((x) => [x.id, x])),
    hosts = new Map(v.hosts.map((x) => [x.id, x]));
  if (s.placement.some((p) => !services.get(p.service).eligible.includes(p.host))) return false;
  if (
    v.hosts.some(
      (h) =>
        s.placement
          .filter((p) => p.host === h.id && p.phase === "active")
          .reduce((n, p) => n + services.get(p.service).size, 0) > h.capacity,
    )
  )
    return false;
  return v.services.every((service) => {
    const active = s.placement.filter((p) => p.service === service.id && p.phase === "active"),
      zones = Object.create(null);
    for (const p of active) {
      const z = hosts.get(p.host).zone;
      zones[z] = (zones[z] ?? 0) + 1;
    }
    return (
      active.length >= service.min &&
      active.length <= service.max &&
      Object.values(zones).every((n) => n <= service.perZone)
    );
  });
}
