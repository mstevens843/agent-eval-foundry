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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { measure } from "./axis-meter.js";
import { checkChallengePackage } from "./challenge/package-check.js";
import { buildChallengePackage } from "./challenge/package.js";
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
import { BUILT_FAMILIES, BUILT_FAMILY_IDS, builtFamily, scenarioSetIdFor } from "./families/registry.js";
import { assertBudgetInputs, assertPlanHonest } from "./foundry/budget-check.js";
import { MEASURED_DEFAULTS, planBudget } from "./foundry/budget.js";
import { assertLedgerConsistency, assertPostmortemExists } from "./foundry/consistency.js";
import { assertPromotionEvidence, variantToShape } from "./foundry/evolve.js";
import { loadRegistry } from "./foundry/load.js";
import { familyLoop, loopAll } from "./foundry/loop.js";
import { assertCoverage, coverage } from "./foundry/registry.js";
import { checkScaffold } from "./foundry/scaffold-check.js";
import { generateScaffold, scaffoldFromShape } from "./foundry/scaffold.js";
import { SchemaError } from "./foundry/schema.js";
import { SHAPE_PROSE } from "./foundry/shape-prose.js";
import { shapeFromFamily } from "./foundry/shape-sync.js";
import { parseTaskShape } from "./foundry/validate.js";
import { MatrixError, parseMatrix } from "./matrix.js";
import { renderReport } from "./report.js";
import { renderHistoricalReport, renderSharedBankReport } from "./reports/bank-report.js";
import { renderBudgetReport } from "./reports/budget-report.js";
import {
  OUTBOX_FAMILY,
  PIC_FAMILY,
  UI_FAMILY,
  familyEvidenceFor,
  familyEvidenceMap,
  outboxHistory,
  outboxMatrix,
  trialLayerFacts,
  vendoredRunsDir,
} from "./reports/evidence.js";
import { renderEvolutionReport } from "./reports/evolution-report.js";
import { renderCrossFamilyReport, renderFamilyReport } from "./reports/family-report.js";
import { renderGateReport } from "./reports/gate-report.js";
import { renderKillReport } from "./reports/kill-report.js";
import { renderFamilyDiversityReport, renderLedgerReport } from "./reports/ledger-report.js";
import { renderOrchestrationReport } from "./reports/orchestration-report.js";
import { renderMechanismReport, renderMutantReport } from "./reports/registry-report.js";
import { renderShapeReport } from "./reports/shape-report.js";
import { renderShipReport } from "./reports/ship-report.js";
import { computeEvidence, renderTrialReadinessReport } from "./reports/trial-report.js";
import { SOURCES, getSource } from "./sources/index.js";
import { computeOverlap } from "./trials/bank.js";
import { readFamilyTrials } from "./trials/directory.js";
import { importDurableOutboxHistory } from "./trials/history.js";
import {
  importAgentTrials,
  measuredScenarios,
  runAgentTrial,
  runLocalTrials,
  scenarioSetId,
} from "./trials/orchestrate.js";
import { PROVIDERS } from "./trials/providers.js";

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
  kill analyze <family>          why a family failed the gate, with evidence and disposition
  evolve <family> [--emit-shapes d]  variants the kill analysis justifies
  families-built                 the families that actually execute
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
  family sweep --family <id>     reference + mutants for any built family
  family shape --family <id>     regenerate a built family's task shape from its own code
  family postmortem <family>     the typed kill analysis for a family
  family promote <variant>       assert a proposed variant is now a built family
  cross-family [--out f]         compare measured families; verdict refused/partial/measured
  family trials [--out f]        trial-readiness: what mutants prove, what they do not
  challenge build [--out dir]    emit the agent-facing package (hidden artifacts excluded)
  trials local [--out f]         run every checked-in subject, emit trial records
  trials run --run-id <id> --model <m> [--provider <p>] [--subject <s>]
       [--command <argv...>] [--timeout <ms>] [--inherit-env] [--cost <usd>]
                                 run ONE real agent trial; writes trials/<family>/<id>/
  trials providers               every adapter, and what each one needs
  trials import <dir> [--out f]  ingest agent attempts from <dir>/<run>/metadata.json
  trials bank [--out f]          every trial on record, counted and uncounted
  shared-bank [--out f]          cross-family subject overlap and what it permits
  history import [path] [--out f]  normalize Harbor runs from the Durable Outbox repo

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
  void root;
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
    case "trials": {
      const { run: r, trials, evidence } = familyEvidenceFor(root);
      return renderTrialReadinessReport(r, trials, evidence);
    }
    default:
      throw new Error(
        `unknown family subcommand "${sub}"; expected scenarios | run | report | axis | sweep | shape | postmortem | promote`,
      );
  }
}

