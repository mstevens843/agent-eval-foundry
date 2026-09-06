// construction: extracted compatibility command services. Core APIs remain independent of dispatch.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { measure } from "../axis-meter.js";
import {
  STARTER_FILE,
  STARTER_MIN_FAILING_FRACTION,
  checkChallengePackage,
  checkStarterFailsEnough,
} from "../challenge/package-check.js";
import { buildChallengePackage } from "../challenge/package.js";
import {
  ALL_SUBJECTS,
  referenceFailures,
  runFamily,
  toMatrix,
} from "../families/prompt-injection-containment/runner.js";
import {
  enumerateSpace,
  generateScenarios,
  selectMeasuredSet,
} from "../families/prompt-injection-containment/scenarios.js";
import { CHECKS as PIC_CHECK_NAMES } from "../families/prompt-injection-containment/verify.js";
import {
  BUILT_FAMILIES,
  BUILT_FAMILY_IDS,
  REALISM_LEVELS,
  REALISM_MEANING,
  builtFamily,
  scenarioSetIdFor,
} from "../families/registry.js";
import {
  readBrowserBackedMeasurement,
  validateBrowserBackedMeasurement,
} from "../families/ui-replay-browser-backed/measurement.js";
import { assertPromotionEvidence, variantToShape } from "../foundry/evolve.js";
import { loadRegistry } from "../foundry/load.js";
import { familyLoop } from "../foundry/loop.js";
import { checkScaffold } from "../foundry/scaffold-check.js";
import { generateScaffold, scaffoldFromShape } from "../foundry/scaffold.js";
import { SHAPE_PROSE } from "../foundry/shape-prose.js";
import { shapeFromFamily } from "../foundry/shape-sync.js";
import { parseTaskShape } from "../foundry/validate.js";
import { renderReport } from "../report.js";
import { PIC_FAMILY, familyEvidenceFor } from "../reports/evidence.js";
import { renderFamilyReport } from "../reports/family-report.js";
import { renderKillReport } from "../reports/kill-report.js";
import { renderTrialReadinessReport } from "../reports/trial-report.js";
import { measuredScenarios, scenarioSetId } from "../trials/orchestrate.js";
import { routeFor } from "../trials/router.js";
import type { Matrix } from "../types.js";
import { flag, positional, readJson } from "./arguments.js";
import { killReportLineageContexts, lineageInputs } from "./discovery.js";
import { reportLedgers } from "./evidence.js";

