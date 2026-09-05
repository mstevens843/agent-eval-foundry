export const subject = {
  id: "multi-name-caa-revalidation",
  label: "Multi-name CAA revalidation",
  run(view, caa) {
    const results = view.names.map((name) => {
      const isStale = view.nowHour - name.validatedAtHour > 8;

      return {
        fqdn: name.fqdn,
        caa: isStale ? caa.current(name.fqdn) : name.cachedCaa,
        source: isStale ? "CURRENT" : "CACHE",
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
