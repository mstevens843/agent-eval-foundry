import { assertKnobCoverage, hash32 } from "../../foundry/sample.js";
import {
  CACHE_STATES,
  REEVALUATION_STATES,
  REGRESSION_SEVERITIES,
  type Scenario,
  type ScenarioParams,
  buildScenarioFromParts,
} from "./truth.js";
import { CANARY_WINDOWS, DEPLOYMENT_SURFACES, MODEL_ALIASES, ROLLOUT_PHASES } from "./types.js";

export const SPACE = {
  seed: [11, 23],
  alias: MODEL_ALIASES,
  currentVersionState: ["same", "successor"],
  rolloutPhase: ROLLOUT_PHASES,
  cacheState: CACHE_STATES,
  canaryWindow: CANARY_WINDOWS,
  regressionSeverity: REGRESSION_SEVERITIES,
  evalMix: ["all_current", "mixed_versions", "misattributed", "insufficient"],
  rollbackTiming: ["none", "after_bad_eval"],
  baselineState: ["correct_previous", "wrong_current"],
  providerDisagreement: ["none", "provider_says_green", "provider_says_red"],
  reevaluation: REEVALUATION_STATES,
  surface: DEPLOYMENT_SURFACES,
  repeatCount: [1, 2],
} as const;

const keyOf = (p: ScenarioParams): string =>
  [
    p.seed,
    p.alias,
    p.currentVersionState,
    p.rolloutPhase,
    p.cacheState,
    p.canaryWindow,
    p.regressionSeverity,
    p.evalMix,
    p.rollbackTiming,
    p.baselineState,
    p.providerDisagreement,
    p.reevaluation,
    p.surface,
    p.repeatCount,
  ].join("|");

export function enumerateSpace(): readonly ScenarioParams[] {
  const out: ScenarioParams[] = [];
  for (const seed of SPACE.seed) {
    for (const alias of SPACE.alias) {
      for (const currentVersionState of SPACE.currentVersionState) {
        for (const rolloutPhase of SPACE.rolloutPhase) {
          for (const cacheState of SPACE.cacheState) {
            for (const canaryWindow of SPACE.canaryWindow) {
              for (const regressionSeverity of SPACE.regressionSeverity) {
                for (const evalMix of SPACE.evalMix) {
                  for (const rollbackTiming of SPACE.rollbackTiming) {
                    for (const baselineState of SPACE.baselineState) {
                      for (const providerDisagreement of SPACE.providerDisagreement) {
                        for (const reevaluation of SPACE.reevaluation) {
                          for (const surface of SPACE.surface) {
                            for (const repeatCount of SPACE.repeatCount) {
                              out.push({
                                seed,
                                alias,
                                currentVersionState,
                                rolloutPhase,
                                cacheState,
                                canaryWindow,
                                regressionSeverity,
                                evalMix,
                                rollbackTiming,
                                baselineState,
                                providerDisagreement,
                                reevaluation,
                                surface,
                                repeatCount,
                              });
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return out;
}

export function selectMeasuredSet(space: readonly ScenarioParams[]): readonly ScenarioParams[] {
  const byKey = new Map<string, ScenarioParams>();
  const add = (params: readonly ScenarioParams[]): void => {
    for (const p of params) byKey.set(keyOf(p), p);
  };
  const expectedKind = (p: ScenarioParams): "continue" | "rollback" | "withhold" => {
    if (p.canaryWindow === "closed" || p.rolloutPhase === "pre_canary") return "withhold";
    if (p.evalMix === "insufficient" || p.regressionSeverity === "unknown") return "withhold";
    if (p.regressionSeverity === "major") return "rollback";
    return "continue";
  };
  interface RankedParam {
    readonly params: ScenarioParams;
    readonly key: string;
    readonly hash: number;
  }

  const ranked = (params: ScenarioParams): RankedParam => {
    const key = keyOf(params);
    return { params, key, hash: hash32(key) };
  };
  const compareRank = (a: RankedParam, b: RankedParam): number =>
    a.hash === b.hash ? a.key.localeCompare(b.key) : a.hash - b.hash;
  const worstIndex = (items: readonly RankedParam[]): number => {
    let worst = 0;
    for (let i = 1; i < items.length; i += 1) {
      if (compareRank(items[worst] as RankedParam, items[i] as RankedParam) < 0) worst = i;
    }
    return worst;
  };
  const takeWhere = (
    candidates: readonly ScenarioParams[],
    count: number,
    predicate: (params: ScenarioParams) => boolean,
  ): readonly ScenarioParams[] => {
    const selected: RankedParam[] = [];
    for (const params of candidates) {
      if (!predicate(params)) continue;
      const candidate = ranked(params);
      if (selected.length < count) {
        selected.push(candidate);
        continue;
      }
      const worst = worstIndex(selected);
      if (compareRank(candidate, selected[worst] as RankedParam) < 0) selected[worst] = candidate;
    }
    return selected.sort(compareRank).map((item) => item.params);
  };
  const take = (params: readonly ScenarioParams[], count: number): readonly ScenarioParams[] =>
    takeWhere(params, count, () => true);

  add(take(space, 96));
  add(takeWhere(space, 96, (params) => expectedKind(params) === "rollback"));
  add(takeWhere(space, 96, (params) => expectedKind(params) === "continue"));
  add(takeWhere(space, 96, (params) => expectedKind(params) === "withhold"));
  add(
    takeWhere(space, 80, (params) => params.cacheState !== "fresh" && params.currentVersionState !== "same"),
  );
  add(
    takeWhere(
      space,
      96,
      (params) =>
        params.evalMix === "misattributed" ||
        params.providerDisagreement !== "none" ||
        params.repeatCount === 2,
    ),
  );
  const firstByKnobValue = new Map<string, ScenarioParams>();
  const knobNames = Object.keys(SPACE);
  for (const params of space) {
    for (const knob of knobNames) {
      const key = `${knob}:${JSON.stringify((params as unknown as Record<string, unknown>)[knob])}`;
      if (!firstByKnobValue.has(key)) firstByKnobValue.set(key, params);
    }
  }
  for (const [knob, values] of Object.entries(SPACE)) {
    for (const value of values) {
      const found = firstByKnobValue.get(`${knob}:${JSON.stringify(value)}`);
      if (found !== undefined) byKey.set(keyOf(found), found);
    }
  }

  const selected = [...byKey.values()].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
  assertKnobCoverage(
    selected,
    SPACE,
    (p, knob) => (p as unknown as Record<string, unknown>)[knob],
    "deployment-model-alias-rollout-drift.space",
  );
  return selected;
}

export function buildScenario(params: ScenarioParams): Scenario {
  return buildScenarioFromParts(params);
}

export function generateScenarios(params: readonly ScenarioParams[]): readonly Scenario[] {
  return params.map(buildScenario);
}
