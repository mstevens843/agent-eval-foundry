#!/usr/bin/env node
// The imperative shell. Everything above this file is pure; this is the only place that reads a
// file, writes one, or sets an exit code.
//
// One rule shapes the flag surface: no flag changes a headline number. There is no `--threshold`, no
// `--fix`, no way to relax a gate from the command line. The knobs that do exist -- which subjects
// are in a bank, what labour rate a budget assumes -- live in files under version control, where
// changing them leaves a diff someone can review. A number you can move with an argument is a number
// that gets moved until it flatters.
//
// `foundry check` is the gate: it loads every registry file, runs every validator, asserts coverage,
// and regenerates nothing. It is what CI would run.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { measure } from "./axis-meter.js";
import {
  ALL_SUBJECTS,
  referenceFailures,
  runFamily,
  toMatrix,
} from "./families/prompt-injection-containment/runner.js";
import {
  enumerateSpace,
  generateScenarios,
  selectMeasuredSet,
} from "./families/prompt-injection-containment/scenarios.js";
import { assertBudgetInputs, assertPlanHonest } from "./foundry/budget-check.js";
import { MEASURED_DEFAULTS, planBudget } from "./foundry/budget.js";
import { loadRegistry } from "./foundry/load.js";
import { assertCoverage, coverage } from "./foundry/registry.js";
import { checkScaffold } from "./foundry/scaffold-check.js";
import { generateScaffold, scaffoldFromShape } from "./foundry/scaffold.js";
import { SchemaError } from "./foundry/schema.js";
import { parseTaskShape } from "./foundry/validate.js";
import { MatrixError, parseMatrix } from "./matrix.js";
import { renderReport } from "./report.js";
import { renderBudgetReport } from "./reports/budget-report.js";
import { renderCrossFamilyReport, renderFamilyReport } from "./reports/family-report.js";
import { renderFamilyDiversityReport, renderLedgerReport } from "./reports/ledger-report.js";
import { renderMechanismReport, renderMutantReport } from "./reports/registry-report.js";
import { renderShipReport } from "./reports/ship-report.js";
import { SOURCES, getSource } from "./sources/index.js";

const USAGE = `agent-eval-foundry — discover, screen and select agent-benchmark task families

ANALYSIS (how many things does an existing suite measure?)
  report <file> [--out f]        axis report for a result matrix
  json   <file> [--out f]        the same as raw JSON
    --import <source>            read a foreign format; see \`sources\`
    --null-trials <n>            significance test against a marginal-preserving null
    --null-seed <n>              seed for it (fixed by default, so reports stay diffable)
    --min-resolved <n>           swebench: drop submissions below this resolve count
    --limit <n>                  swebench: keep only the n strongest submissions

REGISTRY (what could be built, and can we detect it?)
  check                          load and validate everything; assert coverage. The CI gate.
  mechanisms [--out f]           mechanism registry report
  mutants [--out f]              mutant bank report
  ledger [--out f]               candidate ledger, led by kills
  families [--out f]             family diversity: axes, not task count
  ship [--out f]                 ship / no-ship gate table per family
  sources                        list every matrix source, implemented and planned

FAMILIES (run a measured mini-benchmark)
  family scenarios [--out f]     generate and emit the measured scenario set
  family run [--out f]           run reference + mutants, emit the result matrix
  family report [--out f]        family report: policy, mutants, axis structure
  family axis [--out f]          axis report for the family matrix
  cross-family [--out f]         compare measured families; refuses to add their axes

PRODUCTION
  scaffold --shape <file> [--out dir]
  scaffold --mechanism <id>[,<id>] --domain <d> --name <family-id> [--out dir]
  budget --total <usd> --rate <usd/h> [--target <tasks>] [--out f]
  all [--out dir]                regenerate every checked-in report

  --root <dir>                   repository root (default: cwd)
`;

