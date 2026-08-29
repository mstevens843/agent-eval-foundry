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
import { MatrixError, parseMatrix } from "./matrix.js";
import { renderReport } from "./report.js";

const USAGE = `agent-eval-foundry — measure how many things a benchmark suite actually measures

  axis report <matrix.json> [--out <file.md>]   render the markdown report
  axis json   <matrix.json> [--out <file.json>] emit the raw AxisReport

A matrix is a JSON document of schema agent-eval-foundry/matrix@1. See examples/durable-outbox/.
`;

function flag(argv: readonly string[], name: string): string | null {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  return argv[i + 1] ?? null;
}

export function main(argv: readonly string[]): number {
  const [command, path] = argv;
  if (command === undefined || command === "--help" || command === "-h") {
    process.stdout.write(USAGE);
    return command === undefined ? 2 : 0;
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

  let output: string;
  try {
    const report = measure(parseMatrix(parsed));
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
