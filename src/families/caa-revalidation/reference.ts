import type { NameResult, Subject } from "./types.js";

/**
 * One narrow policy switch per option. A mutant differs from the reference in exactly one of them,
 * so `test/…` and the runner's independent-fatality gate can attribute each failure to one defect.
 *
 * `collapseDonor` and `collapseWidth` generalize the original incident's identity-collapse
 * (`bindQueryPerName: false` always reused the FIRST stale name for every other stale name) into a
 * parameterized family of mechanism-preserving variants — same defect class (CAA1, one shared
 * identity standing in for several), different position and extent. `resultOrder` generalizes the
 * original `preserveOrder: boolean` the same way, for the CAA4 (result-shape) defect class.
 */
export interface ReferenceOptions {
  /** Hours above which a name is rechecked. The specification says 8. */
  readonly staleAboveHours: number;
  /** Query each stale name under its own fqdn, rather than reusing a donor stale name's. */
  readonly bindQueryPerName: boolean;
  /** Which stale name's identity is reused by the others when `bindQueryPerName` is false. */
  readonly collapseDonor: "first-stale" | "last-stale" | "middle-stale";
  /**
   * How many of the OTHER stale names (besides the donor) collapse onto the donor's identity, when
   * `bindQueryPerName` is false. "all" reproduces the original incident exactly; a finite number
   * narrows the collapse to that many names (counted in stale-list order, donor excluded), leaving
   * any remaining stale names correctly bound under their own fqdn.
   */
  readonly collapseWidth: number | "all";
  /** Report the value the authority returned, rather than the name's cached value. */
  readonly reportQueriedAnswer: boolean;
  /** Call the authority at all. */
  readonly callAuthority: boolean;
  /** Decide from the bound answers, rather than always refusing or always issuing. */
  readonly decideFromAnswers: "answers" | "always-refuse" | "always-issue";
  /** How the emitted result rows are permuted relative to input order. */
  readonly resultOrder: "input" | "reverse" | "rotate-1" | "swap-adjacent-pairs";
}

export const REFERENCE_OPTIONS: ReferenceOptions = {
  staleAboveHours: 8,
  bindQueryPerName: true,
  collapseDonor: "first-stale",
  collapseWidth: "all",
  reportQueriedAnswer: true,
  callAuthority: true,
  decideFromAnswers: "answers",
  resultOrder: "input",
};

const permute = (
  rows: readonly NameResult[],
  mode: ReferenceOptions["resultOrder"],
): readonly NameResult[] => {
  if (mode === "input") return rows;
  if (mode === "reverse") return [...rows].reverse();
  if (mode === "rotate-1") return rows.length > 1 ? [...rows.slice(1), rows[0] as NameResult] : [...rows];
  // swap-adjacent-pairs: (0,1), (2,3), ... swapped; an odd row out at the end stays put.
  const out = [...rows];
  for (let i = 0; i + 1 < out.length; i += 2) {
    const a = out[i] as NameResult;
    const b = out[i + 1] as NameResult;
    out[i] = b;
    out[i + 1] = a;
  }
  return out;
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
      const staleNames = view.names.filter((name) => staleTest(name.validatedAtHour));
      const donorIndex =
        options.collapseDonor === "last-stale"
          ? staleNames.length - 1
          : options.collapseDonor === "middle-stale"
            ? Math.floor((staleNames.length - 1) / 2)
            : 0;
      const donor = staleNames[donorIndex];
      // The donor itself always binds correctly; collapseWidth counts OTHER stale names, in stale-list
      // order, that get folded onto the donor's identity instead of their own.
      const collapsedFqdns = new Set<string>();
      if (donor !== undefined) {
        const width = options.collapseWidth === "all" ? Number.POSITIVE_INFINITY : options.collapseWidth;
        let folded = 0;
        for (const name of staleNames) {
          if (name.fqdn === donor.fqdn) continue;
          if (folded >= width) break;
          collapsedFqdns.add(name.fqdn);
          folded += 1;
        }
      }
      const results: NameResult[] = view.names.map((name) => {
        if (!staleTest(name.validatedAtHour)) {
          return { fqdn: name.fqdn, caa: name.cachedCaa, source: "CACHE" };
        }
        if (!options.callAuthority) {
          return { fqdn: name.fqdn, caa: name.cachedCaa, source: "CACHE" };
        }
        const shouldCollapse = !options.bindQueryPerName && collapsedFqdns.has(name.fqdn);
        const target = shouldCollapse ? (donor ?? name) : name;
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
      return { decision, results: [...permute(results, options.resultOrder)] };
    },
  };
};

export const reference = makeSubject("reference", "Recheck every stale name under its own fqdn");
