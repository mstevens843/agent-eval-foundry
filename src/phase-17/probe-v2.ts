// Lane 1 - the exact CAA Probe V2.
//
// Phase 16 declared a probe that runs reference, the first-name-reuse mutant, and malformed output
// over one-name controls AND multi-name denied-tail cases. Lane 0 established mechanically that the
// frozen implementation carries no fixture parameter and therefore visited exactly one fixture, and
// that two of its seven reported controls have no reachable failing branch.
//
// This file is the replacement, written outside frozen Phase 16 code. Three properties matter:
//
//  1. Fixtures are DATA. The runner takes one, so the declared fixture classes are reachable.
//  2. Every control has a NEGATIVE CONTROL. An isolation check that cannot fail is not evidence -
//     that is `DEFECT-TAXONOMY.md` B5 living inside a B6 rig, and Lane 0 found two of them.
//  3. The check set enforces the CAA contract's public clauses that Lane 0's enforcement screen
//     showed were stated and metered by nothing. Every added check enforces text already public, so
//     no subject satisfying the published specification loses.

import { rigIntegrity } from "../screens/rig-integrity.js";

/** The private authority marker. Unlike Phase 16's, this one is planted INSIDE the hidden state. */
export const PHASE17_WITNESS = "phase17-caa-current-authority-witness-4b91e7";

export type Caa = "ALLOW" | "DENY";
export type CaaSource = "CACHE" | "CURRENT";
export type Decision = "ISSUE" | "REFUSE";

export const PROBE_V2_CHECKS = [
  "check-caa-result-shape",
  "check-caa-per-name-binding",
  "check-caa-applicable-answer",
  "check-caa-safe-issuance",
  "check-caa-decision-faithful",
  "check-caa-positive-query-work",
] as const;

export type ProbeV2Check = (typeof PROBE_V2_CHECKS)[number];

export interface ProbeName {
  readonly fqdn: string;
  readonly validatedAtHour: number;
  readonly cachedCaa: Caa;
}

/** What the subject sees. It carries no current answer and no witness. */
export interface OrderView {
  readonly orderId: string;
  readonly nowHour: number;
  readonly names: readonly ProbeName[];
}

export interface OrderResult {
  readonly fqdn: string;
  readonly caa: Caa;
  readonly source: CaaSource;
}

export interface OrderReport {
  readonly decision: Decision;
  readonly results: readonly OrderResult[];
}

export interface CaaFacade {
  current(fqdn: string): Caa;
}

export interface ProbeFixture {
  readonly id: string;
  readonly domainCount: 1 | 2 | 3 | 5;
  readonly denyPosition: "none" | "first" | "middle" | "last";
  readonly view: OrderView;
  /** Host-owned. Never reachable from the subject surface. */
  readonly current: Readonly<Record<string, Caa>>;
  readonly note: string;
}

export const STALE_HOURS = 8;
export const isStale = (view: OrderView, name: ProbeName): boolean =>
  view.nowHour - name.validatedAtHour > STALE_HOURS;

export const applicableAnswer = (fixture: ProbeFixture, name: ProbeName): Caa =>
  isStale(fixture.view, name) ? (fixture.current[name.fqdn] ?? "DENY") : name.cachedCaa;

// ---------------------------------------------------------------------------
// The host: hidden authority plus an immutable exact-FQDN query ledger.
// ---------------------------------------------------------------------------

export interface LedgerEntry {
  readonly seq: number;
  readonly fqdn: string;
}

export class CaaHost {
  private seq = 0;
  private readonly entries: { seq: number; fqdn: string; witness: string }[] = [];
  private readonly authority: Map<string, { answer: Caa; witness: string }>;

  constructor(current: Readonly<Record<string, Caa>>) {
    this.authority = new Map(
      Object.entries(current).map(([fqdn, answer]) => [fqdn, { answer, witness: PHASE17_WITNESS }]),
    );
  }

