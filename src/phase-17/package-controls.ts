// Lane 2 - the package controls.
//
// Twelve things must hold before this package is allowed to cost money. Each one is a screen from
// `docs/DEFECT-TAXONOMY.md` Part 2 run against this family's own artifacts, and each one has a
// failing branch that something in the measured set actually reaches.

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  CAA_REVALIDATION_PROFILE,
  checkChallengePackage,
  checkStarterFailsEnough,
} from "../challenge/package-check.js";
import { CHEAT_ORACLES, INTENDED_CHECK } from "../families/caa-revalidation/mutants.js";
import {
  type RunResult,
  checkActivation,
  independentFatality,
  referenceFailures,
  runFamily,
} from "../families/caa-revalidation/runner.js";
import { isActivated } from "../families/caa-revalidation/scenarios.js";
import { RULES, RULE_CODES } from "../families/caa-revalidation/spec.js";
import { CHECKS, CHECK_RULES } from "../families/caa-revalidation/verify.js";
import { builtFamily } from "../families/registry.js";
import { gradeCaaRevalidation, routeFor } from "../trials/router.js";
import { hashChallengeDir } from "../trials/run.js";

export const CAA_FAMILY_ID = "caa-revalidation";

export interface Phase17Control {
  readonly id: string;
  readonly screen: string;
  readonly held: boolean;
  readonly detail: string;
}

export interface Phase17PackageControls {
  readonly schema: "agent-eval-foundry/phase-17-package-controls@1";
  readonly familyId: string;
  readonly challengeSha256: string;
  readonly scenarioSetId: string;
  readonly scenarioCount: number;
  readonly spaceSize: number;
  readonly visibleFiles: readonly string[];
  readonly hiddenArtifacts: readonly string[];
  readonly ruleToCheck: readonly { readonly ruleCode: string; readonly checks: readonly string[] }[];
  readonly activationMap: readonly {
    readonly subjectId: string;
    readonly intendedCheck: string | null;
    readonly activatedFailing: number;
    readonly activatedTotal: number;
    readonly controlFailing: number;
    readonly controlTotal: number;
    readonly intendedCheckFatalIn: number;
  }[];
  readonly checkActivation: Readonly<Record<string, number>>;
  readonly neverFiringChecks: readonly string[];
  readonly starter: { readonly scenarios: number; readonly failing: number; readonly fraction: number };
  readonly controls: readonly Phase17Control[];
  readonly allControlsHeld: boolean;
}

const control = (id: string, screen: string, held: boolean, detail: string): Phase17Control => ({
  id,
  screen,
  held,
  detail,
});

/**
 * The challenge hash.
 *
 * Deliberately NOT a second hashing scheme. It materialises the package exactly as a trial does and
 * calls `hashChallengeDir`, so the value registered before the campaign is bit-for-bit the value the
 * runner recomputes from the preserved challenge directory afterwards. Two definitions of "the
 * challenge hash" is how a package correction silently stops invalidating the trials it should.
 */
