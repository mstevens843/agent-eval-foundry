import { session, checks, equal } from "./adapter.mjs";
import { deliver } from "./restart.mjs";
function eligible(r, s) {
  const wallet = s.wallets.find((w) => w.id === r.wallet),
    grant = wallet?.grants.find((g) => g.id === r.grant);
  const reservation = s.reservations.find((x) => x.wallet === r.wallet && x.id === r.reservation);
  if (r.kind !== "reserve") {
    if (
      !reservation ||
      reservation.grant !== r.grant ||
      reservation.owner !== r.owner ||
      reservation.delegate !== r.delegate
    )
      return false;
    let remaining = reservation.credits;
    for (const x of s.settlements)
      if (x.wallet === r.wallet && x.reservation === r.reservation) remaining -= x.credits;
    return r.credits <= remaining;
  }
  if (
    reservation ||
    wallet?.owner !== r.owner ||
    !grant ||
    !grant.allowed ||
    grant.delegate !== r.delegate ||
    grant.version !== r.grantVersion
  )
    return false;
  let captured = 0,
    outstanding = 0;
  for (const h of s.reservations.filter((h) => h.wallet === r.wallet && h.grant === r.grant)) {
    let rest = h.credits;
    for (const x of s.settlements.filter((x) => x.wallet === h.wallet && x.reservation === h.id)) {
      rest -= x.credits;
      if (x.kind === "capture") captured += x.credits;
    }
    outstanding += rest;
  }
  return captured + outstanding + r.credits <= grant.limit;
}
export async function runScenario(s, execute, storage) {
  const state = {
    revision: 1,
    wallets: structuredClone(s.wallets),
    reservations: structuredClone(s.reservations ?? []),
    settlements: structuredClone(s.settlements ?? []),
  };
  const decisions = [],
    mutations = [],
    observations = [],
    reports = [],
    prefixes = [],
    interruptions = [],
    pending = new Map();
  let correct = true,
    ordered = true,
    index = 0,
    requests = [],
    raced = false;
  function update(updates) {
    for (const u of updates) {
      const g = state.wallets.find((w) => w.id === u.wallet).grants.find((g) => g.id === u.id);
      const { wallet, ...fields } = u;
      Object.assign(g, fields);
    }
    if (updates.length) state.revision++;
  }
  const operations = {
    snapshot: () => {
      const value = structuredClone(state);
      if (!raced) {
        raced = true;
        update(s.jobs[index].race ?? []);
      }
      return value;
    },
    lookup: ({ id }) => {
      if ((pending.get(id) ?? 0) > 0) {
        pending.set(id, pending.get(id) - 1);
        return { status: "PENDING" };
      }
      const d = decisions.find((d) => d.id === id);
      return d ? { status: "TERMINAL", decision: d } : { status: "ABSENT" };
    },
    resolve: ({ request: r, revision, outcome }) => {
      if (!r || typeof r.id !== "string" || !["accepted", "rejected"].includes(outcome))
        return { error: "request" };
      const known = decisions.find((d) => d.id === r.id);
      if (known) return { status: "UNKNOWN" };
      const position = requests.findIndex((q) => !decisions.some((d) => d.id === q.id));
      if (position < 0 || !equal(r, requests[position])) return { error: "request" };
      if (revision !== state.revision) return { stale: true };
      const before = structuredClone(state),
        allow = eligible(r, state);
      correct &&= (outcome === "accepted") === allow;
      const receipt = outcome === "accepted" ? structuredClone(r) : null;
      if (receipt) {
        if (r.kind === "reserve")
          state.reservations.push({
            id: r.reservation,
            requestId: r.id,
            wallet: r.wallet,
            grant: r.grant,
            grantVersion: r.grantVersion,
            owner: r.owner,
            delegate: r.delegate,
            credits: r.credits,
          });
        else
          state.settlements.push({
            id: r.id,
            wallet: r.wallet,
            grant: r.grant,
            reservation: r.reservation,
            kind: r.kind,
            credits: r.credits,
          });
      }
      const decision = { id: r.id, status: outcome, receipt };
      decisions.push(decision);
      mutations.push({ job: index, request: r, revision, before, decision });
      state.revision++;
      pending.set(r.id, s.lag ?? 2);
      return { status: "UNKNOWN" };
    },
  };
  for (index = 0; index < s.jobs.length; index++) {
    const job = s.jobs[index];
    requests = job.requests;
    raced = false;
    update(job.grants);
    await deliver(
      execute,
      () => session({ job: index, requests, storage }, operations, (r) => reports.push(r), observations),
      job.interrupt ? { ...job.interrupt, observations } : null,
      interruptions,
      { job: index },
    );
    const required = requests.map((r) => decisions.find((d) => d.id === r.id));
    ordered &&= required.every(Boolean) && equal(reports.at(-1), { job: index, decisions: required });
    prefixes.push({ job: index, state: structuredClone(state), decisions: structuredClone(decisions) });
  }
  return {
    ...checks({
      completion: ordered && reports.length === s.jobs.length,
      aggregate_budget: correct,
      receipt_history: new Set(decisions.map((d) => d.id)).size === decisions.length,
      decisions: ordered,
    }),
    input: {
      wallets: s.wallets,
      reservations: s.reservations ?? [],
      settlements: s.settlements ?? [],
      jobs: s.jobs.map(({ grants, requests, race }) => ({ grants, requests, race: race ?? [] })),
    },
    actual: state,
    decisions,
    mutations,
    prefixes,
    reports,
    observations,
    interruptions,
  };
}