  /** The only thing the subject receives. It returns the answer and nothing else. */
  facade(): CaaFacade {
    return Object.freeze({
      current: (fqdn: string): Caa => {
        this.seq += 1;
        this.entries.push({ seq: this.seq, fqdn, witness: PHASE17_WITNESS });
        return this.authority.get(fqdn)?.answer ?? "DENY";
      },
    });
  }

  /** Host-side view of the ledger, witness stripped. Never handed to a subject. */
  sealedLedger(): readonly LedgerEntry[] {
    return this.entries.map((entry) => ({ seq: entry.seq, fqdn: entry.fqdn }));
  }

  queriedNames(): readonly string[] {
    return this.entries.map((entry) => entry.fqdn);
  }
}

// ---------------------------------------------------------------------------
// Grammar refusal. A wrong-shaped report is refused, never graded.
// ---------------------------------------------------------------------------

export class ProbeGrammarError extends Error {}

export function requireOrderReport(value: unknown): OrderReport {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ProbeGrammarError("report is absent or not an object");
  }
  const row = value as Record<string, unknown>;
  if (row.decision !== "ISSUE" && row.decision !== "REFUSE") {
    throw new ProbeGrammarError("decision is not ISSUE or REFUSE");
  }
  if (!Array.isArray(row.results)) throw new ProbeGrammarError("results is not an array");
  for (const entry of row.results) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new ProbeGrammarError("a result entry is not an object");
    }
    const item = entry as Record<string, unknown>;
    if (typeof item.fqdn !== "string" || item.fqdn.length === 0) {
      throw new ProbeGrammarError("a result entry has no fqdn");
    }
    if (item.caa !== "ALLOW" && item.caa !== "DENY") {
      throw new ProbeGrammarError("a result caa is not ALLOW or DENY");
    }
    if (item.source !== "CACHE" && item.source !== "CURRENT") {
      throw new ProbeGrammarError("a result source is not CACHE or CURRENT");
    }
  }
  return value as OrderReport;
}

// ---------------------------------------------------------------------------
// The verifier. Every check enforces a clause the CAA public contract already states.
// ---------------------------------------------------------------------------

export function gradeProbeV2(
  fixture: ProbeFixture,
  report: OrderReport,
  queried: readonly string[],
): readonly ProbeV2Check[] {
  const names = fixture.view.names;
  const stale = names.filter((name) => isStale(fixture.view, name));
  const resultFor = (fqdn: string): OrderResult | undefined =>
    report.results.find((row) => row.fqdn === fqdn);

  // reconcile-each-domain-name: "Produce one result bound to each input name in the original order."
  const shapeOk =
    report.results.length === names.length &&
    names.every((name, index) => report.results[index]?.fqdn === name.fqdn);

  // caa-current-result-bound-per-name: each stale name gets its OWN exact-fqdn call. Identity only.
  const bindingOk = stale.every((name) => queried.includes(name.fqdn));

  // reconcile-each-domain-name: stale names use their current answer, "otherwise use its own cachedCaa".
  const answersOk = names.every((name) => resultFor(name.fqdn)?.caa === applicableAnswer(fixture, name));

  const applicable = names.map((name) => applicableAnswer(fixture, name));
  const allAllow = applicable.every((answer) => answer === "ALLOW");

  // caa-all-names-must-authorize, stated as an iff. Both halves.
  const safeOk = !(report.decision === "ISSUE" && applicable.includes("DENY"));
  const faithfulOk = !(report.decision === "REFUSE" && allAllow);

  // caa-positive-query-work-required, metered exactly as declared: >= 1 when a stale name exists.
  const workOk = stale.length === 0 || queried.length >= 1;

  return [
    ...(shapeOk ? [] : (["check-caa-result-shape"] as const)),
    ...(bindingOk ? [] : (["check-caa-per-name-binding"] as const)),
    ...(answersOk ? [] : (["check-caa-applicable-answer"] as const)),
    ...(safeOk ? [] : (["check-caa-safe-issuance"] as const)),
    ...(faithfulOk ? [] : (["check-caa-decision-faithful"] as const)),
    ...(workOk ? [] : (["check-caa-positive-query-work"] as const)),
  ].sort() as readonly ProbeV2Check[];
}

