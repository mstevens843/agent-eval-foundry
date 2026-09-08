export function plan(v) {
  const c = structuredClone(v.config);
  for (const e of v.request.egresses) {
    const name = "override-" + e;
    c.policies[name] = {
      terms: [{ match: v.request.match, action: { kind: "accept", preference: v.request.preference } }],
      fallback: { kind: "call", policy: c.egresses[e] },
    };
    c.egresses[e] = name;
  }
  return c;
}
