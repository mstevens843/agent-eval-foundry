export const checkIds = [
  "completion",
  "origin_identity",
  "policy_at_effect",
  "positive_work",
  "terminal_history",
  "effect_payload",
];
export function scenarios() {
  const rows = [];
  for (let seed = 0; seed < 24; seed++) {
    const suffix = String(seed),
      root = "root-" + suffix;
    const job = (id, parent, principal, resource = "doc", action = "write", route = "scheduled") => ({
      id,
      parent,
      principal,
      resource,
      action,
      payload: { id, amount: seed + 1 },
      route,
    });
    const jobs = [
      job(root, null, "user"),
      job("middle", root, "scheduler"),
      job("leaf", "middle", "admin", "doc", "write", "fanout"),
      job("other", null, "other"),
      job("denied", null, "stranger"),
      job("read", null, "user", "doc", "read", "retry"),
      job("foreign", root, "admin", "foreign", "publish", "fanout"),
    ];
    const grants = [
      { id: "a", from: "owner", to: "team", resources: ["doc"], actions: ["read", "write"], active: true },
      { id: "b", from: "team", to: "user", resources: ["doc"], actions: ["read", "write"], active: true },
      { id: "c", from: "owner", to: "other", resources: ["doc"], actions: ["write"], active: true },
      { id: "d", from: "owner", to: "user", resources: ["doc"], actions: ["read"], active: true },
      {
        id: "cycle",
        from: "team",
        to: "owner",
        resources: ["doc"],
        actions: ["read", "write"],
        active: true,
      },
      {
        id: "admin",
        from: "owner",
        to: "admin",
        resources: ["doc", "foreign"],
        actions: ["read", "write", "publish"],
        active: true,
      },
    ];
    const ids = [root, "middle", "leaf", root, "other", "denied", "read", "foreign", "leaf"];
    const deliveries = ids.map((id, i) => ({ id: "delivery-" + i, jobId: id, worker: "admin" }));
    const policies = deliveries.map((_, i) => ({
      revision: i * 2 + 1,
      owners: { doc: "owner", foreign: "foreign-owner" },
      grants: grants.map((g) => ({ ...g, active: g.id === "a" && i >= 3 ? false : g.active })),
    }));
    rows.push({
      id: "case-" + String(seed).padStart(3, "0"),
      jobs,
      deliveries,
      policies,
      races: seed % 2 ? [2, 4] : [1, 6],
    });
  }
  rows.push({
    id: "case-024",
    jobs: [
      {
        id: "j",
        parent: null,
        principal: "owner",
        resource: "doc",
        action: "read",
        payload: { ok: true },
        route: "direct",
      },
    ],
    deliveries: [{ id: "d", jobId: "j", worker: "w" }],
    policies: [{ revision: 1, owners: { doc: "owner" }, grants: [] }],
    races: [],
  });
  rows.push({ id: "case-025", jobs: [], deliveries: [], policies: [], races: [] });
  // case-026/027: crash-then-redeliver. A real subject process is killed after decide() has
  // already returned (effect applied, for executed work) but before finish() durably closes the
  // delivery — see SEMANTICS.md's "process restart" paragraph and domain.mjs's CRASH_MARKER. A
  // fresh process (a second subject.run() invocation against the SAME still-open job) must
  // recognize the already-recorded decision via receipt() and finish it, without deciding again
  // or reapplying its effect. case-026 crashes an executed (effect-bearing) delivery sandwiched
  // between two ordinary ones, proving resume both recovers the interrupted delivery correctly
  // AND lets the run continue on to what follows it. case-027 crashes a denied delivery (no
  // effect at all), proving resume doesn't fabricate one or flip the outcome.
  rows.push({
    id: "case-026",
    jobs: [
      {
        id: "before-crash",
        parent: null,
        principal: "owner",
        resource: "doc",
        action: "write",
        payload: { step: "before" },
        route: "direct",
      },
      {
        id: "crash-executed",
        parent: null,
        principal: "owner",
        resource: "doc",
        action: "write",
        payload: { step: "crash" },
        route: "direct",
      },
      {
        id: "after-crash",
        parent: null,
        principal: "owner",
        resource: "doc",
        action: "write",
        payload: { step: "after" },
        route: "direct",
      },
    ],
    deliveries: [
      { id: "delivery-before-crash", jobId: "before-crash", worker: "w" },
      { id: "delivery-crash-executed", jobId: "crash-executed", worker: "w" },
      { id: "delivery-after-crash", jobId: "after-crash", worker: "w" },
    ],
    policies: [
      { revision: 1, owners: { doc: "owner" }, grants: [] },
      { revision: 1, owners: { doc: "owner" }, grants: [] },
      { revision: 1, owners: { doc: "owner" }, grants: [] },
    ],
    races: [],
    crashDeliveries: ["delivery-crash-executed"],
  });
  rows.push({
    id: "case-027",
    jobs: [
      {
        id: "crash-denied",
        parent: null,
        principal: "stranger",
        resource: "doc",
        action: "write",
        payload: { step: "denied" },
        route: "direct",
      },
    ],
    deliveries: [{ id: "delivery-crash-denied", jobId: "crash-denied", worker: "w" }],
    policies: [{ revision: 1, owners: { doc: "owner" }, grants: [] }],
    races: [],
    crashDeliveries: ["delivery-crash-denied"],
  });
  // case-028: redundant/independent-path fallback. "user" is reachable two independent ways —
  // owner->team->user (grants a+b) and a separate direct owner->user grant ("direct"). The first
  // delivery decides while grant "a" is still active; the SECOND delivery's policy has grant "a"
  // permanently revoked (the standard "permanent-policy-drift" shape), leaving "direct" as the
  // only surviving path. Revoking one valid path must not deny work still reachable via the
  // other (SEMANTICS.md: "Several independent valid paths may exist; revoking one does not
  // revoke the others") — no existing scenario exercised this because every prior revocation
  // removed the target's ONLY path.
  rows.push({
    id: "case-028",
    jobs: [
      {
        id: "redundant-early",
        parent: null,
        principal: "user",
        resource: "doc",
        action: "write",
        payload: { step: "early" },
        route: "direct",
      },
      {
        id: "redundant-late",
        parent: null,
        principal: "user",
        resource: "doc",
        action: "write",
        payload: { step: "late" },
        route: "direct",
      },
    ],
    deliveries: [
      { id: "delivery-redundant-early", jobId: "redundant-early", worker: "w" },
      { id: "delivery-redundant-late", jobId: "redundant-late", worker: "w" },
    ],
    policies: [
      {
        revision: 1,
        owners: { doc: "owner" },
        grants: [
          { id: "a", from: "owner", to: "team", resources: ["doc"], actions: ["read", "write"], active: true },
          { id: "b", from: "team", to: "user", resources: ["doc"], actions: ["read", "write"], active: true },
          { id: "direct", from: "owner", to: "user", resources: ["doc"], actions: ["write"], active: true },
        ],
      },
      {
        revision: 2,
        owners: { doc: "owner" },
        grants: [
          { id: "a", from: "owner", to: "team", resources: ["doc"], actions: ["read", "write"], active: false },
          { id: "b", from: "team", to: "user", resources: ["doc"], actions: ["read", "write"], active: true },
          { id: "direct", from: "owner", to: "user", resources: ["doc"], actions: ["write"], active: true },
        ],
      },
    ],
    races: [],
  });
  // case-029: adversarial cycle handling. owners.doc = "team" (NOT "owner"), so the search does
  // not start at "owner" — "cycle" (team->owner) is now a load-bearing first hop, not the dead
  // branch it is in every other scenario (where the search always starts at "owner" already).
  // "reach-target"/principal "admin" is legitimately reachable only via cycle+reach (2 hops) —
  // proving cycles are usable as real, correct path segments. "trap-target"/principal "phantom"
  // is NOT reachable: the only edge touching it, "guard", runs phantom->team (the wrong
  // direction for forward reachability from "team"). An implementation that mishandles graph
  // direction/cycles (e.g. treating a grant edge as usable in either direction) is exactly what
  // would over-grant "phantom" here; a correct implementation must deny it even though the
  // cycle sits right next to the only edge that touches it.
  rows.push({
    id: "case-029",
    jobs: [
      {
        id: "reach-target",
        parent: null,
        principal: "admin",
        resource: "doc",
        action: "write",
        payload: { probe: "reach" },
        route: "direct",
      },
      {
        id: "trap-target",
        parent: null,
        principal: "phantom",
        resource: "doc",
        action: "write",
        payload: { probe: "trap" },
        route: "direct",
      },
    ],
    deliveries: [
      { id: "delivery-reach-target", jobId: "reach-target", worker: "w" },
      { id: "delivery-trap-target", jobId: "trap-target", worker: "w" },
    ],
    policies: [1, 2].map((revision) => ({
      revision,
      owners: { doc: "team" },
      grants: [
        { id: "cycle", from: "team", to: "owner", resources: ["doc"], actions: ["read", "write"], active: true },
        { id: "a", from: "owner", to: "team", resources: ["doc"], actions: ["read", "write"], active: true },
        { id: "reach", from: "owner", to: "admin", resources: ["doc"], actions: ["read", "write"], active: true },
        { id: "guard", from: "phantom", to: "team", resources: ["doc"], actions: ["read", "write"], active: true },
      ],
    })),
    races: [],
  });
  return rows;
}
