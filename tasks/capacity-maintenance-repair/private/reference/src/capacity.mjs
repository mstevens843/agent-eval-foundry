// Capacity and eligibility are consumed/required by a placement in EITHER phase. Availability
// (min/max) and perZone are counted from ACTIVE placements only -- a provisioning placement
// occupies the host but does not yet serve, so it neither helps nor hurts those two.
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