// ---------------------------------------------------------------------------
// Fixtures. Every declared envelope class the Phase 16 probe could not reach.
// ---------------------------------------------------------------------------

const NOW = 1000;
const at = (ageHours: number): number => NOW - ageHours;

const fixture = (
  id: string,
  domainCount: 1 | 2 | 3 | 5,
  denyPosition: ProbeFixture["denyPosition"],
  names: readonly (readonly [string, number, Caa])[],
  current: Readonly<Record<string, Caa>>,
  note: string,
): ProbeFixture => ({
  id,
  domainCount,
  denyPosition,
  view: {
    orderId: `order-${id}`,
    nowHour: NOW,
    names: names.map(([fqdn, ageHours, cachedCaa]) => ({
      fqdn,
      validatedAtHour: at(ageHours),
      cachedCaa,
    })),
  },
  current,
  note,
});

export const PROBE_V2_FIXTURES: readonly ProbeFixture[] = [
  fixture(
    "one-name-stale-allow",
    1,
    "none",
    [["a.example", 9, "ALLOW"]],
    { "a.example": "ALLOW" },
    "Declared one-name control. Reference and the first-name-reuse mutant are behaviorally identical and must both pass.",
  ),
  fixture(
    "one-name-stale-deny",
    1,
    "first",
    [["a.example", 9, "ALLOW"]],
    { "a.example": "DENY" },
    "Declared one-name control on the refusing side. Both must correctly refuse.",
  ),
  fixture(
    "multi-name-denied-tail",
    3,
    "last",
    [
      ["a.example", 24, "ALLOW"],
      ["b.example", 24, "ALLOW"],
      ["c.example", 24, "ALLOW"],
    ],
    { "a.example": "ALLOW", "b.example": "ALLOW", "c.example": "DENY" },
    "The incident shape: three stale names, the denied one last, cardinality preserved by the mutant.",
  ),
  fixture(
    "mixed-fresh-stale-identity",
    3,
    "none",
    [
      ["a.example", 0, "ALLOW"],
      ["b.example", 24, "ALLOW"],
      ["c.example", 9, "ALLOW"],
    ],
    { "a.example": "DENY", "b.example": "ALLOW", "c.example": "ALLOW" },
    "Mixed fresh and stale. The fresh name's current answer disagrees with its cache, so querying it is wrong. Every value the mutant reports is coincidentally correct, isolating identity binding alone.",
  ),
  fixture(
    "age-boundary-eight",
    2,
    "none",
    [
      ["a.example", 8, "ALLOW"],
      ["b.example", 9, "ALLOW"],
    ],
    { "a.example": "DENY", "b.example": "ALLOW" },
    "Age exactly eight uses CACHE. Cached and current disagree there, so a >= 8 off-by-one becomes observable.",
  ),
  fixture(
    "age-boundary-nine",
    2,
    "first",
    [
      ["a.example", 9, "ALLOW"],
      ["b.example", 0, "ALLOW"],
    ],
    { "a.example": "DENY", "b.example": "ALLOW" },
    "Age exactly nine requires CURRENT. Cached and current disagree there, so a > 9 off-by-one becomes observable.",
  ),
  fixture(
    "all-fresh-no-query-required",
    2,
    "none",
    [
      ["a.example", 0, "ALLOW"],
      ["b.example", 8, "ALLOW"],
    ],
    { "a.example": "DENY", "b.example": "DENY" },
    "No stale name. The positive-work floor is conditioned on staleness, so doing no query here is correct. This proves the work check cannot fire vacuously.",
  ),
  fixture(
    "five-name-denied-middle",
    5,
    "middle",
    [
      ["a.example", 719, "ALLOW"],
      ["b.example", 0, "ALLOW"],
      ["c.example", 9, "ALLOW"],
      ["d.example", 8, "ALLOW"],
      ["e.example", 24, "ALLOW"],
    ],
    {
      "a.example": "ALLOW",
      "b.example": "DENY",
      "c.example": "DENY",
      "d.example": "DENY",
      "e.example": "ALLOW",
    },
    "Widest declared order, denial away from the first position, both boundary ages present, and two fresh names whose current answers would mislead anyone who queries them.",
  ),
];

