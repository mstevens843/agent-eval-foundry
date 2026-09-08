export const checkIds = ["completion", "ownership", "labels", "preservation", "conditional_writes"];
export function scenarios() {
  const cases = Array.from({ length: 32 }, (_, seed) => {
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
      // trivial baseline cases. (No seed bit is freed up by dropping the old `seed & 16` gate --
      // `conflicts` already guarantees every seed and seed+16 pair differ, since 16 % 3 !== 0.)
      conflictMap: seed % 3
        ? {
            '["A","same"]': seed % 3,
            '["B","same"]': (seed + 1) % 3,
            '["A","second"]': (seed + 2) % 3,
          }
        : {},
    };
  });
  cases.push({
    id: "case-032",
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
  return cases;
}