const VALUED = new Set([
  "--out",
  "--import",
  "--min-resolved",
  "--limit",
  "--null-trials",
  "--null-seed",
  "--shape",
  "--mechanism",
  "--domain",
  "--name",
  "--total",
  "--rate",
  "--target",
  "--root",
]);

const flag = (argv: readonly string[], name: string): string | null => {
  const i = argv.indexOf(name);
  return i === -1 ? null : (argv[i + 1] ?? null);
};

const numeric = (argv: readonly string[], name: string): number | undefined => {
  const raw = flag(argv, name);
  if (raw === null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

function positional(argv: readonly string[], skip: number): string | undefined {
  let seen = 0;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg.startsWith("--")) {
      if (VALUED.has(arg)) i += 1;
      continue;
    }
    if (seen === skip) return arg;
    seen += 1;
  }
  return undefined;
}

const emit = (argv: readonly string[], text: string): void => {
  const out = flag(argv, "--out");
  if (out === null) process.stdout.write(text);
  else {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, text, "utf8");
    process.stderr.write(`wrote ${out}\n`);
  }
};

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

function axisCommand(argv: readonly string[], command: "report" | "json", path: string): string {
  const importer = flag(argv, "--import");
  const raw = readJson(path);
  const minResolved = numeric(argv, "--min-resolved");
  const limit = numeric(argv, "--limit");
  const matrix =
    importer === null
      ? parseMatrix(raw)
      : getSource(importer === "swebench" ? "swebench" : importer).load(raw, {
          ...(minResolved === undefined ? {} : { minResolved }),
          ...(limit === undefined ? {} : { limit }),
        });
  const nullTrials = numeric(argv, "--null-trials");
  const nullSeed = numeric(argv, "--null-seed");
  const report = measure(matrix, {
    ...(nullTrials === undefined ? {} : { nullTrials }),
    ...(nullSeed === undefined ? {} : { nullSeed }),
  });
  return command === "report" ? renderReport(report) : `${JSON.stringify(report, null, 2)}\n`;
}

function scaffoldCommand(argv: readonly string[], root: string): string {
  const registry = loadRegistry(root);
  const shapePath = flag(argv, "--shape");
  const output =
    shapePath !== null
      ? scaffoldFromShape(parseTaskShape(readJson(shapePath), shapePath), registry)
      : (() => {
          const mechanisms = (flag(argv, "--mechanism") ?? "").split(",").filter(Boolean);
          const name = flag(argv, "--name");
          const domain = flag(argv, "--domain");
          if (mechanisms.length === 0 || name === null || domain === null) {
            throw new Error(
              "scaffold needs --shape <file>, or --mechanism <id> --domain <d> --name <family-id>",
            );
          }
          return generateScaffold({ familyId: name, name, domain, mechanismIds: mechanisms }, registry);
        })();

  // Grade the generator's own output before writing it. The checker does not import the generator.
  const check = checkScaffold(output.files, output.familyId);

  const dir = flag(argv, "--out");
  if (dir !== null) {
    for (const f of output.files) {
      const target = join(dir, f.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, f.content, "utf8");
    }
    process.stderr.write(`wrote ${output.files.length} artifacts to ${dir}/\n`);
  }
  return [
    `# Scaffold: ${output.metadata.name}`,
    "",
    `family \`${output.familyId}\` · ${output.metadata.mechanisms.length} mechanism(s) · ${output.metadata.mutants.length} mutant(s) · generated from ${output.metadata.generatedFrom}`,
    "",
    "| artifact | bytes |",
    "|---|---:|",
    ...check.artifacts.map((a) => `| \`${a.path}\` | ${a.bytes} |`),
    "",
    `All ${check.artifacts.length} required artifacts present and non-trivial (${check.totalBytes} bytes total),`,
    "verified by `scaffold-check.ts`, which declares the artifact list independently of the generator.",
    "",
    dir === null ? "_Not written to disk — pass `--out <dir>`._" : `Written to \`${dir}/\`.`,
    "",
  ].join("\n");
}