/** Every adapter, with what it needs to be usable. Answers "why did my provider refuse?". */
function providersCommand(): string {
  return [
    "provider     status        isolation    requires",
    ...PROVIDERS.map(
      (p) => `${p.id.padEnd(13)}${p.status.padEnd(14)}${p.isolation.padEnd(13)}${p.requires ?? "—"}`,
    ),
    "",
    "A declared adapter throws `provider not configured` rather than returning an empty submission.",
    "",
  ].join("\n");
}

/**
 * Run one real agent trial end to end and write a durable directory.
 *
 * `--inherit-env` is the flag worth explaining. The sandbox environment is redacted by default,
 * because the SUBJECT is hostile — it should not receive this machine's credentials. But a provider
 * CLI is not the subject; it is trusted infrastructure that needs its own login. The first real trial
 * run through this layer died in two seconds with "Not logged in" for exactly this reason, and the
 * fix is a flag the caller sets deliberately rather than a default that quietly leaks the environment
 * into every sandbox.
 */
function runTrialCommand(argv: readonly string[], root: string): string {
  const runId = flag(argv, "--run-id");
  const model = flag(argv, "--model");
  if (runId === null) throw new Error("trials run needs --run-id");
  if (model === null) throw new Error("trials run needs --model");
  const provider = flag(argv, "--provider") ?? "shell";
  const cmdIndex = argv.indexOf("--command");
  const command = cmdIndex === -1 ? undefined : argv.slice(cmdIndex + 1).filter((a) => !a.startsWith("--"));

  const result = runAgentTrial({
    root,
    runId,
    provider,
    model,
    subjectId: flag(argv, "--subject") ?? model.split("/").pop() ?? model,
    effort: flag(argv, "--effort"),
    ...(command === undefined || command.length === 0 ? {} : { command }),
    timeoutMs: numeric(argv, "--timeout") ?? 900_000,
    inheritEnv: argv.includes("--inherit-env"),
    costUsd: numeric(argv, "--cost") ?? null,
  });

  const failed = result.record.cells.filter((c) => c.failed.length > 0).length;
  return [
    `run        ${result.record.runId}`,
    `provider   ${provider}`,
    `model      ${result.record.model ?? "—"}`,
    `status     ${result.record.status}`,
    `isolation  ${result.record.isolation}`,
    `runtime    ${result.record.runtimeSeconds === null ? "—" : `${Math.round(result.record.runtimeSeconds)}s`}`,
    `counts     ${result.countability.counts ? "yes" : "NO"} — ${result.countability.reason}`,
    `graded     ${result.record.cells.length} scenarios, ${failed} failed`,
    `directory  ${result.directory}`,
    "",
  ].join("\n");
}