export function scaffoldCommand(argv: readonly string[], root: string): string {
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

export function familyCommand(sub: string, root: string): string {
  void root;
  const run = runFamily(ALL_SUBJECTS);
  /**
   * The declared check universe, attached here rather than in the family's runner.
   *
   * `family run` with no `--family` takes this legacy path, which builds the matrix directly and
   * never reaches `sweep()` in the registry — so the check-firing statistic silently read
   * "universe not declared" for the one family that most needed it: this suite fires 5 of its 9
   * checks, and without a denominator the report said "5 distinct checks fired", which reads as
   * complete.
   *
   * It goes here and not in `runner.ts` because every `runner.ts` is hashed into the verifier hash
   * that gates whether a counted adversarial audit still counts. Metadata that cannot affect
   * grading must not rotate that hash.
   */
  const declared = (m: Matrix): Matrix => ({
    ...m,
    provenance: { ...m.provenance, checks_declared: [...PIC_CHECK_NAMES] },
  });
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
      return `${JSON.stringify(declared(toMatrix(run)), null, 2)}\n`;
    case "report":
      return renderFamilyReport({ run, axis: measure(declared(toMatrix(run)), { nullTrials: 3 }) });
    case "axis":
      return renderReport(measure(declared(toMatrix(run)), { nullTrials: 3 }));
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

/**
 * The starter gate, run on request and reported either way.
 *
 * Deliberately opt-in. `checkChallengePackage` is instant and runs on every build; grading a
 * family's own starter spawns a subprocess per scenario and takes 10-90 seconds, and `pnpm report`
 * plus `pnpm verify` build all nine packages between them. Folding it into the fast path would put
 * minutes on both for a property that changes only when a starter file changes.
 *
 * What is NOT optional is saying so. When the flag is absent this prints that the gate did not run,
 * so a build that skipped it can never be read as a build that passed it — and the enforcement that
 * nothing merges past lives in `test/starter-must-fail.test.ts`, which runs it for all nine.
 */
export function starterGateLines(
  argv: readonly string[],
  familyId: string,
  files: readonly { readonly path: string; readonly content: string }[],
): readonly string[] {
  if (!argv.includes("--verify-starter")) {
    return [
      "Starter gate NOT RUN — pass `--verify-starter` to grade the shipped starter against this",
      "family's own suite (10-90s). `pnpm test` runs it for every family regardless.",
    ];
  }
  const result = checkStarterFailsEnough(familyId, files, (p) => routeFor(familyId).grade(p));
  return [
    `Starter gate PASSED — the shipped \`${STARTER_FILE}\` fails ${result.failing}/${result.scenarios} ` +
      `scenarios (${(result.failingFraction * 100).toFixed(1)}%, floor ${(STARTER_MIN_FAILING_FRACTION * 100).toFixed(0)}%), ` +
      `${result.hostErrors} host error(s). A starter that passed would mean the family measures transcription.`,
  ];
}

export function challengeCommand(argv: readonly string[], root: string): string {
  const requested = flag(argv, "--family");
  if (requested !== null && requested !== PIC_FAMILY) return familyChallenge(argv, root);
  const typesSource = readFileSync(join(root, "src/families/prompt-injection-containment/types.ts"), "utf8");
  const pkg = buildChallengePackage(typesSource, scenarioSetId(measuredScenarios()));
  // Grade the package before writing it. The checker does not import the builder.
  const check = checkChallengePackage(pkg.files);
  const starter = starterGateLines(argv, pkg.familyId, pkg.files);
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
    ...starter,
    "",
    dir === null ? "_Not written — pass `--out <dir>`._" : `Written to \`${dir}/\`.`,
    "",
  ].join("\n");
}

export function killCommand(argv: readonly string[], root: string): string {
  const familyId = positional(argv, 2) ?? PIC_FAMILY;
  const state = familyLoop(root, familyId);
  const lineageContext = killReportLineageContexts(lineageInputs(root).evaluations).get(familyId);
  return renderKillReport({
    shape: state.shape,
    analysis: state.analysis,
    ...(state.evidence === undefined ? {} : { evidence: state.evidence }),
    ...(lineageContext === undefined ? {} : { lineage: lineageContext }),
    variants: state.variants,
    trials: state.trials,
    ledgers: reportLedgers(root),
  });
}

/** `evolve <family> [--emit-shapes <dir>]` — proposals, and optionally their draft shapes. */
export function evolveCommand(argv: readonly string[], root: string): string {
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
            `${v.id.padEnd(42)} risk ${(v.killRisk * 100).toFixed(0).padStart(3)}%  ops: ${v.operators.join(", ")}`,
        )),
    "",
  ].join("\n");
}

/** `family shape --family <id>` — regenerate a built family's shape from its own code. */
export function shapeCommand(argv: readonly string[], root: string): string {
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
export function promoteCommand(argv: readonly string[], root: string): string {
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
export function builtFamilyCommand(argv: readonly string[], root: string, sub: string): string {
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
export function familyChallenge(argv: readonly string[], root: string): string {
  const id = flag(argv, "--family") ?? PIC_FAMILY;
  const family = builtFamily(id);
  const sweep = family.run();
  const typesSource = readFileSync(join(root, family.typesPath), "utf8");
  const pkg = family.challenge(typesSource, scenarioSetIdFor(family, sweep.matrix));
  const check = checkChallengePackage(pkg.files, family.leakProfile);
  const starter = starterGateLines(argv, pkg.familyId, pkg.files);
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
    ...starter,
    "",
  ].join("\n");
}

/**
 * Where each built family's harness sits on the realism ladder, and what the next rung would buy.
 *
 * A single command, because "how real is this?" is the question a reviewer asks first and the one a
 * benchmark is most tempted to answer generously. The level is a field on the family rather than
 * prose in a report, and it is deliberately kept OUT of the challenge package: relabelling a harness
 * must never change the hash, or an honesty improvement would invalidate the evidence that motivated
 * it.
 */
export function realismCommand(root: string): string {
  const browserValidation = validateBrowserBackedMeasurement(readBrowserBackedMeasurement(root));
  return [
    "realism ladder",
    "",
    ...REALISM_LEVELS.map((l) => `  ${l.padEnd(16)} ${REALISM_MEANING[l]}`),
    "",
    "per family",
    "",
    ...BUILT_FAMILIES.flatMap((f) => [
      `  ${f.id}`,
      `    level  ${f.realism}`,
      `    gap    ${f.realismGap}`,
      "",
    ]),
    browserValidation.valid
      ? `Browser-backed replay now has a small measured Playwright spike: ${browserValidation.scenariosMeasured} scenario(s), ${browserValidation.subjectsMeasured} subject(s). It remains mutant-detection evidence only, not real-agent difficulty.`
      : "Browser-backed replay is still below measured status on this checkout: no valid Playwright measurement artifact is preserved.",
    "",
  ].join("\n");
}
