import { session, checks, equal } from "./adapter.mjs";
function origin(job, jobs) {
  const ancestors = [];
  for (let j = job; j; j = jobs.find((x) => x.id === j.parent)) {
    ancestors.push(j);
    if (j.parent === null) break;
  }
  return ancestors.at(-1).principal;
}
function permitted(policy, job, principal) {
  // Fixed point reachability, distinct from both reference path searches.
  const reached = new Set([policy.owners[job.resource]]);
  let progress = true;
  while (progress) {
    progress = false;
    for (const g of policy.grants)
      if (
        g.active &&
        g.resources.includes(job.resource) &&
        g.actions.includes(job.action) &&
        reached.has(g.from) &&
        !reached.has(g.to)
      ) {
        reached.add(g.to);
        progress = true;
      }
  }
  return reached.has(principal);
}
function validPath(p, j, principal, path) {
  if (!Array.isArray(path)) return false;
  let node = p.owners[j.resource];
  const seen = new Set([node]);
  for (const id of path) {
    const g = p.grants.find((g) => g.id === id);
    if (
      !g ||
      !g.active ||
      g.from !== node ||
      !g.resources.includes(j.resource) ||
      !g.actions.includes(j.action) ||
      seen.has(g.to)
    )
      return false;
    node = g.to;
    seen.add(node);
  }
  return node === principal;
}
// Sentinel distinguishing a deliberately-injected crash from a genuine subject/infrastructure
// error. Thrown from inside the `finish` operation below, it propagates authority-side (through
// adapter.mjs's `invoke`) exactly like any other operation error: authority-engine.mjs's `refuse`
// kills the real child process for real, and the shared (unmodified) runner.mjs re-throws it back
// out of `execute()`. Nothing about that path is special-cased anywhere outside this file — the
// crash is real, not simulated by a flag the harness has to know about.
const CRASH_MARKER = "workflow-authority-repair/simulated-crash";

