export const checkIds = ["completion", "payload", "dependency_order", "preservation"];
export function scenarios() {
  const cases = Array.from({ length: 64 }, (_, seed) => {
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
      // Bit 5 (seed & 32) makes `route` itself -- a true leaf with no dependents anywhere in
      // scope or target -- start with a stale payload instead of its target one. This is the
      // isolated "remove this id, then recreate the SAME id" case: recreating route never
      // cascades into any other id, so a candidate that mishandles only route's own restore
      // (e.g. treats an earlier/unrelated receipt as proof this specific create landed) cannot
      // hide behind, or be bailed out by, any other operation the plan also happens to need --
      // the final graph is wrong for route and nothing else. Paired with bit 2 (route already
      // absent) it would ask for a fresh create instead of a remove-then-recreate, a different
      // (already-covered) question, so bit 5 only takes effect when route starts present. Kept
      // mutually exclusive with bit 4 (deliberately, not a limitation of the domain): bit 4
      // already exercises its own cascade-through-a-stale-parent question, and layering a
      // *second*, independently-stale leaf onto that same cascade would just be asking whether a
      // plan recreates two things instead of one -- no new reasoning, only a bigger blast radius
      // for any candidate/control that mishandles the cascade, which is exactly the kind of
      // "harder via more moving parts, not more reasoning" scaling this contract deliberately
      // avoids.
      { ...route, payload: seed & 32 && !(seed & 4) && !(seed & 16) ? "route-stale" : "route" },
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
      // no-ambiguity-at-all case into it, since case-trivial-empty already covers the trivial
      // baseline) makes it far less likely a small graded window happens to miss it entirely.
      uncertain: seed % 3 === 0 ? 2 : seed % 3,
    };
  });
  cases.push({ id: "case-trivial-empty", current: [], target: [], scope: ["worker"], uncertain: 0 });
  return cases;
}
