import { readFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
export const subject = {
  run(view, api) {
    const file = join(view.storage, "revision-log.jsonl");
    let history = [];
    try {
      history = readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    for (const revision of view.updates) {
      appendFileSync(file, `${JSON.stringify(revision)}\n`);
      history.push(revision);
    }
    const latest = new Map();
    for (const r of history)
      if (!latest.has(r.id) || latest.get(r.id).revision < r.revision) latest.set(r.id, r);
    // Bottom-up fixed-point evaluation; unresolved cycles never acquire a value.
    const ready = new Map();
    for (let pass = 0; pass < latest.size; pass++)
      for (const [id, r] of latest) {
        if (r.retracted || ready.has(id)) continue;
        if (r.kind === "source")
          ready.set(id, {
            value: r.value,
            approved: r.authority === "approved",
            versions: new Map([[id, r.revision]]),
          });
        else if (r.parents.every((p) => ready.has(p))) {
          const inputs = r.parents.map((p) => ready.get(p));
          ready.set(id, {
            value: inputs.map((p) => p.value).join(r.separator),
            approved: inputs.every((p) => p.approved),
            versions: new Map([[id, r.revision], ...inputs.flatMap((p) => [...p.versions])]),
          });
        }
      }
    const decisions = [],
      publications = [];
    for (const request of view.requests) {
      const prior = api.receipts({}).find((r) => r.id === request.id);
      const r = ready.get(request.root);
      const lineage =
        prior?.lineage ?? (r ? [...r.versions].map(([id, revision]) => ({ id, revision })) : []);
      const allowed =
        !!prior ||
        (!!r?.approved &&
          view.grants.some(
            (g) => g.destination === request.destination && g.version === request.grantVersion && g.allowed,
          ));
      if (allowed && !prior)
        publications.push({ id: request.id, destination: request.destination, value: r.value, lineage });
      decisions.push({ id: request.id, outcome: allowed ? "published" : "blocked", lineage });
    }
    for (const publication of publications.reverse()) api.publish(publication);
    return { job: view.job, decisions };
  },
};