// ---------------------------------------------------------------------------
// Subjects. One narrow defect each.
// ---------------------------------------------------------------------------

export interface ProbeSubject {
  readonly id: string;
  readonly label: string;
  readonly intendedCheck: ProbeV2Check | null;
  run(view: OrderView, caa: CaaFacade): unknown;
}

const decide = (results: readonly OrderResult[]): Decision =>
  results.every((row) => row.caa === "ALLOW") ? "ISSUE" : "REFUSE";

/** The shared honest body, parameterised by which staleness test it uses. */
const reconcile = (view: OrderView, caa: CaaFacade, staleTest: (name: ProbeName) => boolean): OrderResult[] =>
  view.names.map((name) =>
    staleTest(name)
      ? { fqdn: name.fqdn, caa: caa.current(name.fqdn), source: "CURRENT" as const }
      : { fqdn: name.fqdn, caa: name.cachedCaa, source: "CACHE" as const },
  );

export const PROBE_V2_SUBJECTS: readonly ProbeSubject[] = [
  {
    id: "reference",
    label: "Query each stale name by its own exact fqdn",
    intendedCheck: null,
    run(view, caa) {
      const results = reconcile(view, caa, (name) => isStale(view, name));
      return { decision: decide(results), results };
    },
  },
  {
    id: "first-name-reuse-mutant",
    label: "Query the first stale name once per stale list position",
    intendedCheck: "check-caa-per-name-binding",
    run(view, caa) {
      const first = view.names.find((name) => isStale(view, name));
      const results = view.names.map((name) =>
        isStale(view, name)
          ? { fqdn: name.fqdn, caa: caa.current((first ?? name).fqdn), source: "CURRENT" as const }
          : { fqdn: name.fqdn, caa: name.cachedCaa, source: "CACHE" as const },
      );
      return { decision: decide(results), results };
    },
  },
  {
    id: "boundary-inclusive-mutant",
    label: "Treat age eight as stale (>= 8 instead of > 8)",
    intendedCheck: "check-caa-applicable-answer",
    run(view, caa) {
      const results = reconcile(view, caa, (name) => view.nowHour - name.validatedAtHour >= 8);
      return { decision: decide(results), results };
    },
  },
  {
    id: "boundary-lenient-mutant",
    label: "Treat age nine as fresh (> 9 instead of > 8)",
    intendedCheck: "check-caa-per-name-binding",
    run(view, caa) {
      const results = reconcile(view, caa, (name) => view.nowHour - name.validatedAtHour > 9);
      return { decision: decide(results), results };
    },
  },
  {
    id: "duplicate-query-cheat",
    label: "Make the right number of calls, all against one name, and report the cache",
    intendedCheck: "check-caa-per-name-binding",
    run(view, caa) {
      const stale = view.names.filter((name) => isStale(view, name));
      const first = stale[0];
      for (let index = 0; index < stale.length; index += 1) {
        if (first !== undefined) caa.current(first.fqdn);
      }
      const results = view.names.map((name) => ({
        fqdn: name.fqdn,
        caa: name.cachedCaa,
        source: (isStale(view, name) ? "CURRENT" : "CACHE") as CaaSource,
      }));
      return { decision: decide(results), results };
    },
  },
  {
    id: "no-query-cheat",
    label: "Never call the authority; return the cache for everything",
    intendedCheck: "check-caa-positive-query-work",
    run(view) {
      const results = view.names.map((name) => ({
        fqdn: name.fqdn,
        caa: name.cachedCaa,
        source: "CACHE" as const,
      }));
      return { decision: decide(results), results };
    },
  },
  {
    id: "always-refuse",
    label: "Do all the honest work, then refuse unconditionally",
    intendedCheck: "check-caa-decision-faithful",
    run(view, caa) {
      const results = reconcile(view, caa, (name) => isStale(view, name));
      return { decision: "REFUSE" as const, results };
    },
  },
  {
    id: "fabricated-result",
    label: "Emit plausible CURRENT results without making any matching host query",
    intendedCheck: "check-caa-per-name-binding",
    run(view) {
      const results = view.names.map((name) => ({
        fqdn: name.fqdn,
        caa: "ALLOW" as const,
        source: "CURRENT" as const,
      }));
      return { decision: "ISSUE" as const, results };
    },
  },
  {
    id: "reversed-order-mutant",
    label: "Correct per-name answers, emitted in reverse input order",
    intendedCheck: "check-caa-result-shape",
    run(view, caa) {
      const results = reconcile(view, caa, (name) => isStale(view, name));
      return { decision: decide(results), results: [...results].reverse() };
    },
  },
];

