// Starter skeleton. It establishes the module shape and nothing else.
//
// It never contacts the authority, so every name is answered from its recorded value regardless of
// age. Read SPEC.md and replace this with an implementation that satisfies all five rules.

export const subject = {
  id: "starter",
  label: "Recorded-value-only skeleton",
  run(view, caa) {
    const results = view.names.map((name) => ({
      fqdn: name.fqdn,
      caa: name.cachedCaa,
      source: "CACHE",
    }));
    return {
      decision: results.every((row) => row.caa === "ALLOW") ? "ISSUE" : "REFUSE",
      results,
    };
  },
};
