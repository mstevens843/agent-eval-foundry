// Real mid-job process death: `crashAfter:{method,count}` kills the subject's process right after
// its Nth call to that method has already landed server-side (the effect is committed) but before
// that same attempt can see the response, run a health check, bind, warm, or clean up after it.
// The job is then redelivered identically — the real-world response to an attempt whose outcome
// was never confirmed, standing in for whatever process eventually picks the job back up.
//
// The crashed service is always one whose target release is genuinely healthy, so the interesting
// question is not "does it need a rollback" but "does the redelivered attempt trust the effect
// that already landed for it without ever re-verifying". A subject that assumes success (binds
// straight away without a fresh telemetry check) trips `observed_health`, since no two-sample
// telemetry exists yet for that exact release/generation — a crash before `telemetry` ever ran, or
// before `bind`/`warm` ever ran, leaves the same gap. A subject that assumes failure or simply
// ignores the already-staged deployment (never binds/warms it at all) leaves alias/cache stale,
// tripping `binding`/`cache`. A subject whose cleanup re-sweeps from a stale id list rather than a
// fresh `stages({})` read can call `cleanup` on a record its own earlier attempt (or this one)
// already removed, tripping `legal_operations`. All of these are already-existing check
// dimensions or a direct extension of one; a crash simply exercises them at a boundary the crashed
// attempt never got to confirm. `stage`'s target is deliberately never a service the fixture marks
// `failed`: both the reference and alternative implementations compute their rollback-restore
// release from a fresh `inventory` read taken at the top of *this* attempt, which (correctly)
// equals the true job-entry release for every service *except* one a prior attempt of this same
// job already staged — so routing a real rollback through the crashed service would be testing an
// unrelated, pre-existing ambiguity, not the crash-recovery path this scenario targets. Other,
// untouched services in the same job are free to need a genuine rollback.
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
    jobs: [{ requests: c.requests, crashAfter: { method: "stage", count: 1 } }],
  }));
}

// Same fault-injection mechanism, exercised at the bind/warm/cleanup boundaries instead of stage
// (see the crashCases() comment above for what each boundary probes). `case-crash-cleanup-000`
// reuses the crashCases() "retained record" shape so the crashed attempt's cleanup sweep has
// several of its own temporary records to remove, not just one, and a genuinely unrelated
// pre-existing record it must never touch.
function boundaryCases() {
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
  const baseline3 = [service(0, "a"), service(1, "b"), service(2, "a")];
  const baseline4 = [service(0, "a"), service(1, "b"), service(2, "a"), service(3, "b")];
  const cases = [
    { method: "bind", services: baseline3, stages: [], requests: [request(0), request(1), request(2)] },
    { method: "warm", services: baseline3, stages: [], requests: [request(0), request(1), request(2)] },
    {
      method: "cleanup",
      services: baseline4,
      stages: [{ id: "retained-build", service: "service-3", release: "old-3", generation: 1 }],
      requests: [request(0), request(1), request(2)],
    },
  ];
  return cases.map((c) => ({
    id: `case-crash-${c.method}-000`,
    seed: `boundary-${c.method}`,
    services: c.services,
    releases: releasesFor(c.services),
    stages: c.stages,
    failed: [],
    jobs: [{ requests: c.requests, crashAfter: { method: c.method, count: 1 } }],
  }));
}

// A later-dispatched job for the same service is authorized and runs to full completion while an
// earlier job for that service is sitting interrupted, not yet redelivered. When the earlier job
// finally resumes it must recognize the service moved on without it (compared against its own
// durable job-entry snapshot) and defer to the newer result instead of clobbering it. The two jobs
// request different models (so their target releases are genuinely distinct, not a coincidental
// match) and both targets are healthy — the point of this fixture is supersession detection, not
// health/rollback, which the crash-boundary fixtures above already cover on their own.
function supersessionCases() {
  const svc = {
    id: "service-0",
    abi: "a",
    deployment: { release: "old-0", generation: 1 },
    alias: { release: "old-0", generation: 1 },
    cache: { release: "old-0", abi: "a" },
  };
  const releases = [
    { id: "old-0", model: "prior", abi: "a", rank: 0 },
    { id: "target-v1", model: "requested-v1", abi: "a", rank: 10 },
    { id: "target-v2", model: "requested-v2", abi: "a", rank: 11 },
  ];
  return [
    {
      id: "case-supersession-000",
      seed: "supersession-0",
      services: [svc],
      releases,
      stages: [],
      failed: [],
      jobs: [
        {
          requests: [{ service: "service-0", model: "requested-v1" }],
          crashAfter: { method: "stage", count: 1 },
          supersedingJob: { requests: [{ service: "service-0", model: "requested-v2" }] },
        },
      ],
    },
  ];
}

export function scenarios() {
  return [
    ...Array.from({ length: 12 }, (_, seed) => {
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
    }),
    ...crashCases(),
    ...crashCases()
      .slice(0, 2)
      .map((c, i) => ({
        ...c,
        id: `case-crash-rollback-${i}`,
        failed: [`service-${i}`],
        jobs: [{ requests: c.jobs[0].requests, crashAfter: { method: "stage", count: i + 1 } }],
      })),
    ...boundaryCases(),
    ...["bind","warm","cleanup"].map(method => {
      const c = structuredClone(crashCases()[0]);
      c.id = "case-rollback-crash-" + method;
      c.failed = ["service-0"];
      c.jobs[0].crashAfter = {method,count:1};
      return c;
    }),
    ...supersessionCases(),
  ];
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
  "legal_operations",
  "supersession",
];