// ---------------------------------------------------------------------------
// Malformed-output battery. Wrong shapes are refused, never graded.
// ---------------------------------------------------------------------------

export const PROBE_V2_MALFORMED: readonly { readonly id: string; readonly value: unknown }[] = [
  { id: "null-report", value: null },
  { id: "array-report", value: [] },
  { id: "empty-object", value: {} },
  { id: "missing-results", value: { decision: "ISSUE" } },
  { id: "unknown-decision", value: { decision: "MAYBE", results: [] } },
  { id: "results-not-array", value: { decision: "ISSUE", results: "a.example" } },
  { id: "result-not-object", value: { decision: "ISSUE", results: ["a.example"] } },
  { id: "result-missing-fqdn", value: { decision: "ISSUE", results: [{ caa: "ALLOW", source: "CACHE" }] } },
  {
    id: "result-unknown-caa",
    value: { decision: "ISSUE", results: [{ fqdn: "a.example", caa: "MAYBE", source: "CACHE" }] },
  },
  {
    id: "result-unknown-source",
    value: { decision: "ISSUE", results: [{ fqdn: "a.example", caa: "ALLOW", source: "GUESS" }] },
  },
];

// ---------------------------------------------------------------------------
// Isolation, each with the negative control the Phase 16 probe lacked.
// ---------------------------------------------------------------------------

/** Everything a subject can reach: its argument, the facade surface, and its own return value. */
export const subjectVisibleSurface = (view: OrderView, caa: CaaFacade, report: unknown): string =>
  [
    JSON.stringify(view),
    JSON.stringify(caa),
    Object.getOwnPropertyNames(caa).join(","),
    String((caa as unknown as Record<string, unknown>).current),
    JSON.stringify(report ?? null),
  ].join("|");