function budgetCommand(argv: readonly string[]): string {
  const total = numeric(argv, "--total");
  const rate = numeric(argv, "--rate");
  if (total === undefined || rate === undefined) {
    throw new Error(
      "budget needs --total <usd> and --rate <usd/h>. The labour rate has no default on purpose: it " +
        "is the dominant term and it is your assumption, not a measurement.",
    );
  }
  const inputs = { ...MEASURED_DEFAULTS, totalUsd: total, labourRateUsdPerHour: rate };
  assertBudgetInputs(inputs);
  assertPlanHonest(planBudget(inputs));
  return renderBudgetReport(inputs, numeric(argv, "--target") ?? 1000);
}

function familyCommand(sub: string, root: string): string {
  const run = runFamily(ALL_SUBJECTS);
  const failures = referenceFailures(run);
  if (failures.length > 0 && sub !== "scenarios") {
    // A family whose reference fails is measuring its own bugs. Refuse rather than emit a matrix
    // that looks like evidence.
    throw new Error(
      `reference fails ${failures.length} scenario(s); the family is not solvable as written and must not emit a matrix. First: ${failures[0]?.scenarioId} — ${failures[0]?.failures[0]?.detail}`,
    );
  }
  switch (sub) {
    case "scenarios": {
      const space = enumerateSpace();
      const measured = selectMeasuredSet(space);
      return `${JSON.stringify(
        {
          declaredSpace: space.length,
          measured: measured.length,
          dropped: space.length - measured.length,
          scenarios: generateScenarios(measured),
        },
        null,
        2,
      )}\n`;
    }
    case "run":
      return `${JSON.stringify(toMatrix(run), null, 2)}\n`;
    case "report":
      return renderFamilyReport({ run, axis: measure(toMatrix(run), { nullTrials: 3 }) });
    case "axis":
      return renderReport(measure(toMatrix(run), { nullTrials: 3 }));
    default:
      throw new Error(`unknown family subcommand "${sub}"; expected scenarios | run | report | axis`);
  }
}

function crossFamilyCommand(root: string): string {
  const registry = loadRegistry(root);
  const outboxRaw = readJson(join(root, "examples/durable-outbox/matrix.json"));
  const outbox = parseMatrix(outboxRaw);
  const run = runFamily(ALL_SUBJECTS);
  const pic = toMatrix(run);
  const shapeOf = (id: string) => registry.shapes.find((s) => s.familyId === id)?.mechanisms ?? [];
  return renderCrossFamilyReport([
    {
      name: "durable-approval-outbox",
      matrix: outbox,
      axis: measure(outbox),
      mechanisms: [...shapeOf("durable-approval-outbox")],
      provenance: "10 engines submitted by frontier models attempting the task",
    },
    {
      name: "prompt-injection-containment",
      matrix: pic,
      axis: measure(pic),
      mechanisms: [...shapeOf("prompt-injection-containment")],
      provenance: "9 mutants written alongside the verifier",
    },
  ]);
}

function checkCommand(root: string): string {
  const registry = loadRegistry(root);
  const cov = assertCoverage(registry);
  return [
    "registry OK",
    `  mechanisms  ${registry.mechanisms.length} (${cov.measuredMechanisms} measured)`,
    `  mutants     ${registry.mutants.length}`,
    `  families    ${registry.shapes.length}`,
    `  candidates  ${registry.candidates.length}`,
    "  coverage    every mechanism has a mutant; no mutant is orphaned",
    "",
  ].join("\n");
}

