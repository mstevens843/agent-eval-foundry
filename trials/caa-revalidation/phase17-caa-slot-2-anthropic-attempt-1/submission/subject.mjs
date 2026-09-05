// Multi-name certificate authorization revalidation.
//
// One order decides all of its names together: every name whose recorded validation is older than
// the recheck window is re-asked of the authority under its own fqdn, every name inside the window
// keeps its own recorded answer, and the order issues only when every bound answer allows.

/** Hours after which a recorded authorization answer no longer speaks for the present. */
const RECHECK_WINDOW_HOURS = 8;

/** Keeps the report inside the output grammar whatever the facade hands back. */
const asCaa = (value) => (value === "ALLOW" ? "ALLOW" : "DENY");

export const subject = {
  id: "caa-revalidation",
  label: "Per-name revalidation with conjunctive issuance",
  run(view, caa) {
    const names = view.names;
    const results = [];

    // One pass, one result per name, in the order the order requested them. Every stale name is
    // queried under its own fqdn -- no short-circuit on the first DENY, and no answer is ever
    // carried from one name to another.
    for (let i = 0; i < names.length; i += 1) {
      const name = names[i];
      const age = view.nowHour - name.validatedAtHour;
      const stale = age > RECHECK_WINDOW_HOURS;

      results.push(
        stale
          ? { fqdn: name.fqdn, caa: asCaa(caa.current(name.fqdn)), source: "CURRENT" }
          : { fqdn: name.fqdn, caa: asCaa(name.cachedCaa), source: "CACHE" },
      );
    }

    // Conjunctive: any DENY refuses the whole order, and an all-ALLOW order must issue.
    let decision = "ISSUE";
    for (let i = 0; i < results.length; i += 1) {
      if (results[i].caa !== "ALLOW") {
        decision = "REFUSE";
        break;
      }
    }

    return { decision, results };
  },
};
