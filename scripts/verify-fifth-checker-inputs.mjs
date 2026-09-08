// Trusted author-only regression. This does not establish isolation or model difficulty.
// Optional witness directory contains reviewed author checkers, never model submissions.
import assert from "node:assert/strict";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const output = resolve(process.argv[2]);
const witnesses = process.argv[3] ? resolve(process.argv[3]) : null;
mkdirSync(output, { recursive: false });
const ids = [
  "incremental-build-repair",
  "event-window-repair",
  "staged-allocation-repair",
  "diagnostic-transport-repair",
  "issued-report-repair",
];
const results = [];
for (const id of ids) {
  const directory = join(output, id),
    authority = join(directory, "authority"),
    subjectRoot = join(directory, "subject");
  mkdirSync(directory);
  cpSync(resolve("tasks", id, "private"), authority, { recursive: true });
  cpSync(resolve("tasks/portfolio-runtime/adapter.mjs"), join(authority, "adapter.mjs"));
  cpSync(resolve("tasks", id, "public"), subjectRoot, { recursive: true });
  cpSync(join(authority, "reference"), subjectRoot, { recursive: true });
  const { runScenario } = await import(pathToFileURL(join(authority, "domain.mjs")));
  const { scenarios } = await import(pathToFileURL(join(authority, "scenarios.mjs")));
  const { subject } = await import(pathToFileURL(join(subjectRoot, "entry.mjs")));
  const checker = witnesses ? await import(pathToFileURL(join(witnesses, id + ".mjs"))) : null;
  async function execute(scenario, program) {
    const result = await runScenario(
      structuredClone(scenario),
      async (adapter) => {
        const frame = adapter.begin(0);
        const api = Object.fromEntries(
          frame.facades[0].methods.map((method) => [
            method,
            (request) =>
              adapter
                .invoke("api." + method, [structuredClone(request)])
                .then((value) => structuredClone(value)),
          ]),
        );
        adapter.report(await program.run(structuredClone(frame.view), api));
        return {};
      },
      subjectRoot,
    );
    const { checks, status, failures, expected, truth, groundTruth, ...trace } = result;
    return { valid: failures.length === 0, trace: { scenarioId: scenario.id, ...trace } };
  }
  async function assertWitness(cell, expectedOk, companion) {
    if (!checker) return;
    const input = {
      cases: [
        { token: "candidate-A", cells: [cell] },
        ...(companion ? [{ token: "candidate-B", cells: [companion] }] : []),
      ],
    };
    const original = structuredClone(input);
    const first = await checker.run(input),
      second = await checker.run(input);
    assert.deepEqual(input, original, id + ": checker mutates input");
    assert.deepEqual(first, second, id + ": checker is not deterministic");
    assert.equal(first.verdicts["candidate-A"].ok, expectedOk, id + ": independent verdict mismatch");
  }
  const scenario = scenarios()[0];
  const good = await execute(scenario, subject);
  const bad = await execute(scenario, { run: async () => ({ complete: true }) });
  assert(good.valid, id + ": reference failed");
  assert(!bad.valid, id + ": nonempty no-op passed");
  if (id === "incremental-build-repair") {
    assert.deepEqual(bad.trace.input.rounds, scenario.rounds);
    const artifacts = new Map(good.trace.actual.artifacts.map((a) => [a.handle, a]));
    for (const a of artifacts.values())
      for (const d of a.recipe.dependencies) assert(artifacts.has(d.handle));
    for (const p of good.trace.actual.publications) assert(!Object.hasOwn(p, "validAtPublication"));
  } else if (id === "event-window-repair") {
    assert.deepEqual(bad.trace.input.events, scenario.events);
    assert.deepEqual(bad.trace.view, scenario.view);
  } else if (id === "staged-allocation-repair") {
    assert.deepEqual(bad.trace.view, scenario.view);
    assert(!Object.hasOwn(bad.trace, "winningPolicyExists"));
  } else if (id === "diagnostic-transport-repair") {
    assert.deepEqual(bad.trace.requests, scenario.requests);
    assert.deepEqual(bad.trace.input.chunks, scenario.chunks);
  } else {
    assert.deepEqual(bad.trace.input.steps, scenario.steps);
    assert.deepEqual(bad.trace.input.readings, scenario.readings);
    assert.deepEqual(bad.trace.input.definitions, scenario.definitions);
  }
  await assertWitness(good.trace, true);
  await assertWitness(bad.trace, false);
  await assertWitness(bad.trace, false, good.trace);
  // Different property ordering and diagnostic text cannot change semantic validity.
  const reorder = (x) =>
    Array.isArray(x)
      ? x.map(reorder)
      : x && typeof x === "object"
        ? Object.fromEntries(
            Object.keys(x)
              .reverse()
              .map((k) => [k, reorder(x[k])]),
          )
        : x;
  const reordered = reorder(good.trace);
  reordered.reports = [{ notAnAnswer: true }];
  await assertWitness(reordered, true);
  if (id === "issued-report-repair") {
    const noSnapshots = structuredClone(good.trace);
    noSnapshots.observations = noSnapshots.observations.filter((o) => o.method !== "snapshot");
    await assertWitness(noSnapshots, true);
  }
  if (id === "staged-allocation-repair") {
    const originalGood = await execute(scenario, {
      run: async (view, api) => {
        const nodes = new Map();
        const visit = (n) => {
          nodes.set(n.id, n);
          n.children.forEach(visit);
        };
        visit(view.tree);
        let current = null;
        return subject.run(view, {
          ...api,
          next: async (request) => {
            if (current && nodes.get(current).children.length === 0) return null;
            current = await api.next(request);
            return current;
          },
        });
      },
    });
    assert(originalGood.valid, "leaf completion must not require a redundant read");
    await assertWitness(originalGood.trace, true);
  }
  for (const edge of scenarios().slice(-3)) {
    const edgeGood = await execute(edge, subject);
    assert(edgeGood.valid, id + ": edge reference failed");
    await assertWitness(edgeGood.trace, true);
    await assertWitness(edgeGood.trace, true, bad.trace);
  }
  results.push({
    id,
    passed: true,
    standaloneVerdicts: checker !== null,
    candidateIndependence: checker !== null,
  });
}
const report = { providerCallsMade: 0, protectedRoute: false, results };
writeFileSync(join(output, "summary.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(report));
