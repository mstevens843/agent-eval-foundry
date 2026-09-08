export const checkIds = ["completion", "payload", "dependency_order", "preservation"];
export function scenarios() {
  const cases = Array.from({ length: 32 }, (_, seed) => {
    const root = { id: "shared", parents: [], payload: "stable" },
      db = { id: "database", parents: ["shared"], payload: "db" },
      worker = { id: "worker", parents: ["database"], payload: "v2" },
      route = { id: "route", parents: ["worker"], payload: "route" };
    // Bit 4 (seed & 16) puts the payload mismatch two hops from the leaf instead of one: a
    // stale `database` forces cascading removal/recreation through worker AND route, so a
    // single-pass (non-fixed-point) dependent-closure still fails here even when it happens
    // to catch a one-hop case. Depth-1-only chains (bits 0-3) never distinguish "closure runs
    // to a fixed point" from "closure runs once". Paired with bit 2 (route already absent) it
    // would ask a plan to create route on top of a worker no plan here ever recreates, which
    // is a different (already-covered-by-bit-2-alone) question, so bit 4 only takes effect
    // when route starts present.
    const current = [
      root,
      { ...db, payload: seed & 16 && !(seed & 4) ? "db-stale" : "db" },
      { ...worker, payload: seed & 1 ? "v2" : "v1" },
      route,
      { id: "unrelated", parents: ["shared"], payload: "private" },
    ];
    if (seed & 2) current.push({ id: "obsolete", parents: ["worker"], payload: "old" });
    if (seed & 4)
      current.splice(
        current.findIndex((r) => r.id === "route"),
        1,
      );
    if (seed & 8) current.reverse();
    return {
      id: "case-" + String(seed).padStart(3, "0"),
      current,
      target: [route, worker, db],
      scope: ["database", "worker", "route", "obsolete"],
      // `uncertain === 2` is the only value that actually requires a receipt-poll-and-retry to
      // land at all (0 has no ambiguity; 1 reports UNKNOWN but has already landed for real, so a
      // transport that ignores the status is harmless there). A client that ignores UNKNOWN
      // without ever checking a receipt is indistinguishable from a correct one whenever it never
      // draws an `uncertain === 2` scenario. An even seed % 3 split gave that load-bearing case
      // only 1 in 3 odds within a scenario window; skewing it to 2 in 3 (folding the
      // no-ambiguity-at-all case into it, since case-032 already covers the trivial baseline)
      // makes it far less likely a small graded window happens to miss it entirely.
      uncertain: seed % 3 === 0 ? 2 : seed % 3,
    };
  });
  cases.push({ id: "case-032", current: [], target: [], scope: ["worker"], uncertain: 0 });
  return cases;
}
