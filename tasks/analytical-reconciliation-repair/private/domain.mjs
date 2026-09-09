import { session, checks, equal } from "./adapter.mjs";
export function expected(s) {
  const v = s.view,
    t = s.tables;
  function latest(rows) {
    const order = [...rows].sort((a, b) => b.revision - a.revision),
      seen = new Set(),
      out = [];
    for (const r of order) {
      const k = JSON.stringify([r.tenant, r.id]);
      if (seen.has(k)) continue;
      seen.add(k);
      if (r.tenant === v.tenant && r.state === "posted" && r.at >= v.from && r.at < v.to) out.push(r);
    }
    return out;
  }
  const usage = latest(t.usage),
    credits = latest(t.credits),
    customers = new Map();
  for (const c of t.customers) if (c.tenant === v.tenant && c.active) customers.set(c.id, c);
  return [...customers.values()].map((c) => {
    let n = 0n,
      d = 1n,
      total = 0n,
      credit = 0n;
    const usageIds = [],
      creditIds = [];
    for (const u of usage) {
      const a = t.accounts.find((a) => a.tenant === u.tenant && a.id === u.accountId);
      if (!a || a.customerId !== c.id) continue;
      const decimal = u.quantity.replace(".", ""),
        places = u.quantity.includes(".") ? u.quantity.split(".")[1].length : 0;
      const us =
        (BigInt(decimal) * { ms: 1000n, s: 1000000n, min: 60000000n }[u.unit]) / 10n ** BigInt(places);
      const den = BigInt(a.price.d);
      n = n * den + us * BigInt(a.price.n) * d;
      d *= den;
      total += us;
      usageIds.push(u.id);
    }
    for (const cr of credits)
      if (cr.customerId === c.id) {
        credit += BigInt(cr.microcents);
        creditIds.push(cr.id);
      }
    const floor = n / d,
      twice = (n % d) * 2n,
      cost = twice < d ? floor : twice > d ? floor + 1n : floor + (floor & 1n);
    return {
      customerId: c.id,
      name: c.name,
      usageUs: String(total),
      chargeMicrocents: String(cost),
      creditMicrocents: String(credit),
      balanceMicrocents: String(cost - credit),
      usageIds: usageIds.sort(),
      creditIds: creditIds.sort(),
    };
  });
}
export async function runScenario(s, execute, storage) {
  const observations = [],
    reports = [],
    actual = [],
    pages = {};
  for (const [table, rows] of Object.entries(s.tables)) {
    const list = [];
    for (let i = 0; i < rows.length; i += s.pageSize) list.push(rows.slice(i, i + s.pageSize));
    if (!list.length) list.push([]);
    if (s.emptyPage) list.splice(1, 0, []);
    pages[table] = list;
  }
  await execute(
    session(
      { ...s.view, storage },
      {
        fetch: ({ table, cursor }) => {
          if (!Object.hasOwn(pages, table)) return { error: "cursor" };
          const tokens = pages[table].map((_, i) => "p-" + table + "-" + (i * 17 + 41));
          const index = cursor === null ? 0 : tokens.indexOf(cursor);
          if (index < 0 || index >= pages[table].length) return { error: "cursor" };
          return { rows: pages[table][index], next: index + 1 < tokens.length ? tokens[index + 1] : null };
        },
        record: ({ row }) => {
          if (!row || typeof row !== "object" || JSON.stringify(row).length > 100000) return { error: "row" };
          actual.push(row);
          return { stored: true };
        },
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  const exhausted = Object.keys(s.tables).every((table) => {
    const reached = new Set([null]);
    for (const o of observations) if (o.method === "fetch" && o.request.table === table && reached.has(o.request.cursor) && Array.isArray(o.value?.rows)) {
      if (o.value.next === null) return true;
      reached.add(o.value.next);
    }
    return false;
  });
  const want = expected(s),
    lookup = (id) => actual.find((r) => r.customerId === id),
    ids = (rows) => rows.map((r) => r.customerId).sort();
  return {
    view: s.view,
    // Stable raw source rows remain observable even if a candidate under-fetches.
    tables: s.tables,
    ...checks({
      completion: exhausted && want.every((e) => lookup(e.customerId)),
      population: equal(ids(actual), ids(want)),
      attribution: want.every((e) => {
        const a = lookup(e.customerId);
        return !!a && a.name === e.name && a.usageUs === e.usageUs;
      }),
      exact_amounts: want.every((e) => {
        const a = lookup(e.customerId);
        return (
          !!a && ["chargeMicrocents", "creditMicrocents", "balanceMicrocents"].every((k) => a[k] === e[k])
        );
      }),
      provenance: want.every((e) => {
        const a = lookup(e.customerId);
        return !!a && equal(a.usageIds, e.usageIds) && equal(a.creditIds, e.creditIds);
      }),
      unique_rows:
        new Set(ids(actual)).size === actual.length &&
        actual.every(
          (a) =>
            Object.keys(a).sort().join(",") ===
            Object.keys(want[0] ?? {})
              .sort()
              .join(","),
        ),
    }),
    actual,
    expected: want,
    observations,
    reports,
  };
}
