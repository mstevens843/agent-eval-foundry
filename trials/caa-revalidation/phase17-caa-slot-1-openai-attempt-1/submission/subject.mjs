export const subject = {
  id: "multi-name-caa-revalidation",
  label: "Revalidate each stale certificate name",

  run(view, caa) {
    const results = view.names.map((name) => {
      const stale = view.nowHour - name.validatedAtHour > 8;

      return {
        fqdn: name.fqdn,
        caa: stale ? caa.current(name.fqdn) : name.cachedCaa,
        source: stale ? "CURRENT" : "CACHE",
      };
    });

    return {
      decision: results.every((result) => result.caa === "ALLOW")
        ? "ISSUE"
        : "REFUSE",
      results,
    };
  },
};
