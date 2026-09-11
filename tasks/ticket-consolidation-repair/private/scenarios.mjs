export const checkIds = ["completion", "ownership", "labels", "preservation", "conditional_writes", "membership", "execution"];
export function scenarios() {
  const cases = Array.from({ length: 64 }, (_, seed) => {
    const row = (tenant, id, status = "open") => ({
      tenant,
      id,
      status,
      revision: 1,
      owner: "old",
      labels: ["keep-" + tenant],
      note: "original",
    });
    const rows = [
      row("A", "same"),
      row("B", "same"),
      row("A", "second"),
      row("A", "closed", "closed"),
      row("X", "private"),
    ];
    if (seed & 8) rows.reverse();
    return {
      id: "case-" + String(seed).padStart(3, "0"),
      rows,
      tenants: ["A", "B"],
      team: "care",
      marker: "migrated",
      emptyPage: !!(seed & 1),
      expire: !!(seed & 2),
      overlap: !!(seed & 4),
      conflicts: seed % 3,
      // Every scenario with any conflicts at all gets heterogeneous per-row conflict counts
      // (rotated by seed), not just a single reserved seed bit: with a uniform per-row count, a
      // batch client that assumes positional correspondence between a multi-row batch's
      // `results` and its own `updates` (rather than matching by (tenant,id) identity, as
      // SEMANTICS.md's "results may be reordered" requires) is fully indistinguishable from a
      // correct one whenever every row in the same batch call resolves identically. Only
      // heterogeneous per-row outcomes within one batch call actually exercise that documented
      // reordering contract. This still leaves the conflict-free seeds (seed % 3 === 0) as
      // trivial baseline cases.
      conflictMap: seed % 3
        ? {
            '["A","same"]': seed % 3,
            '["B","same"]': (seed + 1) % 3,
            '["A","second"]': (seed + 2) % 3,
          }
        : {},
      // Bit 16: at most one process interruption, injected right after the FIRST api.batch
      // call's effect lands. Reachable regardless of the other bits, since every tenants-scoped
      // scenario always selects at least one open row and so always issues at least one batch
      // call. No opBudget here — this bit alone only exercises crash correctness, not the
      // budget dimension (see the two hand-authored scenarios below for that).
      crashAfterBatch: seed & 16 ? 1 : null,
      // Bit 32: tenant A's "same" row (always selected, regardless of the other bits) has its
      // status concurrently flipped to "closed" the first time any delivery reads it live.
      statusFlipKey: seed & 32 ? '["A","same"]' : null,
      opBudget: null,
    };
  });
  cases.push({
    // Renamed from the old "case-032": the bit-flag bank now runs seeds 0..63, and seed 32
    // already produces an id of that form. Kept as its own dedicated single-row, single-tenant,
    // no-crash, no-flip, unbudgeted baseline case for the pre-existing controls' `clean` slot.
    id: "case-solo",
    rows: [
      {
        tenant: "A",
        id: "one",
        status: "open",
        revision: 1,
        owner: "old",
        labels: ["keep"],
        note: "original",
      },
    ],
    tenants: ["A"],
    team: "care",
    marker: "migrated",
    emptyPage: false,
    expire: false,
    overlap: false,
    conflicts: 0,
  });
  // Two hand-authored scenarios isolating the budget dimension from everything else: same
  // five-row shape as the bit-flag bank (three selected rows: A/same, B/same, A/second), one
  // interruption after the first api.batch call (which always lands on A/same's own, otherwise
  // unobstructed, single settlement attempt, since it carries no injected conflicts). A
  // strategy that persists progress (via storage, or simply by re-reading before re-writing and
  // skipping rows already correct) pays for one full page walk plus settlement of only the two
  // rows the crash left outstanding; a strategy that blindly redoes full settlement of every
  // selected row on every delivery, with no regard for what already landed, pays for a second
  // full page walk plus full resettlement of all three rows. "case-tight-budget-crash" sets an
  // operation budget between those two costs; "case-loose-budget-crash" is the same shape with
  // no cap, so a full-redo strategy is not banned outright — it only has to respect the budget
  // where one is actually in force.
  const budgetRows = [
    { tenant: "A", id: "same", status: "open", revision: 1, owner: "old", labels: ["keep-A"], note: "original" },
    { tenant: "B", id: "same", status: "open", revision: 1, owner: "old", labels: ["keep-B"], note: "original" },
    { tenant: "A", id: "second", status: "open", revision: 1, owner: "old", labels: ["keep-A"], note: "original" },
    { tenant: "A", id: "closed", status: "closed", revision: 1, owner: "old", labels: ["keep-A"], note: "original" },
    { tenant: "X", id: "private", status: "open", revision: 1, owner: "old", labels: ["keep-X"], note: "original" },
  ];
  const budgetConflictMap = {
    '["A","same"]': 0,
    '["B","same"]': 1,
    '["A","second"]': 2,
  };
  for (const [id, opBudget] of [["case-tight-budget-crash", 29], ["case-loose-budget-crash", null]]) {
    cases.push({
      id,
      rows: budgetRows,
      tenants: ["A", "B"],
      team: "care",
      marker: "migrated",
      emptyPage: false,
      expire: false,
      overlap: false,
      conflicts: 0,
      conflictMap: budgetConflictMap,
      crashAfterBatch: 1,
      statusFlipKey: null,
      opBudget,
    });
  }
  const complete = structuredClone(cases.find(c => c.id === "case-solo"));
  complete.id = "case-already-complete";
  complete.rows[0].owner = "A:care";
  complete.rows[0].labels.push(complete.marker);
  cases.push(complete, { ...structuredClone(complete), id: "case-complete-status-drift", statusFlipKey: '["A","one"]' });
  return cases;
}
