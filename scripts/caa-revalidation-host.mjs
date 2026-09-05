#!/usr/bin/env node

// Runs a submitted CAA revalidation module in a subprocess and reports what it did.
//
// The facade is rebuilt here in plain JavaScript rather than imported: a child that could import the
// family could import the verifier. The exact-fqdn ledger this builds is the graded evidence, and
// the parent never trusts the module's own account of which names it queried.

const [modulePath] = process.argv.slice(2);
const input = await new Promise((resolve, reject) => {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    data += chunk;
  });
  process.stdin.on("end", () => resolve(JSON.parse(data)));
  process.stdin.on("error", reject);
});

const scenario = input.scenario;
if (
  scenario === null ||
  typeof scenario !== "object" ||
  scenario.view === null ||
  typeof scenario.view !== "object" ||
  !Array.isArray(scenario.view.names) ||
  scenario.current === null ||
  typeof scenario.current !== "object"
) {
  process.stdout.write(JSON.stringify({ error: "scenario is absent or wrong-shaped" }));
  process.exit(0);
}

const queries = [];
let seq = 0;
const caa = Object.freeze({
  current(fqdn) {
    seq += 1;
    queries.push({ seq, fqdn: String(fqdn) });
    const answer = scenario.current[String(fqdn)];
    return answer === "ALLOW" || answer === "DENY" ? answer : "DENY";
  },
});

const stale = (view, name) => view.nowHour - name.validatedAtHour > 8;

try {
  const controls = {
    reference: {
      run(view, authority) {
        const results = view.names.map((name) =>
          stale(view, name)
            ? { fqdn: name.fqdn, caa: authority.current(name.fqdn), source: "CURRENT" }
            : { fqdn: name.fqdn, caa: name.cachedCaa, source: "CACHE" },
        );
        return {
          decision: results.every((row) => row.caa === "ALLOW") ? "ISSUE" : "REFUSE",
          results,
        };
      },
    },
    "first-name-reuse": {
      run(view, authority) {
        const first = view.names.find((name) => stale(view, name));
        const results = view.names.map((name) =>
          stale(view, name)
            ? { fqdn: name.fqdn, caa: authority.current((first ?? name).fqdn), source: "CURRENT" }
            : { fqdn: name.fqdn, caa: name.cachedCaa, source: "CACHE" },
        );
        return {
          decision: results.every((row) => row.caa === "ALLOW") ? "ISSUE" : "REFUSE",
          results,
        };
      },
    },
  };
  const control = typeof input.control === "string" ? controls[input.control] : undefined;
  const mod = control === undefined ? await import(modulePath) : { subject: control };
  if (!mod.subject || typeof mod.subject.run !== "function") {
    throw new Error("module must export subject.run(view, caa)");
  }
  const view = JSON.parse(JSON.stringify(scenario.view));
  const report = await mod.subject.run(view, caa);
  process.stdout.write(JSON.stringify({ report, queries }));
} catch (err) {
  process.stdout.write(JSON.stringify({ error: String(err?.message ?? err) }));
}
