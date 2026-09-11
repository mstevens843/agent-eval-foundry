import { equal, verdicts } from "./checker-utils.mjs";
import { eligibility } from "./src/dispatcher.mjs";
function check(c) {
  if (
    c.prefixes.length !== c.input.jobs.length ||
    c.reports.length !== c.input.jobs.length ||
    c.mutations.length !== c.decisions.length
  )
    return false;
  const decisions = new Map(),
    holds = structuredClone(c.input.reservations),
    settlements = structuredClone(c.input.settlements);
  for (const m of c.mutations) {
    if (decisions.has(m.request.id) || !c.input.jobs[m.job]?.requests.some((r) => equal(r, m.request)))
      return false;
    if (
      !equal(m.before.reservations, holds) ||
      !equal(m.before.settlements, settlements) ||
      m.before.revision !== m.revision
    )
      return false;
    const allow = eligibility(m.request, m.before),
      r = m.request;
    if (!equal(m.decision, { id: r.id, status: allow ? "accepted" : "rejected", receipt: allow ? r : null }))
      return false;
    decisions.set(r.id, m.decision);
    if (allow) {
      if (r.kind === "reserve")
        holds.push({
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
        settlements.push({
          id: r.id,
          wallet: r.wallet,
          grant: r.grant,
          reservation: r.reservation,
          kind: r.kind,
          credits: r.credits,
        });
    }
  }
  if (
    !equal(c.actual.reservations, holds) ||
    !equal(c.actual.settlements, settlements) ||
    !equal(c.decisions, [...decisions.values()])
  )
    return false;
  const seen = new Set();
  for (const [i, job] of c.input.jobs.entries()) {
    const prefix = c.prefixes[i],
      report = c.reports[i],
      want = [];
    for (const r of job.requests) {
      const d = decisions.get(r.id);
      if (!d) return false;
      want.push(d);
      seen.add(r.id);
    }
    if (
      !equal(report, { job: i, decisions: want }) ||
      prefix.decisions.length !== seen.size ||
      prefix.decisions.some((d) => !seen.has(d.id))
    )
      return false;
    const rows = c.mutations.filter((m) => m.job <= i && m.decision.status === "accepted");
    if (
      !equal(prefix.state.reservations, [
        ...c.input.reservations,
        ...rows
          .filter((m) => m.request.kind === "reserve")
          .map(({ request: r }) => ({
            id: r.reservation,
            requestId: r.id,
            wallet: r.wallet,
            grant: r.grant,
            grantVersion: r.grantVersion,
            owner: r.owner,
            delegate: r.delegate,
            credits: r.credits,
          })),
      ])
    )
      return false;
    if (
      !equal(prefix.state.settlements, [
        ...c.input.settlements,
        ...rows
          .filter((m) => m.request.kind !== "reserve")
          .map(({ request: r }) => ({
            id: r.id,
            wallet: r.wallet,
            grant: r.grant,
            reservation: r.reservation,
            kind: r.kind,
            credits: r.credits,
          })),
      ])
    )
      return false;
  }
  return true;
}
export const run = ({ cases }) => verdicts(cases, check);
