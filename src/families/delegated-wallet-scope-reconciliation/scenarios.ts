import { assertKnobCoverage, sampleSpace } from "../../foundry/sample.js";
import {
  AUTHORITY_TRANSITIONS,
  CACHE_FRESHNESS,
  POLICY_SOURCE_STATES,
  PRIOR_SPEND_STATES,
  type Scenario,
  type ScenarioParams,
  TOKEN_STATES,
  buildScenarioFromParts,
} from "./truth.js";
import { REQUEST_SURFACES } from "./types.js";

export const SPACE = {
  seed: [11, 23, 41, 67],
  initialApprovedLimit: [50, 100, 250],
  requestedAmount: [25, 60, 140, 260],
  authorityTransition: AUTHORITY_TRANSITIONS,
  tokenState: TOKEN_STATES,
  cacheFreshness: CACHE_FRESHNESS,
  priorSpend: PRIOR_SPEND_STATES,
  policySource: POLICY_SOURCE_STATES,
  requestSurface: REQUEST_SURFACES,
  repeatCount: [1, 2],
} as const;

const keyOf = (p: ScenarioParams): string =>
  [
    p.seed,
    p.initialApprovedLimit,
    p.requestedAmount,
    p.authorityTransition,
    p.tokenState,
    p.cacheFreshness,
    p.priorSpend,
    p.policySource,
    p.requestSurface,
    p.repeatCount,
  ].join("|");

export function enumerateSpace(): readonly ScenarioParams[] {
  const out: ScenarioParams[] = [];
  for (const seed of SPACE.seed) {
    for (const initialApprovedLimit of SPACE.initialApprovedLimit) {
      for (const requestedAmount of SPACE.requestedAmount) {
        for (const authorityTransition of SPACE.authorityTransition) {
          for (const tokenState of SPACE.tokenState) {
            for (const cacheFreshness of SPACE.cacheFreshness) {
              for (const priorSpend of SPACE.priorSpend) {
                for (const policySource of SPACE.policySource) {
                  for (const requestSurface of SPACE.requestSurface) {
                    for (const repeatCount of SPACE.repeatCount) {
                      out.push({
                        seed,
                        initialApprovedLimit,
                        requestedAmount,
                        authorityTransition,
                        tokenState,
                        cacheFreshness,
                        priorSpend,
                        policySource,
                        requestSurface,
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
  return out;
}

export function selectMeasuredSet(space: readonly ScenarioParams[]): readonly ScenarioParams[] {
  const byKey = new Map<string, ScenarioParams>();
  const add = (params: readonly ScenarioParams[]): void => {
    for (const p of params) byKey.set(keyOf(p), p);
  };
  const scenarioRows = space.map((params) => ({ params, scenario: buildScenarioFromParts(params) }));

  add(
    sampleSpace(space, {
      keyOf,
      groupOf: (p) => `${p.authorityTransition}/${p.tokenState}`,
      fraction: 1 / 216,
    }),
  );

  // The base slice covers every trap stratum. Add a deterministic liveness/idempotency slice too,
  // so "refuse everything" and duplicate-retry bugs are measured on more than a token handful.
  add(
    sampleSpace(
      scenarioRows.filter((row) => row.scenario.expected.allowed).map((row) => row.params),
      {
        keyOf,
        groupOf: (p) => `${p.requestSurface}/${p.repeatCount}/${p.priorSpend}`,
        fraction: 1 / 12,
      },
    ),
  );
  add(
    sampleSpace(
      scenarioRows
        .filter((row) => row.scenario.expected.allowed && row.params.repeatCount === 2)
        .map((row) => row.params),
      {
        keyOf,
        groupOf: (p) => `${p.requestSurface}/${p.requestedAmount}`,
        fraction: 1 / 4,
      },
    ),
  );
  add(
    sampleSpace(
      scenarioRows
        .filter(
          (row) =>
            row.params.authorityTransition === "downgraded" &&
            row.scenario.expected.reason === "DWS5_REQUEST_WITHIN_CURRENT_LIMIT",
        )
        .map((row) => row.params),
      {
        keyOf,
        groupOf: (p) => `${p.initialApprovedLimit}/${p.requestedAmount}/${p.cacheFreshness}`,
        fraction: 1 / 18,
      },
    ),
  );

  const selected = [...byKey.values()].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
  assertKnobCoverage(
    selected,
    SPACE,
    (p, knob) => (p as unknown as Record<string, unknown>)[knob],
    "delegated-wallet-scope-reconciliation.space",
  );
  return selected;
}

export function buildScenario(params: ScenarioParams): Scenario {
  return buildScenarioFromParts(params);
}

export function generateScenarios(params: readonly ScenarioParams[]): readonly Scenario[] {
  return params.map(buildScenario);
}
