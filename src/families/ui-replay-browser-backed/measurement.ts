import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseMatrix } from "../../matrix.js";
import type { Matrix } from "../../types.js";
import { BROWSER_BACKED_FAMILY_ID } from "./harness.js";
import {
  BROWSER_BACKED_CHECKS,
  BROWSER_BACKED_INTENDED_CHECK,
  BROWSER_BACKED_SCENARIOS,
  BROWSER_BACKED_SUBJECTS,
  type BrowserBackedCheck,
  type BrowserBackedSubjectId,
} from "./scenarios.js";

export interface BrowserBackedCell {
  readonly scenarioId: string;
  readonly subjectId: BrowserBackedSubjectId;
  readonly failures: readonly BrowserBackedCheck[];
  readonly artifacts: {
    readonly pageSnapshotPath: string;
    readonly browserTracePath: string;
    readonly harnessCallLedgerPath: string;
    readonly effectLedgerPath: string;
    readonly verifierOutputPath: string;
  };
}

export interface BrowserBackedMeasurement {
  readonly schema: "agent-eval-foundry/browser-backed-measurement@1";
  readonly familyId: typeof BROWSER_BACKED_FAMILY_ID;
  readonly driver: "playwright";
  readonly browserEngine: "chromium";
  readonly browserExecutable: string;
  readonly scenariosMeasured: number;
  readonly subjectsMeasured: number;
  readonly cells: readonly BrowserBackedCell[];
}

export interface BrowserBackedMeasurementValidation {
  readonly valid: boolean;
  readonly failures: readonly string[];
  readonly scenariosMeasured: number;
  readonly subjectsMeasured: number;
  readonly mutantAxesReady: boolean;
}

export const browserBackedMeasurementPath = (root: string): string =>
  join(root, "examples", "families", BROWSER_BACKED_FAMILY_ID, "browser-measurement.json");

const isCheck = (value: string): value is BrowserBackedCheck =>
  BROWSER_BACKED_CHECKS.includes(value as BrowserBackedCheck);

export function parseBrowserBackedMeasurement(value: unknown): BrowserBackedMeasurement {
  const raw = value as BrowserBackedMeasurement;
  if (raw.schema !== "agent-eval-foundry/browser-backed-measurement@1") {
    throw new Error("browser-backed measurement schema mismatch");
  }
  if (raw.familyId !== BROWSER_BACKED_FAMILY_ID) throw new Error("browser-backed family id mismatch");
  if (raw.driver !== "playwright") throw new Error("browser-backed measurement must use Playwright");
  for (const cell of raw.cells) {
    if (!BROWSER_BACKED_SUBJECTS.includes(cell.subjectId)) {
      throw new Error(`unknown browser-backed subject ${cell.subjectId}`);
    }
    for (const failure of cell.failures) {
      if (!isCheck(failure)) throw new Error(`unknown browser-backed check ${failure}`);
    }
  }
  return raw;
}

export function readBrowserBackedMeasurement(root: string): BrowserBackedMeasurement | null {
  const path = browserBackedMeasurementPath(root);
  if (!existsSync(path)) return null;
  return parseBrowserBackedMeasurement(JSON.parse(readFileSync(path, "utf8")));
}

export function validateBrowserBackedMeasurement(
  measurement: BrowserBackedMeasurement | null,
): BrowserBackedMeasurementValidation {
  if (measurement === null) {
    return {
      valid: false,
      failures: ["no browser-backed measurement artifact exists"],
      scenariosMeasured: 0,
      subjectsMeasured: 0,
      mutantAxesReady: false,
    };
  }
  const failures: string[] = [];
  const expectedScenarios = new Set(BROWSER_BACKED_SCENARIOS.map((scenario) => scenario.scenarioId));
  const expectedSubjects = new Set(BROWSER_BACKED_SUBJECTS);
  const seenCells = new Set<string>();
  for (const cell of measurement.cells) {
    seenCells.add(`${cell.scenarioId}/${cell.subjectId}`);
    for (const [name, path] of Object.entries(cell.artifacts)) {
      if (path.trim().length === 0) failures.push(`${cell.scenarioId}/${cell.subjectId} missing ${name}`);
    }
  }
  for (const scenario of expectedScenarios) {
    for (const subject of expectedSubjects) {
      if (!seenCells.has(`${scenario}/${subject}`)) failures.push(`missing cell ${scenario}/${subject}`);
    }
  }
  for (const scenario of expectedScenarios) {
    const ref = measurement.cells.find(
      (cell) => cell.scenarioId === scenario && cell.subjectId === "reference",
    );
    if (ref === undefined || ref.failures.length > 0) failures.push(`reference failed ${scenario}`);
  }
  for (const [subject, intended] of Object.entries(BROWSER_BACKED_INTENDED_CHECK)) {
    const caught = measurement.cells.some(
      (cell) => cell.subjectId === subject && cell.failures.includes(intended),
    );
    if (!caught) failures.push(`${subject} did not trip intended check ${intended}`);
  }
  return {
    valid: failures.length === 0,
    failures,
    scenariosMeasured: measurement.scenariosMeasured,
    subjectsMeasured: measurement.subjectsMeasured,
    mutantAxesReady: failures.length === 0,
  };
}

export function browserBackedMeasurementMatrix(measurement: BrowserBackedMeasurement): Matrix {
  const subjects = BROWSER_BACKED_SUBJECTS.filter((subject) => subject !== "reference");
  const results: Record<string, Record<string, { failed: string[] }>> = {};
  for (const scenario of BROWSER_BACKED_SCENARIOS) {
    const row: Record<string, { failed: string[] }> = {};
    for (const subject of subjects) {
      const cell = measurement.cells.find(
        (candidate) => candidate.scenarioId === scenario.scenarioId && candidate.subjectId === subject,
      );
      row[subject] = { failed: [...(cell?.failures ?? [])].sort() };
    }
    results[scenario.scenarioId] = row;
  }
  return parseMatrix({
    schema: "agent-eval-foundry/matrix@1",
    suite: BROWSER_BACKED_FAMILY_ID,
    provenance: {
      repo: "agent-eval-foundry",
      artifact_commit: null,
      task_sha256: null,
      suite_shape: `${BROWSER_BACKED_SCENARIOS.length} browser scenarios / ${subjects.length} known-bad browser strategies`,
      checks_total: BROWSER_BACKED_SCENARIOS.length,
      checks_declared: null,
      extracted_from: [
        "src/families/ui-replay-browser-backed/runner.ts (Playwright browser sweep)",
        "examples/families/ui-replay-browser-backed/browser-measurement.json (preserved browser artifact)",
      ],
      caveat:
        "This is browser-backed mutant-detection evidence from a small Playwright spike. It is not " +
        "real-agent difficulty evidence and it does not upgrade ui-replay-live-dom trials from dom-like.",
    },
    reference_subject: "reference",
    subjects: subjects.map((subject) => ({
      id: subject,
      label: subject,
      family: "mutant",
      model: null,
      effort: null,
      note: BROWSER_BACKED_INTENDED_CHECK[subject],
    })),
    instances: BROWSER_BACKED_SCENARIOS.map((scenario) => ({
      id: scenario.scenarioId,
      schedule: scenario.cases.join("+"),
      seed: 1,
      keys: scenario.trace.steps.length,
      family: "browser-backed-ui-replay",
      source: "generated-playwright",
      note: scenario.cases.join(", "),
    })),
    results,
  });
}
