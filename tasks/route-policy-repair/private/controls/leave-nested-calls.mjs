import { fresh } from "./names.mjs";
export function plan(v) {
  const config = structuredClone(v.config),
    names = {};
  for (const name of Object.keys(v.config.policies)) {
    const id = fresh(config.policies, "local");
    names[name] = id;
    config.policies[id] = { terms: [], fallback: { kind: "return" } };
  }
  for (const [name, policy] of Object.entries(v.config.policies)) {
    const clone = structuredClone(policy);
    for (const a of [...clone.terms.map((t) => t.action), clone.fallback]) {
      if (a.kind === "accept") a.preference = v.request.preference;
    }
    config.policies[names[name]] = clone;
  }
  for (const egress of v.request.egresses) {
    const original = v.config.egresses[egress],
      id = fresh(config.policies, "entry");
    const branch = fresh(config.policies, "branch");
    config.policies[branch] = {
      terms: [{ match: {}, action: { kind: "call", policy: names[original] } }],
      fallback: { kind: "reject" },
    };
    config.policies[id] = {
      terms: [{ match: structuredClone(v.request.match), action: { kind: "call", policy: branch } }],
      fallback: { kind: "call", policy: original },
    };
    config.egresses[egress] = id;
  }
  return config;
}
