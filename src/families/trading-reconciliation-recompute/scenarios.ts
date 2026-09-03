import { assertKnobCoverage } from "../../foundry/sample.js";
import { type Scenario, type ScenarioParams, buildScenario } from "./truth.js";

export const SPACE = {
  seed: [11, 23, 41],
  nReconcilers: [1, 2, 3, 4],
  orders: [4, 6, 12],
  crashPosition: ["none", "after_venue_accept"],
} as const;

export const enumerateSpace = (): readonly ScenarioParams[] => {
  const out: ScenarioParams[] = [];
  for (const seed of SPACE.seed) {
    for (const nReconcilers of SPACE.nReconcilers) {
      for (const orders of SPACE.orders) {
        for (const crashPosition of SPACE.crashPosition) {
          out.push({ seed, nReconcilers, orders, crashPosition });
        }
      }
    }
  }
  return out;
};

export const designCell = (params: ScenarioParams): "U0C0" | "U1C0" | "U0C1" | "U1C1" => {
  const uncertain = params.crashPosition === "after_venue_accept";
  const changed = params.nReconcilers > 1;
  return `${uncertain ? "U1" : "U0"}${changed ? "C1" : "C0"}`;
};

export const selectProbeSet = (space: readonly ScenarioParams[]): readonly ScenarioParams[] =>
  (["U0C0", "U1C0", "U0C1", "U1C1"] as const).map((cell) => {
    const found = space.find(
      (params) => params.seed === 11 && params.orders === 4 && designCell(params) === cell,
    );
    if (found === undefined) throw new Error(`trading probe has no ${cell} cell`);
    return found;
  });

export const selectMeasuredSet = (space: readonly ScenarioParams[]): readonly ScenarioParams[] => {
  const activated = space.filter(
    (params) =>
      params.crashPosition === "after_venue_accept" &&
      params.nReconcilers > 1 &&
      params.seed !== SPACE.seed[2],
  );
  const controls = space.filter(
    (params) =>
      params.seed === 41 &&
      ((params.nReconcilers === 1 && params.crashPosition === "after_venue_accept") ||
        (params.crashPosition === "none" &&
          params.orders === (params.nReconcilers === 4 ? 12 : params.nReconcilers * 2))),
  );
  const selected = [...activated, ...controls];
  assertKnobCoverage(
    selected,
    SPACE,
    (params, knob) => (params as unknown as Record<string, unknown>)[knob],
    "trading-reconciliation-recompute.space",
  );
  return selected;
};

export const generateScenarios = (params: readonly ScenarioParams[]): readonly Scenario[] =>
  params.map(buildScenario);