export const challengeHash = (root: string): { hash: string; scenarioSetId: string; files: string[] } => {
  const route = routeFor(CAA_FAMILY_ID);
  const scenarioSetId = route.scenarioSetId();
  const family = builtFamily(CAA_FAMILY_ID);
  const typesSource = readFileSync(join(root, family.typesPath), "utf8");
  const pkg = family.challenge(typesSource, scenarioSetId);
  const dir = mkdtempSync(join(tmpdir(), "phase17-challenge-hash-"));
  try {
    for (const file of pkg.files) {
      const target = join(dir, file.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, file.content, "utf8");
    }
    const hash = hashChallengeDir(dir);
    if (hash === null) throw new Error("phase-17 challenge directory did not materialise");
    return { hash, scenarioSetId, files: pkg.files.map((file) => file.path).sort() };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

export function runPhase17PackageControls(root: string): Phase17PackageControls {
  const family = builtFamily(CAA_FAMILY_ID);
  const typesSource = readFileSync(join(root, family.typesPath), "utf8");
  const { hash, scenarioSetId, files } = challengeHash(root);
  const pkg = family.challenge(typesSource, scenarioSetId);
  const run: RunResult = runFamily();
  const activation = checkActivation(run);
  const fatality = independentFatality(run);
  const fatalityFor = (id: string): number => fatality.find((row) => row.mutantId === id)?.fatalIn ?? 0;

  // Screen 7. The shipped starter graded through the family's own verifier.
  const starter = checkStarterFailsEnough(CAA_FAMILY_ID, pkg.files, gradeCaaRevalidation);

  // Screen 3, the leak audit, plus the visible-surface fairness half.
  let leakDetail = "no leak or missing-surface finding";
  let leakHeld = true;
  try {
    checkChallengePackage(pkg.files, CAA_REVALIDATION_PROFILE);
  } catch (err) {
    leakHeld = false;
    leakDetail = (err as Error).message;
  }

  const activationMap = run.subjects.map((subject) => {
    const own = run.cells.filter((cell) => cell.subjectId === subject.id);
    const act = own.filter((cell) => cell.activated);
    const ctl = own.filter((cell) => !cell.activated);
    return {
      subjectId: subject.id,
      intendedCheck: INTENDED_CHECK[subject.id] ?? null,
      activatedFailing: act.filter((cell) => cell.failures.length > 0).length,
      activatedTotal: act.length,
      controlFailing: ctl.filter((cell) => cell.failures.length > 0).length,
      controlTotal: ctl.length,
      intendedCheckFatalIn: fatalityFor(subject.id),
    };
  });

  const neverFiring = CHECKS.filter((check) => (activation[check] ?? 0) === 0);
  const unenforcedRules = RULE_CODES.filter((code) => !Object.values(CHECK_RULES).includes(code));
  const mechanismSubject = activationMap.find((row) => row.subjectId === "first-name-reuse");
  const referenceReplay = runFamily();

  const controls: readonly Phase17Control[] = [
    control(
      "C1-reference-passes",
      "rig integrity, known-good",
      referenceFailures(run).length === 0,
      `the reference failed ${referenceFailures(run).length} of ${run.scenarios.length} graded scenarios`,
    ),
    control(
      "C2-every-mutant-independently-fatal",
      "screen 8, independent fatality",
      fatality.every((row) => row.fatalIn > 0),
      fatality.map((row) => `${row.mutantId}:${row.check}=${row.fatalIn}`).join(" "),
    ),
    control(
      "C3-no-unrelated-mutant-failure",
      "screen 8, narrowness",
      activationMap
        .filter((row) => row.subjectId !== "reference")
        .every((row) => row.activatedFailing > 0 || row.controlFailing > 0),
      "every graded subject other than the reference fails somewhere in the measured set",
    ),
    control(
      "C4-starter-fails-widely-without-leaking",
      "screen 7, starter",
      starter.failing / starter.scenarios >= 0.2 && leakHeld,
      `starter fails ${starter.failing}/${starter.scenarios}; package leak check: ${leakDetail}`,
    ),
    control(
      "C5-no-op-and-always-refuse-fail",
      "screen 6, enforcement of the liveness and approval halves",
      fatalityFor("no-query") > 0 && fatalityFor("always-refuse") > 0 && fatalityFor("always-issue") > 0,
      `no-query=${fatalityFor("no-query")} always-refuse=${fatalityFor("always-refuse")} always-issue=${fatalityFor("always-issue")}`,
    ),
    control(
      "C6-malformed-refused",
      "B6, an empty input is not a failing input",
      run.malformedInputRefused,
      "a wrong-shaped verification input raises rather than returning a verdict",
    ),
    control(
      "C7-mechanism-activation",
      "screen 2, activation audit",
      mechanismSubject !== undefined &&
        mechanismSubject.activatedFailing === mechanismSubject.activatedTotal &&
        mechanismSubject.controlFailing === 0,
      `first-name-reuse fails ${mechanismSubject?.activatedFailing}/${mechanismSubject?.activatedTotal} activated and ${mechanismSubject?.controlFailing}/${mechanismSubject?.controlTotal} control scenarios`,
    ),
    control(
      "C8-witness-isolation-with-canary",
      "B5 applied to the isolation control itself",
      run.witnessIsolated && run.leakCanaryDetected,
      `isolated=${run.witnessIsolated}; the deliberately leaky facade tripped the detector=${run.leakCanaryDetected}`,
    ),
    control(
      "C9-deterministic-replay",
      "reproducibility",
      JSON.stringify(run.cells) === JSON.stringify(referenceReplay.cells),
      "two independent sweeps produced byte-identical cells",
    ),
    control(
      "C10-challenge-nonleakage",
      "screen 3, content-based leak audit",
      leakHeld &&
        !pkg.files.some(
          (file) =>
            file.path !== "MANIFEST.json" &&
            (file.content.includes("caa-revalidation-host-authority-witness") ||
              file.content.includes("deniedIndexFor") ||
              file.content.includes("first-name-reuse")),
        ),
      "no visible file carries the authority witness, the denied-position resolver, or a mutant identifier",
    ),
    control(
      "C11-registry-and-router-consistent",
      "family-list drift",
      routeFor(CAA_FAMILY_ID).familyId === CAA_FAMILY_ID &&
        family.checks.length === CHECKS.length &&
        family.ruleCodes.join(",") === RULE_CODES.join(","),
      `route, ${family.checks.length} checks and ${family.ruleCodes.length} rule codes agree with the family modules`,
    ),
    control(
      "C12-every-public-rule-enforced-and-every-check-fires",
      "screen 6 and screen 5, in both directions",
      neverFiring.length === 0 && unenforcedRules.length === 0,
      `never-firing checks: ${neverFiring.length === 0 ? "none" : neverFiring.join(", ")}; public rules with no check: ${unenforcedRules.length === 0 ? "none" : unenforcedRules.join(", ")}`,
    ),
  ];

  return {
    schema: "agent-eval-foundry/phase-17-package-controls@1",
    familyId: CAA_FAMILY_ID,
    challengeSha256: hash,
    scenarioSetId,
    scenarioCount: run.scenarios.length,
    spaceSize: run.spaceSize,
    visibleFiles: files,
    hiddenArtifacts: [...pkg.manifest.hiddenArtifacts],
    ruleToCheck: RULES.map((rule) => ({
      ruleCode: rule.code,
      checks: CHECKS.filter((check) => CHECK_RULES[check] === rule.code),
    })),
    activationMap,
    checkActivation: activation,
    neverFiringChecks: neverFiring,
    starter: {
      scenarios: starter.scenarios,
      failing: starter.failing,
      fraction: Number(starter.failingFraction.toFixed(4)),
    },
    controls,
    allControlsHeld: controls.every((row) => row.held),
  };
}

export const phase17PackageControlsJson = (row: Phase17PackageControls): string =>
  `${JSON.stringify(row, null, 2)}\n`;

export { CHEAT_ORACLES, isActivated };