function challengeCommand(argv: readonly string[], root: string): string {
  const requested = flag(argv, "--family");
  if (requested !== null && requested !== PIC_FAMILY) return familyChallenge(argv, root);
  const typesSource = readFileSync(join(root, "src/families/prompt-injection-containment/types.ts"), "utf8");
  const pkg = buildChallengePackage(typesSource, scenarioSetId(measuredScenarios()));
  // Grade the package before writing it. The checker does not import the builder.
  const check = checkChallengePackage(pkg.files);
  const dir = flag(argv, "--out");
  if (dir !== null) {
    for (const f of pkg.files) {
      const target = join(dir, f.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, f.content, "utf8");
    }
    process.stderr.write(`wrote ${pkg.files.length} files to ${dir}/\n`);
  }
  return [
    `# Challenge package: ${pkg.familyId}`,
    "",
    `${check.files} visible files, ${check.bytes} bytes, ${check.examples} worked example(s),`,
    `all ${check.specCodesFound} policy rule codes present in SPEC.md.`,
    "",
    "| file |",
    "|---|",
    ...pkg.files.map((f) => `| \`${f.path}\` |`),
    "",
    `Hidden and verified absent: ${pkg.manifest.hiddenArtifacts.map((h) => `\`${h}\``).join(", ")}.`,
    "Checked by content as well as filename, so renaming a leaked file does not defeat it.",
    "",
    dir === null ? "_Not written — pass `--out <dir>`._" : `Written to \`${dir}/\`.`,
    "",
  ].join("\n");
}

function sharedBankCommand(root: string): string {
  const matrix = outboxMatrix(root);
  const history = outboxHistory(root);
  const { trials, run } = familyEvidenceFor(root);
  const picMatrix = toMatrix(run);
  return renderSharedBankReport({
    history,
    outboxMatrix: matrix,
    picMatrix,
    picTrials: trials,
    overlap: computeOverlap([
      {
        familyId: OUTBOX_FAMILY,
        matrix,
        provenance: "engines submitted by frontier models",
        agentDerived: true,
      },
      {
        familyId: PIC_FAMILY,
        matrix: picMatrix,
        provenance: "mutants written alongside the verifier",
        agentDerived: false,
      },
    ]),
  });
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

  // The gate and the ledger must agree, and a killed family must have a postmortem. Both run inside
  // `check` so CI fails on a contradiction rather than a reader finding one.
  const states = loopAll(root, registry);
  assertLedgerConsistency({
    candidates: registry.candidates,
    shapes: registry.shapes,
    verdicts: Object.fromEntries(states.map((st) => [st.shape.familyId, st.assessment.verdict])),
    analyses: Object.fromEntries(states.map((st) => [st.shape.familyId, st.analysis])),
    builtFamilyIds: BUILT_FAMILY_IDS,
  });
  for (const st of states) {
    assertPostmortemExists(
      st.shape.familyId,
      st.assessment,
      existsSync(join(root, "reports", `${st.shape.familyId}-kill-analysis.md`)),
    );
  }

  return [
    "registry OK",
    `  mechanisms  ${registry.mechanisms.length} (${cov.measuredMechanisms} measured)`,
    `  mutants     ${registry.mutants.length}`,
    `  families    ${registry.shapes.length}`,
    `  candidates  ${registry.candidates.length}`,
    `  built       ${BUILT_FAMILY_IDS.length} families execute`,
    "  coverage    every mechanism has a mutant; no mutant is orphaned",
    "  consistency ledger statuses agree with the ship gate; every kill has a postmortem",
    "",
  ].join("\n");
}

/** `kill analyze <family>` — the typed postmortem, rendered. */
function killCommand(argv: readonly string[], root: string): string {
  const familyId = positional(argv, 2) ?? PIC_FAMILY;
  const state = familyLoop(root, familyId);
  return renderKillReport({
    shape: state.shape,
    analysis: state.analysis,
    ...(state.evidence === undefined ? {} : { evidence: state.evidence }),
    variants: state.variants,
    trials: state.trials,
  });
}

