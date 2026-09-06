// matrix: extracted compatibility command services. Core APIs remain independent of dispatch.
import { measure } from "../axis-meter.js";
import { assertBudgetInputs, assertPlanHonest } from "../foundry/budget-check.js";
import { MEASURED_DEFAULTS, planBudget } from "../foundry/budget.js";
import { parseMatrix } from "../matrix.js";
import { renderReport } from "../report.js";
import { renderBudgetReport } from "../reports/budget-report.js";
import { getSource } from "../sources/index.js";
import { flag, numeric, readJson } from "./arguments.js";

export function axisCommand(argv: readonly string[], command: "report" | "json", path: string): string {
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

export function budgetCommand(argv: readonly string[]): string {
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
