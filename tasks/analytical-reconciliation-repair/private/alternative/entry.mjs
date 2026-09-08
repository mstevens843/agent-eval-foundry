function distinct(rows) {
  return [...new Map(rows.map((r) => [JSON.stringify(r), r])).values()];
}
function current(rows, v) {
  return distinct(rows).filter(
    (r) =>
      r.tenant === v.tenant &&
      !rows.some((x) => x.tenant === r.tenant && x.id === r.id && x.revision > r.revision) &&
      r.state === "posted" &&
      r.at >= v.from &&
      r.at < v.to,
  );
}
const scale = { ms: 1000n, s: 1000000n, min: 60000000n };
export const subject = {
  async run(v, api) {
    const db = {};
    for (const table of ["customers", "accounts", "usage", "credits"]) {
      db[table] = [];
      let cursor = null;
      do {
        const p = await api.fetch({ table, cursor });
        db[table].push(...p.rows);
        cursor = p.next;
      } while (cursor !== null);
    }
    const u = current(db.usage, v),
      cr = current(db.credits, v);
    for (const c of distinct(db.customers)
      .filter((c) => c.tenant === v.tenant && c.active)
      .reverse()) {
      const terms = [],
        picked = [];
      let usage = 0n;
      for (const event of u) {
        const a = db.accounts.find(
          (a) => a.tenant === v.tenant && a.id === event.accountId && a.customerId === c.id,
        );
        if (!a) continue;
        const [w, f = ""] = event.quantity.split("."),
          us = ((BigInt(w) * 1000n + BigInt(f.padEnd(3, "0"))) * scale[event.unit]) / 1000n;
        terms.push([us * BigInt(a.price.n), BigInt(a.price.d)]);
        usage += us;
        picked.push(event.id);
      }
      // One common denominator, contrasting the reference's incrementally reduced sum.
      const denominator = terms.reduce((d, t) => d * t[1], 1n),
        numerator = terms.reduce((n, t) => n + t[0] * (denominator / t[1]), 0n);
      let cost = numerator / denominator;
      const twice = 2n * (numerator % denominator);
      if (twice > denominator || (twice === denominator && cost % 2n === 1n)) cost++;
      const credits = cr.filter((x) => x.customerId === c.id),
        amount = credits.reduce((n, x) => n + BigInt(x.microcents), 0n);
      await api.record({
        row: {
          customerId: c.id,
          name: c.name,
          usageUs: String(usage),
          chargeMicrocents: String(cost),
          creditMicrocents: String(amount),
          balanceMicrocents: String(cost - amount),
          usageIds: picked.sort(),
          creditIds: credits.map((x) => x.id).sort(),
        },
      });
    }
    return { complete: true };
  },
};
