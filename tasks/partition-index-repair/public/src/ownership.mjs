export function owners(partitions) {
  const map = new Map(partitions.map((p) => [p, 0]));
  return {
    assign: (e) => {
      if (map.has(e.partition)) map.set(e.partition, e.generation);
    },
    accept: (e) => map.get(e.partition) === e.generation,
  };
}