/** `evolve <family> [--emit-shapes <dir>]` — proposals, and optionally their draft shapes. */
function evolveCommand(argv: readonly string[], root: string): string {
  const familyId = positional(argv, 1) ?? PIC_FAMILY;
  const state = familyLoop(root, familyId);
  const dir = flag(argv, "--emit-shapes");
  if (dir !== null) {
    mkdirSync(dir, { recursive: true });
    for (const v of state.variants) {
      const shape = parseTaskShape(variantToShape(v), `variant:${v.id}`);
      writeFileSync(
        join(dir, `${shape.familyId}.json`),
        `${JSON.stringify(variantToShape(v), null, 2)}\n`,
        "utf8",
      );
    }
    process.stderr.write(`wrote ${state.variants.length} draft shape(s) to ${dir}/\n`);
  }
  return [
    `family     ${familyId}`,
    `verdict    ${state.assessment.verdict}`,
    `primary    ${state.analysis.primary?.reason ?? "none"}`,
    `disposition ${state.analysis.disposition ?? "none"}`,
    "",
    ...(state.variants.length === 0
      ? [
          `No variants: disposition \`${state.analysis.disposition ?? "none"}\` does not call for descendants.`,
        ]
      : state.variants.map(
          (v) =>
            `${v.id.padEnd(42)} risk ${(v.killRisk * 100).toFixed(0).padStart(3)}%  ${v.estimatedBuildHours}h  ops: ${v.operators.join(", ")}`,
        )),
    "",
  ].join("\n");
}

/** `family shape --family <id>` — regenerate a built family's shape from its own code. */
function shapeCommand(argv: readonly string[], root: string): string {
  const id = flag(argv, "--family") ?? PIC_FAMILY;
  const prose = SHAPE_PROSE[id];
  if (prose === undefined) {
    throw new Error(
      `no shape prose for "${id}"; generated shapes exist for ${Object.keys(SHAPE_PROSE).join(", ")}`,
    );
  }
  const shape = shapeFromFamily(builtFamily(id), prose);
  parseTaskShape(shape, `shape:${id}`);
  const out = flag(argv, "--out");
  const text = `${JSON.stringify(shape, null, 2)}\n`;
  if (out !== null) {
    writeFileSync(out, text, "utf8");
    process.stderr.write(`wrote ${out}\n`);
  }
  return text;
}

/** `family promote <variant>` — assert a proposal has actually become a built family. */
function promoteCommand(argv: readonly string[], root: string): string {
  const variantId = positional(argv, 2);
  if (variantId === undefined) throw new Error("family promote needs a variant id");
  const registry = loadRegistry(root);
  assertPromotionEvidence(
    variantId,
    BUILT_FAMILY_IDS,
    registry.shapes.map((s) => s.familyId),
  );
  const family = builtFamily(variantId);
  const sweep = family.run();
  return [
    `promoted   ${variantId}`,
    `scenarios  ${sweep.scenarioCount} measured of ${sweep.spaceSize} declared`,
    `reference  ${sweep.referenceFailures.length === 0 ? "passes every scenario" : `FAILS ${sweep.referenceFailures.length}`}`,
    `mutants    ${sweep.mutantsCaught.filter((m) => m.caught).length}/${sweep.mutantsCaught.length} caught by their intended check`,
    `axes       ${measure(sweep.matrix, { nullTrials: 3 }).independentAxes} measured`,
    "",
    "A promotion is only a claim until a counted agent trial exists. None has been run for this family.",
    "",
  ].join("\n");
}

/** `family run|axis|report|challenge --family <id>` for any BUILT family. */
function builtFamilyCommand(argv: readonly string[], root: string, sub: string): string {
  const id = flag(argv, "--family") ?? PIC_FAMILY;
  const family = builtFamily(id);
  const sweep = family.run();
  switch (sub) {
    case "run":
      return `${JSON.stringify(sweep.matrix, null, 2)}\n`;
    case "axis":
      return renderReport(measure(sweep.matrix, { nullTrials: 3 }));
    case "sweep":
      return [
        `family     ${family.id}`,
        `scenarios  ${sweep.scenarioCount} of ${sweep.spaceSize} declared points`,
        `reference  ${sweep.referenceFailures.length} failing scenario(s)`,
        "",
        ...sweep.mutantsCaught.map(
          (m) =>
            `  ${m.mutantId.padEnd(28)} ${m.check.padEnd(24)} ${m.caught ? "caught" : "MISSED"} ${m.caughtIn}/${m.total}`,
        ),
        "",
        `baselines  ${sweep.baselinesBlocked.length}/${sweep.baselinesTotal} rejected`,
        "",
      ].join("\n");
    default:
      throw new Error(`unknown built-family subcommand "${sub}"`);
  }
}