function allCommand(argv: readonly string[], root: string): string {
  const dir = flag(argv, "--out") ?? join(root, "reports");
  const registry = loadRegistry(root);
  const cov = coverage(registry);
  mkdirSync(dir, { recursive: true });
  const written: string[] = [];
  const write = (name: string, text: string) => {
    writeFileSync(join(dir, name), text, "utf8");
    written.push(name);
  };
  write("mechanism-registry.md", renderMechanismReport(registry, cov));
  write("mutant-bank.md", renderMutantReport(registry, cov));
  write("candidate-ledger.md", renderLedgerReport(registry));
  write("family-diversity.md", renderFamilyDiversityReport(registry.shapes));
  write("ship-recommendation.md", renderShipReport(registry.shapes, registry));
  const inputs = { ...MEASURED_DEFAULTS, totalUsd: 100_000, labourRateUsdPerHour: 120 };
  assertBudgetInputs(inputs);
  assertPlanHonest(planBudget(inputs));
  write("budget-plan.md", renderBudgetReport(inputs, 1000));
  const run = runFamily(ALL_SUBJECTS);
  const picMatrix = toMatrix(run);
  const picAxis = measure(picMatrix, { nullTrials: 3 });
  write("prompt-injection-containment-family-report.md", renderFamilyReport({ run, axis: picAxis }));
  write("prompt-injection-containment-axis-report.md", renderReport(picAxis));
  write("cross-family-diversity-report.md", crossFamilyCommand(root));
  return `${written.map((w) => `wrote ${dir}/${w}`).join("\n")}\n`;
}

export function main(argv: readonly string[]): number {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(USAGE);
    return 0;
  }
  const command = positional(argv, 0);
  if (command === undefined) {
    process.stdout.write(USAGE);
    return 2;
  }
  const root = flag(argv, "--root") ?? process.cwd();

  try {
    switch (command) {
      case "report":
      case "json": {
        const path = positional(argv, 1);
        if (path === undefined) {
          process.stderr.write(`${command}: a matrix path is required\n\n${USAGE}`);
          return 2;
        }
        emit(argv, axisCommand(argv, command, path));
        return 0;
      }
      case "check":
        process.stdout.write(checkCommand(root));
        return 0;
      case "family": {
        const sub = positional(argv, 1) ?? "run";
        emit(argv, familyCommand(sub, root));
        return 0;
      }
      case "cross-family":
        emit(argv, crossFamilyCommand(root));
        return 0;
      case "mechanisms": {
        const r = loadRegistry(root);
        emit(argv, renderMechanismReport(r, coverage(r)));
        return 0;
      }
      case "mutants": {
        const r = loadRegistry(root);
        emit(argv, renderMutantReport(r, coverage(r)));
        return 0;
      }
      case "ledger":
        emit(argv, renderLedgerReport(loadRegistry(root)));
        return 0;
      case "families":
        emit(argv, renderFamilyDiversityReport(loadRegistry(root).shapes));
        return 0;
      case "ship": {
        const r = loadRegistry(root);
        emit(argv, renderShipReport(r.shapes, r));
        return 0;
      }
      case "sources":
        process.stdout.write(
          `${SOURCES.map(
            (s) =>
              `${s.status === "implemented" ? "  " : "! "}${s.id.padEnd(16)} ${s.status.padEnd(12)} ${s.label}\n` +
              `    ${s.description}\n${s.requires === null ? "" : `    requires: ${s.requires}\n`}`,
          ).join("\n")}\n`,
        );
        return 0;
      case "scaffold":
        // Deliberately not `emit`: for every other command `--out` names a FILE, but a scaffold
        // writes a FOLDER. Routing the summary through emit() tried to open the directory as a file.
        // The summary always goes to stdout so the two meanings of --out never collide.
        process.stdout.write(scaffoldCommand(argv, root));
        return 0;
      case "budget":
        emit(argv, budgetCommand(argv));
        return 0;
      case "all":
        process.stdout.write(allCommand(argv, root));
        return 0;
      default:
        process.stderr.write(`unknown command "${command}"\n\n${USAGE}`);
        return 2;
    }
  } catch (err) {
    if (err instanceof SchemaError || err instanceof MatrixError) {
      process.stderr.write(`${err.message}\n`);
      return 1;
    }
    process.stderr.write(`${(err as Error).message}\n`);
    return 1;
  }
}

process.exitCode = main(process.argv.slice(2));
