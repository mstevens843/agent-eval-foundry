export function admissible(v, s) {
  const services = new Map(v.services.map((x) => [x.id, x])),
    hosts = new Map(v.hosts.map((x) => [x.id, x]));
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
      rows.every((p) => service.eligible.includes(p.host)) &&
      Object.values(zones).every((n) => n <= service.perZone)
    );
  });
}