/** Emit a built family's challenge package and grade it with the independent checker. */
function familyChallenge(argv: readonly string[], root: string): string {
  const id = flag(argv, "--family") ?? PIC_FAMILY;
  const family = builtFamily(id);
  const sweep = family.run();
  const typesSource = readFileSync(join(root, family.typesPath), "utf8");
  const pkg = family.challenge(typesSource, scenarioSetIdFor(family, sweep.matrix));
  const check = checkChallengePackage(pkg.files, family.leakProfile);
  const dir = flag(argv, "--out");
  if (dir !== null) {
    for (const f of pkg.files) {
      const target = join(dir, f.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, f.content, "utf8");
    }
    process.stderr.write(`wrote ${pkg.files.length} files to ${dir}/\n`);
  }
  return [
    `# Challenge package: ${pkg.familyId}`,
    "",
    `${check.files} visible files, ${check.bytes} bytes, ${check.examples} worked example(s),`,
    `all ${check.specCodesFound} rule codes present in SPEC.md.`,
    "",
    "| file |",
    "|---|",
    ...pkg.files.map((f) => `| \`${f.path}\` |`),
    "",
    `Hidden and verified absent: ${pkg.manifest.hiddenArtifacts.map((h) => `\`${h}\``).join(", ")}.`,
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
  const ev = familyEvidenceFor(root);
  write("ship-recommendation.md", renderShipReport(registry.shapes, registry, { [PIC_FAMILY]: ev.evidence }));
  write(
    "prompt-injection-containment-trial-readiness.md",
    renderTrialReadinessReport(ev.run, ev.trials, ev.evidence),
  );
  write("shared-bank-report.md", sharedBankCommand(root));
  write(
    "trial-orchestration-report.md",
    renderOrchestrationReport({
      familyId: PIC_FAMILY,
      trials: ev.trials,
      directories: readFamilyTrials(join(root, "trials"), PIC_FAMILY),
    }),
  );
  write("ship-gate-report.md", renderGateReport({ registry, evidence: { [PIC_FAMILY]: ev.evidence } }));

  // The evolution layer: one postmortem for the killed family, and the loop across all of them.
  const picState = familyLoop(root, PIC_FAMILY, registry);
  write(
    `${PIC_FAMILY}-kill-analysis.md`,
    renderKillReport({
      shape: picState.shape,
      analysis: picState.analysis,
      ...(picState.evidence === undefined ? {} : { evidence: picState.evidence }),
      variants: picState.variants,
      trials: picState.trials,
    }),
  );
  write(
    "foundry-evolution-report.md",
    renderEvolutionReport({
      registry,
      states: loopAll(root, registry),
      builtFamilyIds: BUILT_FAMILY_IDS,
      promoted: ["prompt-injection-memory-poisoning"],
      sharedBankSubjects: ev.evidence.sharedBankSubjects,
      sharedBankThreshold: 3,
    }),
  );

  // Every built family gets its own axis report and sweep summary.
  for (const family of BUILT_FAMILIES) {
    if (family.id === PIC_FAMILY) continue;
    const sweep = family.run();
    write(`${family.id}-axis-report.md`, renderReport(measure(sweep.matrix, { nullTrials: 3 })));
  }
  const uiShape = registry.shapes.find((s) => s.familyId === UI_FAMILY);
  if (uiShape !== undefined) {
    write(`${UI_FAMILY}-family-report.md`, renderShapeReport(uiShape, registry));
  }
  write("historical-durable-outbox-trials.md", renderHistoricalReport(outboxHistory(root)));
  const inputs = { ...MEASURED_DEFAULTS, totalUsd: 100_000, labourRateUsdPerHour: 120 };
  assertBudgetInputs(inputs);
  assertPlanHonest(planBudget(inputs));
  write("budget-plan.md", renderBudgetReport(inputs, 1000, trialLayerFacts(root)));
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
        // Subcommands that work for ANY built family. The originals below keep their behaviour, so
        // `family run` with no flag is still the first family and every existing script still works.
        if (sub === "sweep") {
          process.stdout.write(builtFamilyCommand(argv, root, "sweep"));
          return 0;
        }
        if (sub === "shape") {
          emit(argv, shapeCommand(argv, root));
          return 0;
        }
        if (sub === "postmortem") {
          emit(argv, killCommand(argv, root));
          return 0;
        }
        if (sub === "promote") {
          process.stdout.write(promoteCommand(argv, root));
          return 0;
        }
        const requested = flag(argv, "--family");
        if (requested !== null && requested !== PIC_FAMILY && (sub === "run" || sub === "axis")) {
          emit(argv, builtFamilyCommand(argv, root, sub));
          return 0;
        }
        emit(argv, familyCommand(sub, root));
        return 0;
      }
      case "cross-family":
        emit(argv, crossFamilyCommand(root));
        return 0;
      case "shared-bank":
        emit(argv, sharedBankCommand(root));
        return 0;
      case "history": {
        const path = positional(argv, 2);
        emit(argv, renderHistoricalReport(outboxHistory(root, path)));
        return 0;
      }
      case "challenge": {
        // Not `emit`: --out names a DIRECTORY here, as it does for `scaffold`. Summary to stdout.
        process.stdout.write(challengeCommand(argv, root));
        return 0;
      }
      case "trials": {
        const sub = positional(argv, 1) ?? "local";
        if (sub === "local") {
          emit(argv, `${JSON.stringify(runLocalTrials(), null, 2)}\n`);
          return 0;
        }
        if (sub === "bank") {
          const { trials } = familyEvidenceFor(root);
          emit(argv, `${JSON.stringify(trials, null, 2)}\n`);
          return 0;
        }
        if (sub === "import") {
          const dir = positional(argv, 2);
          if (dir === undefined) throw new Error("trials import needs a directory");
          const records = importAgentTrials(dir);
          emit(
            argv,
            `${JSON.stringify({ familyId: "prompt-injection-containment", scenarioSetId: scenarioSetId(measuredScenarios()), records }, null, 2)}\n`,
          );
          return 0;
        }
        if (sub === "run") {
          process.stdout.write(runTrialCommand(argv, root));
          return 0;
        }
        if (sub === "providers") {
          process.stdout.write(providersCommand());
          return 0;
        }
        throw new Error(
          `unknown trials subcommand "${sub}"; expected local | run | providers | import | bank`,
        );
      }
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
        // Same evidence the report writer uses. A standalone `ship` that skipped it said SHIP for a
        // family the generated report called NOT-READY, which is the worst possible failure for a
        // gate: two commands, one repository, opposite answers.
        const r = loadRegistry(root);
        emit(argv, renderShipReport(r.shapes, r, familyEvidenceMap(root)));
        return 0;
      }
      case "kill": {
        const sub = positional(argv, 1) ?? "analyze";
        if (sub !== "analyze") throw new Error(`unknown kill subcommand "${sub}"; expected analyze`);
        emit(argv, killCommand(argv, root));
        return 0;
      }
      case "evolve":
        process.stdout.write(evolveCommand(argv, root));
        return 0;
      case "families-built":
        process.stdout.write(
          `${BUILT_FAMILIES.map((f) => `${f.id.padEnd(38)} ${f.checks.length} checks  ${f.mechanisms.join(", ")}`).join("\n")}\n`,
        );
        return 0;
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
