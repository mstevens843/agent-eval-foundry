import { session, checks, equal } from "./adapter.mjs";
import { deliver } from "./restart.mjs";

function origin(job, jobs) {
  while (job.parent !== null) job = jobs.find((j) => j.id === job.parent);
  return job.principal;
}
function permitted(p, j, principal) {
  const reached = new Set([p.owners[j.resource]]);
  for (let n = 0; n <= p.grants.length; n++)
    for (const g of p.grants)
      if (g.active && reached.has(g.from) && g.resources.includes(j.resource) && g.actions.includes(j.action))
        reached.add(g.to);
  return reached.has(principal);
}
function pathValid(p, j, principal, path) {
  let node = p.owners[j.resource];
  const seen = new Set([node]);
  for (const id of path) {
    const g = p.grants.find((g) => g.id === id);
    if (
      !g ||
      !g.active ||
      g.from !== node ||
      seen.has(g.to) ||
      !g.resources.includes(j.resource) ||
      !g.actions.includes(j.action)
    )
      return false;
    node = g.to;
    seen.add(node);
  }
  return node === principal;
}
export async function runScenario(s, execute, storage) {
  const observations = [],
    reports = [],
    authorizations = [],
    decisions = [],
    effects = [],
    finished = [],
    boundaries = [],
    interruptions = [];
  let index = 0,
    active = null,
    current = null,
    readRaced = false,
    dispatchRaced = false;
  const pending = new Map(),
    visibility = new Map();
  let identity = true,
    authority = true,
    positive = true,
    payload = true;
  const drift = () => {
    current = structuredClone(current);
    current.revision++;
    current.grants = current.grants.map((g) => (g.id === "a" ? { ...g, active: false } : g));
  };
  const inspect = (r, p, allowOutcome) => {
    const j = s.jobs.find((j) => j.id === r.jobId),
      principal = origin(j, s.jobs),
      allowed = permitted(p, j, principal);
    identity &&= r.principal === principal;
    payload &&= r.resource === j.resource && r.action === j.action && equal(r.payload, j.payload);
    if (allowOutcome) authority &&= allowed && pathValid(p, j, principal, r.path);
    else positive &&= !allowed && r.path.length === 0;
  };
  const operations = {
    take: () => {
      if (active) return { delivery: active };
      if (index === s.deliveries.length) return { done: true };
      active = s.deliveries[index];
      current = structuredClone(s.policies[index]);
      readRaced = false;
      dispatchRaced = false;
      return { delivery: active };
    },
    policy: () => {
      if (!active) return { error: "request" };
      const result = structuredClone(current);
      if (!readRaced && s.races.includes(index)) {
        readRaced = true;
        drift();
      }
      return result;
    },
    outcome: ({ jobId }) => {
      const d = decisions.find((d) => d.jobId === jobId);
      if (d) {
        if ((visibility.get(jobId) ?? 0) > 0) {
          visibility.set(jobId, visibility.get(jobId) - 1);
          return { status: "PENDING" };
        }
        return { status: "TERMINAL", decision: d };
      }
      return { status: "NONE", authorization: pending.get(jobId) ?? null };
    },
    admit: (r) => {
      if (
        !active ||
        r.jobId !== active.jobId ||
        !["authorized", "denied"].includes(r.outcome) ||
        !Array.isArray(r.path) ||
        r.path.some(id => typeof id !== "string") ||
        r.path.length > 24 ||
        typeof r.principal !== "string" ||
        typeof r.resource !== "string" ||
        typeof r.action !== "string" ||
        r.payload === undefined
      )
        return { error: "request" };
      if (decisions.some((d) => d.jobId === r.jobId)) return { error: "terminal" };
      if (r.revision !== current.revision) return { stale: true };
      inspect(r, current, r.outcome === "authorized");
      const a = { ...r, id: "authorization-" + authorizations.length };
      authorizations.push(a);
      boundaries.push({ kind: "admission", id: a.id, policy: structuredClone(current) });
      if (r.outcome === "denied") {
        const decision = { ...a, id: "decision-" + decisions.length, authorizationId: a.id };
        decisions.push(decision);
        pending.delete(r.jobId);
        return { decision };
      }
      pending.set(r.jobId, a);
      if (!dispatchRaced && (s.dispatchRaces ?? []).includes(index)) {
        dispatchRaced = true;
        drift();
      }
      return { authorization: a };
    },
    dispatch: (request) => {
      if (!request || typeof request !== "object" || typeof request.authorizationId !== "string" || !Number.isInteger(request.revision)) return { error: "request" };
      const { authorizationId, revision } = request;
      if (!active) return { error: "request" };
      const prior = decisions.find((d) => d.jobId === active.jobId);
      if (prior) {
        if (prior.outcome !== "executed" || prior.authorizationId !== authorizationId) return { error: "request" };
        return { status: "PENDING" };
      }
      const a = pending.get(active.jobId);
      if (!a || a.id !== authorizationId) return { error: "request" };
      if (revision !== current.revision || a.revision !== current.revision) return { stale: true };
      inspect(a, current, true);
      const decision = {
        ...a,
        id: "decision-" + decisions.length,
        authorizationId: a.id,
        outcome: "executed",
      };
      decisions.push(decision);
      visibility.set(a.jobId, s.receiptLag ?? 2);
      pending.delete(a.jobId);
      effects.push({
        jobId: a.jobId,
        principal: a.principal,
        resource: a.resource,
        action: a.action,
        payload: a.payload,
        decisionId: decision.id,
        authorizationId: a.id,
        revision: current.revision,
      });
      boundaries.push({ kind: "dispatch", id: a.id, policy: structuredClone(current) });
      return { status: "PENDING" };
    },
    finish: ({ deliveryId, decisionId }) => {
      if (!active || active.id !== deliveryId || typeof decisionId !== "string") return { error: "request" };
      finished.push({ deliveryId, jobId: active.jobId, decisionId });
      index++;
      active = null;
      return { stored: true };
    },
  };
  await deliver(
    execute,
    () => session({ jobs: s.jobs, storage }, operations, (r) => reports.push(r), observations),
    s.interrupt ? { ...s.interrupt, observations } : null,
    interruptions,
    {},
  );
  const encountered = [...new Set(s.deliveries.map((d) => d.jobId))];
  return {
    ...checks({
      completion:
        index === s.deliveries.length &&
        finished.every((f) => decisions.some((d) => d.id === f.decisionId && d.jobId === f.jobId)),
      origin_identity: identity,
      policy_at_effect: authority,
      positive_work: positive,
      effect_payload: payload,
      terminal_history:
        decisions.length === encountered.length &&
        new Set(decisions.map((d) => d.jobId)).size === decisions.length &&
        encountered.every((id) => decisions.some((d) => d.jobId === id)) &&
        effects.length === decisions.filter((d) => d.outcome === "executed").length,
    }),
    view: { jobs: s.jobs },
    deliveries: s.deliveries,
    actual: { authorizations, decisions, effects, finished },
    boundaries,
    observations,
    reports,
    interruptions,
  };
}
