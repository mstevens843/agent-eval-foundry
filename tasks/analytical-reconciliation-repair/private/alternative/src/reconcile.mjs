import { latest } from "./revisions.mjs";
import { microseconds, add, rounded } from "./arithmetic.mjs";
export function reconcile(source, view) {
  const customers = [
    ...new Map(source.customers.map((c) => [JSON.stringify([c.tenant, c.id]), c])).values(),
  ].filter((c) => c.tenant === view.tenant && c.active);
  const accounts = new Map(source.accounts.filter((a) => a.tenant === view.tenant).map((a) => [a.id, a]));
  const usage = latest(source.usage, view).filter(
    (u) => u.tenant === view.tenant && u.state === "posted" && u.at >= view.from && u.at < view.to,
  );
  const credits = latest(source.credits, view).filter(
    (c) => c.tenant === view.tenant && c.state === "posted" && c.at >= view.from && c.at < view.to,
  );
  return customers.map((c) => {
    let us = 0n,
      charge = { n: 0n, d: 1n };
    const usageIds = [];
    for (const u of usage) {
      const a = accounts.get(u.accountId);
      if (!a || a.customerId !== c.id) continue;
      const amount = microseconds(u.quantity, u.unit);
      us += amount;
      usageIds.push(u.id);
      charge = add(charge, { n: amount * BigInt(a.price.n), d: BigInt(a.price.d) });
    }
    const selected = credits.filter((x) => x.customerId === c.id),
      credit = selected.reduce((n, x) => n + BigInt(x.microcents), 0n),
      cost = rounded(charge);
    return {
      customerId: c.id,
      name: c.name,
      usageUs: String(us),
      chargeMicrocents: String(cost),
      creditMicrocents: String(credit),
      balanceMicrocents: String(cost - credit),
      usageIds: usageIds.sort(),
      creditIds: selected.map((x) => x.id).sort(),
    };
  });
}
