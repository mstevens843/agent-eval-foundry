// Real mid-job process death: `crashAfterStage: N` kills the subject's process right after its
// Nth `api.stage` call has already landed server-side (the targeted service's deployment record
// is updated and its generation bumped) but before that same attempt can see the response, run a
// health check, bind, warm, or clean up after it. The job is then redelivered identically — the
// real-world response to an attempt whose outcome was never confirmed, standing in for whatever
// process eventually picks the job back up.
//
// The crashed service is always one whose target release is genuinely healthy, so the interesting
// question is not "does it need a rollback" but "does the redelivered attempt trust the deployment
// stage() already landed for it without ever re-verifying". A subject that assumes success (binds
// straight away without a fresh telemetry check) trips `observed_health`, since no two-sample
// telemetry exists yet for that exact release/generation — attempt one crashed before ever calling
// `telemetry`. A subject that assumes failure or simply ignores the already-staged deployment
// (never binds/warms it at all) leaves alias/cache stale, tripping `binding`/`cache`. Both are
// already-existing check dimensions; a crash is simply the first thing to exercise them for a
// deployment that was staged but never confirmed. `stage`'s target is deliberately never a
// service the fixture marks `failed`: both the reference and alternative implementations compute
// their rollback-restore release from a fresh `inventory` read taken at the top of *this* attempt,
// which (correctly) equals the true job-entry release for every service *except* one a prior
// attempt of this same job already staged — so routing a real rollback through the crashed service
// would be testing an unrelated, pre-existing ambiguity, not the crash-recovery path this scenario
// targets. Other, untouched services in the same job are free to need a genuine rollback.
function crashCases() {
  const service = (i, abi) => ({
    id: `service-${i}`,
    abi,
    deployment: { release: `old-${i}`, generation: 1 },
    alias: { release: `old-${i}`, generation: 1 },
    cache: { release: `old-${i}`, abi },
  });
  const releasesFor = (services) => [
    ...services.map((s, i) => ({ id: `old-${i}`, model: "prior", abi: s.abi, rank: i })),
    { id: "target-a", model: "requested", abi: "a", rank: 10 },
    { id: "target-b", model: "requested", abi: "b", rank: 11 },
  ];
  const request = (i, model = "requested") => ({ service: `service-${i}`, model });
  const cases = [
    {
      // Baseline: three services; the crashed one and both others end up healthy.
      services: [service(0, "a"), service(1, "b"), service(2, "a")],
      failed: [],
      stages: [],
      requests: [request(0), request(1), request(2)],
    },
    {
      // The crashed service (service-0) is healthy; a different, never-touched-by-the-crash
      // service (service-1) independently needs a genuine rollback within the same redelivered
      // attempt — exercising crash recovery and ordinary rollback side by side in one job.
      services: [service(0, "a"), service(1, "b"), service(2, "a")],
      failed: ["service-1"],
      stages: [],
      requests: [request(0), request(1), request(2)],
    },
    {
      // The crashed service (service-0) is healthy; service-1 has no compatible release at all.
      services: [service(0, "a"), service(1, "b")],
      failed: [],
      stages: [],
      requests: [request(0), request(1, "missing")],
    },
    {
      // A genuinely unrelated, pre-existing staging record for an unrequested service must
      // survive the crash-recovery cleanup untouched, even while the recovery also needs to
      // reconcile the crashed service's own orphaned record — this catches an overzealous
      // "just delete everything in stages()" reaction to the crash (the original public bug).
      services: [service(0, "a"), service(1, "b"), service(2, "a"), service(3, "b")],
      failed: [],
      stages: [{ id: "retained-build", service: "service-3", release: "old-3", generation: 1 }],
      requests: [request(0), request(1), request(2)],
    },
  ];
  return cases.map((c, seed) => ({
    id: `case-crash-${String(seed).padStart(3, "0")}`,
    seed,
    services: c.services,
    releases: releasesFor(c.services),
    stages: c.stages,
    failed: c.failed,
    jobs: [{ requests: c.requests, crashAfterStage: 1 }],
  }));
}
export function scenarios() {
  return [...Array.from({ length: 12 }, (_, seed) => {
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
  }), ...crashCases(), ...crashCases().slice(0,2).map((c,i)=>({...c,id:`case-crash-rollback-${i}`,failed:[`service-${i}`],jobs:[{requests:c.jobs[0].requests,crashAfterStage:i+1}]}))];
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
