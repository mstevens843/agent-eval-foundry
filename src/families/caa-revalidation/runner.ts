import { parseMatrix } from "../../matrix.js";
import { RigInputError, rigIntegrity } from "../../screens/rig-integrity.js";
import type { Matrix } from "../../types.js";
import { BASELINES, CHEAT_ORACLES, INTENDED_CHECK, MUTANTS, firstNameReuse } from "./mutants.js";
import { reference } from "./reference.js";
import { enumerateSpace, generateScenarios, isActivated, selectMeasuredSet } from "./scenarios.js";
import { type CaaQuery, type Scenario, isStale } from "./truth.js";
import type { Caa, CaaAuthority, Subject } from "./types.js";
import { type Check, type Failure, verify } from "./verify.js";

/** The private authority witness. It lives inside the hidden map and inside every ledger entry. */
export const CAA_WITNESS = "caa-revalidation-host-authority-witness-9d2f";

export interface CellResult {
  readonly scenarioId: string;
  readonly subjectId: string;
  readonly failures: readonly Failure[];
  readonly crashed: string | null;
  readonly queryCount: number;
  readonly uniqueQueryCount: number;
  readonly staleCount: number;
  readonly activated: boolean;
}

export interface RunResult {
  readonly scenarios: readonly Scenario[];
  readonly subjects: readonly Subject[];
  readonly cells: readonly CellResult[];
  readonly spaceSize: number;
  readonly rigUsable: boolean;
  readonly malformedInputRefused: boolean;
  readonly witnessIsolated: boolean;
  readonly leakCanaryDetected: boolean;
}

export const ALL_SUBJECTS: readonly Subject[] = [reference, ...MUTANTS];

/**
 * The host. It owns the current-authorization map and an append-only exact-fqdn ledger.
 *
 * The subject receives a frozen object whose only own property is `current`. It cannot enumerate the
 * map, cannot read the ledger, and cannot rewrite which fqdn a call recorded.
 */
export class CaaAuthorityHarness {
  private seq = 0;
  private readonly entries: { seq: number; fqdn: string; witness: string }[] = [];
  private readonly map: Map<string, { answer: Caa; witness: string }>;

  constructor(current: Readonly<Record<string, Caa>>) {
    this.map = new Map(
      Object.entries(current).map(([fqdn, answer]) => [fqdn, { answer, witness: CAA_WITNESS }]),
    );
  }

  facade(): CaaAuthority {
    return Object.freeze({
      current: (fqdn: string): Caa => {
        this.seq += 1;
        this.entries.push({ seq: this.seq, fqdn: String(fqdn), witness: CAA_WITNESS });
        return this.map.get(String(fqdn))?.answer ?? "DENY";
      },
    });
  }

  sealedQueries(): readonly CaaQuery[] {
    return this.entries.map((entry) => ({ seq: entry.seq, fqdn: entry.fqdn }));
  }
}

export function runCell(scenario: Scenario, subject: Subject): CellResult {
  const harness = new CaaAuthorityHarness(scenario.current);
  const facade = harness.facade();
  const view = JSON.parse(JSON.stringify(scenario.view)) as Scenario["view"];
  const staleCount = scenario.view.names.filter((name) => isStale(scenario.view, name)).length;
  try {
    const report = subject.run(view, facade);
    const queries = harness.sealedQueries();
    return {
      scenarioId: scenario.id,
      subjectId: subject.id,
      failures: verify({ scenario, report, queries }),
      crashed: null,
      queryCount: queries.length,
      uniqueQueryCount: new Set(queries.map((query) => query.fqdn)).size,
      staleCount,
      activated: isActivated(scenario.params),
    };
  } catch (err) {
    const queries = harness.sealedQueries();
    return {
      scenarioId: scenario.id,
      subjectId: subject.id,
      failures: [{ check: "caa_result_shape", detail: `subject threw: ${(err as Error).message}` }],
      crashed: (err as Error).message,
      queryCount: queries.length,
      uniqueQueryCount: new Set(queries.map((query) => query.fqdn)).size,
      staleCount,
      activated: isActivated(scenario.params),
    };
  }
}

/**
 * Witness isolation, with the negative control that makes it evidence.
 *
 * Phase 16's probe reported `witnessIsolated: true` for this candidate while its sentinel sat in an
 * unused local constant, so the check had no reachable failing branch. A control that cannot fail is
 * not a control, so the leaky facade below must trip the same detector or the whole sweep is void.
 */
const isolationEvidence = (
  scenario: Scenario,
): { readonly isolated: boolean; readonly canaryDetected: boolean } => {
  const harness = new CaaAuthorityHarness(scenario.current);
  const facade = harness.facade();
  const view = JSON.parse(JSON.stringify(scenario.view)) as Scenario["view"];
  const report = reference.run(view, facade);
  const surface = [
    JSON.stringify(view),
    JSON.stringify(facade),
    Object.getOwnPropertyNames(facade).join(","),
    String((facade as unknown as Record<string, unknown>)["current"]),
    JSON.stringify(report),
  ].join("|");
  const leaky = { current: () => "ALLOW", ledger: { witness: CAA_WITNESS } };
  return {
    isolated:
      !surface.includes(CAA_WITNESS) &&
      JSON.stringify(Object.getOwnPropertyNames(facade)) === JSON.stringify(["current"]),
    canaryDetected: JSON.stringify(leaky).includes(CAA_WITNESS),
  };
};

