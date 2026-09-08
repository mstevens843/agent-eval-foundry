// Trusted author programs only. This is NOT protected-route or model evidence.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, mkdtempSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
const ids = [
  "document-export-repair",
  "analytical-reconciliation-repair",
  "recurring-calendar-repair",
  "variant-cache-repair",
  "workflow-authority-repair",
];
const output = resolve(process.argv[2]);
mkdirSync(output, { recursive: false });
function copy(a, b) {
  mkdirSync(b, { recursive: true });
  for (const x of readdirSync(a, { withFileTypes: true })) {
    if (x.isDirectory()) copy(join(a, x.name), join(b, x.name));
    else copyFileSync(join(a, x.name), join(b, x.name));
  }
}
const results = [];
for (const id of ids) {
  const root = resolve("tasks", id),
    local = join(output, id);
  mkdirSync(local);
  const authority = join(local, "authority");
  mkdirSync(authority);
  for (const p of readdirSync(join(root, "private")).filter((p) => p.endsWith(".mjs")))
    copyFileSync(join(root, "private", p), join(authority, p));
  copyFileSync("tasks/portfolio-runtime/adapter.mjs", join(authority, "adapter.mjs"));
  const { runScenario } = await import(pathToFileURL(join(authority, "domain.mjs")));
  const { scenarios } = await import(pathToFileURL(join(authority, "scenarios.mjs")));
  let controls = [];
  try {
    controls = JSON.parse(readFileSync(join(root, "private/control-manifest.json")));
  } catch {}
  for (const name of [
    "reference",
    "alternative",
    "starter",
    ...controls.filter((c) => !c.isolation).map((c) => c.id),
  ]) {
    const start = Date.now(),
      target = join(local, name);
    copy(join(root, "public"), target);
    const control = controls.find((c) => c.id === name);
    if (name !== "starter")
      copy(join(root, "private", name === "alternative" ? "alternative" : "reference"), target);
    for (const [dest, src] of Object.entries(control?.overlay ?? {})) {
      mkdirSync(dirname(join(target, dest)), { recursive: true });
      copyFileSync(join(root, "private", src), join(target, dest));
    }
    const { subject } = await import(pathToFileURL(join(target, "entry.mjs")));
    const cells = [];
    for (const scenario of scenarios()) {
      try {
        const result = await runScenario(
          scenario,
          async (adapter) => {
            const frame = adapter.begin(0),
              api = Object.fromEntries(
                frame.facades[0].methods.map((m) => [
                  m,
                  (x) => adapter.invoke("api." + m, [structuredClone(x)]).then((v) => structuredClone(v)),
                ]),
              );
            adapter.report(await subject.run(structuredClone(frame.view), api));
            return {};
          },
          target,
        );
        cells.push({ id: scenario.id, failures: result.failures, checks: result.checks });
      } catch (e) {
        cells.push({ id: scenario.id, error: String(e.stack ?? e) });
      }
    }
    const positive = ["reference", "alternative"].includes(name);
    const passed =
      cells.every((c) => !c.error) &&
      (positive
        ? cells.every((c) => !c.failures.length)
        : cells.some((c) => c.failures.length && (!control || c.failures.includes(control.check))) &&
          (!control?.clean || cells.find((c) => c.id === control.clean)?.failures.length === 0));
    const result = { id, name, passed, milliseconds: Date.now() - start, cells };
    results.push(result);
    writeFileSync(join(target, "author-result.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
    console.log(
      JSON.stringify({
        id,
        name,
        passed,
        milliseconds: result.milliseconds,
        failures: cells.filter((c) => c.error || c.failures.length).slice(0, 2),
      }),
    );
  }
}
writeFileSync(
  join(output, "summary.json"),
  JSON.stringify({ protectedRoute: false, providerCallsMade: 0, results }, null, 2) + "\n",
  { flag: "wx" },
);
if (results.some((r) => !r.passed)) process.exitCode = 1;
