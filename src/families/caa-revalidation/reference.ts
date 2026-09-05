import { isStale } from "./truth.js";
import type { NameResult, Subject } from "./types.js";

/**
 * One narrow policy switch per option. A mutant differs from the reference in exactly one of them,
 * so `test/…` and the runner's independent-fatality gate can attribute each failure to one defect.
 */
export interface ReferenceOptions {
  /** Hours above which a name is rechecked. The specification says 8. */
  readonly staleAboveHours: number;
  /** Query each stale name under its own fqdn, rather than reusing the first stale name's. */
  readonly bindQueryPerName: boolean;
  /** Report the value the authority returned, rather than the name's cached value. */
  readonly reportQueriedAnswer: boolean;
  /** Call the authority at all. */
  readonly callAuthority: boolean;
  /** Decide from the bound answers, rather than always refusing or always issuing. */
  readonly decideFromAnswers: "answers" | "always-refuse" | "always-issue";
  /** Emit results in input order. */
  readonly preserveOrder: boolean;
}

export const REFERENCE_OPTIONS: ReferenceOptions = {
  staleAboveHours: 8,
  bindQueryPerName: true,
  reportQueriedAnswer: true,
  callAuthority: true,
  decideFromAnswers: "answers",
  preserveOrder: true,
};

export const makeSubject = (
  id: string,
  label: string,
  overrides: Partial<ReferenceOptions> = {},
): Subject => {
  const options: ReferenceOptions = { ...REFERENCE_OPTIONS, ...overrides };
  return {
    id,
    label,
    run(view, caa) {
      const staleTest = (validatedAtHour: number): boolean =>
        view.nowHour - validatedAtHour > options.staleAboveHours;
      const firstStale = view.names.find((name) => staleTest(name.validatedAtHour));
      const results: NameResult[] = view.names.map((name) => {
        if (!staleTest(name.validatedAtHour)) {
          return { fqdn: name.fqdn, caa: name.cachedCaa, source: "CACHE" };
        }
        if (!options.callAuthority) {
          return { fqdn: name.fqdn, caa: name.cachedCaa, source: "CACHE" };
        }
        const target = options.bindQueryPerName ? name : (firstStale ?? name);
        const answered = caa.current(target.fqdn);
        return {
          fqdn: name.fqdn,
          caa: options.reportQueriedAnswer ? answered : name.cachedCaa,
          source: "CURRENT",
        };
      });
      const decision =
        options.decideFromAnswers === "always-refuse"
          ? ("REFUSE" as const)
          : options.decideFromAnswers === "always-issue"
            ? ("ISSUE" as const)
            : results.every((row) => row.caa === "ALLOW")
              ? ("ISSUE" as const)
              : ("REFUSE" as const);
      return { decision, results: options.preserveOrder ? results : [...results].reverse() };
    },
  };
};

export const reference = makeSubject("reference", "Recheck every stale name under its own fqdn");
