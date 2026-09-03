import { assertKnobCoverage } from "../../foundry/sample.js";
import { type Scenario, type ScenarioParams, buildScenario } from "./truth.js";

export const SPACE = {
  seed: [11, 23, 41],
  nControllers: [1, 2, 3, 4],
  effects: [4, 6, 12],
  crashPosition: ["none", "after_compensation"],
} as const;

export const enumerateSpace = (): readonly ScenarioParams[] => {
  const out: ScenarioParams[] = [];
  for (const seed of SPACE.seed) {
    for (const nControllers of SPACE.nControllers) {
      for (const effects of SPACE.effects) {
        for (const crashPosition of SPACE.crashPosition) {
          out.push({ seed, nControllers, effects, crashPosition });
        }
      }
    }
  }
  return out;
};

export const designCell = (params: ScenarioParams): "U0C0" | "U1C0" | "U0C1" | "U1C1" => {
  const uncertain = params.crashPosition === "after_compensation";
  const changed = params.nControllers > 1;
  return `${uncertain ? "U1" : "U0"}${changed ? "C1" : "C0"}`;
};

export const selectProbeSet = (space: readonly ScenarioParams[]): readonly ScenarioParams[] =>
  (["U0C0", "U1C0", "U0C1", "U1C1"] as const).map((cell) => {
    const found = space.find(
      (params) => params.seed === 11 && params.effects === 4 && designCell(params) === cell,
    );
    if (found === undefined) throw new Error(`deployment rollback probe has no ${cell} cell`);
    return found;
  });

export const selectMeasuredSet = (space: readonly ScenarioParams[]): readonly ScenarioParams[] => {
  const activated = space.filter(
    (params) =>
      params.crashPosition === "after_compensation" &&
      params.nControllers > 1 &&
      params.seed !== SPACE.seed[2],
  );
  const controls = space.filter(
    (params) =>
      params.seed === 41 &&
      ((params.nControllers === 1 && params.crashPosition === "after_compensation") ||
        (params.crashPosition === "none" &&
          params.effects === (params.nControllers === 4 ? 12 : params.nControllers * 2))),
  );
  const selected = [...activated, ...controls];
  assertKnobCoverage(
    selected,
    SPACE,
    (params, knob) => (params as unknown as Record<string, unknown>)[knob],
    "deployment-rollback-recompute.space",
  );
  return selected;
};

export const generateScenarios = (params: readonly ScenarioParams[]): readonly Scenario[] =>
  params.map(buildScenario);
