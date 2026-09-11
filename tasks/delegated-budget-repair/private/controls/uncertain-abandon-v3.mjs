export function eligibility(r, s) {
  const w = s.wallets.find((w) => w.id === r.wallet),
    g = w?.grants.find((g) => g.id === r.grant);
  const hold = s.reservations.find((h) => h.wallet === r.wallet && h.id === r.reservation);
  if (r.kind === "reserve") {
    if (
      hold ||
      w?.owner !== r.owner ||
      !g ||
      g.delegate !== r.delegate ||
      g.version !== r.grantVersion ||
      !g.allowed
    )
      return false;
    const holds = s.reservations.filter((h) => h.wallet === r.wallet && h.grant === r.grant);
    const releases = s.settlements.filter(
      (x) => x.kind === "release" && x.wallet === r.wallet && x.grant === r.grant,
    );
    const used = holds.reduce((n, h) => n + h.credits, 0) - releases.reduce((n, x) => n + x.credits, 0);
    return used + r.credits <= g.limit;
  }
  if (!hold || hold.grant !== r.grant || hold.owner !== r.owner || hold.delegate !== r.delegate) return false;
  const settled = s.settlements
    .filter((x) => x.wallet === r.wallet && x.reservation === r.reservation)
    .reduce((n, x) => n + x.credits, 0);
  return r.credits <= hold.credits - settled;
}
export async function run(view, api, { retry = false, recover = false } = {}) {
  if (recover) await api.resolve({ request: {}, revision: -1, outcome: "rejected" });
  const decisions = [];
  for (const r of view.requests) {
    for (;;) {
      const known = await api.lookup({ id: r.id });
      if (known.status === "TERMINAL") {
        decisions.push(known.decision);
        break;
      }
      if (known.status === "PENDING") {
        decisions.push({ id: r.id, status: "rejected", receipt: null });
        break;
      }
      const snapshot = await api.snapshot({});
      const result = await api.resolve({
        request: r,
        revision: snapshot.revision,
        outcome: eligibility(r, snapshot) ? "accepted" : "rejected",
      });
      if (retry && result.status === "UNKNOWN")
        await api.resolve({
          request: r,
          revision: snapshot.revision,
          outcome: eligibility(r, snapshot) ? "accepted" : "rejected",
        });
    }
  }
  return { job: view.job, decisions };
}
