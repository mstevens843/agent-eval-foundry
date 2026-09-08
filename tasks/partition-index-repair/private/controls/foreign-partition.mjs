export function owners(p) {
  const m = new Map(p.map((x) => [x, 0]));
  return {
    assign: (e) => m.set(e.partition, e.generation),
    accept: (e) => (m.get(e.partition) ?? 0) === e.generation,
  };
}
