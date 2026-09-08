export const subject = {
  async run(v, api) {
    const config = structuredClone(v.config);
    let serial = 0;
    const memo = new Map();
    function clone(name) {
      if (memo.has(name)) return memo.get(name);
      let id;
      do {
        id = "scoped" + serial++;
      } while (Object.hasOwn(config.policies, id));
      memo.set(name, id);
      const p = structuredClone(v.config.policies[name]);
      function action(a) {
        if (a.kind === "call") a.policy = clone(a.policy);
        else if (a.kind === "accept") a.preference = v.request.preference;
        return a;
      }
      p.terms = p.terms.map((t) => ({ ...t, action: action(t.action) }));
      p.fallback = action(p.fallback);
      config.policies[id] = p;
      return id;
    }
    for (const egress of v.request.egresses) {
      const original = config.egresses[egress],
        scoped = clone(original);
      let wrapper;
      do {
        wrapper = "wrapper" + serial++;
      } while (Object.hasOwn(config.policies, wrapper));
      // A matched branch whose original top level returned must still reject, not fall through.
      let branch;
      do {
        branch = "branch" + serial++;
      } while (Object.hasOwn(config.policies, branch));
      config.policies[branch] = {
        terms: [{ match: {}, action: { kind: "call", policy: scoped } }],
        fallback: { kind: "reject" },
      };
      config.policies[wrapper] = {
        terms: [{ match: v.request.match, action: { kind: "call", policy: branch } }],
        fallback: { kind: "call", policy: original },
      };
      config.egresses[egress] = wrapper;
    }
    return api.publish({ config });
  },
};
