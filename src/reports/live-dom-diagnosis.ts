import type { TrialRecord } from "../trials/types.js";

interface RateRow {
  readonly knob: string;
  readonly value: string;
  readonly scenarios: number;
  readonly failed: number;
  readonly rate: number;
}

interface DriverRow {
  readonly check: string;
  readonly knob: string;
  readonly highest: RateRow;
  readonly lowest: RateRow;
  readonly spread: number;
}

const pct = (n: number): string => `${(n * 100).toFixed(1)}%`;

const failedCells = (record: TrialRecord) => record.cells.filter((c) => c.failed.length > 0);

const countBySignature = (
  record: TrialRecord,
): readonly { readonly signature: string; readonly scenarios: number }[] => {
  const counts = new Map<string, number>();
  for (const cell of failedCells(record)) {
    const signature = [...cell.failed].sort().join(" + ");
    counts.set(signature, (counts.get(signature) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([signature, scenarios]) => ({ signature, scenarios }))
    .sort((a, b) => b.scenarios - a.scenarios || a.signature.localeCompare(b.signature));
};

const countByCheck = (
  record: TrialRecord,
): readonly { readonly check: string; readonly scenarios: number }[] => {
  const counts = new Map<string, number>();
  for (const cell of failedCells(record)) {
    for (const check of new Set(cell.failed)) counts.set(check, (counts.get(check) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([check, scenarios]) => ({ check, scenarios }))
    .sort((a, b) => b.scenarios - a.scenarios || a.check.localeCompare(b.check));
};

const knobsOf = (params: ReadonlyMap<string, Readonly<Record<string, unknown>>>): readonly string[] => {
  const knobs = new Set<string>();
  for (const p of params.values()) for (const key of Object.keys(p)) knobs.add(key);
  return [...knobs].sort();
};

const rateRowsForCheck = (
  record: TrialRecord,
  params: ReadonlyMap<string, Readonly<Record<string, unknown>>>,
  check: string,
): readonly RateRow[] => {
  const rows: RateRow[] = [];
  for (const knob of knobsOf(params)) {
    const counts = new Map<string, { scenarios: number; failed: number }>();
    for (const cell of record.cells) {
      const value = String(params.get(cell.scenarioId)?.[knob] ?? "unknown");
      const next = counts.get(value) ?? { scenarios: 0, failed: 0 };
      next.scenarios += 1;
      if (cell.failed.includes(check)) next.failed += 1;
      counts.set(value, next);
    }
    for (const [value, entry] of counts) {
      rows.push({
        knob,
        value,
        scenarios: entry.scenarios,
        failed: entry.failed,
        rate: entry.scenarios === 0 ? 0 : entry.failed / entry.scenarios,
      });
    }
  }
  return rows.sort((a, b) => a.knob.localeCompare(b.knob) || a.value.localeCompare(b.value));
};

const driversForCheck = (
  record: TrialRecord,
  params: ReadonlyMap<string, Readonly<Record<string, unknown>>>,
  check: string,
): readonly DriverRow[] => {
  const rows = rateRowsForCheck(record, params, check);
  const drivers: DriverRow[] = [];
  for (const knob of new Set(rows.map((r) => r.knob))) {
    const own = rows.filter((r) => r.knob === knob);
    const highest = [...own].sort(
      (a, b) => b.rate - a.rate || b.failed - a.failed || a.value.localeCompare(b.value),
    )[0];
    const lowest = [...own].sort(
      (a, b) => a.rate - b.rate || a.failed - b.failed || a.value.localeCompare(b.value),
    )[0];
    if (highest === undefined || lowest === undefined) continue;
    drivers.push({ check, knob, highest, lowest, spread: highest.rate - lowest.rate });
  }
  return drivers.sort((a, b) => b.spread - a.spread || a.knob.localeCompare(b.knob));
};

const anyFailureRows = (
  record: TrialRecord,
  params: ReadonlyMap<string, Readonly<Record<string, unknown>>>,
): readonly RateRow[] => {
  const rows: RateRow[] = [];
  for (const knob of knobsOf(params)) {
    const counts = new Map<string, { scenarios: number; failed: number }>();
    for (const cell of record.cells) {
      const value = String(params.get(cell.scenarioId)?.[knob] ?? "unknown");
      const next = counts.get(value) ?? { scenarios: 0, failed: 0 };
      next.scenarios += 1;
      if (cell.failed.length > 0) next.failed += 1;
      counts.set(value, next);
    }
    for (const [value, entry] of counts) {
      rows.push({
        knob,
        value,
        scenarios: entry.scenarios,
        failed: entry.failed,
        rate: entry.scenarios === 0 ? 0 : entry.failed / entry.scenarios,
      });
    }
  }
  return rows.sort((a, b) => a.knob.localeCompare(b.knob) || a.value.localeCompare(b.value));
};

const anchorConflictRows = (
  record: TrialRecord,
  params: ReadonlyMap<string, Readonly<Record<string, unknown>>>,
): readonly RateRow[] => anyFailureRows(record, params).filter((r) => r.knob === "anchorConflict");

const driverTable = (rows: readonly DriverRow[]): readonly string[] =>
  rows.length === 0
    ? ["_No failures for this check._"]
    : [
        "| knob | highest-risk value | high rate | failed/high total | lowest-risk value | low rate | failed/low total | spread |",
        "|---|---|---:|---:|---|---:|---:|---:|",
        ...rows
          .slice(0, 8)
          .map(
            (r) =>
              `| \`${r.knob}\` | \`${r.highest.value}\` | ${pct(r.highest.rate)} | ${r.highest.failed}/${r.highest.scenarios} | \`${r.lowest.value}\` | ${pct(r.lowest.rate)} | ${r.lowest.failed}/${r.lowest.scenarios} | ${pct(r.spread)} |`,
          ),
      ];

export function renderLiveDomCodexDiagnosis(input: {
  readonly records: readonly TrialRecord[];
  readonly params: ReadonlyMap<string, Readonly<Record<string, unknown>>>;
  readonly categoricalAnchorAxisProvenByMutants: boolean;
}): string {
  const counted = input.records.filter((r) => r.subjectType === "agent" && r.counts);
  const failing = counted.filter((r) => failedCells(r).length > 0);
  const directAnchorFailures = failing.some((r) =>
    r.cells.some((c) => c.failed.includes("correct_anchor_resolution")),
  );

  return [
    "# ui-replay-live-dom Codex failure diagnosis",
    "",
    "This report reads counted real-agent Live-DOM failures. It does not use mutants as model",
    "evidence, and it does not treat prepared import bundles as results.",
    "",
    "| item | value |",
    "|---|---:|",
    `| counted real-agent records | ${counted.length} |`,
    `| counted failing records | ${failing.length} |`,
    `| categorical anchor axis proven by mutant bank | ${input.categoricalAnchorAxisProvenByMutants ? "yes" : "no"} |`,
    `| categorical anchor check failed by counted agent | ${directAnchorFailures ? "yes" : "no"} |`,
    "",
    failing.length === 0
      ? "No counted Live-DOM agent failure is present under the current challenge hash."
      : failing
          .flatMap((record) => {
            const failed = failedCells(record);
            const checks = countByCheck(record);
            const replayDrivers = driversForCheck(record, input.params, "replay_completes");
            const preconditionDrivers = driversForCheck(record, input.params, "precondition_observed");
            const anchor = anchorConflictRows(record, input.params);
            const recordDirectAnchorFailures = record.cells.some((c) =>
              c.failed.includes("correct_anchor_resolution"),
            );
            return [
              `## \`${record.runId}\` — ${record.model ?? "unknown model"}`,
              "",
              `Counted: ${record.counts ? "yes" : "no"}. Failed ${failed.length} of ${record.cells.length} scenarios.`,
              "",
              "### Failure Clusters",
              "",
              "| failed checks on scenario | scenarios |",
              "|---|---:|",
              ...countBySignature(record).map((row) => `| \`${row.signature}\` | ${row.scenarios} |`),
              "",
              "### By Check",
              "",
              "| check | scenarios |",
              "|---|---:|",
              ...checks.map((row) => `| \`${row.check}\` | ${row.scenarios} |`),
              "",
              "### `replay_completes` Drivers",
              "",
              ...driverTable(replayDrivers),
              "",
              "### `precondition_observed` Drivers",
              "",
              ...driverTable(preconditionDrivers),
              "",
              "### Anchor-Conflict Split",
              "",
              "| anchor conflict | scenarios | any failure | rate |",
              "|---|---:|---:|---:|",
              ...anchor.map(
                (row) => `| \`${row.value}\` | ${row.scenarios} | ${row.failed} | ${pct(row.rate)} |`,
              ),
              "",
              "### Reading",
              "",
              recordDirectAnchorFailures
                ? "The counted agent failed `correct_anchor_resolution`, so the categorical anchor axis appears in real-agent evidence for this run."
                : "The counted agent did not fail `correct_anchor_resolution`. The categorical anchor axis is proven on the mutant bank, but the real-agent failure in this run is settling/precondition evidence, not an agent-side anchor-resolution axis.",
              "",
            ];
          })
          .join("\n"),
    "",
    "Measured: counted Codex/OpenAI trial directories and hidden verifier output. Mutant-detection:",
    "categorical anchor antichain is measured separately in the family matrix. Not-run/import-only:",
    "Anthropic, Gemini and generic external bundles are not evidence until imported and hash-verified.",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}
