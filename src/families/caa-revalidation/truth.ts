import type { Caa, OrderName, OrderReport, OrderView } from "./types.js";

export const RECHECK_WINDOW_HOURS = 8;

export const AGE_PATTERNS = {
  "all-stale": [24, 719, 9, 24, 719],
  mixed: [0, 24, 8, 719, 9],
  "boundary-eight": [8, 9, 8, 24, 9],
  "boundary-nine": [9, 0, 9, 8, 24],
} as const;

export type AgePattern = keyof typeof AGE_PATTERNS;
export type DenyPosition = "none" | "first" | "middle" | "last";

export interface ScenarioParams {
  readonly seed: number;
  readonly domainCount: 1 | 2 | 3 | 5;
  readonly agePattern: AgePattern;
  readonly denyPosition: DenyPosition;
}

export interface Scenario {
  readonly id: string;
  readonly params: ScenarioParams;
  readonly view: OrderView;
  /**
   * Host-owned. Absent from the challenge package, absent from the view, and absent from every
   * artifact a subject can read.
   */
  readonly current: Readonly<Record<string, Caa>>;
  /** Which rechecked name the harness denied, or null. Host-owned. */
  readonly deniedFqdn: string | null;
}

export interface CaaQuery {
  readonly seq: number;
  readonly fqdn: string;
}

export interface VerificationInput {
  readonly scenario: Scenario;
  readonly report: OrderReport;
  readonly queries: readonly CaaQuery[];
}

export const ageOf = (view: OrderView, name: OrderName): number => view.nowHour - name.validatedAtHour;

export const isStale = (view: OrderView, name: OrderName): boolean =>
  ageOf(view, name) > RECHECK_WINDOW_HOURS;

/** The answer the specification makes applicable to a name: current when stale, its own cache when not. */
export const applicableAnswer = (scenario: Scenario, name: OrderName): Caa =>
  isStale(scenario.view, name) ? (scenario.current[name.fqdn] ?? "DENY") : name.cachedCaa;

/**
 * The denied position, resolved against the names that are ACTUALLY rechecked.
 *
 * The collapse rule is stated in SPEC.md rather than left implicit, because a one-name order crossed
 * with `middle` names no instance and an undefined dimension combination is a specification defect
 * the readers flagged before any of it was built.
 */
export const deniedIndexFor = (staleIndices: readonly number[], position: DenyPosition): number | null => {
  if (position === "none" || staleIndices.length === 0) return null;
  if (position === "first") return staleIndices[0] ?? null;
  if (position === "last") return staleIndices[staleIndices.length - 1] ?? null;
  return staleIndices[Math.floor((staleIndices.length - 1) / 2)] ?? null;
};

export const buildScenario = (params: ScenarioParams): Scenario => {
  const nowHour = 1000 + params.seed;
  const ages = AGE_PATTERNS[params.agePattern].slice(0, params.domainCount);
  const names: OrderName[] = ages.map((age, index) => ({
    fqdn: `n${index + 1}-s${params.seed}.example`,
    validatedAtHour: nowHour - age,
    cachedCaa: "ALLOW",
  }));
  const view: OrderView = { orderId: `order-${params.seed}-${params.domainCount}`, nowHour, names };
  const staleIndices = names
    .map((_, index) => index)
    .filter((index) => {
      const name = names[index];
      return name !== undefined && isStale(view, name);
    });
  const deniedIndex = deniedIndexFor(staleIndices, params.denyPosition);
  const deniedFqdn = deniedIndex === null ? null : (names[deniedIndex]?.fqdn ?? null);

  // A fresh name's current answer disagrees with its cache. The specification says a fresh name uses
  // its own cache, so this makes the recheck-window boundary observable in the grade instead of
  // leaving an off-by-one silently equivalent to the correct implementation.
  const current: Record<string, Caa> = {};
  for (const [index, name] of names.entries()) {
    current[name.fqdn] = name.fqdn === deniedFqdn ? "DENY" : staleIndices.includes(index) ? "ALLOW" : "DENY";
  }

  return {
    id: `caa-s${params.seed}-d${params.domainCount}-${params.agePattern}-${params.denyPosition}`,
    params,
    view,
    current,
    deniedFqdn,
  };
};

/** Whether the incident's identity-collapse mechanism can even fire on this scenario. */
export const activatesIdentityCollapse = (scenario: Scenario): boolean =>
  scenario.view.names.filter((name) => isStale(scenario.view, name)).length >= 2;