export interface Phase17IsolationEvidence {
  readonly witnessAbsentFromEverySurface: boolean;
  readonly facadeOwnPropertyNames: readonly string[];
  readonly leakCanaryDetected: boolean;
  readonly challengeCarriesNoWitness: boolean;
  readonly challengeLeakCanaryDetected: boolean;
  readonly staleNamesWhereCacheDisagreesWithCurrent: number;
  readonly ledgerReachableFromSubject: boolean;
  readonly usable: boolean;
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------

export interface ProbeV2Cell {
  readonly fixtureId: string;
  readonly subjectId: string;
  readonly failures: readonly ProbeV2Check[];
  readonly queries: readonly string[];
  readonly uniqueQueries: number;
  readonly refused: string | null;
  readonly replayIdentical: boolean;
}

export interface ProbeV2Run {
  readonly checks: readonly ProbeV2Check[];
  readonly fixtures: readonly {
    readonly id: string;
    readonly domainCount: number;
    readonly denyPosition: string;
    readonly nameCount: number;
    readonly staleCount: number;
    readonly freshCount: number;
    readonly ages: readonly number[];
    readonly allApplicableAllow: boolean;
    readonly note: string;
  }[];
  readonly cells: readonly ProbeV2Cell[];
  readonly repetitions: number;
  readonly deterministicReplay: boolean;
  readonly malformed: readonly {
    readonly id: string;
    readonly refusedFirstPass: boolean;
    readonly refusedSecondPass: boolean;
    readonly identicalMessage: boolean;
  }[];
  readonly malformedAllRefusedTwice: boolean;
  readonly isolation: Phase17IsolationEvidence;
  readonly checkActivation: Readonly<Record<string, number>>;
  readonly neverFiringChecks: readonly string[];
  readonly b6: {
    readonly sameInvocation: true;
    readonly usable: boolean;
    readonly knownGoodPassed: boolean;
    readonly knownBadFailed: boolean;
    readonly malformedInputRefused: boolean;
    readonly nondegenerate: boolean;
    readonly reasons: readonly string[];
  };
}

const runCell = (fixture: ProbeFixture, subject: ProbeSubject): Omit<ProbeV2Cell, "replayIdentical"> => {
  const host = new CaaHost(fixture.current);
  const facade = host.facade();
  const view = JSON.parse(JSON.stringify(fixture.view)) as OrderView;
  try {
    const raw = subject.run(view, facade);
    const report = requireOrderReport(raw);
    const queries = host.queriedNames();
    return {
      fixtureId: fixture.id,
      subjectId: subject.id,
      failures: gradeProbeV2(fixture, report, queries),
      queries,
      uniqueQueries: new Set(queries).size,
      refused: null,
    };
  } catch (err) {
    return {
      fixtureId: fixture.id,
      subjectId: subject.id,
      failures: [],
      queries: host.queriedNames(),
      uniqueQueries: new Set(host.queriedNames()).size,
      refused: (err as Error).message,
    };
  }
};

const runIsolation = (): Phase17IsolationEvidence => {
  const surfaces: string[] = [];
  let facadeNames: readonly string[] = [];
  let disagreeing = 0;
  for (const fixture of PROBE_V2_FIXTURES) {
    const host = new CaaHost(fixture.current);
    const facade = host.facade();
    facadeNames = Object.getOwnPropertyNames(facade);
    const view = JSON.parse(JSON.stringify(fixture.view)) as OrderView;
    const report = PROBE_V2_SUBJECTS[0]?.run(view, facade);
    surfaces.push(subjectVisibleSurface(view, facade, report));
    disagreeing += fixture.view.names.filter(
      (name) => isStale(fixture.view, name) && fixture.current[name.fqdn] !== name.cachedCaa,
    ).length;
  }

  // Negative control: a facade that really does leak must trip the same detector.
  const leaky = {
    current: (): Caa => "ALLOW",
    __authority: { witness: PHASE17_WITNESS },
  } as unknown as CaaFacade;
  const canarySurface = subjectVisibleSurface(
    PROBE_V2_FIXTURES[0]?.view ?? { orderId: "x", nowHour: 0, names: [] },
    leaky,
    null,
  );

  // Negative control for the challenge: a view carrying the witness must trip the detector.
  const challengeBytes = JSON.stringify(PROBE_V2_FIXTURES.map((row) => row.view));
  const challengeCanary = JSON.stringify([{ orderId: PHASE17_WITNESS, nowHour: 0, names: [] }]);

  const evidence = {
    witnessAbsentFromEverySurface: surfaces.every((row) => !row.includes(PHASE17_WITNESS)),
    facadeOwnPropertyNames: facadeNames,
    leakCanaryDetected: canarySurface.includes(PHASE17_WITNESS),
    challengeCarriesNoWitness: !challengeBytes.includes(PHASE17_WITNESS),
    challengeLeakCanaryDetected: challengeCanary.includes(PHASE17_WITNESS),
    staleNamesWhereCacheDisagreesWithCurrent: disagreeing,
    ledgerReachableFromSubject: facadeNames.some((name) => name !== "current"),
  };
  return {
    ...evidence,
    usable:
      evidence.witnessAbsentFromEverySurface &&
      evidence.leakCanaryDetected &&
      evidence.challengeCarriesNoWitness &&
      evidence.challengeLeakCanaryDetected &&
      evidence.staleNamesWhereCacheDisagreesWithCurrent > 0 &&
      !evidence.ledgerReachableFromSubject,
  };
};

export function runProbeV2(): ProbeV2Run {
  const first = PROBE_V2_FIXTURES.flatMap((fixture) =>
    PROBE_V2_SUBJECTS.map((subject) => runCell(fixture, subject)),
  );
  const second = PROBE_V2_FIXTURES.flatMap((fixture) =>
    PROBE_V2_SUBJECTS.map((subject) => runCell(fixture, subject)),
  );
  const cells: readonly ProbeV2Cell[] = first.map((cell, index) => ({
    ...cell,
    replayIdentical: JSON.stringify(cell) === JSON.stringify(second[index]),
  }));

  const malformed = PROBE_V2_MALFORMED.map((entry) => {
    const attempt = (): string | null => {
      try {
        requireOrderReport(entry.value);
        return null;
      } catch (err) {
        return err instanceof ProbeGrammarError ? err.message : `wrong-error:${(err as Error).message}`;
      }
    };
    const one = attempt();
    const two = attempt();
    return {
      id: entry.id,
      refusedFirstPass: one !== null && !one.startsWith("wrong-error:"),
      refusedSecondPass: two !== null && !two.startsWith("wrong-error:"),
      identicalMessage: one === two,
    };
  });

  const failuresOf = (subjectId: string, fixtureIds?: readonly string[]): readonly string[] =>
    cells
      .filter(
        (cell) =>
          cell.subjectId === subjectId && (fixtureIds === undefined || fixtureIds.includes(cell.fixtureId)),
      )
      .flatMap((cell) => cell.failures);

  const activating = ["multi-name-denied-tail", "mixed-fresh-stale-identity", "five-name-denied-middle"];
  const integrity = rigIntegrity(
    "phase-17-caa-probe-v2",
    [
      { id: "reference", expect: "pass", observedFailures: failuresOf("reference") },
      {
        id: "first-name-reuse-mutant",
        expect: "fail",
        observedFailures: failuresOf("first-name-reuse-mutant", activating),
      },
    ],
    cells.map((cell) => cell.failures),
  );

  const checkActivation = Object.fromEntries(
    PROBE_V2_CHECKS.map((check) => [check, cells.filter((cell) => cell.failures.includes(check)).length]),
  );
  const malformedAllRefusedTwice = malformed.every(
    (row) => row.refusedFirstPass && row.refusedSecondPass && row.identicalMessage,
  );

  return {
    checks: PROBE_V2_CHECKS,
    fixtures: PROBE_V2_FIXTURES.map((row) => ({
      id: row.id,
      domainCount: row.domainCount,
      denyPosition: row.denyPosition,
      nameCount: row.view.names.length,
      staleCount: row.view.names.filter((name) => isStale(row.view, name)).length,
      freshCount: row.view.names.filter((name) => !isStale(row.view, name)).length,
      ages: row.view.names.map((name) => row.view.nowHour - name.validatedAtHour),
      allApplicableAllow: row.view.names.every((name) => applicableAnswer(row, name) === "ALLOW"),
      note: row.note,
    })),
    cells,
    repetitions: 2,
    deterministicReplay: cells.every((cell) => cell.replayIdentical),
    malformed,
    malformedAllRefusedTwice,
    isolation: runIsolation(),
    checkActivation,
    neverFiringChecks: PROBE_V2_CHECKS.filter((check) => (checkActivation[check] ?? 0) === 0),
    b6: {
      sameInvocation: true,
      usable: integrity.usable && malformedAllRefusedTwice,
      knownGoodPassed: failuresOf("reference").length === 0,
      knownBadFailed: failuresOf("first-name-reuse-mutant", activating).length > 0,
      malformedInputRefused: malformedAllRefusedTwice,
      nondegenerate: !integrity.degenerate,
      reasons: integrity.reasons,
    },
  };
}

// ---------------------------------------------------------------------------
// Adjudication. The registration owns the expectations; this only compares.
//
// The expected matrix is written to `data/phase-17-probe-v2-preregistration.json` and hashed BEFORE
// this code is executed for the first time, so a disagreement is a real surprise rather than a
// number fitted after the fact.
// ---------------------------------------------------------------------------

export interface ProbeV2Registration {
  readonly registrationId: string;
  readonly implementationSha256: string;
  readonly repetitions: number;
  readonly activatingFixtures: readonly string[];
  readonly expectedMatrix: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;
  readonly killRules: readonly { readonly id: string; readonly rule: string }[];
}

export interface ProbeV2Verdict {
  readonly status: "PROBE-V2-PASSED" | "PROBE-REPAIR-REQUIRED" | "CANDIDATE-INVALID";
  readonly matrixMismatches: readonly {
    readonly subjectId: string;
    readonly fixtureId: string;
    readonly expected: readonly string[];
    readonly observed: readonly string[];
  }[];
  readonly killReasons: readonly string[];
  readonly implementationHashMatches: boolean;
}

export function adjudicateProbeV2(
  registration: ProbeV2Registration,
  run: ProbeV2Run,
  observedImplementationSha256: string,
): ProbeV2Verdict {
  const mismatches: {
    subjectId: string;
    fixtureId: string;
    expected: readonly string[];
    observed: readonly string[];
  }[] = [];
  for (const subject of PROBE_V2_SUBJECTS) {
    for (const fixture of PROBE_V2_FIXTURES) {
      const expected = [...(registration.expectedMatrix[subject.id]?.[fixture.id] ?? [])].sort();
      const cell = run.cells.find((row) => row.subjectId === subject.id && row.fixtureId === fixture.id);
      const observed = [...(cell?.failures ?? [])].sort();
      if (JSON.stringify(expected) !== JSON.stringify(observed)) {
        mismatches.push({ subjectId: subject.id, fixtureId: fixture.id, expected, observed });
      }
    }
  }

  const intendedCheckFired = PROBE_V2_SUBJECTS.filter((subject) => subject.intendedCheck !== null).filter(
    (subject) =>
      !run.cells.some(
        (cell) =>
          cell.subjectId === subject.id && cell.failures.includes(subject.intendedCheck as ProbeV2Check),
      ),
  );

  const killReasons = [
    ...(observedImplementationSha256 === registration.implementationSha256
      ? []
      : ["the executed implementation does not match the registered hash"]),
    ...(run.repetitions === registration.repetitions ? [] : ["repetition count differs from registration"]),
    ...(mismatches.length === 0 ? [] : [`${mismatches.length} registered cell(s) did not match observation`]),
    ...(run.b6.usable ? [] : ["the B6 rig is not usable in this invocation"]),
    ...(run.b6.nondegenerate ? [] : ["the result matrix is degenerate"]),
    ...(run.deterministicReplay ? [] : ["replay was not deterministic"]),
    ...(run.malformedAllRefusedTwice ? [] : ["a malformed report was graded or refused inconsistently"]),
    ...(run.isolation.usable
      ? []
      : ["witness isolation or challenge nonleakage failed, or its negative control did not fire"]),
    ...(run.neverFiringChecks.length === 0
      ? []
      : [`checks that never fired: ${run.neverFiringChecks.join(", ")}`]),
    ...(intendedCheckFired.length === 0
      ? []
      : [`subjects whose intended check never fired: ${intendedCheckFired.map((row) => row.id).join(", ")}`]),
    ...(run.cells.some((cell) => cell.refused !== null)
      ? [
          `a subject's report was refused as malformed: ${run.cells
            .filter((cell) => cell.refused !== null)
            .map((cell) => `${cell.subjectId}/${cell.fixtureId}`)
            .join(", ")}`,
        ]
      : []),
  ];

  const referenceClean = run.cells
    .filter((cell) => cell.subjectId === "reference")
    .every((cell) => cell.failures.length === 0);

  return {
    status:
      killReasons.length === 0
        ? "PROBE-V2-PASSED"
        : referenceClean
          ? "PROBE-REPAIR-REQUIRED"
          : "CANDIDATE-INVALID",
    matrixMismatches: mismatches,
    killReasons,
    implementationHashMatches: observedImplementationSha256 === registration.implementationSha256,
  };
}
