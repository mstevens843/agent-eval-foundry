// Fast package-local diagnostics. Protected Foundry/Harbor validation is separate.
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [destination, ...ids] = process.argv.slice(2);
if (!destination || !ids.length) throw Error("Usage: verify-next-five-author.mjs FRESH_OUTPUT TASK...");
const out = resolve(destination);
if (existsSync(out)) throw Error("Output exists");
mkdirSync(out, { recursive: true });
const results = [];
for (const id of ids) {
  const directory = join(out, id);
  mkdirSync(directory);
  cpSync("tasks/" + id + "/private", join(directory, "private"), { recursive: true });
  cpSync("tasks/portfolio-runtime/adapter.mjs", join(directory, "private/adapter.mjs"));
  const { runScenario } = await import(pathToFileURL(join(directory, "private/domain.mjs")));
  const { scenarios } = await import(pathToFileURL(join(directory, "private/scenarios.mjs")));
  const bank = scenarios(),
    controls = JSON.parse(readFileSync(join(directory, "private/control-manifest.json"), "utf8"));
  const cases = [],
    labels = [];
  const variantRoot=join(directory,"private/variants");
  const variants=existsSync(variantRoot)?readdirSync(variantRoot).sort().map(name=>({id:"variant-"+name,positive:true})):[];
  for (const [i, candidate] of [
    { id: "reference", positive: true },
    { id: "alternative", positive: true },
    ...variants,
    { id: "starter" },
    ...controls.filter((c) => !c.isolation),
  ].entries()) {
    const path = join(directory, candidate.id);
    mkdirSync(path);
    if (candidate.id === "starter") cpSync("tasks/" + id + "/public", path, { recursive: true });
    else {
      cpSync(join(directory, "private/reference"), path, { recursive: true });
      if (candidate.id === "alternative")
        cpSync(join(directory, "private/alternative"), path, { recursive: true });
      if (candidate.id.startsWith("variant-"))
        cpSync(join(variantRoot,candidate.id.slice(8)),path,{recursive:true});
      for (const [target, source] of Object.entries(candidate.overlay ?? {}))
        cpSync(join(directory, "private", source), join(path, target));
    }
    const { subject } = await import(pathToFileURL(join(path, "entry.mjs")));
    const cells = [];
    let maxFrame = 0,
      maxCalls = 0;
    for (const scenario of bank) {
      const storage = join(path, "storage-" + scenario.id);
      mkdirSync(storage);
      let count = 0;
      const cell = await runScenario(
        scenario,
        async (adapter) => {
          const begin = adapter.begin(0);
          maxFrame = Math.max(maxFrame, Buffer.byteLength(JSON.stringify(begin)));
          const api = Object.fromEntries(
            begin.facades[0].methods.map((method) => [
              method,
              async (request) => {
                if (++count > 3997) throw Error("RPC limit");
                const value = await adapter.invoke("api." + method, [request]);
                maxFrame = Math.max(
                  maxFrame,
                  Buffer.byteLength(JSON.stringify(request)),
                  Buffer.byteLength(JSON.stringify(value)),
                );
                return structuredClone(value);
              },
            ]),
          );
          const report = await subject.run(structuredClone(begin.view), api);
          adapter.report(report ?? {});
          return {};
        },
        storage,
      );
      maxCalls = Math.max(maxCalls, count);
      cells.push({ scenarioId: scenario.id, ...cell });
    }
    const failures = cells.filter((c) => c.failures.length),
      passed = candidate.positive
        ? failures.length === 0
        : failures.length > 0 &&
          (!candidate.check || failures.some((c) => c.failures.includes(candidate.check)));
    const clean =
      !candidate.clean || cells.find((c) => c.scenarioId === candidate.clean)?.failures.length === 0;
    results.push({
      id,
      candidate: candidate.id,
      passed: passed && clean,
      scenarios: bank.length,
      failures: failures.map((c) => ({ id: c.scenarioId, failures: c.failures })),
      maxFrame,
      maxCalls,
    });
    writeFileSync(join(path, "cells.json"), JSON.stringify(cells));
    cases.push({
      token: String(i),
      cells: cells.map(({ checks, failures, expected, browserTrace, ...raw }) => raw),
    });
    labels.push(Boolean(candidate.positive));
    console.log(JSON.stringify({ ...results.at(-1), failures: failures.length }));
  }
  const { run } = await import(pathToFileURL(join(directory, "reference/checker.mjs")));
  const before = JSON.stringify(cases),
    a = await run({ cases }),
    b = await run({ cases });
  const checker =
    cases.every((c, i) => a.verdicts[c.token].ok === labels[i]) &&
    JSON.stringify(a) === JSON.stringify(b) &&
    before === JSON.stringify(cases);
  results.push({ id, checker: true, passed: checker, verdicts: a, labels });
  console.log(JSON.stringify(results.at(-1)));
}
writeFileSync(
  join(out, "summary.json"),
  JSON.stringify({ results, providerCallsMade: 0, protectedRoute: false }, null, 2) + "\n",
);
if (results.some((r) => !r.passed || r.maxFrame > 48 * 1024)) process.exitCode = 1;
