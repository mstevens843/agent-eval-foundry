export const subject = {
  async run(v, api) {
    const config = structuredClone(v.config);
    for (const p of Object.values(config.policies))
      for (const a of [...p.terms.map((t) => t.action), p.fallback])
        if (a.kind === "accept") a.preference = 200;
    return api.publish({ config });
  },
};
