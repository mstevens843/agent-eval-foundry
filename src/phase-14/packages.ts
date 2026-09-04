import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkChallengePackage } from "../challenge/package-check.js";
import type { ChallengeFile, ChallengePackage } from "../challenge/package.js";
import { builtFamily } from "../families/registry.js";
import { fail, str } from "../foundry/schema.js";
import { RigInputError, requireShape, rigIntegrity } from "../screens/rig-integrity.js";
import { routeFor } from "../trials/router.js";
import { challengeHash, prepareChallenge } from "../trials/run.js";

export const PHASE14_FAMILIES = [
  "dao-descendant",
  "trading-reconciliation-recompute",
  "deployment-rollback-recompute",
] as const;
export type Phase14FamilyId = (typeof PHASE14_FAMILIES)[number];

export const STARTER_PROFILES = ["seeded-recompute", "neutral-skeleton"] as const;
export type StarterProfile = (typeof STARTER_PROFILES)[number];

const PREREGISTRATION_PATH = "data/phase-14-preregistration.json";
const ALLOWED_NEUTRAL_DELTAS = ["README.md", "starter/subject.mjs"] as const;

interface FamilyProfile {
  readonly readmeSeededLine: string;
  readonly readmeNeutralLine: string;
  readonly neutralStarter: string;
  readonly actorKnob: string;
  readonly widthKnob: string;
  readonly crashKnob: string;
  readonly uncertainValue: string;
}

const FAMILY_PROFILES: Readonly<Record<Phase14FamilyId, FamilyProfile>> = {
  "dao-descendant": {
    readmeSeededLine: "| `starter/subject.mjs` | a deliberately incorrect current-epoch implementation |",
    readmeNeutralLine:
      "| `starter/subject.mjs` | a neutral interface skeleton with no key-selection implementation |",
    neutralStarter: `// Neutral starter. Implement the normative contract in SPEC.md.
// This profile supplies the interface without seeding a key-selection strategy.

export const subject = {
  id: "starter-neutral",
  label: "Neutral durable-recovery skeleton",
  run(view, tool) {
    void tool;
    return {
      actionId: view.intent.actionId,
      workerId: view.workerId,
      leaseEpoch: view.leaseEpoch,
      idempotencyKey: "",
      outcome: "not_implemented",
      toolOk: false,
    };
  },
};
`,
    actorKnob: "nWorkers",
    widthKnob: "keys",
    crashKnob: "crashPosition",
    uncertainValue: "after_tool",
  },
  "trading-reconciliation-recompute": {
    readmeSeededLine: "| `starter/subject.mjs` | a deliberately incorrect authority-epoch implementation |",
    readmeNeutralLine:
      "| `starter/subject.mjs` | a neutral interface skeleton with no key-selection implementation |",
    neutralStarter: `// Neutral starter. Implement the normative contract in SPEC.md.
// This profile supplies the interface without seeding a key-selection strategy.

export const subject = {
  id: "starter-neutral",
  label: "Neutral reconciliation skeleton",
  run(view, venue) {
    void venue;
    return {
      orderIntentId: view.intent.orderIntentId,
      reconcilerId: view.reconcilerId,
      authorityEpoch: view.authorityEpoch,
      idempotencyKey: "",
      outcome: "not_implemented",
      venueAccepted: false,
    };
  },
};
`,
    actorKnob: "nReconcilers",
    widthKnob: "orders",
    crashKnob: "crashPosition",
    uncertainValue: "after_venue_accept",
  },
  "deployment-rollback-recompute": {
    readmeSeededLine: "| `starter/subject.mjs` | a deliberately incorrect authority-epoch implementation |",
    readmeNeutralLine:
      "| `starter/subject.mjs` | a neutral interface skeleton with no key-selection implementation |",
    neutralStarter: `// Neutral starter. Implement the normative contract in SPEC.md.
// This profile supplies the interface without seeding a key-selection strategy.

export const subject = {
  id: "starter-neutral",
  label: "Neutral rollback-recovery skeleton",
  run(view, controller) {
    void controller;
    return {
      rollbackIntentId: view.intent.rollbackIntentId,
      controllerId: view.controllerId,
      authorityEpoch: view.authorityEpoch,
      idempotencyKey: "",
      outcome: "not_implemented",
      controllerApplied: false,
    };
  },
};
`,
    actorKnob: "nControllers",
    widthKnob: "effects",
    crashKnob: "crashPosition",
    uncertainValue: "after_compensation",
  },
};

