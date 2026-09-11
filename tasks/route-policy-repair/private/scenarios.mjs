export const checkIds = [
  "completion",
  "positive_change",
  "scoped_behavior",
  "preservation",
  "legal_config",
  "translation",
];
// Every base scenario's request.match.communities is either absent or a single community
// (["tagged"]), so a checker whose own community-matching logic works for zero or one required
// community but is wrong for two-or-more (e.g. checks only one of several, or uses OR instead of
// AND across the required set) was never actually exercised. A real submitted checker
// demonstrated exactly this: correct on {}, {a}, {b} and {a,b,c} route-community sets against a
// three-community match, wrong on {a,b}. These two scenarios require ALL of three communities
// and test every one of the 8 possible route-community subsets against that requirement, closing
// the gap without touching the existing 25 scenarios' shape, ids or count.
function multiCommunityScenario(id, egresses) {
  const policies = {
    root: {
      terms: [{ match: {}, action: { kind: "call", policy: "leaf" } }],
      fallback: { kind: "reject" },
    },
    leaf: {
      terms: [{ match: {}, action: { kind: "accept", preference: 10 } }],
      fallback: { kind: "reject" },
    },
  };
  const config = { egresses: { east: "root", west: "root" }, policies };
  const request = { egresses, match: { communities: ["a", "b", "c"] }, preference: 200 };
  const subsets = [[], ["a"], ["b"], ["c"], ["a", "b"], ["a", "c"], ["b", "c"], ["a", "b", "c"]];
  const routes = [];
  for (const egress of ["east", "west"])
    for (const communities of subsets)
      for (const prefix of ["10.0.0.0/16", "0.0.0.0/0"])
        routes.push({ egress, route: { prefix, preference: 17, communities } });
  return { id, config, request, routes };
}
function baseScenarios() {
  return [
    ...Array.from({ length: 25 }, (_, n) => {
      const simple = n === 24,
        policies = {
          root: {
            terms: [
              { match: { communities: ["blocked"] }, action: { kind: "reject", add: ["denied"] } },
              { match: {}, action: { kind: "call", policy: "leaf" } },
            ],
            fallback: { kind: "reject" },
          },
          leaf: {
            terms: [
              {
                match: { prefix: "10.0.0.0/8", ge: 16, le: 24 },
                action: { kind: "accept", preference: 100, add: ["exported"] },
              },
            ],
            fallback: { kind: "accept", preference: 50 },
          },
        };
      if (n & 1)
        policies.leaf.terms.unshift({
          match: { communities: ["tagged"] },
          action: { kind: "continue", remove: ["tagged"], add: ["changed"] },
        });
      if (n & 2)
        policies.leaf.terms.unshift({
          match: { prefix: "10.128.0.0/9", ge: 16, le: 24 },
          action: { kind: "return", preference: 33 },
        });
      if (n & 4) policies.local0 = { terms: [], fallback: { kind: "return" } };
      const request = {
        egresses: simple ? ["east", "west"] : ["east"],
        match: simple
          ? {}
          : { prefix: "10.64.0.0/10", ge: 16, le: 24, ...(n & 8 ? { communities: ["tagged"] } : {}) },
        preference: !simple && n & 16 ? 0 : 200,
      };
      const config = { egresses: { east: "root", west: "root" }, policies },
        routes = [];
      for (const egress of ["east", "west"])
        for (const prefix of [
          "10.64.0.0/16",
          "10.64.0.0/24",
          "10.64.0.0/25",
          "10.127.0.0/16",
          "10.128.0.0/16",
          "11.0.0.0/16",
          "0.0.0.0/0",
        ])
          for (const communities of [[], ["tagged"], ["blocked"], ["tagged", "blocked"]])
            routes.push({ egress, route: { prefix, preference: 17, communities } });
      return { id: "case-" + String(n).padStart(3, "0"), config, request, routes };
    }),
    multiCommunityScenario("case-025", ["east"]),
    multiCommunityScenario("case-026", ["east", "west"]),
  ];
}

