import { assertKnobCoverage, sampleSpace } from "../../foundry/sample.js";
import {
  APPROVAL_DRIFTS,
  CACHE_FRESHNESS,
  type Scenario,
  type ScenarioParams,
  TOKEN_DRIFTS,
  buildScenarioFromParts,
} from "./truth.js";
import { REQUEST_SURFACES } from "./types.js";

export const SPACE = {
  seed: [11, 23, 41, 67],
  approvalDrift: APPROVAL_DRIFTS,
  tokenDrift: TOKEN_DRIFTS,
  cacheFreshness: CACHE_FRESHNESS,
  requestSurface: REQUEST_SURFACES,
  repeatCount: [1, 2],
} as const;

export function enumerateSpace(): readonly ScenarioParams[] {
  const out: ScenarioParams[] = [];
  for (const seed of SPACE.seed) {
    for (const approvalDrift of SPACE.approvalDrift) {
      for (const tokenDrift of SPACE.tokenDrift) {
        for (const cacheFreshness of SPACE.cacheFreshness) {
          for (const requestSurface of SPACE.requestSurface) {
            for (const repeatCount of SPACE.repeatCount) {
              out.push({ seed, approvalDrift, tokenDrift, cacheFreshness, requestSurface, repeatCount });
            }
          }
        }
      }
    }
  }
  return out;
}

export function selectMeasuredSet(space: readonly ScenarioParams[]): readonly ScenarioParams[] {
  const selected = sampleSpace(space, {
    keyOf: (p) =>
      `${p.approvalDrift}|${p.tokenDrift}|${p.cacheFreshness}|${p.requestSurface}|${p.repeatCount}|${p.seed}`,
    groupOf: (p) => `${p.approvalDrift}/${p.tokenDrift}`,
    fraction: 1 / 3,
  });
  assertKnobCoverage(
    selected,
    SPACE,
    (p, knob) => (p as unknown as Record<string, unknown>)[knob],
    "access-token-scope-expansion.space",
  );
  return selected;
}

export function buildScenario(params: ScenarioParams): Scenario {
  return buildScenarioFromParts(params);
}

export function generateScenarios(params: readonly ScenarioParams[]): readonly Scenario[] {
  return params.map(buildScenario);
}