export async function runScenario(s, execute, storage) {
  const observations = [],
    reports = [],
    decisions = [],
    effects = [],
    finished = [],
    expected = [];
  let index = 0,
    active = null,
    current = null,
    raced = false,
    identity = true,
    policyCorrect = true,
    positive = true,
    payload = true;
  // `crashDeliveries` names delivery IDs whose FIRST `finish()` attempt must be interrupted —
  // after `decide()` has already returned (and, for executed work, its effect already applied),
  // but strictly before that delivery is durably closed. Each listed delivery is crashed at most
  // once; a subsequent `finish()` for the same delivery (after resume) completes normally. Empty
  // for every pre-existing scenario, so this is a no-op unless a scenario opts in.
  const crashTargets = new Set(s.crashDeliveries ?? []);
  const crashedOnce = new Set();
  const operations = {
    take: () => {
      if (active) return { error: "unfinished" };
      if (index === s.deliveries.length) return { done: true };
      active = s.deliveries[index];
      current = structuredClone(s.policies[index]);
      raced = false;
      return { delivery: active };
    },
    policy: () => {
      if (!active) return { error: "request" };
      const snapshot = structuredClone(current);
      if (!raced && s.races.includes(index)) {
        current.revision++;
        current.grants = current.grants.map((g) => (g.id === "a" ? { ...g, active: false } : g));
        raced = true;
      }
      return snapshot;
    },
    receipt: ({ jobId }) => ({ decision: decisions.find((d) => d.jobId === jobId) ?? null }),
    decide: (r) => {
      if (
        !active ||
        r.jobId !== active.jobId ||
        !["executed", "denied"].includes(r.outcome) ||
        !Array.isArray(r.path) ||
        typeof r.principal !== "string" ||
        typeof r.resource !== "string" ||
        typeof r.action !== "string" ||
        r.payload === undefined
      )
        return { error: "request" };
      if (r.revision !== current.revision) return { stale: true };
      const job = s.jobs.find((j) => j.id === active.jobId),
        principal = origin(job, s.jobs),
        allow = permitted(current, job, principal);
      if (r.principal !== principal) identity = false;
      if (r.outcome === "executed" && (!allow || !validPath(current, job, principal, r.path)))
        policyCorrect = false;
      if (r.outcome === "denied" && (allow || r.path.length)) positive = false;
      if (r.resource !== job.resource || r.action !== job.action || !equal(r.payload, job.payload))
        payload = false;
      const d = { ...r, id: "decision-" + decisions.length };
      decisions.push(d);
      expected.push({
        jobId: job.id,
        principal,
        permitted: allow,
        revision: current.revision,
        policy: structuredClone(current),
      });
      if (r.outcome === "executed")
        effects.push({
          jobId: job.id,
          principal: r.principal,
          resource: r.resource,
          action: r.action,
          payload: r.payload,
          decisionId: d.id,
        });
      return { decision: d };
    },
    finish: ({ deliveryId, decisionId }) => {
      if (!active || deliveryId !== active.id || typeof decisionId !== "string")
        return { error: "request" };
      if (crashTargets.has(active.id) && !crashedOnce.has(active.id)) {
        crashedOnce.add(active.id);
        // The decision (and its effect, if executed) is already recorded above in `decisions`/
        // `effects` — durable, per SEMANTICS.md's terminal_history contract. Only the durable
        // close-out (`finished.push` / `active = null` / `index++` below) never happens: this
        // throw kills the real subject process before any of that runs, exactly matching "crash
        // between decide() returning and finish() durably closing it."
        throw Error(`${CRASH_MARKER}:${active.id}`);
      }
      finished.push({ deliveryId, jobId: active.jobId, decisionId });
      active = null;
      index++;
      return { stored: true };
    },
  };
  // Ordinarily one `execute()` per scenario. A crash-injected delivery makes the subject process
  // die for real mid-flight; this loop gives a FRESH process (a new `execute()` call, same
  // closure state: `decisions`/`effects`/`finished`/`observations` all persist across it) the
  // chance to pick the abandoned delivery back up, standing in for whatever real process would
  // eventually redeliver it. `active` is reset here — outside any operation — so the next `take()`
  // redelivers the interrupted delivery rather than reporting "unfinished" forever.
  for (;;) {
    try {
      await execute(session({ jobs: s.jobs, storage }, operations, (r) => reports.push(r), observations));
      break;
    } catch (err) {
      const message = String(err?.message ?? err);
      if (active && crashTargets.has(active.id) && message.includes(CRASH_MARKER)) {
        active = null;
        continue;
      }
      throw err;
    }
  }
  const ids = s.deliveries.map((d) => d.jobId),
    unique = [...new Set(ids)];
  const complete =
    index === s.deliveries.length &&
    !active &&
    finished.every((f) => decisions.some((d) => d.id === f.decisionId && d.jobId === f.jobId));
  return {
    ...checks({
      completion: complete,
      origin_identity: identity,
      policy_at_effect: policyCorrect,
      positive_work: positive,
      terminal_history:
        decisions.length === unique.length &&
        new Set(decisions.map((d) => d.jobId)).size === decisions.length &&
        unique.every((id) => decisions.some((d) => d.jobId === id)) &&
        finished.every((f) => decisions.find((d) => d.jobId === f.jobId)?.id === f.decisionId),
      effect_payload: payload,
    }),
    actual: { decisions, effects, finished },
    deliveries: s.deliveries,
    // Raw policy snapshots at admitted effects, without the derived permitted verdict.
    admissionPolicies: expected.map(({ jobId, revision, policy }) => ({ jobId, revision, policy })),
    expected,
    observations,
    reports,
    // Exactly the `jobs` half of the `view` every real candidate already receives at session
    // begin (see the `session(...)` call above: `{ jobs: s.jobs, storage }`) — problem structure
    // a candidate already has, not a computed answer. A checker needs the job/parent graph to
    // independently recompute each decision's true root origin and to match effect resource/
    // action/payload against each job's own fields; `observations` alone (the real policy()
    // snapshots and decide()/finish() call log) already covers everything else a checker needs.
    view: { jobs: s.jobs },
  };
}