export function scenarios() {
  const rows = baseScenarios();
  for (let n = 0; n < 4; n++) {
    const shared = {
      terms: [
        { match: { communities: ["a", "routed"] }, action: { kind: "return", preference: 9, remove: ["b"] } },
        { match: { communities: ["b", "c"] }, action: { kind: "continue", add: ["routed"], remove: ["c"] } },
      ],
      fallback: { kind: "return", add: ["routed"] },
    };
    const policies = {
      root: {
        terms: [
          { match: { communities: ["blocked"] }, action: { kind: "reject" } },
          { match: {}, action: { kind: "call", policy: "gate" } },
          {
            match: { prefix: "10.0.0.0/8", communities: ["routed"] },
            action: { kind: "accept", preference: 80 },
          },
        ],
        fallback: { kind: "reject" },
      },
      gate: {
        terms: [
          { match: { communities: ["a", "b"] }, action: { kind: "call", policy: "shared" } },
          { match: { prefix: "10.64.0.0/10", ge: 12, le: 24 }, action: { kind: "call", policy: "nested" } },
        ],
        fallback: { kind: "return" },
      },
      nested: {
        terms: [
          {
            match: { communities: ["b", "c"] },
            action: { kind: "continue", remove: ["a"], add: ["routed"] },
          },
          { match: { prefix: "10.96.0.0/11" }, action: { kind: "call", policy: "shared" } },
        ],
        fallback: { kind: "return", preference: n ? 0 : 33 },
      },
      shared,
      outbound: {
        terms: [{ match: {}, action: { kind: "call", policy: "shared" } }],
        fallback: { kind: "accept", add: ["exported"] },
      },
    };
    const config = { policies, egresses: { east: "root", west: "root", backup: "outbound" } },
      request = {
        egresses: ["east"],
        match: { prefix: "10.64.0.0/10", ge: 16, le: 24, communities: n % 2 ? ["a", "b", "c"] : ["routed"] },
        preference: 200,
      };
    const routes = [];
    for (const egress of Object.keys(config.egresses))
      for (const prefix of ["10.64.0.0/16", "10.96.0.0/20", "10.128.0.0/16", "11.0.0.0/8"])
        for (const communities of [
          [],
          ["a", "b"],
          ["a", "b", "c"],
          ["b", "c"],
          ["routed"],
          ["a", "b", "c", "blocked"],
        ])
          routes.push({ egress, route: { prefix, preference: 17, communities } });
    rows.push({ id: "migration-" + n, config, request, routes });
  }
  const six = structuredClone(rows[24]);
  six.id = "six-egresses";
  six.config.egresses = Object.fromEntries(
    Array.from({ length: 6 }, (_, i) => ["edge-" + i, i % 2 ? "leaf" : "root"]),
  );
  six.request.egresses = ["edge-0", "edge-2", "edge-5"];
  six.routes = Object.keys(six.config.egresses).flatMap((egress) =>
    rows[24].routes.filter((r) => r.egress === "east").map((r) => ({ ...r, egress })),
  );
  rows.push(six);
  const wide = structuredClone(rows[24]);
  wide.id = "twelve-communities";
  const tags = Array.from({ length: 12 }, (_, i) => "c" + i);
  wide.config.policies = {
    root: {
      terms: [{ match: { communities: tags }, action: { kind: "accept", preference: 50 } }],
      fallback: { kind: "reject" },
    },
  };
  wide.config.egresses = { east: "root", west: "root" };
  wide.request = { egresses: ["east"], match: {}, preference: 200 };
  wide.routes = [tags, tags.slice(0, -1), tags.slice(1), []].flatMap((communities) =>
    ["east", "west"].map((egress) => ({
      egress,
      route: { prefix: "10.0.0.0/8", preference: 17, communities },
    })),
  );
  rows.push(wide);
  return rows;
}
