import { session, equal, checks } from "./adapter.mjs";
export async function runScenario(s, execute, storage) {
  const services = new Map(s.services.map((x) => [x.id, structuredClone(x)])),
    stages = structuredClone(s.stages),
    observations = [],
    reports = [],
    actions = [],
    violations = [];
  let sequence = 10,
    stageId = 0,
    job = 0;
  let entry = new Map(),
    currentRequests = [];
  const catalog = ({ model }) => s.releases.filter((r) => r.model === model);
  const good = (id, release) => !s.failed.includes(id) || release === entry.get(id)?.deployment.release;
  const telemetry = ({ service }) => {
    const d = services.get(service).deployment;
    const ok = good(service, d.release);
    const rows = [
      { service, release: d.release, generation: d.generation, ok, sequence: ++sequence },
      { service, release: d.release, generation: d.generation, ok, sequence: ++sequence },
      { service, release: d.release, generation: d.generation - 1, ok: true, sequence: ++sequence },
      {
        service: "unrelated-sample",
        release: d.release,
        generation: d.generation,
        ok: true,
        sequence: ++sequence,
      },
    ];
    return rows;
  };
  const operations = {
    inventory: () => [...services.values()],
    catalog,
    stage: ({ service, release }) => {
      if (!services.has(service) || !s.releases.some((r) => r.id === release))
        throw Error("unknown deployment");
      if (!currentRequests.some((r) => r.service === service)) violations.push("preservation");
      const state = services.get(service);
      state.deployment = { release, generation: state.deployment.generation + 1 };
      stages.push({ id: `created-${++stageId}`, service, ...state.deployment });
      actions.push({ job, kind: "stage", service, ...state.deployment });
      return state.deployment;
    },
    telemetry,
    bind: ({ service, release, generation }) => {
      const state = services.get(service);
      if (!state) throw Error("unknown service");
      const seen = observations
        .filter((o) => o.method === "telemetry")
        .flatMap((o) => o.value)
        .filter((r) => r.service === service && r.release === release && r.generation === generation)
        .sort((a, b) => b.sequence - a.sequence)
        .slice(0, 2);
      if (
        !equal(state.deployment, { release, generation }) ||
        seen.length !== 2 ||
        seen.some((x) => !x.ok) ||
        !good(service, release)
      )
        violations.push("observed_health");
      if (s.releases.find((r) => r.id === release)?.abi !== state.abi) violations.push("compatibility");
      if (!currentRequests.some((r) => r.service === service)) violations.push("preservation");
      state.alias = { release, generation };
      actions.push({ job, kind: "bind", service, release, generation });
      return { ok: true };
    },
    warm: ({ service, release, abi }) => {
      const state = services.get(service);
      if (!state) throw Error("unknown service");
      if (state.alias.release !== release || state.abi !== abi) violations.push("cache");
      if (!currentRequests.some((r) => r.service === service)) violations.push("preservation");
      state.cache = { release, abi };
      return { ok: true };
    },
    stages: () => stages,
    cleanup: ({ id }) => {
      if (s.stages.some((r) => r.id === id)) violations.push("preservation");
      const index = stages.findIndex((x) => x.id === id);
      if (index !== -1) stages.splice(index, 1);
      return { ok: true };
    },
  };
  const verdicts = [];
  for (const input of s.jobs) {
    entry = new Map([...services].map(([id, v]) => [id, structuredClone(v)]));
    currentRequests = input.requests;
    const expected = input.requests.map((r) => {
      const service = entry.get(r.service),
        target = catalog({ model: r.model })
          .filter((x) => x.abi === service.abi)
          .sort((a, b) => b.rank - a.rank)[0];
      return {
        service: r.service,
        status: !target ? "unavailable" : good(r.service, target.id) ? "deployed" : "rolled-back",
        release: !target || !good(r.service, target.id) ? service.deployment.release : target.id,
      };
    });
    await execute(
      session({ job, storage, requests: input.requests }, operations, (r) => reports.push(r), observations),
    );
    verdicts.push({
      completion: expected.every((e) => services.get(e.service).deployment.release === e.release),
      compatibility: expected.every(
        (e) =>
          e.status === "unavailable" ||
          s.releases.find((r) => r.id === services.get(e.service).deployment.release)?.abi ===
            services.get(e.service).abi,
      ),
      binding: expected.every((e) =>
        e.status === "unavailable"
          ? equal(services.get(e.service), entry.get(e.service))
          : equal(services.get(e.service).alias, services.get(e.service).deployment),
      ),
      cache: expected.every(
        (e) =>
          e.status === "unavailable" ||
          equal(services.get(e.service).cache, { release: e.release, abi: services.get(e.service).abi }),
      ),
      rollback: expected
        .filter((e) => e.status === "rolled-back")
        .every((e) => services.get(e.service).deployment.release === entry.get(e.service).deployment.release),
      preservation: [...entry]
        .filter(([id]) => !input.requests.some((r) => r.service === id))
        .every(([id, v]) => equal(v, services.get(id))),
      cleanup: equal(stages, s.stages),
      reports: equal(reports.at(-1), { job, results: expected }),
    });
    job++;
  }
  return {
    ...checks(
      Object.fromEntries(
        [
          "completion",
          "compatibility",
          "observed_health",
          "binding",
          "cache",
          "rollback",
          "preservation",
          "cleanup",
          "reports",
        ].map((k) => [k, !violations.includes(k) && verdicts.every((v) => v[k] !== false)]),
      ),
    ),
    observations,
    reports,
    actions,
    violations,
    state: [...services],
    stages,
    verdicts,
  };
}
