// Lane 0 - audit and truth repair.
//
// Phase 16 registered `REPEAT-DISCOVERY` on the strength of one candidate that survived 2-of-2 blind
// reading and "its registered B6 probe". This module re-derives, from the frozen artifacts alone,
// what that probe actually executed, and separates the part of the claim that is real from the part
// that was declared but never run.
//
// It never writes to a frozen Phase 16 input. Everything here is read-only.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runPhase16Probe } from "../phase-16/probes.js";
import type { Phase17AuditFinding, Phase17FrozenInput } from "./types.js";

export const PHASE17_CAA_CANDIDATE = "multi-name-caa-revalidation-reconciler";

/** The sentinel the frozen probe uses as its private-authority marker. */
const PHASE16_SENTINEL = "phase16-private-authority-7f31";

const sha256 = (bytes: Buffer | string): string => createHash("sha256").update(bytes).digest("hex");

const readJson = <T>(root: string, relative: string): T =>
  JSON.parse(readFileSync(join(root, relative), "utf8")) as T;

interface ContinuationRegistration {
  readonly frozenReviewContract: {
    readonly readerOutputSchemaSha256: string;
    readonly readerInstructionsSha256: string;
    readonly probeImplementationSha256: string;
    readonly providerImage: string;
    readonly providerImageDigest: string;
  };
  readonly parent: { readonly preregistrationSha256: string };
  readonly packets: readonly { readonly candidateId: string; readonly packetSha256: string }[];
}

interface ReaderReviewSet {
  readonly reviews: readonly {
    readonly candidateId: string;
    readonly providerFamily: string;
    readonly verdict: string;
    readonly packetSha256: string;
    readonly model: string;
    readonly classification: string;
    readonly independentlyProduced: boolean;
    readonly dimensions: Readonly<Record<string, string>>;
  }[];
}

export interface Phase17ProbeAudit {
  readonly schema: "agent-eval-foundry/phase-17-phase16-probe-audit@1";
  readonly auditId: string;
  readonly supersedes: readonly string[];
  readonly frozenInputs: readonly Phase17FrozenInput[];
  readonly allFrozenInputsIntact: boolean;
  readonly funnel: Readonly<Record<string, number>>;
  readonly caaReaderVerdicts: readonly {
    readonly providerFamily: string;
    readonly model: string;
    readonly verdict: string;
    readonly packetSha256: string;
    readonly independentlyProduced: boolean;
    readonly allDimensionsPass: boolean;
  }[];
  readonly caaPromotedByTwoIndependentFamilies: boolean;
  readonly declaredProcedure: string;
  readonly declaredFalsifier: string;
  readonly implemented: Phase17ImplementedProcedure;
  readonly replayedProbeResult: Readonly<Record<string, unknown>>;
  readonly findings: readonly Phase17AuditFinding[];
  readonly retainedAsReal: readonly string[];
  readonly markedIncomplete: readonly string[];
  readonly verdict: "full-procedure-probe-survivor" | "partial-procedure-probe-survivor";
  readonly correction: string;
}

export interface Phase17ImplementedProcedure {
  /** SHA-256 of the frozen implementation this extraction was taken from. */
  readonly sourceSha256: string;
  readonly runnerAcceptsFixtureParameter: boolean;
  readonly distinctFixtures: number;
  readonly fixtureNameCount: number;
  readonly fixtureNowHour: number;
  readonly fixtureValidatedAtHours: readonly number[];
  readonly fixtureAges: readonly number[];
  readonly fixtureStaleCount: number;
  readonly fixtureFreshCount: number;
  readonly envelopeAgeValues: readonly number[];
  readonly fixtureAgesInsideDeclaredEnvelope: boolean;
  readonly referenceRuns: number;
  readonly mutantRuns: number;
  readonly malformedChecks: number;
  readonly oneNameControlsRun: number;
  readonly sentinelInCaaAuthorityMap: boolean;
  readonly sentinelOccurrencesInContractArtifact: number;
  readonly sentinelOccurrencesInPacketArtifact: number;
}

/** Slice one top-level `const name = (...) => {...}` body out of the frozen source. */
const functionBody = (source: string, declaration: string): string => {
  const start = source.indexOf(declaration);
  if (start < 0) throw new Error(`phase-17 audit: ${declaration} is absent from the frozen probe source`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open, index + 1);
    }
  }
  throw new Error(`phase-17 audit: ${declaration} body is unterminated`);
};

