export const checkIds = [
  "completion",
  "capacity_and_constraints",
  "future_promise",
  "irreversible_sequence",
  "preservation",
];
const q = (tags, units = 1, minZones = 1, antiWith = [], shareZoneWith = null) => ({
  tags,
  units,
  minZones,
  antiWith,
  shareZoneWith,
});
export function scenarios() {
  const out = [];
  for (let seed = 0; seed < 24; seed++) {
    const resources = [
      { id: "flex", tags: ["general", "critical"], zone: "a", capacity: 1, used: 0 },
      { id: "general-b", tags: ["general"], zone: "b", capacity: 1, used: 0 },
      { id: "general-a", tags: ["general"], zone: "a", capacity: 1, used: seed % 2 ? 0 : 1 },
      { id: "spare", tags: ["later"], zone: "b", capacity: 2, used: seed % 3 ? 1 : 0 },
    ];
    const leaf = { id: "later", request: q(["later"]), children: [] };
    const tree = {
      id: "first",
      request: q(["general"], seed % 2 ? 2 : 1, seed % 2 ? 2 : 1),
      children: [
        { id: "critical", request: q(["critical"]), children: [leaf] },
        { id: "ordinary", request: q(["general"]), children: [{ ...leaf, id: "other-later" }] },
      ],
    };
    const path = seed % 3 ? ["first", "critical", "later"] : ["first", "ordinary", "other-later"];
    if (seed >= 12) {
      tree.children[0].request.antiWith = ["first"];
      tree.children[1].request.antiWith = ["first"];
    }
    if (seed >= 18) {
      tree.children[1].request.shareZoneWith = "first";
      resources[1].zone = "a";
      tree.request.minZones = 1;
    }
    out.push({ id: "case-" + String(seed).padStart(3, "0"), view: { resources, tree }, path });
  }
  out.push({
    id: "case-024",
    view: {
      resources: [{ id: "r", tags: ["g"], zone: "a", capacity: 1, used: 0 }],
      tree: { id: "n", request: q(["g"]), children: [] },
    },
    path: ["n"],
  });
  out.push({
    id: "case-025",
    view: {
      resources: [
        { id: "a", tags: ["start", "g"], zone: "a", capacity: 2, used: 0 },
        { id: "b", tags: ["g"], zone: "b", capacity: 1, used: 0 },
      ],
      tree: {
        id: "root",
        request: q(["start"]),
        children: [{ id: "child", request: q(["g"], 1, 1, ["root"]), children: [] }],
      },
    },
    path: ["root", "child"],
  });
  out.push({
    id: "case-026",
    view: {
      resources: [
        { id: "a", tags: ["start"], zone: "a", capacity: 1, used: 0 },
        { id: "b", tags: ["g"], zone: "b", capacity: 1, used: 0 },
        { id: "c", tags: ["g"], zone: "a", capacity: 1, used: 0 },
      ],
      tree: {
        id: "root",
        request: q(["start"]),
        children: [{ id: "child", request: q(["g"], 1, 1, [], "root"), children: [] }],
      },
    },
    path: ["root", "child"],
  });
  out.push({
    id: "case-027",
    view: {
      resources: [
        { id: "a", tags: ["g"], zone: "a", capacity: 1, used: 0 },
        { id: "b", tags: ["g"], zone: "a", capacity: 1, used: 0 },
        { id: "c", tags: ["g"], zone: "b", capacity: 1, used: 0 },
      ],
      tree: { id: "root", request: q(["g"], 2, 2), children: [] },
    },
    path: ["root"],
  });
  // Widened families below. case-025/026/027 above each isolate exactly one binding
  // constraint (antiWith / shareZoneWith / minZones) with genuine spare capacity, so a
  // subject that ignores the constraint produces a placement that is capacity-legal but
  // constraint-illegal -- unlike the seed loop above, where every resource a violation
  // could touch has capacity 1 (so a capacity check alone already excludes it) or the
  // constraint's own enabling condition removes the zone diversity needed to violate it.
  // Naive edits to the seed loop's shared 4-resource template to add that slack were tried
  // and verified (empirically, by running the real reference/alternative/control code) to
  // either leave detection at 0 or collapse detection of the *other* controls that seed
  // loop already carries (locally-greedy, existential-future, mint-capacity,
  // coalesce-requested-units all depend on that template's specific scarcity). Rather than
  // silently trade one coverage gap for another, these families reuse the proven-isolated
  // shape and vary it (declaration order, ancestor depth, capacity) so each defect is
  // caught across a genuinely larger fraction of the declared scenario space instead of
  // exactly one dedicated case.
  for (let i = 0; i < 4; i++) {
    // antiWith family: "a" always satisfies the root's "start" tag and has spare capacity
    // left after root (and, when nested, an intermediate ancestor) consumes one unit; the
    // leaf's antiWith must still forbid reusing "a" even though capacity alone allows it.
    // An extra, always-irrelevant "decoy" resource (wrong tag entirely) is appended in half
    // the variants to confirm an unrelated array entry never changes the outcome.
    const nested = i >= 2;
    const decoy = i % 2 === 1;
    // capacity stays within the published 1-2 bound; "mid" (when present) gets its own
    // dedicated "m" resource rather than a second unit of "a", so "a" is only ever consumed
    // once (by root) and still has exactly the same one spare slot in every variant.
    const a = { id: "a", tags: ["start", "g"], zone: "a", capacity: 2, used: 0 };
    const b = { id: "b", tags: ["g"], zone: "b", capacity: 1, used: 0 };
    const m = { id: "m", tags: ["mid"], zone: "a", capacity: 1, used: 0 };
    const resources = [
      a,
      b,
      ...(nested ? [m] : []),
      ...(decoy ? [{ id: "irrelevant", tags: ["other"], zone: "a", capacity: 1, used: 0 }] : []),
    ];
    const tree = nested
      ? {
          id: "root",
          request: q(["start"]),
          children: [
            {
              id: "mid",
              request: q(["mid"]),
              children: [{ id: "child", request: q(["g"], 1, 1, ["root"]), children: [] }],
            },
          ],
        }
      : {
          id: "root",
          request: q(["start"]),
          children: [{ id: "child", request: q(["g"], 1, 1, ["root"]), children: [] }],
        };
    out.push({
      id: "anti-affinity-" + i,
      view: { resources, tree },
      path: nested ? ["root", "mid", "child"] : ["root", "child"],
    });
  }
  for (let i = 0; i < 4; i++) {
    // shareZoneWith family: root's tag is only satisfiable by a single zone-"a" resource, so
    // root's realized zone is fixed; the child must share that zone even though a same-tag,
    // wrong-zone resource remains capacity-available.
    const nested = i >= 2;
    const swapped = i % 2 === 1;
    const start = { id: "start", tags: ["start"], zone: "a", capacity: nested ? 2 : 1, used: 0 };
    const wrong = { id: "wrong-zone", tags: ["g"], zone: "b", capacity: 1, used: 0 };
    const right = { id: "right-zone", tags: ["g"], zone: "a", capacity: 1, used: 0 };
    const resources = swapped ? [wrong, right, start] : [start, wrong, right];
    const tree = nested
      ? {
          id: "root",
          request: q(["start"]),
          children: [
            {
              id: "mid",
              request: q(["start"]),
              children: [{ id: "child", request: q(["g"], 1, 1, [], "root"), children: [] }],
            },
          ],
        }
      : {
          id: "root",
          request: q(["start"]),
          children: [{ id: "child", request: q(["g"], 1, 1, [], "root"), children: [] }],
        };
    out.push({
      id: "zone-affinity-" + i,
      view: { resources, tree },
      path: nested ? ["root", "mid", "child"] : ["root", "child"],
    });
  }
  for (let i = 0; i < 4; i++) {
    // minZones family: two candidate pairs both preserve every future obligation (there is
    // none here to preserve), so only minZones distinguishes the single-zone pair (invalid)
    // from the two-zone pair (valid) -- unlike the seed loop, where the two-zone pair is the
    // only one that also happens to be future-safe, so minZones itself is never the reason.
    const decoy = i % 2 === 1;
    const wide = i >= 2; // 4-resource variant: two same-zone pairs to choose from, not one
    const a = { id: "a", tags: ["g"], zone: "a", capacity: 1, used: 0 };
    const b = { id: "b", tags: ["g"], zone: "a", capacity: 1, used: 0 };
    const c = { id: "c", tags: ["g"], zone: "b", capacity: 1, used: 0 };
    const d = { id: "d", tags: ["g"], zone: "b", capacity: 1, used: 0 };
    const irrelevant = { id: "irrelevant", tags: ["other"], zone: "a", capacity: 1, used: 0 };
    const resources = wide
      ? [a, b, c, d, ...(decoy ? [irrelevant] : [])]
      : [a, b, c, ...(decoy ? [irrelevant] : [])];
    out.push({
      id: "zone-count-" + i,
      view: { resources, tree: { id: "root", request: q(["g"], 2, 2), children: [] } },
      path: ["root"],
    });
  }
  // Combined scenario: antiWith, shareZoneWith and minZones all simultaneously binding on
  // the same path. Root has a real one-zone/two-zone choice; the child has independently
  // wrong used-resource and wrong-zone choices. The earlier forced-root variant did not
  // activate all three constraints independently. Adopted from the later construction
  // snapshot, with a separate retained re-freeze record and fresh activation tests.
  out.push({
    id: "combined-constraints-000",
    view: {
      resources: [
        { id: "root-a", tags: ["start", "g"], zone: "a", capacity: 2, used: 0 },
        { id: "root-same-zone", tags: ["start"], zone: "a", capacity: 1, used: 0 },
        { id: "root-other-zone", tags: ["start"], zone: "b", capacity: 1, used: 0 },
        { id: "wrong-zone-g", tags: ["g"], zone: "c", capacity: 1, used: 0 },
        { id: "right-zone-g", tags: ["g"], zone: "a", capacity: 1, used: 0 },
      ],
      tree: {
        id: "root",
        request: q(["start"], 2, 2),
        children: [{ id: "child", request: q(["g"], 1, 1, ["root"], "root"), children: [] }],
      },
    },
    path: ["root", "child"],
  });
  return out;
}
