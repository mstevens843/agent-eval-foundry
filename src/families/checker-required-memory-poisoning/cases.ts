import { buildScenario } from "./scenarios.js";
import type { Scenario } from "./truth.js";
import type { CheckerCase, CheckerCaseParams } from "./types.js";

export const CASE_LIMITS = { generated: 16, invocations: 64, maximumSeed: 2147483647 } as const;
export class CaseApiError extends Error {
  constructor(
    readonly code: "CASE_UNKNOWN" | "CASE_PARAMS" | "CASE_LIMIT",
    detail: string,
  ) {
    super(`${code}: ${detail}`);
  }
}
const domains = {
  attack: ["none", "memory_authority", "laundered_scope", "secret_recall"],
  sessionsBetween: [0, 1, 3],
  memoryKind: ["summary", "fact_store", "vector_note"],
  visibleCoverage: ["visible_example", "held_out"],
} as const;

/** Same constructor and canonical identity for public generated cases and private fixed cases. */
export function generateCheckerCase(params: CheckerCaseParams): Scenario {
  if (
    !params ||
    !Number.isSafeInteger(params.seed) ||
    params.seed < 0 ||
    params.seed > CASE_LIMITS.maximumSeed ||
    Object.keys(params).sort().join(",") !== "attack,memoryKind,seed,sessionsBetween,visibleCoverage" ||
    Object.entries(domains).some(
      ([key, values]) => !(values as readonly unknown[]).includes(params[key as keyof CheckerCaseParams]),
    )
  ) {
    throw new CaseApiError("CASE_PARAMS", "parameters outside the published domain");
  }
  const scenario = buildScenario({ ...params, checkerProbe: "reference_accept" });
  // Supplied diagnostic cases and generated candidate executions are different public API objects.
  // Even makeCase({}) must run the submitted implementation, not alias a supplied diagnostic trace.
  return {
    ...scenario,
    checkerCase: { ...scenario.checkerCase, id: `generated-${scenario.checkerCase.id}` },
  };
}

export class CaseRegistry {
  private readonly cases = new Map<string, Scenario>();
  private generated = 0;
  private calls = 0;
  constructor(private readonly initial: Scenario) {
    this.cases.set(initial.checkerCase.id, initial);
  }
  make(params: Partial<CheckerCaseParams>): CheckerCase {
    if (!params || typeof params !== "object" || Array.isArray(params))
      throw new CaseApiError("CASE_PARAMS", "expected parameter object");
    const scenario = generateCheckerCase({ ...this.initial.checkerCase.params, ...params });
    if (!this.cases.has(scenario.checkerCase.id)) {
      if (this.generated >= CASE_LIMITS.generated)
        throw new CaseApiError("CASE_LIMIT", "generated case budget exceeded");
      this.generated++;
      this.cases.set(scenario.checkerCase.id, scenario);
    }
    return structuredClone(scenario.checkerCase);
  }
  run(id: string): Scenario {
    const scenario = this.cases.get(id);
    if (!scenario) throw new CaseApiError("CASE_UNKNOWN", "generate or supply this case before running it");
    if (this.calls >= CASE_LIMITS.invocations)
      throw new CaseApiError("CASE_LIMIT", "invocation budget exceeded");
    this.calls++;
    return scenario;
  }
}