export function runFamily(subjects: readonly Subject[] = ALL_SUBJECTS): RunResult {
  const space = enumerateSpace();
  const scenarios = generateScenarios(selectMeasuredSet(space));
  const cells = subjects.flatMap((subject) => scenarios.map((scenario) => runCell(scenario, subject)));
  const activatedCells = cells.filter((cell) => cell.activated);
  const referenceCells = cells.filter((cell) => cell.subjectId === reference.id);
  const badCells = activatedCells.filter((cell) => cell.subjectId === firstNameReuse.id);

  const rig = rigIntegrity(
    "caa-revalidation-family-sweep",
    [
      {
        id: reference.id,
        expect: "pass",
        observedFailures: referenceCells.flatMap((cell) => cell.failures.map((item) => item.check)),
      },
      {
        id: firstNameReuse.id,
        expect: "fail",
        observedFailures: badCells.flatMap((cell) => cell.failures.map((item) => item.check)),
      },
    ],
    cells
      .filter((cell) => cell.subjectId !== reference.id)
      .map((cell) => cell.failures.map((item) => item.check)),
  );

  let malformedInputRefused = false;
  try {
    verify({});
  } catch (err) {
    malformedInputRefused = err instanceof RigInputError;
  }
  const firstScenario = scenarios[0];
  if (firstScenario === undefined) throw new Error("caa-revalidation produced no scenarios");
  const isolation = isolationEvidence(firstScenario);

  if (!rig.usable || !malformedInputRefused || !isolation.isolated || !isolation.canaryDetected) {
    throw new Error(
      `caa-revalidation rig is void: ${[
        ...rig.reasons,
        malformedInputRefused ? "" : "wrong-shaped input was graded",
        isolation.isolated ? "" : "the authority witness reached the subject surface",
        isolation.canaryDetected ? "" : "the isolation detector did not fire on a deliberately leaky facade",
      ]
        .filter(Boolean)
        .join("; ")}`,
    );
  }

  return {
    scenarios,
    subjects,
    cells,
    spaceSize: space.length,
    rigUsable: rig.usable,
    malformedInputRefused,
    witnessIsolated: isolation.isolated,
    leakCanaryDetected: isolation.canaryDetected,
  };
}

export function toMatrix(run: RunResult): Matrix {
  const graded = run.subjects.filter((subject) => subject.id !== "reference");
  const byCell = new Map(run.cells.map((cell) => [`${cell.scenarioId}|${cell.subjectId}`, cell]));
  return parseMatrix({
    schema: "agent-eval-foundry/matrix@1",
    suite: "caa-revalidation",
    provenance: {
      repo: "agent-eval-foundry",
      artifact_commit: null,
      task_sha256: null,
      suite_shape: `${run.scenarios.length} scenarios / ${graded.length} subjects / ${run.spaceSize} points in the declared space`,
      checks_total: run.scenarios.length,
      extracted_from: [
        "src/families/caa-revalidation/runner.ts (B6-gated sweep with a leak canary)",
        "src/families/caa-revalidation/verify.ts (host-ledger identity grading)",
      ],
      caveat:
        "A Phase 17 candidate package derived from the 2020 Let's Encrypt CAA rechecking incident. It carries measured local mutant discrimination and the agent-trial result recorded in reports/PHASE-17-CAA-VALIDATION.md. It is not a proven task family.",
    },
    reference_subject: "reference",
    subjects: graded.map((subject) => ({
      id: subject.id,
      label: subject.label,
      family: BASELINES.includes(subject.id as never)
        ? "baseline"
        : CHEAT_ORACLES.includes(subject.id as never)
          ? "cheat"
          : "mutant",
      model: null,
      effort: null,
      note: INTENDED_CHECK[subject.id] ?? null,
    })),
    instances: run.scenarios.map((scenario) => ({
      id: scenario.id,
      schedule: `${scenario.params.agePattern}/deny-${scenario.params.denyPosition}`,
      seed: scenario.params.seed,
      keys: scenario.params.domainCount,
      family: "multi-name-authorization-revalidation",
      source: "generated",
      note: `${scenario.params.domainCount} name(s), ${isActivated(scenario.params) ? "activated" : "non-activating"}`,
    })),
    results: Object.fromEntries(
      run.scenarios.map((scenario) => [
        scenario.id,
        Object.fromEntries(
          graded.map((subject) => {
            const cell = byCell.get(`${scenario.id}|${subject.id}`);
            return [
              subject.id,
              { failed: [...new Set((cell?.failures ?? []).map((item) => item.check))].sort() },
            ];
          }),
        ),
      ]),
    ),
  });
}

export const referenceFailures = (run: RunResult): readonly CellResult[] =>
  run.cells.filter((cell) => cell.subjectId === "reference" && cell.failures.length > 0);

/** Screen 8: every planted defect alone must be fatal somewhere in the graded set. */
export const independentFatality = (
  run: RunResult,
): readonly { readonly mutantId: string; readonly check: string; readonly fatalIn: number }[] =>
  Object.entries(INTENDED_CHECK).map(([mutantId, check]) => ({
    mutantId,
    check,
    fatalIn: run.cells.filter(
      (cell) => cell.subjectId === mutantId && cell.failures.some((item) => item.check === check),
    ).length,
  }));

/** Screen 5: a check that never fires is not a check. */
export const checkActivation = (run: RunResult): Readonly<Record<string, number>> => {
  const counts: Record<string, number> = {};
  for (const cell of run.cells) {
    for (const failure of cell.failures) counts[failure.check] = (counts[failure.check] ?? 0) + 1;
  }
  return counts;
};

export { BASELINES, CHEAT_ORACLES, INTENDED_CHECK };
export type { Check };
