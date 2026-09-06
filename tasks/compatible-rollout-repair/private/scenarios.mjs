export function scenarios() {
  return Array.from({ length: 12 }, (_, seed) => {
    const services = Array.from({ length: 4 }, (_, i) => ({
      id: `service-${i}`,
      abi: seed === 0 ? "a" : i % 2 ? "b" : "a",
      deployment: { release: `old-${i}`, generation: 1 },
      alias: { release: `old-${i}`, generation: 1 },
      cache: { release: `old-${i}`, abi: seed === 0 ? "a" : i % 2 ? "b" : "a" },
    }));
    const releases = [
      ...services.map((s, i) => ({ id: `old-${i}`, model: "prior", abi: s.abi, rank: i })),
      { id: "target-a", model: "requested", abi: "a", rank: 10 },
      { id: "target-b", model: "requested", abi: "b", rank: 11 },
      { id: "target-c", model: "requested", abi: "c", rank: 12 },
    ];
    if (seed === 0) releases.splice(5);
    return {
      id: `case-${String(seed).padStart(3, "0")}`,
      seed,
      services,
      releases,
      stages:
        seed === 0 ? [] : [{ id: "retained-build", service: "service-3", release: "old-3", generation: 1 }],
      failed: seed === 0 ? [] : [`service-${seed % 3}`],
      jobs: [
        {
          requests: (seed === 0 ? services.slice(0, 1) : services.slice(0, 3)).map((s, i) => ({
            service: s.id,
            model: seed % 4 === 0 && i === 1 ? "missing" : "requested",
          })),
        },
        ...(seed % 2 ? [{ requests: [{ service: "service-0", model: "requested" }] }] : []),
      ],
    };
  });
}
export const checkIds = [
  "completion",
  "compatibility",
  "observed_health",
  "binding",
  "cache",
  "rollback",
  "preservation",
  "cleanup",
  "reports",
];