const assertFamily = (value: string): Phase14FamilyId => {
  if (!(PHASE14_FAMILIES as readonly string[]).includes(value)) {
    fail("E_SHAPE", "phase14.familyId", `expected one of ${PHASE14_FAMILIES.join(" | ")}`);
  }
  return value as Phase14FamilyId;
};

const assertStarterProfile = (value: string): StarterProfile => {
  if (!(STARTER_PROFILES as readonly string[]).includes(value)) {
    fail("E_SHAPE", "phase14.starterProfile", `expected one of ${STARTER_PROFILES.join(" | ")}`);
  }
  return value as StarterProfile;
};

export const parsePhase14FamilyId = (value: string): Phase14FamilyId => assertFamily(value);
export const parsePhase14StarterProfile = (value: string): StarterProfile => assertStarterProfile(value);

const replaceOnce = (source: string, before: string, after: string, path: string): string => {
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${path}: expected exactly one seeded starter description`);
  }
  return `${source.slice(0, first)}${after}${source.slice(first + before.length)}`;
};

/** Build a Phase 14 package without changing the registered Phase 13 default builder. */
export function phase14ChallengePackage(
  root: string,
  familyId: Phase14FamilyId,
  starterProfile: StarterProfile,
): ChallengePackage {
  const base = prepareChallenge(root, familyId).pkg;
  if (starterProfile === "seeded-recompute") return base;

  const profile = FAMILY_PROFILES[familyId];
  const files = base.files.map((file): ChallengeFile => {
    if (file.path === "starter/subject.mjs") return { ...file, content: profile.neutralStarter };
    if (file.path === "README.md") {
      return {
        ...file,
        content: replaceOnce(file.content, profile.readmeSeededLine, profile.readmeNeutralLine, file.path),
      };
    }
    return file;
  });
  return { ...base, files };
}

export function writeChallengePackage(pkg: ChallengePackage, outDir: string): void {
  for (const file of pkg.files) {
    const path = join(outDir, file.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, file.content, "utf8");
  }
}

const changedPaths = (before: ChallengePackage, after: ChallengePackage): readonly string[] => {
  const prior = new Map(before.files.map((file) => [file.path, file.content]));
  return after.files
    .filter((file) => prior.get(file.path) !== file.content)
    .map((file) => file.path)
    .sort();
};

function packageDeltaFailures(
  base: ChallengePackage,
  candidate: ChallengePackage,
  allowed: readonly string[],
): readonly string[] {
  const basePaths = base.files.map((file) => file.path).sort();
  const candidatePaths = candidate.files.map((file) => file.path).sort();
  const changes = changedPaths(base, candidate);
  return [
    ...(basePaths.join("\n") === candidatePaths.join("\n") ? [] : ["file-set-changed"]),
    ...changes.filter((path) => !allowed.includes(path)).map((path) => `unregistered-delta:${path}`),
    ...(changes.length > 0 ? [] : ["no-material-delta"]),
  ];
}

export interface Phase14PackageRow {
  readonly familyId: Phase14FamilyId;
  readonly starterProfile: StarterProfile;
  readonly challengeHash: string;
  readonly phase13ChallengeHash: string;
  readonly scenarioSetId: string;
  readonly files: number;
  readonly bytes: number;
  readonly changedFromSeeded: readonly string[];
  readonly onlyRegisteredDelta: boolean;
  readonly packageGatePassed: boolean;
  readonly starterFailedScenarios: number;
  readonly starterScenarios: number;
  readonly starterHostErrors: number;
}

export interface Phase14PackageLock {
  readonly schema: "agent-eval-foundry/phase-14-package-lock@1";
  readonly preregistrationPath: string;
  readonly preregistrationSha256: string;
  readonly phase13PreregistrationPath: string;
  readonly phase13PreregistrationExpectedSha256: string;
  readonly phase13PreregistrationCurrentSha256: string;
  readonly phase13PreregistrationPreserved: boolean;
  readonly allowedNeutralDeltas: readonly string[];
  readonly rows: readonly Phase14PackageRow[];
  readonly phase13SeededHashesPreserved: boolean;
  readonly b6: {
    readonly usable: boolean;
    readonly malformedInputRefused: boolean;
    readonly knownGoodPassed: boolean;
    readonly knownBadFailed: boolean;
  };
}

const sha256File = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

const starterGrade = (
  root: string,
  familyId: Phase14FamilyId,
  pkg: ChallengePackage,
): { failed: number; total: number; hostErrors: number } => {
  const dir = mkdtempSync(join(tmpdir(), `phase14-${familyId}-`));
  writeChallengePackage(pkg, dir);
  const grade = routeFor(familyId).grade(join(dir, "starter", "subject.mjs"));
  return {
    failed: grade.cells.filter((cell) => cell.failed.length > 0).length,
    total: grade.cells.length,
    hostErrors: grade.hostErrors,
  };
};

/** Recompute every locked package and calibrate the delta checker in the same invocation. */
export function buildPhase14PackageLock(root: string): Phase14PackageLock {
  const preregistrationPath = join(root, PREREGISTRATION_PATH);
  const registered = JSON.parse(readFileSync(preregistrationPath, "utf8")) as Record<string, unknown>;
  const frozen = requireShape(registered.frozenPhase13Inputs, "phase14.frozenPhase13Inputs", [
    "preregistration",
    "preregistrationSha256",
    "families",
  ]);
  const phase13PreregistrationPath = str(
    frozen.preregistration,
    "phase14.frozenPhase13Inputs.preregistration",
  );
  const phase13PreregistrationExpectedSha256 = str(
    frozen.preregistrationSha256,
    "phase14.frozenPhase13Inputs.preregistrationSha256",
  );
  const phase13PreregistrationCurrentSha256 = sha256File(join(root, phase13PreregistrationPath));
  if (!Array.isArray(frozen.families)) throw new TypeError("phase14 frozen families must be an array");
  const frozenHashes = new Map(
    frozen.families.map((raw, index) => {
      const row = requireShape(raw, `phase14.frozenPhase13Inputs.families[${index}]`, [
        "familyId",
        "challengeHash",
      ]);
      return [
        assertFamily(str(row.familyId, `phase14.families[${index}].familyId`)),
        str(row.challengeHash, `phase14.families[${index}].challengeHash`),
      ] as const;
    }),
  );

  const rows: Phase14PackageRow[] = [];
  for (const familyId of PHASE14_FAMILIES) {
    const family = builtFamily(familyId);
    const seeded = phase14ChallengePackage(root, familyId, "seeded-recompute");
    for (const starterProfile of STARTER_PROFILES) {
      const pkg = phase14ChallengePackage(root, familyId, starterProfile);
      const check = checkChallengePackage(pkg.files, family.leakProfile);
      const delta = starterProfile === "seeded-recompute" ? [] : changedPaths(seeded, pkg);
      const deltaFailures =
        starterProfile === "seeded-recompute"
          ? []
          : packageDeltaFailures(seeded, pkg, ALLOWED_NEUTRAL_DELTAS);
      const starter = starterGrade(root, familyId, pkg);
      rows.push({
        familyId,
        starterProfile,
        challengeHash: challengeHash(pkg),
        phase13ChallengeHash: frozenHashes.get(familyId) ?? "",
        scenarioSetId: pkg.manifest.scenarioSetId,
        files: check.files,
        bytes: check.bytes,
        changedFromSeeded: delta,
        onlyRegisteredDelta: deltaFailures.length === 0,
        packageGatePassed: true,
        starterFailedScenarios: starter.failed,
        starterScenarios: starter.total,
        starterHostErrors: starter.hostErrors,
      });
    }
  }

  const firstFamily = PHASE14_FAMILIES[0];
  const goodBase = phase14ChallengePackage(root, firstFamily, "seeded-recompute");
  const goodNeutral = phase14ChallengePackage(root, firstFamily, "neutral-skeleton");
  const knownGoodFailures = packageDeltaFailures(goodBase, goodNeutral, ALLOWED_NEUTRAL_DELTAS);
  const knownBad: ChallengePackage = {
    ...goodNeutral,
    files: goodNeutral.files.map((file) =>
      file.path === "SPEC.md" ? { ...file, content: `${file.content}\nUnregistered change.\n` } : file,
    ),
  };
  const knownBadFailures = packageDeltaFailures(goodBase, knownBad, ALLOWED_NEUTRAL_DELTAS);
  const integrity = rigIntegrity(
    "phase-14-package-delta",
    [
      { id: "registered-neutral-delta", expect: "pass", observedFailures: knownGoodFailures },
      { id: "unregistered-spec-delta", expect: "fail", observedFailures: knownBadFailures },
    ],
    [knownGoodFailures, knownBadFailures],
  );
  let malformedInputRefused = false;
  try {
    parsePhase14PackageLock({});
  } catch {
    malformedInputRefused = true;
  }
  if (!integrity.usable || !malformedInputRefused) {
    throw new RigInputError(
      `phase-14 package lock is void: ${[
        ...integrity.reasons,
        malformedInputRefused ? "" : "wrong-shaped package lock was accepted",
      ]
        .filter(Boolean)
        .join("; ")}`,
    );
  }

  return {
    schema: "agent-eval-foundry/phase-14-package-lock@1",
    preregistrationPath: PREREGISTRATION_PATH,
    preregistrationSha256: sha256File(preregistrationPath),
    phase13PreregistrationPath,
    phase13PreregistrationExpectedSha256,
    phase13PreregistrationCurrentSha256,
    phase13PreregistrationPreserved:
      phase13PreregistrationExpectedSha256 === phase13PreregistrationCurrentSha256,
    allowedNeutralDeltas: [...ALLOWED_NEUTRAL_DELTAS],
    rows,
    phase13SeededHashesPreserved: rows
      .filter((row) => row.starterProfile === "seeded-recompute")
      .every((row) => row.challengeHash === row.phase13ChallengeHash),
    b6: {
      usable: integrity.usable,
      malformedInputRefused,
      knownGoodPassed: knownGoodFailures.length === 0,
      knownBadFailed: knownBadFailures.length > 0,
    },
  };
}

export function parsePhase14PackageLock(value: unknown): Phase14PackageLock {
  const top = requireShape(value, "phase14.packageLock", [
    "schema",
    "phase13PreregistrationPath",
    "phase13PreregistrationExpectedSha256",
    "phase13PreregistrationCurrentSha256",
    "phase13PreregistrationPreserved",
    "rows",
  ]);
  if (top.schema !== "agent-eval-foundry/phase-14-package-lock@1") {
    fail("E_SHAPE", "phase14.packageLock.schema", "unexpected schema");
  }
  const phase13Expected = str(
    top.phase13PreregistrationExpectedSha256,
    "phase14.packageLock.phase13PreregistrationExpectedSha256",
  );
  const phase13Current = str(
    top.phase13PreregistrationCurrentSha256,
    "phase14.packageLock.phase13PreregistrationCurrentSha256",
  );
  if (
    top.phase13PreregistrationPreserved !== (phase13Expected === phase13Current) ||
    !/^[0-9a-f]{64}$/.test(phase13Expected) ||
    !/^[0-9a-f]{64}$/.test(phase13Current)
  ) {
    fail("E_SHAPE", "phase14.packageLock.phase13PreregistrationPreserved", "hash verdict is invalid");
  }
  if (!Array.isArray(top.rows) || top.rows.length !== PHASE14_FAMILIES.length * STARTER_PROFILES.length) {
    fail("E_SHAPE", "phase14.packageLock.rows", "expected one row per family and starter profile");
  }
  for (const [index, raw] of top.rows.entries()) {
    const row = requireShape(raw, `phase14.packageLock.rows[${index}]`, [
      "familyId",
      "starterProfile",
      "challengeHash",
      "scenarioSetId",
      "changedFromSeeded",
    ]);
    assertFamily(str(row.familyId, `phase14.packageLock.rows[${index}].familyId`));
    assertStarterProfile(str(row.starterProfile, `phase14.packageLock.rows[${index}].starterProfile`));
    if (!Array.isArray(row.changedFromSeeded)) {
      fail("E_SHAPE", `phase14.packageLock.rows[${index}].changedFromSeeded`, "expected an array");
    }
  }
  return value as Phase14PackageLock;
}

export interface Phase14ScenarioRow {
  readonly familyId: Phase14FamilyId;
  readonly scenarioId: string;
  readonly params: Readonly<Record<string, unknown>>;
  readonly activation: "target" | "control";
  readonly uncertainAfterEffect: boolean;
  readonly changedAuthority: boolean;
  readonly inConcentrated24: true;
  readonly inBalanced12: boolean;
}

export interface Phase14ScenarioLock {
  readonly schema: "agent-eval-foundry/phase-14-scenario-lock@1";
  readonly preregistrationPath: string;
  readonly preregistrationSha256: string;
  readonly selectionRule: string;
  readonly rows: readonly Phase14ScenarioRow[];
}

const normalizedKnobs = (
  familyId: Phase14FamilyId,
  params: Readonly<Record<string, unknown>>,
): { seed: number; actors: number; width: number; uncertain: boolean; changed: boolean } => {
  const profile = FAMILY_PROFILES[familyId];
  const seed = Number(params.seed);
  const actors = Number(params[profile.actorKnob]);
  const width = Number(params[profile.widthKnob]);
  const uncertain = params[profile.crashKnob] === profile.uncertainValue;
  return { seed, actors, width, uncertain, changed: actors > 1 };
};

const balancedTarget = (knobs: ReturnType<typeof normalizedKnobs>): boolean => {
  if (!(knobs.uncertain && knobs.changed)) return false;
  if (knobs.seed === 11) {
    return (
      (knobs.actors === 2 && knobs.width === 4) ||
      (knobs.actors === 3 && knobs.width === 6) ||
      (knobs.actors === 4 && knobs.width === 12)
    );
  }
  return (
    knobs.seed === 23 &&
    ((knobs.actors === 2 && knobs.width === 6) ||
      (knobs.actors === 3 && knobs.width === 12) ||
      (knobs.actors === 4 && knobs.width === 4))
  );
};

export function buildPhase14ScenarioLock(root: string): Phase14ScenarioLock {
  const preregistrationPath = join(root, PREREGISTRATION_PATH);
  const rows: Phase14ScenarioRow[] = [];
  for (const familyId of PHASE14_FAMILIES) {
    const params = routeFor(familyId).scenarioParams();
    for (const [scenarioId, rawParams] of params) {
      const knobs = normalizedKnobs(familyId, rawParams);
      const target = knobs.uncertain && knobs.changed;
      rows.push({
        familyId,
        scenarioId,
        params: rawParams,
        activation: target ? "target" : "control",
        uncertainAfterEffect: knobs.uncertain,
        changedAuthority: knobs.changed,
        inConcentrated24: true,
        inBalanced12: target ? balancedTarget(knobs) : true,
      });
    }
    const familyRows = rows.filter((row) => row.familyId === familyId);
    const targetRows = familyRows.filter((row) => row.activation === "target");
    const controlRows = familyRows.filter((row) => row.activation === "control");
    const balancedRows = familyRows.filter((row) => row.inBalanced12);
    if (
      familyRows.length !== 24 ||
      targetRows.length !== 18 ||
      controlRows.length !== 6 ||
      balancedRows.length !== 12 ||
      balancedRows.filter((row) => row.activation === "target").length !== 6
    ) {
      throw new Error(
        `${familyId}: expected concentrated 18 target + 6 control and balanced 6 target + 6 control`,
      );
    }
  }
  return {
    schema: "agent-eval-foundry/phase-14-scenario-lock@1",
    preregistrationPath: PREREGISTRATION_PATH,
    preregistrationSha256: sha256File(preregistrationPath),
    selectionRule:
      "Keep all six nonactivation controls. Select six targets before agent output: seed 11 uses actor/width pairs 2/4, 3/6, 4/12; seed 23 uses 2/6, 3/12, 4/4.",
    rows,
  };
}

export function renderPhase14PackageLock(lock: Phase14PackageLock): string {
  return `${JSON.stringify(lock, null, 2)}\n`;
}

export function renderPhase14ScenarioLock(lock: Phase14ScenarioLock): string {
  return `${JSON.stringify(lock, null, 2)}\n`;
}
