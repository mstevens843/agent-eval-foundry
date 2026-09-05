// Multi-name certificate authorization revalidation.
//
// One order decides all of its names together: every name older than the recheck window is
// rechecked against the authority under its own fqdn, and only then is issuance decided. A DENY
// discovered early never cancels the remaining rechecks -- the queries are the work the order owes,
// not an optimisation for reaching the decision.

const RECHECK_WINDOW_HOURS = 8;

export const subject = {
  id: "caa-revalidation",
  label: "Conjunctive revalidation of every stale name",
  run(view, caa) {
    const names = view.names;
    const results = [];

    // First pass: bind an answer to every name. Stale names are rechecked one query per name,
    // under that name's own fqdn, with no early exit and no reuse of another name's answer.
    for (let i = 0; i < names.length; i += 1) {
      const name = names[i];
      const age = view.nowHour - name.validatedAtHour;

      if (age > RECHECK_WINDOW_HOURS) {
        // CAA1: this exact fqdn, bound to this name and no other. The recorded value is not
        // consulted, whatever it said, so a cached DENY cannot suppress the query.
        const current = caa.current(name.fqdn);
        results.push({ fqdn: name.fqdn, caa: current, source: "CURRENT" });
      } else {
        // CAA2: age at or inside the window uses its own recorded value. Age exactly 8 is fresh.
        results.push({ fqdn: name.fqdn, caa: name.cachedCaa, source: "CACHE" });
      }
    }

    // CAA3: conjunctive over the bound answers, decided after all of them exist.
    let decision = "ISSUE";
    for (let i = 0; i < results.length; i += 1) {
      if (results[i].caa !== "ALLOW") {
        decision = "REFUSE";
      }
    }

    return { decision, results };
  },
};
