export function admissible(v, s) {
  return (
    v.hosts.every((h) => s.placement.filter((p) => p.host === h.id).length <= h.capacity) &&
    v.services.every((service) => {
      const rows = s.placement.filter((p) => p.service === service.id);
      return (
        rows.length >= service.min &&
        rows.length <= service.max &&
        rows.every((p) => service.eligible.includes(p.host))
      );
    })
  );
}
