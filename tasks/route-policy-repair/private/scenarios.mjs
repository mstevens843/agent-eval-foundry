export const checkIds = ["completion", "positive_change", "scoped_behavior", "preservation", "legal_config"];
export function scenarios() {
  return Array.from({ length: 25 }, (_, n) => {
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
  });
}
