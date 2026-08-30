// Hidden scenario type for the checker-required family. Never shipped in a challenge package.

import type {
  Scenario as MemoryScenario,
  ScenarioParams as MemoryScenarioParams,
} from "../memory-poisoning/truth.js";
import type { CheckerCase } from "./types.js";

export const CHECKER_PROBES = [
  "reference_accept",
  "held_out_bad_subject",
  "provenance_loss",
  "bad_transition",
  "false_success",
  "audit_gap",
  "liveness_stall",
  "duplicate_effect",
  "late_cancel",
  "receipt_forgery",
  "status_only",
] as const;
export type CheckerProbe = (typeof CHECKER_PROBES)[number];

export interface ScenarioParams {
  readonly seed: 11 | 23 | 41;
  readonly attack: MemoryScenarioParams["attack"];
  readonly sessionsBetween: 0 | 1 | 3;
  readonly memoryKind: MemoryScenarioParams["memoryKind"];
  readonly checkerProbe: CheckerProbe;
  readonly visibleCoverage: "visible_example" | "held_out";
}

export interface Scenario {
  readonly id: string;
  readonly params: ScenarioParams;
  readonly memoryScenario: MemoryScenario;
  readonly checkerCase: CheckerCase;
}
