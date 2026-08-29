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
import { analyseFamilyTrials } from "./reports/agent-results.js";
import { renderHistoricalReport, renderSharedBankReport } from "./reports/bank-report.js";
import {
  renderSharedBankReport as renderBankReport,
  renderCrossFamilyAxisReport,
} from "./reports/bank-reports.js";
import { renderBudgetReport } from "./reports/budget-report.js";
import { renderAgentResults, renderCampaignReport } from "./reports/campaign-report.js";
import {
  OUTBOX_FAMILY,
  PIC_FAMILY,
  UI_FAMILY,
  campaignFacts,
  familyEvidenceFor,
  familyEvidenceMap,
  outboxHistory,
  outboxMatrix,
  trialLayerFacts,
  vendoredRunsDir,
} from "./reports/evidence.js";
import { renderEvolutionReport } from "./reports/evolution-report.js";
import { renderEvolutionValidation, validateOperator } from "./reports/evolution-validation.js";
import { renderCrossFamilyReport, renderFamilyReport } from "./reports/family-report.js";
import { renderGateReport } from "./reports/gate-report.js";
import { renderKillReport } from "./reports/kill-report.js";
import { renderFamilyDiversityReport, renderLedgerReport } from "./reports/ledger-report.js";
import { renderOrchestrationReport } from "./reports/orchestration-report.js";
import { renderMechanismReport, renderMutantReport } from "./reports/registry-report.js";
import { renderShapeReport } from "./reports/shape-report.js";
import { renderShipReport } from "./reports/ship-report.js";
import { computeEvidence, renderTrialReadinessReport } from "./reports/trial-report.js";
import { renderUiUpgradeReport } from "./reports/ui-upgrade-report.js";
import { SOURCES, getSource } from "./sources/index.js";
import { buildAgentBank } from "./trials/agent-bank.js";
import { crossFamilyClaims, kindedBank, normalizeSubjectId } from "./trials/bank.js";
import { computeOverlap } from "./trials/bank.js";
import { reconcile, runCampaign } from "./trials/campaign-run.js";
import { loadCampaign, loadCampaigns, progressOf } from "./trials/campaign.js";
import { readFamilyTrials, readTrialDirectory } from "./trials/directory.js";
import { importDurableOutboxHistory } from "./trials/history.js";
import { importAgentTrials, measuredScenarios, runLocalTrials, scenarioSetId } from "./trials/orchestrate.js";
import { PROVIDERS } from "./trials/providers.js";
import { ROUTABLE_FAMILY_IDS, routeFor } from "./trials/router.js";
import { prepareChallenge, runAgentTrial } from "./trials/run.js";
import { assertChallengeMatch, challengeHash } from "./trials/run.js";

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
       [--timeout <ms>] [--inherit-env] [--cost <usd>] [--campaign <id>]
       [--command <argv...>]        MUST BE LAST: everything after it is the command
                                 run ONE real agent trial; writes trials/<family>/<id>/
  trials campaign [--plan f] [--run] [--only A1,A2]
                                 validate/reconcile a campaign plan; --run executes runnable slots
  trials verify --family <id> <run-id>
                                 re-grade a preserved submission; checks the challenge hash
  trials matrix --family <id>    the AGENT bank: counted trials as a matrix
  trials prepare --family <id> --out <dir>
                                 emit the exact challenge bundle + instruction for external running
  trials route [--family <id>]   what the router knows about a family
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
  // Added with the trial router. Every flag that takes a value must be here or `positional` reads
  // the VALUE as a positional argument — which is how `trials verify --family X <run-id>` first
  // tried to open a trial directory named after the family.
  "--family",
  "--run-id",
  "--model",
  "--provider",
  "--subject",
  "--effort",
  "--timeout",
  "--cost",
  "--campaign",
  "--plan",
  "--only",
  "--emit-shapes",
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
  const familyId = flag(argv, "--family") ?? PIC_FAMILY;
  const provider = flag(argv, "--provider") ?? "shell";
  // Everything after `--command` IS the command, flags included. The earlier version filtered out
  // anything starting with `--`, which silently dropped `--permission-mode bypassPermissions` and
  // left the provider CLI asking for approval in a non-interactive sandbox.
  const cmdIndex = argv.indexOf("--command");
  const command = cmdIndex === -1 ? undefined : argv.slice(cmdIndex + 1);

  const result = runAgentTrial({
    root,
    familyId,
    runId,
    provider,
    model,
    subjectId: flag(argv, "--subject") ?? model.split("/").pop() ?? model,
    effort: flag(argv, "--effort"),
    ...(command === undefined || command.length === 0 ? {} : { command }),
    timeoutMs: numeric(argv, "--timeout") ?? 900_000,
    inheritEnv: argv.includes("--inherit-env"),
    costUsd: numeric(argv, "--cost") ?? null,
    campaign: flag(argv, "--campaign"),
  });

  const failed = result.record.cells.filter((c) => c.failed.length > 0).length;
  return [
    `run        ${result.record.runId}`,
    `family     ${familyId}`,
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
/** The agent bank for a family: counted trials as a matrix the axis meter can read. */
function agentBankFor(root: string, familyId: string) {
  const route = routeFor(familyId);
  const records = readFamilyTrials(join(root, "trials"), familyId).map((t) => t.record);
  return buildAgentBank(records, {
    familyId,
    instanceIds: route.matrix().instances.map((i) => i.id),
    caveat:
      "Subjects are real models attempting the task. Cells are the UNION of failures across that " +
      "model's counted trials; a scenario no counted trial graded is null rather than a pass.",
  });
}

/**
 * `trials campaign --plan <file> [--run] [--only A1,A2]`.
 *
 * Validating and reconciling by default, executing only when asked. A campaign command whose default
 * spends money is a campaign command someone runs by accident.
 */
function campaignCommand(argv: readonly string[], root: string): string {
  const planPath = flag(argv, "--plan");
  const plan = planPath === null ? null : loadCampaign(planPath);
  if (plan === null) {
    const all = loadCampaigns(root);
    return [
      `${all.length} campaign plan(s):`,
      "",
      ...all.map((p) => {
        const counted = readFamilyTrials(join(root, "trials"), p.familyId)
          .filter((t) => t.record.counts)
          .map((t) => t.runId);
        const prog = progressOf(p, counted);
        return `  ${p.campaignId.padEnd(14)} ${p.familyId.padEnd(38)} ${prog.run}/${prog.total} run, ${prog.counted} counted, ${prog.notRun} not run`;
      }),
      "",
    ].join("\n");
  }

  const rec = reconcile(root, plan);
  if (!argv.includes("--run")) {
    return [
      `campaign   ${plan.campaignId}`,
      `family     ${plan.familyId}`,
      `challenge  plan ${plan.challengeHash} / current ${rec.challengeCurrent} — ${rec.challengeMatches ? "match" : "MISMATCH"}`,
      `slots      ${plan.slots.length} (${plan.slots.filter((s) => s.state === "NOT_RUN").length} not run)`,
      `counted    ${rec.countedRecords.length} trial record(s) on disk`,
      "",
      ...(rec.disagreements.length === 0
        ? ["plan and evidence agree"]
        : ["DISAGREEMENTS:", ...rec.disagreements.map((d) => `  ${d}`)]),
      ...(rec.orphanRuns.length === 0
        ? []
        : ["", `unclaimed trial directories: ${rec.orphanRuns.join(", ")}`]),
      "",
      "Pass --run to execute the runnable slots.",
      "",
    ].join("\n");
  }

  const onlyRaw = flag(argv, "--only");
  const result = runCampaign({
    root,
    plan,
    ...(onlyRaw === null ? {} : { only: onlyRaw.split(",").map((s) => s.trim()) }),
    inheritEnv: !argv.includes("--no-inherit-env"),
  });
  return [
    `campaign   ${plan.campaignId}`,
    `executed   ${result.executed}`,
    `counted    ${result.counted}`,
    `skipped    ${result.skipped}`,
    "",
    ...result.outcomes.map((o) => `  ${o.slot.slotId.padEnd(4)} ${o.runId ?? "—"} — ${o.detail}`),
    "",
  ].join("\n");
}

/**
 * `trials verify --family <id> <run-id>` — re-grade a preserved submission from scratch.
 *
 * The check that makes a trial directory an artifact rather than a claim: the submission is still
 * there, the challenge hash still matches the family, and re-running the grader reproduces the cells
 * recorded at the time. A trial that cannot be re-verified is a screenshot.
 */
function verifyTrialCommand(argv: readonly string[], root: string): string {
  const familyId = flag(argv, "--family") ?? PIC_FAMILY;
  const runId = positional(argv, 2);
  if (runId === undefined) throw new Error("trials verify needs a run id");
  const dir = join(root, "trials", familyId, runId);
  const trial = readTrialDirectory(dir);
  const route = routeFor(familyId);

  const metadata = JSON.parse(readFileSync(join(dir, "metadata.json"), "utf8")) as Record<string, unknown>;
  const typesSource = readFileSync(join(root, route.family.typesPath), "utf8");
  const current = challengeHash(route.family.challenge(typesSource, route.scenarioSetId()));
  assertChallengeMatch((metadata["challengeHash"] as string | undefined) ?? null, current, runId);

  const submission = join(dir, "submission", route.submissionFile.split("/").pop() ?? "subject.mjs");
  const regraded = route.grade(submission);
  const recorded = trial.record.cells;
  const same =
    recorded.length === regraded.cells.length &&
    recorded.every((cell, i) => {
      const other = regraded.cells[i];
      return (
        other !== undefined &&
        other.scenarioId === cell.scenarioId &&
        other.failed.join(",") === cell.failed.join(",")
      );
    });

  return [
    `run          ${runId}`,
    `family       ${familyId}`,
    `challenge    ${current} (matches)`,
    `recorded     ${recorded.length} cells, ${recorded.filter((c) => c.failed.length > 0).length} failing`,
    `re-graded    ${regraded.cells.length} cells, ${regraded.cells.filter((c) => c.failed.length > 0).length} failing`,
    `reproduces   ${same ? "yes — identical cells" : "NO — the grading changed"}`,
    "",
  ].join("\n");
}

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

/** Every family's bank, tagged by kind, with the claims each kind licenses. */
function bankInput(root: string, registry: ReturnType<typeof loadRegistry>) {
  const banks = BUILT_FAMILIES.map((f) => {
    const bundle = familyEvidenceFor(root, f.id);
    const agent = agentBankFor(root, f.id);
    // A family with counted trials has an AGENT bank; one without has only its mutants.
    const useAgent = agent.subjects.length > 0;
    return kindedBank(
      {
        familyId: f.id,
        matrix: useAgent ? agent.matrix : bundle.matrix,
        provenance: useAgent ? "counted agent trials" : "mutants written alongside the verifier",
        agentDerived: useAgent,
      },
      useAgent ? "agent" : "mutant",
    );
  });
  const outbox = kindedBank(
    {
      familyId: OUTBOX_FAMILY,
      matrix: outboxMatrix(root),
      provenance: "engines submitted by frontier models, imported from the source project",
      agentDerived: true,
    },
    "imported",
  );
  const all = [...banks, outbox];

  const appearances = new Map<string, string[]>();
  for (const bank of all) {
    for (const subject of bank.subjects) {
      appearances.set(subject, [...(appearances.get(subject) ?? []), bank.familyId]);
    }
  }

  const rows = all.map((bank) => {
    const shape = registry.shapes.find((sh) => sh.familyId === bank.familyId);
    const counted = ROUTABLE_FAMILY_IDS.includes(bank.familyId)
      ? familyEvidenceFor(root, bank.familyId).evidence.countedAgentTrials
      : 0;
    return {
      familyId: bank.familyId,
      kind: bank.kind,
      subjects: bank.subjects,
      instances: bank.matrix.instances.length,
      axes: bank.matrix.subjects.length > 1 ? measure(bank.matrix, { nullTrials: 3 }).independentAxes : null,
      countedTrials: counted,
      note: shape?.dataQuality ?? "unknown",
    };
  });

  return {
    rows,
    banks: all,
    claims: crossFamilyClaims(all),
    sharedAnywhere: [...appearances.entries()]
      .filter(([, families]) => families.length > 1)
      .map(([subject, families]) => ({ subject, families: [...families].sort() }))
      .sort((a, b) => a.subject.localeCompare(b.subject)),
    threshold: 3,
    axisReports: all
      .filter((b) => b.matrix.subjects.length > 1)
      .map((b) => ({ familyId: b.familyId, kind: b.kind, axis: measure(b.matrix, { nullTrials: 3 }) })),
  };
}

/** The operator-validation report: parent, child, and whether the operator explains the difference. */
function evolutionValidationReport(root: string, registry: ReturnType<typeof loadRegistry>): string {
  const parentState = familyLoop(root, PIC_FAMILY, registry);
  const childId = "prompt-injection-memory-poisoning";
  const childShape = registry.shapes.find((sh) => sh.familyId === childId);
  if (childShape === undefined) throw new Error(`no shape for ${childId}`);

  const parentAnalysis = analyseFamilyTrials(
    PIC_FAMILY,
    familyEvidenceFor(root, PIC_FAMILY).trials,
    routeFor(PIC_FAMILY).scenarioParams(),
  );
  const childAnalysis = analyseFamilyTrials(
    childId,
    familyEvidenceFor(root, childId).trials,
    routeFor(childId).scenarioParams(),
  );
  const variant = parentState.variants.find((v) => v.id === childId) ?? null;

  const input = {
    parentShape: parentState.shape,
    childShape,
    parentAnalysis,
    childAnalysis,
    killAnalysis: parentState.analysis,
    variant,
    operatorKnob: "sessionsBetween",
    // Checks the persistence mechanism can reach. A failure on one of these is evidence the operator
    // produced the difficulty; a failure elsewhere is a harder family for another reason.
    operatorChecks: [
      "provenance_persisted",
      "no_forbidden_call",
      "exactly_allowed",
      "recall_trust_preserved",
    ],
  };
  return renderEvolutionValidation(validateOperator(input), input);
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
  // Evidence for EVERY built family, not just the first one. The determinism test builds it the
  // same way, and the two drifted the moment a second family had evidence to report.
  const allEvidence = familyEvidenceMap(root);
  write("ship-recommendation.md", renderShipReport(registry.shapes, registry, allEvidence));
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
  write("ship-gate-report.md", renderGateReport({ registry, evidence: allEvidence }));

  // ---- the campaign + trial-analysis layer -------------------------------------------------------
  for (const plan of loadCampaigns(root)) {
    const rec = reconcile(root, plan);
    write(
      `${plan.familyId}-trial-campaign.md`,
      renderCampaignReport({
        plan,
        countedRunIds: rec.countedRecords.map((r) => r.runId),
        challengeCurrent: rec.challengeCurrent,
        disagreements: rec.disagreements,
        superseded: rec.supersededRuns,
      }),
    );
    const bundle = familyEvidenceFor(root, plan.familyId);
    const analysis = analyseFamilyTrials(
      plan.familyId,
      bundle.trials,
      routeFor(plan.familyId).scenarioParams(),
      plan,
    );
    write(
      `${plan.familyId}-agent-results.md`,
      renderAgentResults({
        analysis,
        plan,
        ...(plan.familyId === "prompt-injection-memory-poisoning"
          ? {
              parent: {
                familyId: PIC_FAMILY,
                counted: familyEvidenceFor(root, PIC_FAMILY).evidence.countedAgentTrials,
                failures: 0,
                operator: "add_time_separation",
              },
            }
          : {}),
      }),
    );
  }

  // ---- the shared bank, by kind -------------------------------------------------------------------
  write("shared-subject-bank-report.md", renderBankReport(bankInput(root, registry)));
  write("cross-family-axis-report.md", renderCrossFamilyAxisReport(bankInput(root, registry)));

  // ---- what the UI family actually models ---------------------------------------------------------
  {
    const uiFamily = builtFamily(UI_FAMILY);
    const sweep = uiFamily.run();
    const prepared = prepareChallenge(root, UI_FAMILY);
    write(
      "ui-action-record-replay-upgrade-report.md",
      renderUiUpgradeReport({
        sweep,
        axis: measure(sweep.matrix, { nullTrials: 3 }),
        plan: loadCampaigns(root).find((p) => p.familyId === UI_FAMILY) ?? null,
        challengeFiles: prepared.pkg.files.length,
        challengeHash: prepared.hash,
        countedTrials: familyEvidenceFor(root, UI_FAMILY).evidence.countedAgentTrials,
      }),
    );
  }

  // ---- did the evolution operator work? -----------------------------------------------------------
  write("evolution-validation-report.md", evolutionValidationReport(root, registry));

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
  write("budget-plan.md", renderBudgetReport(inputs, 1000, trialLayerFacts(root), campaignFacts(root)));
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
        if (sub === "campaign") {
          process.stdout.write(campaignCommand(argv, root));
          return 0;
        }
        if (sub === "verify") {
          process.stdout.write(verifyTrialCommand(argv, root));
          return 0;
        }
        if (sub === "matrix") {
          const familyId = flag(argv, "--family") ?? PIC_FAMILY;
          emit(argv, `${JSON.stringify(agentBankFor(root, familyId).matrix, null, 2)}\n`);
          return 0;
        }
        if (sub === "prepare") {
          const familyId = flag(argv, "--family") ?? PIC_FAMILY;
          const out = flag(argv, "--out");
          if (out === null) throw new Error("trials prepare needs --out <dir>");
          const prepared = prepareChallenge(root, familyId, out);
          process.stdout.write(
            [
              `family         ${familyId}`,
              `challenge      ${prepared.pkg.files.length} files -> ${out}/`,
              `challenge hash ${prepared.hash}`,
              `scenario set   ${prepared.scenarioSetId}`,
              `scenarios      ${prepared.route.scenarioCount()}`,
              "",
              "Instruction handed to the agent:",
              "",
              prepared.route.instruction,
              "",
            ].join("\n"),
          );
          return 0;
        }
        if (sub === "route") {
          const familyId = flag(argv, "--family") ?? PIC_FAMILY;
          const route = routeFor(familyId);
          process.stdout.write(
            [
              `family      ${route.familyId}`,
              `host        ${route.hostScript}`,
              `submission  ${route.submissionFile}`,
              `scenarios   ${route.scenarioCount()}`,
              `set id      ${route.scenarioSetId()}`,
              "",
              `routable    ${ROUTABLE_FAMILY_IDS.join(", ")}`,
              "",
            ].join("\n"),
          );
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
