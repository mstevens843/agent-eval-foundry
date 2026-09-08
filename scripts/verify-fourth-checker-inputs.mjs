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
  "document-export-repair",
  "analytical-reconciliation-repair",
  "recurring-calendar-repair",
  "variant-cache-repair",
  "workflow-authority-repair",
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
  if (id === "document-export-repair") {
    assert.deepEqual(bad.trace.tickets, scenario.tickets);
    assert.deepEqual(
      bad.trace.view.ticketIds,
      scenario.tickets.map((ticket) => ticket.id),
    );
    assert.deepEqual(bad.trace.view.policy, scenario.policy);
  } else if (id === "analytical-reconciliation-repair") {
    assert.deepEqual(bad.trace.tables, scenario.tables);
  } else if (id === "recurring-calendar-repair") {
    assert.deepEqual(bad.trace.view, scenario.view);
  } else if (id === "variant-cache-repair") {
    assert.deepEqual(bad.trace.input.events, scenario.events);
    assert.deepEqual(bad.trace.input.initial, { "edge-a": [], "edge-b": [], shield: [] });
  } else {
    assert.deepEqual(bad.trace.deliveries, scenario.deliveries);
    assert.equal(good.trace.admissionPolicies.length, good.trace.actual.decisions.length);
    for (const admission of good.trace.admissionPolicies) {
      assert.deepEqual(Object.keys(admission).sort(), ["jobId", "policy", "revision"]);
      assert.equal(admission.policy.revision, admission.revision);
    }
  }
  await assertWitness(good.trace, true);
  await assertWitness(bad.trace, false);
  await assertWitness(bad.trace, false, good.trace);
  // Terminal reads are not output obligations. Removing these read-only observations must
  // not change the verdict for an otherwise identical, completed authoritative state.
  if (["variant-cache-repair", "workflow-authority-repair"].includes(id)) {
    const withoutTerminalRead = structuredClone(good.trace);
    withoutTerminalRead.observations = withoutTerminalRead.observations.filter(
      (o) => !(["next", "take"].includes(o.method) && o.value?.done === true),
    );
    await assertWitness(withoutTerminalRead, true);
  }
  const empty = structuredClone(scenario);
  if (id === "document-export-repair") empty.tickets = [];
  if (id === "analytical-reconciliation-repair") empty.tables.customers = [];
  if (id === "variant-cache-repair") empty.events = [];
  if (id === "workflow-authority-repair") empty.deliveries = [];
  if (id !== "recurring-calendar-repair") {
    const emptyGood = await execute(empty, subject);
    assert(emptyGood.valid, id + ": empty reference failed");
    await assertWitness(emptyGood.trace, true);
    await assertWitness(emptyGood.trace, true, bad.trace);
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
