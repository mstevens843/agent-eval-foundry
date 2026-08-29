#!/usr/bin/env node
// The imperative shell. Everything above this file is pure; this is the only place that reads a
// file, writes one, or exits with a code.
//
// Two commands, deliberately. `report` renders markdown for a human; `json` emits the AxisReport for
// a machine. There is no `--fix`, no `--threshold`, and no flag that changes a headline number,
// because every such flag is an invitation to tune until the answer flatters the suite. The one knob
// the tool has -- which subjects are in the bank -- lives in the matrix file, under version control,
// where changing it leaves a diff.

import { readFileSync, writeFileSync } from "node:fs";
import { measure } from "./axis-meter.js";
import { importSweBenchVerified } from "./import-swebench.js";
import { MatrixError, parseMatrix } from "./matrix.js";
import { renderReport } from "./report.js";

const USAGE = `agent-eval-foundry — measure how many things a benchmark suite actually measures

  axis report <file.json> [--out <file.md>]     render the markdown report
  axis json   <file.json> [--out <file.json>]   emit the raw AxisReport

  --import swebench     read a swebench-verified.raw.json produced by
                        examples/public-swebench-verified/fetch.py instead of a native matrix
  --min-resolved <n>    swebench only: drop submissions resolving fewer than n instances
  --limit <n>           swebench only: keep only the n strongest submissions
  --null-trials <n>     run the null-model significance test with n trials (default 0, off)
  --null-seed <n>       seed for the null model (default fixed, so reports stay reproducible)

A native matrix is a JSON document of schema agent-eval-foundry/matrix@1. See examples/.
`;

/** Every flag this CLI accepts takes exactly one value, which keeps positional parsing trivial. */
const VALUED_FLAGS = new Set([
  "--out",
  "--import",
  "--min-resolved",
  "--limit",
  "--null-trials",
  "--null-seed",
]);

function flag(argv: readonly string[], name: string): string | null {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  return argv[i + 1] ?? null;
}

/** The first argument that is neither a flag nor a flag's value. Order-independent, so
 * `report --import swebench file.json` and `report file.json --import swebench` both work. */
function positional(argv: readonly string[], skip: number): string | undefined {
  let seen = 0;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg.startsWith("--")) {
      if (VALUED_FLAGS.has(arg)) i += 1;
      continue;
    }
    if (seen === skip) return arg;
    seen += 1;
  }
  return undefined;
}

export function main(argv: readonly string[]): number {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(USAGE);
    return 0;
  }
  const command = positional(argv, 0);
  const path = positional(argv, 1);
  if (command === undefined) {
    process.stdout.write(USAGE);
    return 2;
  }
  if (command !== "report" && command !== "json") {
    process.stderr.write(`unknown command "${command}"\n\n${USAGE}`);
    return 2;
  }
  if (path === undefined) {
    process.stderr.write(`${command}: a matrix path is required\n\n${USAGE}`);
    return 2;
  }

  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    process.stderr.write(`cannot read ${path}\n`);
    return 1;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`${path} is not valid JSON: ${(err as Error).message}\n`);
    return 1;
  }

  const importer = flag(argv, "--import");
  if (importer !== null && importer !== "swebench") {
    process.stderr.write(`unknown importer "${importer}"; supported: swebench\n`);
    return 2;
  }
  const numeric = (name: string): number | undefined => {
    const raw = flag(argv, name);
    if (raw === null) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  let output: string;
  try {
    const matrix =
      importer === "swebench"
        ? importSweBenchVerified(parsed, {
            ...(numeric("--min-resolved") === undefined
              ? {}
              : { minResolved: numeric("--min-resolved") as number }),
            ...(numeric("--limit") === undefined ? {} : { limit: numeric("--limit") as number }),
          })
        : parseMatrix(parsed);
    const report = measure(matrix, {
      ...(numeric("--null-trials") === undefined ? {} : { nullTrials: numeric("--null-trials") as number }),
      ...(numeric("--null-seed") === undefined ? {} : { nullSeed: numeric("--null-seed") as number }),
    });
    output = command === "report" ? renderReport(report) : `${JSON.stringify(report, null, 2)}\n`;
  } catch (err) {
    if (err instanceof MatrixError) {
      process.stderr.write(`${path}: [${err.code}] ${err.message}\n`);
      return 1;
    }
    throw err;
  }

  const out = flag(argv, "--out");
  if (out === null) process.stdout.write(output);
  else {
    writeFileSync(out, output, "utf8");
    process.stderr.write(`wrote ${out}\n`);
  }
  return 0;
}

process.exitCode = main(process.argv.slice(2));
