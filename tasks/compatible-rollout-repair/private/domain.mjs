import { session, equal, checks } from "./adapter.mjs";
import { runAttempt, deliver } from "./restart.mjs";

const CHECK_NAMES = [
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

export async function runScenario(s, execute, storage) {
  const services = new Map(s.services.map((x) => [x.id, structuredClone(x)])),
    stages = structuredClone(s.stages),
    reports = [],
    actions = [],
    violations = [], stageOwners = new Map(s.stages.map(x => [x.id, null])), usedStageIds = new Set(s.stages.map(x => x.id));
  let sequence = 10,
    stageId = 0;
  // `current` is the single mutable "which job/attempt is live right now" context that every
  // operation closure reads. It is reassigned (never merged) at the start of each attempt a job
  // makes, including the resumed attempt of a job whose first attempt was interrupted — see
  // runJob below. There is never more than one attempt in flight at a time (no real concurrency),
  // so a plain reassignment is always safe and unambiguous.
  let current = null;

  const catalog = ({ model }) => s.releases.filter((r) => r.model === model);
  const good = (id, release, entryMap) => !s.failed.includes(id) || release === entryMap.get(id)?.deployment.release;
  const telemetry = ({ service }) => {
    const d = services.get(service).deployment;
    const ok = good(service, d.release, current.entry);
    return [
      { service, release: d.release, generation: d.generation, ok, sequence: ++sequence },
      { service, release: d.release, generation: d.generation, ok, sequence: ++sequence },
      { service, release: d.release, generation: d.generation - 1, ok: true, sequence: ++sequence },
      { service: "unrelated-sample", release: d.release, generation: d.generation, ok: true, sequence: ++sequence },
    ];
  };
  const operations = {
    // Read-only queries return snapshots, not live references into domain state: a caller that
    // persists an `inventory`/`stages` read as its "job entry" baseline (the durable-journal
    // pattern both reference implementations use) must see a stable value, not one that silently
    // mutates in place as this same attempt's own later stage()/cleanup() calls run.
    inventory: () => structuredClone([...services.values()]),
    catalog,
    stage: ({ service, release }) => {
      if (!services.has(service) || !s.releases.some((r) => r.id === release))
        throw Error("unknown deployment");
      if (!current.requests.some((r) => r.service === service)) violations.push("preservation");
      const state = services.get(service);
      state.deployment = { release, generation: state.deployment.generation + 1 };
      let id;
      do { id = `created-${++stageId}`; } while (usedStageIds.has(id));
      usedStageIds.add(id); stageOwners.set(id, current.job);
      stages.push({ id, service, ...state.deployment });
      actions.push({ job: current.job, kind: "stage", stageId: id, service, ...state.deployment });
      return state.deployment;
    },
    telemetry,
    bind: ({ service, release, generation }) => {
      const state = services.get(service);
      if (!state) throw Error("unknown service");
      const seen = current.observations
        .filter((o) => o.method === "telemetry")
        .flatMap((o) => o.value)
        .filter((r) => r.service === service && r.release === release && r.generation === generation)
        .sort((a, b) => b.sequence - a.sequence)
        .slice(0, 2);
      if (
        !equal(state.deployment, { release, generation }) ||
        seen.length !== 2 ||
        seen.some((x) => !x.ok) ||
        !good(service, release, current.entry)
      )
        violations.push("observed_health");
      if (s.releases.find((r) => r.id === release)?.abi !== state.abi) violations.push("compatibility");
      if (!current.requests.some((r) => r.service === service)) violations.push("preservation");
      state.alias = { release, generation };
      actions.push({ job: current.job, kind: "bind", service, release, generation });
      return { ok: true };
    },
    warm: ({ service, release, abi }) => {
      const state = services.get(service);
      if (!state) throw Error("unknown service");
      if (state.alias.release !== release || state.abi !== abi || !equal(state.alias, state.deployment) || !good(service, release, current.entry)) violations.push("cache");
      if (!current.requests.some((r) => r.service === service)) violations.push("preservation");
      state.cache = { release, abi };
      actions.push({ job: current.job, kind: "warm", service, release, abi });
      return { ok: true };
    },
    stages: () => structuredClone(stages),
    // Cleanup is no longer a silent no-op on an id that isn't currently a live stage record: any
    // such call is now an illegal operation (`legal_operations`), independent of whether the id
    // also happens to belong to a genuinely pre-existing, unrelated record (`preservation`,
    // unchanged). A solver that always re-reads `stages({})` immediately before sweeping (the
    // pattern both reference implementations already use) never calls cleanup on an id that isn't
    // there, crash or no crash — this only trips for a solver that cleans from a stale/remembered
    // id list instead of the live one.
    cleanup: ({ id }) => {
      if (stageOwners.has(id) && stageOwners.get(id) !== current.job) violations.push("preservation");
      const index = stages.findIndex((x) => x.id === id);
      if (index === -1) violations.push("legal_operations");
      else stages.splice(index, 1);
      return { ok: true };
    },
  };

  const computeExpected = (entryMap, requests) =>
    requests.map((r) => {
      const service = entryMap.get(r.service),
        target = catalog({ model: r.model })
          .filter((x) => x.abi === service.abi)
          .sort((a, b) => b.rank - a.rank)[0];
      return {
        service: r.service,
        status: !target ? "unavailable" : good(r.service, target.id, entryMap) ? "deployed" : "rolled-back",
        release: !target || !good(r.service, target.id, entryMap) ? service.deployment.release : target.id,
      };
    });

  // A service that a strictly later-dispatched job has already staged, by the time this job's
  // resumed attempt is about to act on it, was superseded: the newer job's authorized deployment
  // wins, and this job's stale plan for that service must be dropped in favor of reporting it.
  const applySupersession = (expected, jobId, resumeEntry) =>
    expected.map((e) => {
      const superseded = actions.some((a) => a.kind === "stage" && a.service === e.service && a.job > jobId);
      return superseded
        ? { service: e.service, status: "superseded", release: resumeEntry.get(e.service).deployment.release }
        : e;
    });

  const buildVerdict = (expected, entryMap, requests, jobId, entryStages, originMap = entryMap) => ({
    completion: expected.every((e) => services.get(e.service).deployment.release === e.release),
    compatibility: expected.every(
      (e) =>
        e.status === "unavailable" ||
        s.releases.find((r) => r.id === services.get(e.service).deployment.release)?.abi ===
          services.get(e.service).abi,
    ),
    binding: expected.every((e) =>
      e.status === "unavailable"
        ? equal(services.get(e.service), entryMap.get(e.service))
        : equal(services.get(e.service).alias, services.get(e.service).deployment),
    ),
    cache: expected.every(
      (e) =>
        e.status === "unavailable" ||
        equal(services.get(e.service).cache, { release: e.release, abi: services.get(e.service).abi }),
    ),
    rollback: expected
      .filter((e) => e.status === "rolled-back")
      .every((e) => services.get(e.service).deployment.release === originMap.get(e.service).deployment.release),
    preservation: [...entryMap]
      .filter(([id]) => !requests.some((r) => r.service === id))
      .every(([id, v]) => equal(v, services.get(id))),
    // Scoped to what existed when THIS job started, not the scenario-wide original: a still-
    // pending sibling job's own orphaned record (one this job must never touch) can legitimately
    // still be present when a job that ran and finished around it completes.
    cleanup: equal(stages, entryStages),
    reports: equal(reports.at(-1), { job: jobId, results: expected }),
  });

  // Independently re-derivable (also implemented from raw `actions` in reference/checker.mjs):
  // once a higher-numbered (later-dispatched) job has staged a service, no lower-numbered job may
  // stage, bind or warm that same service afterward — that would be a stale, superseding job
  // clobbering a newer one's already-applied, legitimate result.
  const actionOwnershipOk = () => {
    const maxJobSoFar = new Map();
    for (const a of actions) {
      const seen = maxJobSoFar.get(a.service);
      if (a.kind === "stage") {
        if (seen !== undefined && a.job < seen) return false;
        maxJobSoFar.set(a.service, seen === undefined ? a.job : Math.max(seen, a.job));
      } else if ((a.kind === "bind" || a.kind === "warm") && seen !== undefined && a.job < seen) return false;
    }
    return true;
  };

  const interruptions = [], runs = [], verdicts = [];

  async function runJob(input, jobId) {
    const requests = input.requests;
    const localEntry = new Map([...services].map(([id, v]) => [id, structuredClone(v)]));
    const localEntryStages = structuredClone(stages);
    const makeAdapter = (obs) => () => session({ job: jobId, storage, requests }, operations, (r) => reports.push(r), obs);
    const crashConfig = (obs) =>
      input.crashAfter
        ? {
            method: `api.${input.crashAfter.method}`,
            count: input.crashAfter.count,
            observations: obs,
            completed: 0,
            injected: false,
          }
        : null;

    if (input.supersedingJob) {
      // Phase 1: exactly one attempt, which this fixture requires to be interrupted. Its outcome
      // is recorded as its own, non-terminal run (report:null — nothing was ever delivered back to
      // this job, so there is nothing yet to validate a report against).
      const fragmentObservations = [];
      current = { job: jobId, entry: localEntry, requests, observations: fragmentObservations };
      const { crashed } = await runAttempt(
        execute,
        makeAdapter(fragmentObservations),
        crashConfig(fragmentObservations),
        interruptions,
        { job: jobId },
      );
      if (!crashed) {
        // A candidate that never reaches the fault-injected call (or that swallows the injected
        // error itself, e.g. a broad try/catch) never actually gets interrupted: this fixture's
        // "later job arrives before redelivery" story never happens for it, so it is graded as
        // one ordinary, complete job — exactly what its own single attempt actually did — rather
        // than the harness insisting on an interruption the candidate itself made moot.
        const expected = computeExpected(localEntry, requests);
        runs.push({
          job: jobId,
          requests,
          entry: [...localEntry],
          stagesAtEntry: localEntryStages,
          state: structuredClone([...services]),
          stages: structuredClone(stages),
          observations: structuredClone(fragmentObservations),
          report: structuredClone(reports.at(-1) ?? null),
        });
        verdicts.push(buildVerdict(expected, localEntry, requests, jobId, localEntryStages));
        return;
      }
      runs.push({
        job: jobId,
        requests,
        entry: [...localEntry],
        stagesAtEntry: localEntryStages,
        state: structuredClone([...services]),
        stages: structuredClone(stages),
        observations: structuredClone(fragmentObservations),
        report: null,
        interrupted: true,
      });

      // Phase 2: a genuinely different, later-dispatched job for the same service is authorized
      // and runs to full completion before this job's own redelivery ever happens.
      await runJob(input.supersedingJob, jobId + 1);

      // Phase 3: this job's redelivery, resuming against whatever the superseding job left behind.
      const resumeEntry = new Map([...services].map(([id, v]) => [id, structuredClone(v)]));
      const resumeObservations = [];
      current = { job: jobId, entry: localEntry, requests, observations: resumeObservations };
      await deliver(execute, makeAdapter(resumeObservations), null, interruptions, { job: jobId });
      const expected = applySupersession(computeExpected(localEntry, requests), jobId, resumeEntry);
      runs.push({
        job: jobId,
        requests,
        entry: [...resumeEntry],
        stagesAtEntry: localEntryStages,
        state: structuredClone([...services]),
        stages: structuredClone(stages),
        observations: structuredClone(resumeObservations),
        report: structuredClone(reports.at(-1) ?? null),
      });
      verdicts.push(buildVerdict(expected, resumeEntry, requests, jobId, localEntryStages, localEntry));
      return;
    }

    const jobObservations = [];
    current = { job: jobId, entry: localEntry, requests, observations: jobObservations };
    await deliver(execute, makeAdapter(jobObservations), crashConfig(jobObservations), interruptions, { job: jobId });
    const expected = computeExpected(localEntry, requests);
    runs.push({
      job: jobId,
      requests,
      entry: [...localEntry],
      stagesAtEntry: localEntryStages,
      state: structuredClone([...services]),
      stages: structuredClone(stages),
      observations: structuredClone(jobObservations),
      report: structuredClone(reports.at(-1) ?? null),
    });
    verdicts.push(buildVerdict(expected, localEntry, requests, jobId, localEntryStages));
  }

  let jobId = 0;
  for (const input of s.jobs) {
    await runJob(input, jobId);
    jobId += input.supersedingJob ? 2 : 1;
  }
  if (!actionOwnershipOk()) violations.push("supersession");

  return {
    ...checks(
      Object.fromEntries(
        CHECK_NAMES.map((k) => [k, !violations.includes(k) && verdicts.every((v) => v[k] !== false)]),
      ),
    ),
    observations: runs.flatMap((r) => r.observations),
    reports,
    actions,
    state: [...services],
    stages,
    runs,
    interruptions,
    input: { services: s.services, releases: s.releases, stages: s.stages },
  };
}
