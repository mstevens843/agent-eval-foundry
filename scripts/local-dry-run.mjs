// Unsandboxed, no-Docker local dry-run for one task package under tasks/<id>/.
// Mirrors the SHAPE of tasks/portfolio-runtime/harbor-grade.mjs (service execution over every
// scenario for every candidate, then the checker over stripped cell traces) but runs everything
// in-process, in the same UID, with no container. This is a FAST logic-correctness loop for
// iterating on a package's domain.mjs/scenarios.mjs/reference/alternative/controls/checker —
// it does NOT validate sandbox isolation, resource limits, or the real cell-entry RPC framing.
// Real isolation/native validation still requires the Docker-based path (buildPortfolioPackage /
// validatePortfolioPackage / native harbor-grade.mjs in a container) run separately.
//
// Usage: node scripts/local-dry-run.mjs <task-id> [--controls-only|--checker-only]
import { existsSync, mkdtempSync, readFileSync, rmSync, cpSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { pathToFileURL } from "node:url";

const [, , taskId, flag, checkerOverride] = process.argv;
if (!taskId) throw Error("usage: node scripts/local-dry-run.mjs <task-id> [--controls-only|--checker-only] [checkerOverridePath]");
const root = process.cwd();
const taskDir = join(root, "tasks", taskId);
if (!existsSync(taskDir)) throw Error(`no such task: ${taskDir}`);
// domain.mjs does `import {session,checks,equal} from "./adapter.mjs"` — at real build/native-export
// time, tasks/portfolio-runtime/adapter.mjs is copied in as a sibling (see build-harbor-portfolio.mjs).
// Mirror that here with a scratch copy of private/ so domain.mjs's relative import resolves.
const scratchPrivate = mkdtempSync(join(tmpdir(), "dry-run-private-"));
cpSync(join(taskDir, "private"), scratchPrivate, { recursive: true });
cpSync(join(root, "tasks/portfolio-runtime/adapter.mjs"), join(scratchPrivate, "adapter.mjs"));
const privateDir = scratchPrivate;

function importFresh(path) {
  return import(`${pathToFileURL(path).href}?t=${Date.now()}_${Math.random()}`);
}

// In-process driver replacing scripts/secure/{authority-engine,cell-entry}.mjs's sandboxed RPC.
// Same session() contract from tasks/portfolio-runtime/adapter.mjs: adapter.begin(index) returns
// {view, facades, method, mergeView}; adapter.invoke(name,args) runs the operation; adapter.report(v).
async function driveInProcess(adapter, modulePath) {
  const mod = await importFresh(modulePath);
  const subject = mod.subject ?? mod.default;
  if (!subject || typeof subject.run !== "function") throw Error(`invalid execution: ${modulePath} does not export subject.run`);
  let index = 0;
  while (index < adapter.count) {
    const frame = adapter.begin(index);
    const facades = frame.facades.map((d) =>
      Object.freeze({
        ...d.properties,
        ...Object.fromEntries(
          d.methods.map((m) => [m, (...args) => adapter.invoke(`${d.name}.${m}`, args)]),
        ),
      }),
    );
    let report;
    try {
      report = frame.mergeView
        ? await subject[frame.method]({ ...frame.view, ...facades[0] })
        : await subject[frame.method](frame.view, ...facades);
    } catch (error) {
      throw Error(`invalid execution: subject threw: ${error?.stack ?? error}`);
    }
    // Mirrors scripts/secure/authority-engine.mjs's server-side "report" handler: adapter.report()
    // itself returns nothing meaningful (it's the domain's onReport callback); remaining is
    // computed by the caller from its own index bookkeeping, not from adapter.report's result.
    await adapter.report(report);
    index++;
  }
  return adapter.result();
}

async function runOneCandidate(directory, scenarioBank, domain) {
  const cells = [];
  for (const scenario of scenarioBank) {
    const storage = mkdtempSync(join(tmpdir(), "dry-run-storage-"));
    const result = await domain.runScenario(
      scenario,
      (adapter) => driveInProcess(adapter, join(directory, "entry.mjs")),
      storage,
    );
    cells.push({ scenarioId: scenario.id, ...result });
    rmSync(storage, { recursive: true, force: true });
  }
  return cells;
}

function overlayControl(name, control) {
  const dest = mkdtempSync(join(tmpdir(), `dry-run-candidate-${name}-`));
  cpSync(join(privateDir, "reference"), dest, { recursive: true });
  for (const [target, source] of Object.entries(control?.overlay ?? {})) {
    const to = join(dest, target);
    mkdirSync(dirname(to), { recursive: true });
    cpSync(join(privateDir, source), to);
  }
  return dest;
}

async function main() {
  const domain = await importFresh(join(privateDir, "domain.mjs"));
  const generator = await importFresh(join(privateDir, "scenarios.mjs"));
  const scenarioBank = generator.scenarios();
  const ids = scenarioBank.map((s) => s.id);
  if (new Set(ids).size !== ids.length) throw Error("SCENARIO_ID_COLLISION: scenario ids must be unique");
  const controls = existsSync(join(privateDir, "control-manifest.json"))
    ? JSON.parse(readFileSync(join(privateDir, "control-manifest.json"), "utf8"))
    : [];
  console.log(`[${taskId}] ${scenarioBank.length} scenarios, ${controls.length} controls`);

  const report = { taskId, scenarios: scenarioBank.length, controls: controls.length, results: {} };
  const strip = (cells) => cells.map(({ checks, failures, expected, truth, groundTruth, status, ...raw }) => raw);
  const candidateDirs = {};

  if (flag !== "--checker-only") {
    for (const name of ["reference", "alternative"]) {
      const dir = join(privateDir, name);
      if (!existsSync(join(dir, "entry.mjs"))) { console.log(`  [skip] ${name}: no entry.mjs`); continue; }
      const cells = await runOneCandidate(dir, scenarioBank, domain);
      const failures = cells.flatMap((c) => c.failures ?? []);
      const ok = failures.length === 0;
      report.results[name] = { ok, failures: [...new Set(failures)], perScenario: cells.map((c) => ({ id: c.scenarioId, failures: c.failures })) };
      console.log(`  ${ok ? "PASS" : "FAIL"} ${name}: ${failures.length === 0 ? "0 failures" : [...new Set(failures)].join(",")}`);
      candidateDirs[name] = dir;
    }
    for (const control of controls) {
      const dir = overlayControl(control.id, control);
      candidateDirs[control.id] = dir;
      try {
        const cells = await runOneCandidate(dir, scenarioBank, domain);
        const failures = [...new Set(cells.flatMap((c) => c.failures ?? []))];
        const hit = failures.includes(control.check);
        const cleanCell = control.clean ? cells.find((c) => c.scenarioId === control.clean) : null;
        const cleanOk = !control.clean || (cleanCell && cleanCell.failures.length === 0);
        report.results[control.id] = { ok: hit && cleanOk, expectedCheck: control.check, observedFailures: failures, cleanClean: cleanOk };
        console.log(`  ${hit && cleanOk ? "PASS" : "FAIL"} control:${control.id} expected=${control.check} observed=[${failures.join(",")}] clean=${control.clean ?? "n/a"}:${cleanOk}`);
      } catch (error) {
        report.results[control.id] = { ok: false, error: String(error?.message ?? error) };
        console.log(`  ERROR control:${control.id}: ${error?.message ?? error}`);
      }
    }
  }

  if (flag !== "--controls-only" && existsSync(join(privateDir, "reference/checker.mjs"))) {
    const cases = [], labels = new Map();
    const rows = [
      { name: "reference", expected: true },
      { name: "alternative", expected: true },
      ...controls.map((c) => ({ name: c.id, expected: false, control: c })),
    ];
    for (const row of rows) {
      let dir = candidateDirs[row.name];
      if (!dir) {
        dir = row.control ? overlayControl(row.name, row.control) : join(privateDir, row.name);
        candidateDirs[row.name] = dir;
      }
      if (!existsSync(join(dir, "entry.mjs"))) continue;
      const cells = await runOneCandidate(dir, scenarioBank, domain);
      const token = `${row.name}-${Math.random().toString(36).slice(2)}`;
      cases.push({ token, cells: strip(cells) });
      labels.set(token, row.expected);
    }
    const checkerPath = checkerOverride ? join(root, checkerOverride) : join(privateDir, "reference/checker.mjs");
    const checkerMod = await importFresh(checkerPath);
    if (checkerOverride) console.log(`  [using checker override: ${checkerOverride}]`);
    const before = JSON.stringify(cases);
    const first = await checkerMod.run({ cases: JSON.parse(before) });
    const casesForSecond = JSON.parse(before);
    const second = await checkerMod.run({ cases: casesForSecond });
    const mutated = JSON.stringify(casesForSecond) !== before;
    const tokens = cases.map((c) => c.token);
    const validOutput = (o) => o?.verdicts && typeof o.verdicts === "object" && !Array.isArray(o.verdicts)
      && Object.keys(o.verdicts).length === tokens.length
      && tokens.every((t) => Object.hasOwn(o.verdicts, t) && typeof o.verdicts[t]?.ok === "boolean");
    const deterministic = tokens.every((t) => first.verdicts[t].ok === second.verdicts[t].ok);
    let correct = 0, wrong = [];
    for (const t of tokens) {
      const got = first.verdicts[t]?.ok;
      const want = labels.get(t);
      if (got === want) correct++; else wrong.push({ token: t, got, want });
    }
    report.checker = { totalCases: tokens.length, correct, wrong, mutated, deterministic, validFirst: validOutput(first), validSecond: validOutput(second) };
    console.log(`  checker: ${correct}/${tokens.length} correct, mutated=${mutated}, deterministic=${deterministic}, validOutput=${validOutput(first) && validOutput(second)}`);
    if (wrong.length) console.log(`    WRONG: ${JSON.stringify(wrong)}`);
  }

  const outDir = join(root, ".local", "next-five-successors-2026-09-11", "dry-run");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${taskId}.json`), JSON.stringify(report, null, 2) + "\n");
  const failed = Object.entries(report.results ?? {}).filter(([, r]) => !r.ok);
  const checkerFailed = report.checker && (report.checker.wrong.length || report.checker.mutated || !report.checker.deterministic || !report.checker.validFirst || !report.checker.validSecond);
  if (failed.length || checkerFailed) { console.log(`[${taskId}] FAIL: ${failed.map(([k]) => k).join(",")}${checkerFailed ? " checker" : ""}`); process.exitCode = 1; }
  else console.log(`[${taskId}] ALL PASS`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
