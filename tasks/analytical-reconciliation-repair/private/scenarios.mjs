export const checkIds = [
  "completion",
  "population",
  "attribution",
  "exact_amounts",
  "provenance",
  "unique_rows",
];
export function scenarios() {
  const result = [];
  for (let seed = 0; seed < 24; seed++) {
    // Three previously-conflated stress bits, split onto independent low bits of seed so every
    // combination of {empty-page continuation, reversed usage order, large-number precision}
    // occurs across the 24 cases instead of all three always moving together on seed % 2.
    const emptyPageBit = (seed >> 1) & 1,
      reverseBit = seed & 1,
      bigQuantityBit = (seed >> 2) & 1;
    const tenant = "tenant-" + seed,
      foreign = "outside",
      customers = [
        { tenant, id: "a", name: "Alpha " + seed, active: true },
        { tenant, id: "b", name: "Beta", active: true },
        { tenant, id: "z", name: "Zero", active: true },
        { tenant, id: "off", name: "Inactive", active: false },
        { tenant: foreign, id: "a", name: "Foreign", active: true },
      ];
    const accounts = [
      { tenant, id: "x", customerId: "a", price: { n: "1", d: "2" } },
      { tenant, id: "y", customerId: "b", price: { n: "1", d: "3" } },
      { tenant: foreign, id: "x", customerId: "a", price: { n: "999", d: "1" } },
    ];
    const usage = [
      {
        tenant,
        id: "u1",
        revision: 1,
        accountId: "x",
        at: 1,
        quantity: "0.001",
        unit: "ms",
        state: "posted",
      },
      {
        tenant,
        id: "u2",
        revision: 1,
        accountId: "x",
        at: 2,
        quantity: "0.001",
        unit: "ms",
        state: "posted",
      },
      { tenant, id: "moved", revision: 1, accountId: "x", at: 2, quantity: "5", unit: "s", state: "posted" },
      { tenant, id: "moved", revision: 2, accountId: "y", at: 10, quantity: "5", unit: "s", state: "posted" },
      {
        tenant,
        id: "cancelled",
        revision: 1,
        accountId: "x",
        at: 4,
        quantity: "3",
        unit: "min",
        state: "posted",
      },
      {
        tenant,
        id: "cancelled",
        revision: 2,
        accountId: "x",
        at: 4,
        quantity: "3",
        unit: "min",
        state: "void",
      },
      {
        tenant,
        id: "billed",
        revision: 1,
        accountId: "y",
        at: 0,
        quantity: bigQuantityBit ? "1000000000000.003" : "1.003",
        unit: seed % 3 ? "s" : "min",
        state: "posted",
      },
      {
        tenant: foreign,
        id: "u1",
        revision: 8,
        accountId: "x",
        at: 3,
        quantity: "100",
        unit: "s",
        state: "posted",
      },
    ];
    const credits = [
      { tenant, id: "u1", revision: 1, customerId: "a", at: 2, microcents: "2", state: "posted" },
      { tenant, id: "r", revision: 1, customerId: "b", at: 1, microcents: "9", state: "posted" },
      { tenant, id: "r", revision: 2, customerId: "a", at: 2, microcents: "3", state: "posted" },
      { tenant: foreign, id: "u1", revision: 9, customerId: "a", at: 2, microcents: "99", state: "posted" },
    ];
    usage.push(structuredClone(usage[0]));
    if (reverseBit) usage.reverse();
    if (seed % 3 === 0) credits.reverse();
    result.push({
      id: "case-" + String(seed).padStart(3, "0"),
      view: { tenant, from: 0, to: 10 },
      tables: { customers, accounts, usage, credits },
      pageSize: 1 + (seed % 5),
      emptyPage: emptyPageBit === 1,
    });
  }
  result.push({
    id: "case-024",
    view: { tenant: "t", from: 0, to: 10 },
    tables: {
      customers: [{ tenant: "t", id: "a", name: "A", active: true }],
      accounts: [],
      usage: [],
      credits: [],
    },
    pageSize: 3,
    emptyPage: false,
  });
  result.push({
    id: "case-025",
    view: { tenant: "none", from: 0, to: 1 },
    tables: { customers: [], accounts: [], usage: [], credits: [] },
    pageSize: 1,
    emptyPage: true,
  });
  // Every primary-loop revision that reassigns accountId to a different customer's account
  // (usage id "moved") always lands its winning revision OUTSIDE the view window, so a solver
  // that resolves "latest revision" and "in-window" independently never has to prove it applies
  // the reassignment correctly to a revision that actually survives the window. This case forces
  // that: revision 2 both changes ownership (customer c1's account -> customer c2's account) AND
  // stays inside [from,to). Correct behavior counts the usage entirely under c2 via account p2;
  // c1 must show zero usage from it (its own revision 1 was fully superseded, not merged).
  result.push({
    id: "case-026",
    view: { tenant: "reassign-tenant", from: 0, to: 10 },
    tables: {
      customers: [
        { tenant: "reassign-tenant", id: "c1", name: "Reassign C1", active: true },
        { tenant: "reassign-tenant", id: "c2", name: "Reassign C2", active: true },
      ],
      accounts: [
        { tenant: "reassign-tenant", id: "p1", customerId: "c1", price: { n: "1", d: "1" } },
        { tenant: "reassign-tenant", id: "p2", customerId: "c2", price: { n: "2", d: "1" } },
      ],
      usage: [
        {
          tenant: "reassign-tenant",
          id: "switch",
          revision: 1,
          accountId: "p1",
          at: 2,
          quantity: "5",
          unit: "s",
          state: "posted",
        },
        {
          tenant: "reassign-tenant",
          id: "switch",
          revision: 2,
          accountId: "p2",
          at: 8,
          quantity: "5",
          unit: "s",
          state: "posted",
        },
      ],
      credits: [],
    },
    pageSize: 1,
    emptyPage: false,
  });
  // No existing case ever sums usage from TWO DIFFERENT accounts (different price ratios) for the
  // SAME customer to an exact halfway rounding tie: the only existing tie source is two events on
  // one account (same denominator throughout, no real fraction combination). Account p1 (1/2) and
  // p2 (1/3) each contribute a term with a different denominator; 1us on p1 (1/2) plus 3us on p2
  // (3/3 = 1) sums to exactly 3/2, an exact halfway tie that only exists after combining across
  // accounts — forcing whichever combination strategy (incremental reduction, common denominator,
  // or otherwise) to land on the same exact value the reference and alternative both reach.
  result.push({
    id: "case-027",
    view: { tenant: "tie-tenant", from: 0, to: 10 },
    tables: {
      customers: [
        { tenant: "tie-tenant", id: "c", name: "Tie C", active: true },
        { tenant: "tie-tenant", id: "idle", name: "Tie Idle", active: true },
        { tenant: "tie-tenant", id: "off", name: "Tie Off", active: false },
      ],
      accounts: [
        { tenant: "tie-tenant", id: "p1", customerId: "c", price: { n: "1", d: "2" } },
        { tenant: "tie-tenant", id: "p2", customerId: "c", price: { n: "1", d: "3" } },
      ],
      usage: [
        {
          tenant: "tie-tenant",
          id: "e1",
          revision: 1,
          accountId: "p1",
          at: 1,
          quantity: "0.001",
          unit: "ms",
          state: "posted",
        },
        {
          tenant: "tie-tenant",
          id: "e2",
          revision: 1,
          accountId: "p2",
          at: 2,
          quantity: "0.003",
          unit: "ms",
          state: "posted",
        },
      ],
      credits: [],
    },
    pageSize: 1,
    emptyPage: false,
  });
  return result;
}