const numbersAfter = (body: string, key: string): readonly number[] =>
  [...body.matchAll(new RegExp(`${key}:\\s*(-?\\d+)`, "g"))].map((match) => Number(match[1]));

const countOccurrences = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

export function extractImplementedProcedure(root: string): Phase17ImplementedProcedure {
  const path = join(root, "src/phase-16/probes.ts");
  const source = readFileSync(path, "utf8");
  const caa = functionBody(source, "const runCaa = ");
  const runner = functionBody(source, "export function runPhase16Probe");
  const authority = caa.slice(caa.indexOf("const authority = new Map"), caa.indexOf("const marker"));
  const namesArray = caa.slice(caa.indexOf("names: ["), caa.indexOf("],", caa.indexOf("names: [")));

  const validatedAtHours = numbersAfter(caa, "validatedAtHour");
  const nowHour = numbersAfter(caa, "nowHour")[0] ?? Number.NaN;
  const ages = validatedAtHours.map((hour) => nowHour - hour);

  const contracts = readFileSync(join(root, "data/phase-16-candidate-contracts.json"), "utf8");
  const packets = readFileSync(join(root, "data/phase-16-reader-packets.json"), "utf8");
  const envelopeAges = (
    JSON.parse(contracts) as {
      contracts: readonly {
        candidateId: string;
        hiddenInstanceEnvelope: { dimensions: readonly { id: string; values: readonly number[] }[] };
      }[];
    }
  ).contracts
    .find((row) => row.candidateId === PHASE17_CAA_CANDIDATE)
    ?.hiddenInstanceEnvelope.dimensions.find((row) => row.id === "validation-age-hours")?.values;
  if (envelopeAges === undefined) throw new Error("phase-17 audit: CAA age envelope is absent");

  return {
    sourceSha256: sha256(readFileSync(path)),
    // The decisive structural fact: the runner is `(subject) => ProbeSubjectRun`. It takes no fixture,
    // so no amount of repetition can make it visit a second case.
    runnerAcceptsFixtureParameter: /run\(\s*"(reference|mutant)"\s*,/.test(runner),
    distinctFixtures: 1,
    fixtureNameCount: countOccurrences(namesArray, "fqdn:"),
    fixtureNowHour: nowHour,
    fixtureValidatedAtHours: validatedAtHours,
    fixtureAges: ages,
    fixtureStaleCount: ages.filter((age) => age > 8).length,
    fixtureFreshCount: ages.filter((age) => age <= 8).length,
    envelopeAgeValues: envelopeAges,
    fixtureAgesInsideDeclaredEnvelope: ages.every((age) => envelopeAges.includes(age)),
    referenceRuns: countOccurrences(runner, 'implementation.run("reference")'),
    mutantRuns: countOccurrences(runner, 'implementation.run("mutant")'),
    malformedChecks: countOccurrences(runner, "malformedRefused("),
    oneNameControlsRun: 0,
    sentinelInCaaAuthorityMap: authority.includes("PRIVATE_SENTINEL"),
    sentinelOccurrencesInContractArtifact: countOccurrences(contracts, PHASE16_SENTINEL),
    sentinelOccurrencesInPacketArtifact: countOccurrences(packets, PHASE16_SENTINEL),
  };
}

// ---------------------------------------------------------------------------
// Screen 6, the enforcement screen: for every stated rule, a subject that violates it must fail
// some check. `DEFECT-TAXONOMY.md` Part 2 names this the most valuable of the three added screens
// because B1 ("stated but unenforced") has now appeared three times and nothing looks for it.
//
// This runs the Phase 16 CAA metric set EXACTLY as its own `deterministicProcedure` text describes,
// against eight strategies, and records which ones escape. It grades the contract, not an agent.
// ---------------------------------------------------------------------------

type Caa = "ALLOW" | "DENY";

interface EnforcementName {
  readonly fqdn: string;
  readonly ageHours: number;
  readonly cachedCaa: Caa;
  readonly currentCaa: Caa;
}

interface EnforcementFixture {
  readonly id: string;
  readonly names: readonly EnforcementName[];
}

interface EnforcementReport {
  readonly decision: "ISSUE" | "REFUSE";
  readonly results: readonly { readonly fqdn: string; readonly caa: Caa; readonly source: string }[];
  readonly queries: readonly string[];
}

const isStale = (name: EnforcementName): boolean => name.ageHours > 8;
const applicable = (name: EnforcementName): Caa => (isStale(name) ? name.currentCaa : name.cachedCaa);

/**
 * The three Phase 16 metrics, implemented from their own text under the STRICTEST reading that text
 * supports. A defect that escapes the strictest reading escapes the contract.
 */
const phase16MetricsAsWritten = (
  fixture: EnforcementFixture,
  report: EnforcementReport,
): readonly string[] => {
  const stale = fixture.names.filter(isStale);
  const resultFor = (fqdn: string) => report.results.find((row) => row.fqdn === fqdn);

  // caa-name-binding-mismatch-count: missing, repeated-other-name, or mismatched bindings.
  const bindingMismatches = stale.filter((name) => {
    const queried = report.queries.includes(name.fqdn);
    const row = resultFor(name.fqdn);
    return !queried || row === undefined || row.caa !== name.currentCaa;
  }).length;

  // caa-unsafe-issuance-count: ISSUE reports carrying any denied applicable answer.
  const unsafeIssuance =
    report.decision === "ISSUE" && fixture.names.some((name) => applicable(name) === "DENY") ? 1 : 0;

  // caa-stale-name-query-count: at least one exact-fqdn current call when a stale name exists.
  const queryFloorMet = stale.length === 0 || report.queries.length >= 1;

  return [
    ...(bindingMismatches === 0 ? [] : ["check-caa-per-name-binding"]),
    ...(unsafeIssuance === 0 ? [] : ["check-caa-safe-issuance"]),
    ...(queryFloorMet ? [] : ["check-caa-positive-query-work"]),
  ].sort();
};

interface EnforcementStrategy {
  readonly id: string;
  readonly violatesPublicRule: string;
  readonly run: (fixture: EnforcementFixture) => EnforcementReport;
}

const decide = (rows: readonly { readonly caa: Caa }[]): "ISSUE" | "REFUSE" =>
  rows.every((row) => row.caa === "ALLOW") ? "ISSUE" : "REFUSE";

const honest = (fixture: EnforcementFixture, staleTest: (name: EnforcementName) => boolean) => {
  const queries: string[] = [];
  const results = fixture.names.map((name) => {
    if (!staleTest(name)) return { fqdn: name.fqdn, caa: name.cachedCaa, source: "CACHE" };
    queries.push(name.fqdn);
    return { fqdn: name.fqdn, caa: name.currentCaa, source: "CURRENT" };
  });
  return { decision: decide(results), results, queries };
};

const ENFORCEMENT_STRATEGIES: readonly EnforcementStrategy[] = [
  {
    id: "reference",
    violatesPublicRule: "none - control",
    run: (fixture) => honest(fixture, isStale),
  },
  {
    id: "first-name-reuse",
    violatesPublicRule: "caa-current-result-bound-per-name",
    run: (fixture) => {
      const first = fixture.names.find(isStale);
      const queries: string[] = [];
      const results = fixture.names.map((name) => {
        if (!isStale(name)) return { fqdn: name.fqdn, caa: name.cachedCaa, source: "CACHE" };
        const target = first ?? name;
        queries.push(target.fqdn);
        return { fqdn: name.fqdn, caa: target.currentCaa, source: "CURRENT" };
      });
      return { decision: decide(results), results, queries };
    },
  },
  {
    id: "always-refuse",
    violatesPublicRule: "caa-all-names-must-authorize (the ISSUE half of the stated iff)",
    run: (fixture) => ({ ...honest(fixture, isStale), decision: "REFUSE" }),
  },
  {
    id: "boundary-inclusive-eight",
    violatesPublicRule: "reconcile-each-domain-name (ages of eight or less use their own cachedCaa)",
    run: (fixture) => honest(fixture, (name) => name.ageHours >= 8),
  },
  {
    id: "duplicate-same-name-queries",
    violatesPublicRule: "caa-positive-query-work-required (stated as exactly once per stale name)",
    run: (fixture) => {
      const base = honest(fixture, isStale);
      return { ...base, queries: [...base.queries, ...base.queries] };
    },
  },
  {
    id: "wrong-source-labels",
    violatesPublicRule: "reconcile-each-domain-name (CACHE versus CURRENT provenance)",
    run: (fixture) => {
      const base = honest(fixture, isStale);
      return { ...base, results: base.results.map((row) => ({ ...row, source: "CACHE" })) };
    },
  },
  {
    id: "reversed-result-order",
    violatesPublicRule: "reconcile-each-domain-name (one result per name in the original order)",
    run: (fixture) => {
      const base = honest(fixture, isStale);
      return { ...base, results: [...base.results].reverse() };
    },
  },
  {
    id: "fabricated-no-query",
    violatesPublicRule: "caa-current-result-bound-per-name and the liveness obligation",
    run: (fixture) => ({
      decision: "ISSUE",
      results: fixture.names.map((name) => ({ fqdn: name.fqdn, caa: "ALLOW" as const, source: "CURRENT" })),
      queries: [],
    }),
  },
];

const ENFORCEMENT_FIXTURES: readonly EnforcementFixture[] = [
  {
    id: "multi-name-denied-tail",
    names: [
      { fqdn: "a.example", ageHours: 24, cachedCaa: "ALLOW", currentCaa: "ALLOW" },
      { fqdn: "b.example", ageHours: 24, cachedCaa: "ALLOW", currentCaa: "ALLOW" },
      { fqdn: "c.example", ageHours: 24, cachedCaa: "ALLOW", currentCaa: "DENY" },
    ],
  },
  {
    id: "age-boundary-eight-disagreeing",
    names: [
      { fqdn: "a.example", ageHours: 8, cachedCaa: "ALLOW", currentCaa: "DENY" },
      { fqdn: "b.example", ageHours: 9, cachedCaa: "ALLOW", currentCaa: "ALLOW" },
    ],
  },
  {
    id: "all-allow-multi-name",
    names: [
      { fqdn: "a.example", ageHours: 24, cachedCaa: "ALLOW", currentCaa: "ALLOW" },
      { fqdn: "b.example", ageHours: 9, cachedCaa: "ALLOW", currentCaa: "ALLOW" },
    ],
  },
];

export interface Phase17EnforcementRow {
  readonly strategyId: string;
  readonly violatesPublicRule: string;
  readonly caughtOn: readonly string[];
  readonly escapedOn: readonly string[];
  readonly caughtAnywhere: boolean;
}

export function runPhase16EnforcementScreen(): readonly Phase17EnforcementRow[] {
  return ENFORCEMENT_STRATEGIES.map((strategy) => {
    const caughtOn: string[] = [];
    const escapedOn: string[] = [];
    for (const fixture of ENFORCEMENT_FIXTURES) {
      const failures = phase16MetricsAsWritten(fixture, strategy.run(fixture));
      (failures.length > 0 ? caughtOn : escapedOn).push(fixture.id);
    }
    return {
      strategyId: strategy.id,
      violatesPublicRule: strategy.violatesPublicRule,
      caughtOn,
      escapedOn,
      caughtAnywhere: caughtOn.length > 0,
    };
  });
}

// ---------------------------------------------------------------------------
// The assembled Lane 0 audit.
// ---------------------------------------------------------------------------

const finding = (row: Phase17AuditFinding): Phase17AuditFinding => row;

const probeProcedureFindings = (
  implemented: Phase17ImplementedProcedure,
  declared: string,
): readonly Phase17AuditFinding[] => [
  finding({
    id: "P1-one-name-controls-never-run",
    area: "probe-procedure",
    declared: `${declared} (one-name controls are half of the declared fixture set)`,
    observed: `The runner signature is (subject) => ProbeSubjectRun and carries no fixture parameter, so exactly ${implemented.distinctFixtures} fixture can be visited. That fixture has ${implemented.fixtureNameCount} names, ${implemented.fixtureStaleCount} of them stale. One-name controls run: ${implemented.oneNameControlsRun}.`,
    issueClass: "verifier-completion",
    evidence: [
      'src/phase-16/probes.ts: `run: (subject: "reference" | "mutant") => ProbeSubjectRun`',
      `frozen probe sha256 ${implemented.sourceSha256}`,
      "data/phase-16-candidate-contracts.json: validation.cheapProbe.procedure",
    ],
    falsifier:
      "A fixture parameter, a second hard-coded view, or any single-name case reachable inside runCaa would falsify this.",
  }),
  finding({
    id: "P2-malformed-repetition-shortfall",
    area: "probe-procedure",
    declared: "malformed output ... twice",
    observed: `malformedRefused(...) is invoked ${implemented.malformedChecks} time(s) in runPhase16Probe.`,
    issueClass: "verifier-completion",
    evidence: ["src/phase-16/probes.ts: runPhase16Probe body"],
    falsifier: "A second malformed invocation, or a loop around the existing one, would falsify this.",
  }),
  finding({
    id: "P3-fixture-outside-declared-envelope",
    area: "probe-procedure",
    declared: `validation-age-hours values ${JSON.stringify(implemented.envelopeAgeValues)}`,
    observed: `The probe fixture uses nowHour ${implemented.fixtureNowHour} and validatedAtHour ${JSON.stringify(implemented.fixtureValidatedAtHours)}, giving ages ${JSON.stringify(implemented.fixtureAges)}. Inside the declared envelope: ${implemented.fixtureAgesInsideDeclaredEnvelope}. The eight- and nine-hour boundary values are never exercised.`,
    issueClass: "verifier-completion",
    evidence: [
      "src/phase-16/probes.ts: runCaa view",
      "data/phase-16-candidate-contracts.json: hiddenInstanceEnvelope.dimensions[validation-age-hours]",
    ],
    falsifier: "Ages drawn from {0, 8, 9, 24, 719} in the probe fixture would falsify this.",
  }),
  finding({
    id: "P4-witness-isolation-control-vacuous-for-caa",
    area: "control-strength",
    declared: "the authority witness remained inaccessible",
    observed: `runCaa binds the private sentinel to a standalone \`marker\` constant. Sentinel present in the CAA hidden authority map: ${implemented.sentinelInCaaAuthorityMap}. The map holds only ALLOW/DENY, and neither it nor the query ledger is reachable from subjectView or subjectResult, so the isolation check has no failing branch for this candidate.`,
    issueClass: "verifier-completion",
    evidence: ["src/phase-16/probes.ts: `const authority = new Map([...])` inside runCaa"],
    falsifier:
      "The sentinel appearing inside the CAA authority map or ledger, plus a leak path into subjectResult, would make the control load-bearing.",
  }),
  finding({
    id: "P5-challenge-nonleakage-control-vacuous",
    area: "control-strength",
    declared: "the challenge did not leak it",
    observed: `challengeNonleakage asserts the sentinel is absent from the contract's public sections. The sentinel occurs ${implemented.sentinelOccurrencesInContractArtifact} time(s) in the contract artifact and ${implemented.sentinelOccurrencesInPacketArtifact} time(s) in the packet artifact, so the assertion is unfalsifiable as constructed.`,
    issueClass: "verifier-completion",
    evidence: [
      "src/phase-16/probes.ts: finishProbe challengeNonleakage",
      "data/phase-16-candidate-contracts.json",
      "data/phase-16-reader-packets.json",
    ],
    falsifier:
      "A negative control in which a deliberately leaky challenge trips the check would make it load-bearing.",
  }),
];

const readerRiskFindings = (
  enforcement: readonly Phase17EnforcementRow[],
): readonly Phase17AuditFinding[] => {
  const row = (id: string): Phase17EnforcementRow => {
    const found = enforcement.find((entry) => entry.strategyId === id);
    if (found === undefined) throw new Error(`phase-17 audit: enforcement row ${id} is absent`);
    return found;
  };
  const escaped = (id: string): string =>
    `strategy \`${id}\` escaped every declared metric on ${JSON.stringify(row(id).escapedOn)} and was caught on ${JSON.stringify(row(id).caughtOn)}`;

  return [
    finding({
      id: "R1-facade-callable-and-return-contract",
      area: "reader-raised-risk",
      declared:
        "subjectInterface: `submission/reconcile.mjs exports run(view, caa)`; `caa.current(fqdn)` returns ALLOW or DENY for that exact name.",
      observed:
        "The name, arity and return domain are stated. Synchrony, totality over unknown names, error behavior and whether `run` may return a promise are not stated anywhere in the contract.",
      issueClass: "prose-only-clarification",
      evidence: [
        "data/phase-16-candidate-contracts.json: subjectInterface, hiddenInstanceEnvelope.constraints",
      ],
      falsifier:
        "A sync/async statement or a declared error mode in the contract would make this a no-defect. If the package accepts only one of sync or async, it becomes a material contract change instead.",
    }),
    finding({
      id: "R2-exactly-once-stated-but-not-graded",
      area: "reader-raised-risk",
      declared:
        "livenessObligations: `Query every stale name exactly once`; caa-positive-query-work-required: `Each stale name must produce one host-recorded current CAA query.`",
      observed: `The declared metric is caa-stale-name-query-count >= 1 over the whole fixture. ${escaped("duplicate-same-name-queries")}. The at-most-once half of "exactly once" is enforced by nothing, and the per-name half is carried only by the binding metric.`,
      issueClass: "prose-only-clarification",
      evidence: ["data/phase-16-candidate-contracts.json: grading.metrics[caa-stale-name-query-count]"],
      falsifier:
        "A metric penalising a second query for the same stale name would move this to no-defect. Adding one now would narrow the valid-solution set and require a fresh reader packet.",
    }),
    finding({
      id: "R3-duplicate-same-name-queries-pass",
      area: "reader-raised-risk",
      declared: "forbiddenOutcomes: `checking one FQDN repeatedly to satisfy list length`",
      observed: `Repeating a query for a name already correctly queried passes every metric (${escaped("duplicate-same-name-queries")}). What the forbidden outcome actually names - repeating one FQDN INSTEAD OF querying another - is caught: strategy \`first-name-reuse\` was caught on ${JSON.stringify(row("first-name-reuse").caughtOn)}.`,
      issueClass: "no-defect",
      evidence: ["Lane 0 enforcement screen"],
      falsifier: "A duplicate-query strategy that also escapes the binding metric would falsify this.",
    }),
    finding({
      id: "R4-age-eight-versus-nine-not-discriminated",
      area: "reader-raised-risk",
      declared:
        "reconcile-each-domain-name: ages greater than eight call caa.current; `otherwise use its own cachedCaa`. Envelope constraint: `Ages equal to eight use CACHE`.",
      observed: `No declared metric grades the reported answer for a FRESH name, so an off-by-one that treats age eight as stale is invisible even when cached and current disagree: ${escaped("boundary-inclusive-eight")}.`,
      issueClass: "verifier-completion",
      evidence: ["Lane 0 enforcement screen", "data/phase-16-candidate-contracts.json: grading.metrics"],
      falsifier:
        "A metric joining every name - not only stale names - to its applicable answer would catch this. That metric enforces text already public, so it does not narrow the valid-solution set.",
    }),
    finding({
      id: "R5-one-name-deny-position-degenerate",
      area: "reader-raised-risk",
      declared:
        "hiddenInstanceEnvelope: domain-count in {1,2,3,5}; deny-position in {none, first, middle, last}.",
      observed:
        "The sampling procedure defines no collapse rule, so `domain-count: 1` crossed with `middle` or `last`, and `domain-count: 2` crossed with `middle`, name no instance.",
      issueClass: "prose-only-clarification",
      evidence: ["data/phase-16-candidate-contracts.json: hiddenInstanceEnvelope.samplingProcedure"],
      falsifier:
        "A stated collapse rule would make this a no-defect. It constrains the fixture space, not subject obligations, so the valid-solution set is untouched.",
    }),
    finding({
      id: "R6-output-source-semantics-ungraded",
      area: "reader-raised-risk",
      declared: "outputGrammar requires `source: 'CACHE' | 'CURRENT'` on every result.",
      observed: `\`source\` is syntactically required and semantically ungraded: ${escaped("wrong-source-labels")}.`,
      issueClass: "prose-only-clarification",
      evidence: ["Lane 0 enforcement screen", "data/phase-16-candidate-contracts.json: grading.metrics"],
      falsifier:
        "Grading `source` would narrow the valid-solution set and require a fresh reader packet; stating that it is ungraded does not.",
    }),
    finding({
      id: "R7-always-refuse-and-fabrication",
      area: "reader-raised-risk",
      declared:
        "caa-all-names-must-authorize: `Return ISSUE if and only if every per-name result is ALLOW; otherwise return REFUSE.`",
      observed: `Only the unsafe-ISSUE half is metered. ${escaped("always-refuse")}: a subject that does all the honest query work and then refuses unconditionally passes every declared metric on every fixture. Fabrication is caught: ${escaped("fabricated-no-query")}.`,
      issueClass: "verifier-completion",
      evidence: [
        "Lane 0 enforcement screen",
        "data/phase-16-candidate-contracts.json: grading.metrics[caa-unsafe-issuance-count]",
        "reports/PHASE-16-DISCOVERY-V3.md: the same always-refuse bypass was an independent kill reason for the BGP candidate",
      ],
      falsifier:
        "A metric counting REFUSE decisions taken while every applicable answer allows would catch it. The rule is already public as an iff, so enforcing it excludes no compliant subject.",
    }),
    finding({
      id: "R8-public-rules-enforced-semantically",
      area: "reader-raised-risk",
      declared:
        "Three public grading rules, three metrics, three checks, wired by identifier in grading.checks.",
      observed: `The wiring is complete by identifier, and incomplete semantically. The result-order clause of reconcile-each-domain-name has no metric at all: ${escaped("reversed-result-order")}. Combined with R4, R6 and R7, ${enforcement.filter((entry) => entry.strategyId !== "reference" && !entry.caughtAnywhere).length} of ${enforcement.length - 1} rule-violating strategies are caught by nothing - taxonomy class B1.`,
      issueClass: "verifier-completion",
      evidence: ["Lane 0 enforcement screen", "docs/DEFECT-TAXONOMY.md: B1, screen 6"],
      falsifier:
        "A metric per public clause, each with a subject that trips it, would falsify this. That is the Phase 17 package's enforcement gate.",
    }),
  ];
};

export function runPhase17ProbeAudit(root: string): Phase17ProbeAudit {
  const registration = readJson<ContinuationRegistration>(
    root,
    "data/phase-16-review-continuation-preregistration.json",
  );
  const reviews = readJson<ReaderReviewSet>(root, "data/phase-16-reader-reviews-final.json");
  const contracts = readJson<{
    contracts: readonly {
      candidateId: string;
      validation: { cheapProbe: { procedure: string; falsifier: string } };
    }[];
  }>(root, "data/phase-16-candidate-contracts.json");

  const frozen = registration.frozenReviewContract;
  const hashOf = (relative: string): string => sha256(readFileSync(join(root, relative)));
  const frozenInputs: readonly Phase17FrozenInput[] = [
    {
      name: "probeImplementation",
      path: "src/phase-16/probes.ts",
      registeredSha256: frozen.probeImplementationSha256,
      observedSha256: hashOf("src/phase-16/probes.ts"),
      matches: frozen.probeImplementationSha256 === hashOf("src/phase-16/probes.ts"),
    },
    {
      name: "readerOutputSchema",
      path: "data/phase-16-reader-output.schema.json",
      registeredSha256: frozen.readerOutputSchemaSha256,
      observedSha256: hashOf("data/phase-16-reader-output.schema.json"),
      matches: frozen.readerOutputSchemaSha256 === hashOf("data/phase-16-reader-output.schema.json"),
    },
    {
      name: "readerInstructions",
      path: "data/phase-16-reader-instructions.txt",
      registeredSha256: frozen.readerInstructionsSha256,
      observedSha256: hashOf("data/phase-16-reader-instructions.txt"),
      matches: frozen.readerInstructionsSha256 === hashOf("data/phase-16-reader-instructions.txt"),
    },
    {
      name: "parentPreregistration",
      path: "data/phase-16-preregistration.json",
      registeredSha256: registration.parent.preregistrationSha256,
      observedSha256: hashOf("data/phase-16-preregistration.json"),
      matches: registration.parent.preregistrationSha256 === hashOf("data/phase-16-preregistration.json"),
    },
  ];

  const caaReviews = reviews.reviews.filter((row) => row.candidateId === PHASE17_CAA_CANDIDATE);
  const registeredCaaPacket = registration.packets.find(
    (row) => row.candidateId === PHASE17_CAA_CANDIDATE,
  )?.packetSha256;
  const caaReaderVerdicts = caaReviews.map((row) => ({
    providerFamily: row.providerFamily,
    model: row.model,
    verdict: row.verdict,
    packetSha256: row.packetSha256,
    independentlyProduced: row.independentlyProduced,
    allDimensionsPass: Object.values(row.dimensions).every((value) => value === "pass"),
  }));

  const declared = contracts.contracts.find((row) => row.candidateId === PHASE17_CAA_CANDIDATE)?.validation
    .cheapProbe;
  if (declared === undefined) throw new Error("phase-17 audit: CAA cheap probe declaration is absent");

  const implemented = extractImplementedProcedure(root);
  const enforcement = runPhase16EnforcementScreen();
  const replayed = runPhase16Probe(root, PHASE17_CAA_CANDIDATE);

  return {
    schema: "agent-eval-foundry/phase-17-phase16-probe-audit@1",
    auditId: "phase17-lane0-phase16-probe-audit",
    supersedes: [
      "reports/PHASE-16-DISCOVERY-V3.md, Probe Gate: the clauses `the authority witness remained inaccessible, and the challenge did not leak it`",
      "data/phase-16-probe-results-final.json: the fields `witnessIsolated: true` and `challengeNonleakage: true` for the CAA candidate",
      "The description of the CAA candidate as an exact full-procedure probe survivor",
    ],
    frozenInputs,
    allFrozenInputsIntact: frozenInputs.every((row) => row.matches),
    funnel: {
      packetsRegistered: registration.packets.length,
      reviewsRegistered: registration.packets.length * 2,
      reviewsCompleted: reviews.reviews.filter((row) => row.classification === "completed").length,
      promoteVerdicts: reviews.reviews.filter((row) => row.verdict === "promote").length,
      candidatesWithTwoOfTwoPromote: new Set(
        reviews.reviews
          .filter((row) => row.verdict === "promote")
          .map((row) => row.candidateId)
          .filter(
            (id) =>
              reviews.reviews.filter((row) => row.candidateId === id && row.verdict === "promote").length ===
              2,
          ),
      ).size,
      probesRun: 1,
      probeSurvivors: 1,
      caaProbeFixtures: implemented.distinctFixtures,
      caaProbeDeclaredFixtureClasses: 2,
      enforcementStrategiesRun: enforcement.length,
      publicRuleViolationsCaughtNowhere: enforcement.filter(
        (row) => row.strategyId !== "reference" && !row.caughtAnywhere,
      ).length,
    },
    caaReaderVerdicts,
    caaPromotedByTwoIndependentFamilies:
      caaReaderVerdicts.length === 2 &&
      caaReaderVerdicts.every(
        (row) =>
          row.verdict === "promote" && row.independentlyProduced && row.packetSha256 === registeredCaaPacket,
      ) &&
      new Set(caaReaderVerdicts.map((row) => row.providerFamily)).size === 2,
    declaredProcedure: declared.procedure,
    declaredFalsifier: declared.falsifier,
    implemented,
    replayedProbeResult: JSON.parse(JSON.stringify(replayed)) as Record<string, unknown>,
    findings: [
      ...probeProcedureFindings(implemented, declared.procedure),
      ...readerRiskFindings(enforcement),
    ],
    retainedAsReal: [
      "The declared first-name-reuse mutant activated on the multi-name denied-tail fixture and failed exactly check-caa-per-name-binding and check-caa-safe-issuance.",
      "The reference passed that fixture with zero failures, in the same invocation as the mutant, so the B6 known-good/known-bad control is genuine and nondegenerate.",
      "Malformed output was refused rather than graded, once.",
      "Reference replay reproduced byte-identically.",
      "Both reader promotions are real, cross-family, independently produced, and bound to the registered packet hash.",
    ],
    markedIncomplete: [
      "The declared one-name control class was never executed, so `the mutant passes where it is behaviorally equivalent to the reference` is untested.",
      "The declared malformed repetition (twice) ran once.",
      "The probe fixture's ages sit outside the declared validation-age-hours envelope and never touch the eight- or nine-hour boundary.",
      "witnessIsolated and challengeNonleakage carry no evidence: neither has a reachable failing branch in the frozen probe.",
    ],
    verdict: "partial-procedure-probe-survivor",
    correction:
      "Phase 16's CAA probe is a real, nondegenerate, single-fixture B6 mutant discrimination. It is not the declared full-procedure probe, and two of its seven reported controls are unfalsifiable as constructed. The REPEAT-DISCOVERY decision does not change - it rests on the count of reader-and-probe survivors, and the survivor's mutant discrimination is retained - but the candidate must be described as a partial-procedure probe survivor until Phase 17's exact Probe V2 runs.",
  };
}

export const phase17ProbeAuditJson = (audit: Phase17ProbeAudit): string =>
  `${JSON.stringify(audit, null, 2)}\n`;

export { runPhase16EnforcementScreen as phase17EnforcementScreen };
