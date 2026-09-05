import { assertKnobCoverage } from "../../foundry/sample.js";
import {
  type AgePattern,
  type DenyPosition,
  type Scenario,
  type ScenarioParams,
  activatesIdentityCollapse,
  buildScenario,
} from "./truth.js";

export const SPACE = {
  seed: [7, 19, 31],
  domainCount: [1, 2, 3, 5],
  agePattern: ["all-stale", "mixed", "boundary-eight", "boundary-nine"],
  denyPosition: ["none", "first", "middle", "last"],
} as const;

const KNOBS = ["seed", "domainCount", "agePattern", "denyPosition"] as const;

export const enumerateSpace = (): readonly ScenarioParams[] => {
  const out: ScenarioParams[] = [];
  for (const seed of SPACE.seed) {
    for (const domainCount of SPACE.domainCount) {
      for (const agePattern of SPACE.agePattern) {
        for (const denyPosition of SPACE.denyPosition) {
          out.push({
            seed,
            domainCount,
            agePattern: agePattern as AgePattern,
            denyPosition: denyPosition as DenyPosition,
          });
        }
      }
    }
  }
  return out;
};

const key = (params: ScenarioParams): string =>
  `${params.seed}|${params.domainCount}|${params.agePattern}|${params.denyPosition}`;

/** FNV-1a. Used only to order candidates so the denied name is not predictably first. */
const rank = (text: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
};

const ordered = (rows: readonly ScenarioParams[]): readonly ScenarioParams[] =>
  [...rows].sort((left, right) => rank(key(left)) - rank(key(right)) || key(left).localeCompare(key(right)));

/** The declared value, at its declared type. `assertKnobCoverage` compares these by JSON identity. */
const knobValue = (params: ScenarioParams, knob: string): unknown =>
  (params as unknown as Record<string, unknown>)[knob];

/** The same value as a set key, for the coverage-first picker below. */
const knobKey = (params: ScenarioParams, knob: string): string => JSON.stringify(knobValue(params, knob));

export const isActivated = (params: ScenarioParams): boolean =>
  activatesIdentityCollapse(buildScenario(params));

/**
 * Coverage first, then hash order.
 *
 * A hash-sorted slice alone can silently drop a declared knob value, and `assertKnobCoverage` would
 * then throw at the end rather than the selection quietly under-covering. Taking coverage first
 * makes the guarantee structural instead of lucky.
 */
const pick = (
  pool: readonly ScenarioParams[],
  quota: number,
  already: readonly ScenarioParams[],
): readonly ScenarioParams[] => {
  const covered = new Map<string, Set<string>>(KNOBS.map((knob) => [knob, new Set<string>()]));
  for (const params of already) {
    for (const knob of KNOBS) covered.get(knob)?.add(knobKey(params, knob));
  }
  const rows = ordered(pool);
  const chosen: ScenarioParams[] = [];
  for (const params of rows) {
    if (chosen.length >= quota) break;
    if (KNOBS.some((knob) => !covered.get(knob)?.has(knobKey(params, knob)))) {
      chosen.push(params);
      for (const knob of KNOBS) covered.get(knob)?.add(knobKey(params, knob));
    }
  }
  for (const params of rows) {
    if (chosen.length >= quota) break;
    if (!chosen.some((row) => key(row) === key(params))) chosen.push(params);
  }
  return chosen;
};

export const ACTIVATED_QUOTA = 18;
export const CONTROL_QUOTA = 6;

/**
 * The graded set: 18 scenarios on which the identity-collapse mechanism can fire, plus 6 explicit
 * non-activation controls. Fatality is always reported over the named activated stratum, never over
 * the whole matrix, and the controls keep every declared knob value represented without diluting it.
 */
export const selectMeasuredSet = (space: readonly ScenarioParams[]): readonly ScenarioParams[] => {
  const activated = pick(space.filter(isActivated), ACTIVATED_QUOTA, []);
  const controls = pick(
    space.filter((params) => !isActivated(params)),
    CONTROL_QUOTA,
    activated,
  );
  const selected = [...activated, ...controls];
  assertKnobCoverage(selected, SPACE, knobValue, "caa-revalidation.space");
  return selected;
};

/** The four-cell probe set: activation crossed with a denied rechecked name. */
export const selectProbeSet = (space: readonly ScenarioParams[]): readonly ScenarioParams[] =>
  (
    [
      [false, "none"],
      [false, "first"],
      [true, "none"],
      [true, "last"],
    ] as const
  ).map(([activated, denyPosition]) => {
    const found = space.find(
      (params) =>
        params.seed === 7 &&
        params.denyPosition === denyPosition &&
        isActivated(params) === activated &&
        (activated ? params.domainCount >= 2 : true),
    );
    if (found === undefined) {
      throw new Error(
        `caa-revalidation probe has no ${activated ? "activated" : "control"}/${denyPosition} cell`,
      );
    }
    return found;
  });

export const generateScenarios = (params: readonly ScenarioParams[]): readonly Scenario[] =>
  params.map(buildScenario);
