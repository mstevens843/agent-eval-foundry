import { assertKnobCoverage } from "../../foundry/sample.js";
import { type Scenario, type ScenarioParams, buildScenario } from "./truth.js";

export const SPACE = {
  seed: [11, 23, 41],
  nWorkers: [1, 2, 3, 4],
  keys: [4, 6, 12],
  crashPosition: ["none", "after_tool"],
} as const;

export const enumerateSpace = (): readonly ScenarioParams[] => {
  const out: ScenarioParams[] = [];
  for (const seed of SPACE.seed) {
    for (const nWorkers of SPACE.nWorkers) {
      for (const keys of SPACE.keys) {
        for (const crashPosition of SPACE.crashPosition) {
          out.push({ seed, nWorkers, keys, crashPosition });
        }
      }
    }
  }
  return out;
};

/**
 * The registered 18 activated schedules plus six explicit non-activation controls. The controls
 * keep every declared value represented without diluting the fatality claim, which is always
 * reported over the named activated stratum rather than over the whole matrix.
 */
export const selectMeasuredSet = (space: readonly ScenarioParams[]): readonly ScenarioParams[] => {
  const activated = space.filter(
    (params) => params.crashPosition === "after_tool" && params.nWorkers > 1 && params.seed !== SPACE.seed[2],
  );
  const controls = space.filter(
    (params) =>
      params.seed === 41 &&
      ((params.nWorkers === 1 && params.crashPosition === "after_tool") ||
        (params.crashPosition === "none" &&
          params.keys === (params.nWorkers === 4 ? 12 : params.nWorkers * 2))),
  );
  const selected = [...activated, ...controls];
  assertKnobCoverage(
    selected,
    SPACE,
    (params, knob) => (params as unknown as Record<string, unknown>)[knob],
    "dao-descendant.space",
  );
  return selected;
};

export const generateScenarios = (params: readonly ScenarioParams[]): readonly Scenario[] =>
  params.map(buildScenario);
