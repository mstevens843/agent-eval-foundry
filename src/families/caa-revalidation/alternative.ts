import type { NameResult, Subject } from "./types.js";

/** Two-phase, reverse-order collection; unlike the reference's per-name query/report loop. */
export const alternative: Subject = {
  id: "alternative",
  label: "Collect current answers by identity before assembling ordered results",
  run(view, authority) {
    const answers = new Map<string, NameResult["caa"]>();
    for (const name of [...view.names].reverse()) {
      if (view.nowHour - name.validatedAtHour > 8) answers.set(name.fqdn, authority.current(name.fqdn));
    }
    const results: NameResult[] = view.names.map((name) =>
      answers.has(name.fqdn)
        ? { fqdn: name.fqdn, caa: answers.get(name.fqdn) as NameResult["caa"], source: "CURRENT" }
        : { fqdn: name.fqdn, caa: name.cachedCaa, source: "CACHE" },
    );
    return { results, decision: results.some((r) => r.caa === "DENY") ? "REFUSE" : "ISSUE" };
  },
};
