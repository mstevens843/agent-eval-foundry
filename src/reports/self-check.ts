// Did the model verify its own work, and can we actually tell?
//
// WHY THIS EXISTS
//
// An earlier version of the provider report scanned submission sources for `assert|invariant|sanity`
// and concluded: not one of sixteen submissions built a self-check. The regex was right and the
// conclusion was wrong. Reading the transcripts afterwards, most of these models describe building a
// local harness, running the public examples through it, and writing synthetic scenarios — and then
// shipping only `subject.mjs`, because the task asked for exactly one file. The checker was real and
// ephemeral, and a scanner that only reads the artifact cannot see it.
//
// That is the distinction this module is built around, because it is the difference between a claim
// about MODELS and a claim about the FILE FORMAT WE ASKED FOR:
//
//   observed        the behaviour is in source we hold. Strongest, and checkable by anyone.
//   ephemeral       the checker's SOURCE is in the transcript — a file body the agent wrote, or a
//                   script it piped to a shell — and the submission does not carry it. Source, so
//                   re-checkable by anyone; unshipped, so invisible to anyone grading the artifact.
//   self-reported   the model says it did this in its transcript. Real evidence about what it
//                   attempted, and NOT evidence that it happened. Never merged with observed.
//   absent          the artifact is present, we looked, and there is nothing.
//   unobservable    we have no artifact and no transcript. Not a finding, a gap.
//
// The second rule follows from the first: a match inside a COMMENT is not a check. Comments are
// stripped before any source pattern runs, and a claim that survives only in prose is classified
// `narrative-only` rather than counted. `results/29` in the source project was a lesson about
// exactly this — an engine's comments described a legality table it had not written.
//
// WHAT THE ANSWER TURNED OUT TO BE, and why it is worth measuring going forward: the most thoroughly
// self-verified run on record (a legality table, fourteen synthetic scenarios, structural checks
// against token-scanned ground truth) FAILED thirty-two scenarios. Its checker could express the
// rule; its generator never reached the state where the rule bit. That is the coverage argument, and
// it is the reason self-verification is reported as a behaviour rather than scored as a virtue.

export const SELF_CHECK_KINDS = [
  "legality-table",
  "assertions",
  "synthetic-scenarios",
  "example-harness",
  "fuzzing",
  "mutation-testing",
  "separate-checker",
  "audit-inspection",
  "syntax-only",
  "narrative-only",
] as const;
export type SelfCheckKind = (typeof SELF_CHECK_KINDS)[number];

export const KIND_MEANING: Readonly<Record<SelfCheckKind, string>> = {
  "legality-table":
    "an explicit table of permitted states or transitions, consulted rather than reasoned about each time",
  assertions: "executable assertions or invariant checks that fail loudly",
  "synthetic-scenarios": "inputs the model invented beyond the ones it was given",
  "example-harness": "the published examples, run through a driver the model wrote",
  fuzzing: "randomized or exhaustive generation over an input space",
  "mutation-testing": "deliberately breaking its own code to confirm its checker notices",
  "separate-checker": "a checking routine distinct from the implementation it checks",
  "audit-inspection": "reading its own output back and verifying the output rather than the code",
  "syntax-only": "`node --check` or equivalent: the file parses, and nothing else was established",
  "narrative-only": "prose describing verification, with no executable check anywhere",
};

/** How strong the checking behaviour is, independent of what kind it is. */
export const RIGOUR_ORDER: readonly SelfCheckKind[] = [
  "narrative-only",
  "syntax-only",
  "example-harness",
  "audit-inspection",
  "assertions",
  "separate-checker",
  "legality-table",
  "synthetic-scenarios",
  "fuzzing",
  "mutation-testing",
];

import type { EvidenceState } from "../trials/evidence-lifecycle.js";

export type EvidenceSource = "observed" | "ephemeral" | "self-reported" | "absent" | "unobservable";

export interface SelfCheckSignal {
  readonly kind: SelfCheckKind;
  readonly source: EvidenceSource;
  /** The exact text that produced this classification. Never a paraphrase. */
  readonly citation: string;
  /** Where it came from: `submission:LINE` or `transcript:LINE`. */
  readonly locus: string;
}

export interface SelfCheckProfile {
  readonly runId: string;
  readonly familyId: string;
  readonly subjectId: string;
  readonly providerFamily: string;
  /**
   * Where the run sits in the evidence lifecycle — not a bare counted/uncounted boolean.
   *
   * A boolean here let a superseded run appear in the behaviour table as though it were live
   * evidence: `counted: no` with no reason reads as "this run was uninteresting" rather than "the
   * task this measured no longer exists". The guard in `migration.ts` caught it on this report.
   */
  readonly state: EvidenceState;
  readonly counted: boolean;
  readonly scenariosFailed: number;
  /** Behaviour visible in source we hold. */
  readonly observed: readonly SelfCheckSignal[];
  /** Behaviour in source the agent wrote into the transcript and did not ship. */
  readonly ephemeral: readonly SelfCheckSignal[];
  /** Behaviour the model says it performed. Evidence of intent, not of occurrence. */
  readonly selfReported: readonly SelfCheckSignal[];
  /** Paths the agent wrote or piped to a shell and did not ship. Named, in transcript order. */
  readonly unshipped: readonly string[];
  /** The agent scaffolding, from the run's own metadata. Observed, and never inferred from the model. */
  readonly harness: string | null;
  /** Defined and never called — a checker that exists and does nothing. */
  readonly definedButUnused: readonly string[];
  /**
   * Files in the submission directory beyond the graded artifact.
   *
   * The single most informative field here, and the one an artifact scanner that reads only
   * `subject.mjs` cannot produce. Two runs shipped their checker as a second file — a genuine,
   * observable self-check — and reading one file per submission would have reported them as having
   * none, exactly as an earlier version of this analysis did.
   */
  readonly extraFiles: readonly string[];
  readonly hasSubmission: boolean;
  readonly hasTranscript: boolean;
  /** The strongest OBSERVED kind, or null. The headline number is built from this and nothing else. */
  readonly strongestObserved: SelfCheckKind | null;
  readonly strongestEphemeral: SelfCheckKind | null;
  readonly strongestReported: SelfCheckKind | null;
  readonly verdict: EvidenceSource;
}

// ---------------------------------------------------------------- source scanning

/**
 * Remove comments and string literals before pattern matching.
 *
 * The whole reason the first version of this analysis was wrong. `// never asserted:` in a comment
 * and `assert(x)` in code are the same three regex characters and opposite facts, and a model that
 * describes a legality table it did not write should be classified `narrative-only`, not credited
 * with one. String literals go too: a submission whose audit messages mention "invariant" is not
 * checking an invariant.
 */
export function stripNonCode(source: string): string {
  let out = "";
  let i = 0;
  const n = source.length;
  while (i < n) {
    const two = source.slice(i, i + 2);
    if (two === "//") {
      while (i < n && source[i] !== "\n") i += 1;
      continue;
    }
    if (two === "/*") {
      i += 2;
      while (i < n && source.slice(i, i + 2) !== "*/") i += 1;
      i += 2;
      continue;
    }
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i += 1;
      while (i < n && source[i] !== quote) {
        if (source[i] === "\\") i += 1;
        i += 1;
      }
      i += 1;
      out += '""';
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

interface SourcePattern {
  readonly kind: SelfCheckKind;
  readonly re: RegExp;
  readonly why: string;
}

// Deliberately narrow. Each pattern must match something that EXECUTES, not something that reads as
// though it might. A false positive here becomes a claim that a model verified itself when it did
// not, which is worse than missing a real one.
const SOURCE_PATTERNS: readonly SourcePattern[] = [
  {
    kind: "assertions",
    // The bare `assert x, msg` alternative is Python's spelling. It is not valid JavaScript, so
    // widening for one language cannot start crediting the other's ordinary code.
    re: /\b(?:assert|invariant|mustBe|require)\s*\(|\bassert\s+[A-Za-z_(]|\bthrow new (?:Error|TypeError)\s*\(\s*[^)]*(?:invariant|assertion|impossible|unreachable)/i,
    why: "an executable assertion",
  },
  {
    kind: "legality-table",
    // The second alternative is deliberately a table of PAIRS — `allowed = {('READY', 'LEASED'),`.
    // A lowercase `transitions = {` would match an implementation's own state machine, which is the
    // false positive that got `separate-checker` deleted; a set of state pairs cannot be that.
    re: /\b(?:LEGAL|ALLOWED|PERMITTED|VALID_TRANSITIONS|TRANSITIONS|LEGAL_TRANSITIONS)\s*(?:=|:)\s*(?:new (?:Map|Set)|\{|\[)|\b(?:allowed|legal|permitted)\w*\s*=\s*[{[]\s*\n?\s*[([]/i,
    why: "a declared table of permitted states or transitions",
  },
  {
    kind: "fuzzing",
    re: /\bfuzz[A-Z_]?\w*\s*\(|\bfor\s*\([^)]*\bfuzz\b[^)]*\)/i,
    why: "a generation loop over an input space",
  },
  {
    kind: "mutation-testing",
    re: /\bmutant|\bmutation(?:Test|s)\b/i,
    why: "deliberate self-mutation",
  },
];

// DELIBERATELY NOT SOURCE PATTERNS: `separate-checker` and `audit-inspection`.
//
// Both were here and both were wrong, and the way they were wrong is the failure this whole module
// is a correction for. `function auditAlreadyCompleted(trace, app)` in `ui-codex-1` matched
// `audit[A-Z]` and was credited as a self-check. It is not one: it is the submission deciding
// whether a trace has already run, which is the task. These families are ABOUT auditing and
// validating, so their domain vocabulary and the vocabulary of self-verification are the same words,
// and a name-shaped pattern cannot separate them.
//
// The patterns that survive are the ones that cannot plausibly be ordinary implementation logic in a
// submission that ships behaviour and nothing else: an executable assertion, a declared legality
// table, a fuzz loop, self-mutation. Both dropped kinds remain in `CLAIM_PATTERNS` below, where a
// model describing its own checker in prose is classified as exactly that — self-reported.

/**
 * Find identifiers that look like checkers, are defined, and are never called.
 *
 * A checker that exists and is never invoked is the most misleading artifact a scan can meet: it
 * matches every pattern above and does nothing at run time. Naming it separately is the only honest
 * way to report it.
 */
export function definedButUnused(code: string): readonly string[] {
  const declared = new Map<string, number>();
  const decl = /\b(?:function|const|let|var)\s+((?:check|verify|validate|assert|audit)[A-Z_]\w*)/g;
  for (let m = decl.exec(code); m !== null; m = decl.exec(code)) {
    const name = m[1];
    if (name !== undefined) declared.set(name, (declared.get(name) ?? 0) + 1);
  }
  const unused: string[] = [];
  for (const name of declared.keys()) {
    // A call is the identifier followed by `(` somewhere other than its own declaration.
    const calls = code.match(new RegExp(`\\b${name}\\s*\\(`, "g")) ?? [];
    const declarations = code.match(new RegExp(`\\b(?:function|const|let|var)\\s+${name}\\b`, "g")) ?? [];
    // `function f(` counts as one apparent call; subtract the declarations to get real invocations.
    if (calls.length - declarations.length <= 0) unused.push(name);
  }
  return unused.sort();
}

function lineOf(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i += 1) if (source[i] === "\n") line += 1;
  return line;
}

/**
 * A shipped file that imports the graded artifact is a driver for it.
 *
 * Structural rather than name-based, which is what makes it safe. `_test_harness.mjs` in one real
 * submission reimplements the app facade and runs the subject through it — an unambiguous self-check
 * — and contains no `assert`, no `LEGAL` table and nothing else the pattern list looks for. Widening
 * those patterns to catch it would have re-introduced the false positives they were narrowed to
 * exclude. "This file executes the thing being graded" cannot be said by accident.
 */
export function importsGradedArtifact(
  name: string,
  source: string,
  shipped: readonly string[] = ["subject.mjs"],
): boolean {
  if (shipped.some((s) => name.endsWith(s))) return false;
  // The module roots of the graded submission: `subject.mjs` -> `subject`, `engine/db.py` ->
  // `engine`. Short roots are dropped because a two-letter word matches everything.
  const roots = [...new Set(shipped.map((s) => (s.split("/")[0] ?? s).replace(/\.\w+$/, "")))].filter(
    (r) => r.length > 2,
  );
  if (roots.length === 0) return false;
  return new RegExp(`\\b(?:import|from|require)\\b[^\\n]{0,80}\\b(?:${roots.join("|")})\\b`).test(source);
}

/** The placeholder name for a script the agent piped to a shell rather than saving. */
export const INLINE_SCRIPT = "<inline script>";

function walkRecords(transcript: string, visit: (node: Record<string, unknown>) => void): void {
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (node === null || typeof node !== "object") return;
    visit(node as Record<string, unknown>);
    for (const value of Object.values(node)) walk(value);
  };
  for (const line of transcript.split("\n")) {
    if (!line.startsWith("{")) continue;
    try {
      walk(JSON.parse(line));
    } catch {
      // Not a record line. Silence is correct: an unparsed line is not evidence of anything.
    }
  }
}

/**
 * Source the agent wrote, ran, and did not ship.
 *
 * This module's founding claim — "the checker was real and ephemeral" — was read off prose and never
 * measured, because a family whose submission is one file preserves only that file. A trial holding
 * the RAW agent transcript holds the missing source: each written file's body is the payload of a
 * write tool call, and each throwaway script's body is inside the shell command that ran it. Both
 * are source and re-checkable by anyone with the transcript, and neither is `observed`, because
 * nobody grading the submission can see them.
 *
 * A written path ending in one of `shipped` is the artifact, not a checker. Structural, so it needs
 * no list of blessed checker names and cannot be defeated by a model that picks a different one. A
 * transcript line that does not parse as JSON is skipped, so prose is never credited as source.
 */
export function extractCheckers(
  transcript: string,
  shipped: readonly string[],
): readonly { readonly name: string; readonly source: string }[] {
  const written = new Map<string, string>();
  const inline: { name: string; source: string }[] = [];
  walkRecords(transcript, (o) => {
    const path = typeof o.file_path === "string" ? o.file_path : null;
    // Last write wins: a file rewritten eight times is one checker, and the last body is the one
    // that ran. Counting the rewrites would report iteration as if it were eight checkers.
    if (path !== null && typeof o.content === "string" && !shipped.some((s) => path.endsWith(s)))
      written.set(path, o.content);
    if (typeof o.command === "string")
      for (const m of o.command.matchAll(/<<\s*'?(\w+)'?\r?\n([\s\S]*?)\r?\n\1\b/g)) {
        const body = m[2] ?? "";
        // Short heredocs are configuration and log filters, not checkers.
        if (body.length >= 200) inline.push({ name: `${INLINE_SCRIPT} ${inline.length + 1}`, source: body });
      }
  });
  return [...[...written].map(([name, source]) => ({ name, source })), ...inline];
}

/**
 * The model's own words, out of a machine transcript.
 *
 * `scanTranscript` quotes what it matched, and a match found inside a serialized tool call quotes
 * JSON punctuation instead of a sentence — the transcript equivalent of crediting a comment. A raw
 * agent log carries the prose in `text` and `description` fields; a transcript that is already prose
 * has no record lines and comes back unchanged, so no existing family's classification moves.
 */
export function transcriptProse(transcript: string): string {
  const said: string[] = [];
  walkRecords(transcript, (o) => {
    for (const key of ["text", "description"])
      if (typeof o[key] === "string") said.push(o[key] as string);
  });
  return said.length === 0 ? transcript : said.join("\n");
}

/** Scan submission source for behaviour that actually executes. */
export function scanSubmission(source: string): readonly SelfCheckSignal[] {
  const code = stripNonCode(source);
  const signals: SelfCheckSignal[] = [];
  for (const pattern of SOURCE_PATTERNS) {
    const re = new RegExp(
      pattern.re.source,
      pattern.re.flags.includes("g") ? pattern.re.flags : `${pattern.re.flags}g`,
    );
    const m = re.exec(code);
    if (m === null) continue;
    signals.push({
      kind: pattern.kind,
      source: "observed",
      citation: m[0].trim().slice(0, 120),
      locus: `submission:${lineOf(code, m.index)}`,
    });
  }
  return signals;
}

// ---------------------------------------------------------------- transcript scanning

interface ClaimPattern {
  readonly kind: SelfCheckKind;
  readonly re: RegExp;
}

// These read a model's own account of what it did. Every hit is `self-reported` and none of them is
// ever promoted to `observed`, however specific the wording.
const CLAIM_PATTERNS: readonly ClaimPattern[] = [
  { kind: "syntax-only", re: /node\s+--check|--check\s+submission/i },
  {
    kind: "example-harness",
    re: /\b(?:local|mock|small)\s+(?:mock\s+)?harness\b|ran? (?:the )?(?:public|visible|provided) examples?\b|against (?:the |all )?(?:three |the )?(?:public|visible) examples?/i,
  },
  {
    kind: "synthetic-scenarios",
    re: /\b\d+\s+synthetic\b|\bsynthetic (?:scenarios?|checks?|cases?|tests?)\b|\bcases? I (?:wrote|invented|constructed)\b/i,
  },
  {
    kind: "fuzzing",
    re: /\bfuzz(?:ed|ing|er)?\b|\brandomi[sz]ed (?:inputs?|trials?)\b|\bexhaustive(?:ly)? (?:enumerat|generat)/i,
  },
  {
    kind: "mutation-testing",
    re: /\bmutation tests?\b|\bmutated (?:my|its|the) own\b|\bbroke it deliberately\b/i,
  },
  { kind: "legality-table", re: /\blegal(?:ity)? (?:table|transitions?)\b|\btransition table\b/i },
  {
    kind: "assertions",
    re: /\bstructural checks?\b|\bassertions?\b|\binvariants? (?:checked|verified|held)\b/i,
  },
  { kind: "audit-inspection", re: /\baudit (?:trail|log|events?)\b.{0,40}\b(?:match|verif|check|against)/i },
];

export function scanTranscript(transcript: string): readonly SelfCheckSignal[] {
  const signals: SelfCheckSignal[] = [];
  for (const pattern of CLAIM_PATTERNS) {
    const m = pattern.re.exec(transcript);
    if (m === null) continue;
    const start = Math.max(0, m.index - 40);
    signals.push({
      kind: pattern.kind,
      source: "self-reported",
      citation: transcript
        .slice(start, m.index + m[0].length + 60)
        .replace(/\s+/g, " ")
        .trim(),
      locus: `transcript:${lineOf(transcript, m.index)}`,
    });
  }
  return signals;
}

const strongest = (signals: readonly SelfCheckSignal[]): SelfCheckKind | null => {
  let best: SelfCheckKind | null = null;
  for (const s of signals) {
    if (best === null || RIGOUR_ORDER.indexOf(s.kind) > RIGOUR_ORDER.indexOf(best)) best = s.kind;
  }
  return best;
};

export interface ProfileInput {
  readonly runId: string;
  readonly familyId: string;
  readonly subjectId: string;
  readonly providerFamily: string;
  readonly state: EvidenceState;
  readonly scenariosFailed: number;
  /** Every file in the submission directory, name and source. Scanned in full. */
  readonly submissionFiles: readonly { readonly name: string; readonly source: string }[];
  readonly transcript: string | null;
  /**
   * The graded artifact, or null when the whole submission is graded.
   *
   * Was the literal string `subject.mjs` in two places, which is a claim about one family's
   * submission format written into a module that reads every family's. A trial whose submission is a
   * seven-file Python package reported all seven as checkers shipped beside the artifact.
   */
  readonly gradedArtifact?: string | null;
  readonly harness?: string | null;
}

export function profileRun(input: ProfileInput): SelfCheckProfile {
  const graded = input.gradedArtifact === undefined ? "subject.mjs" : input.gradedArtifact;
  const shipped = [...input.submissionFiles.map((f) => f.name), ...(graded === null ? [] : [graded])];
  // Every file, not just the graded artifact. A model that ships `subject.mjs` and `_test.mjs` has
  // done the thing this module measures, and reading one file per submission misses it entirely.
  const observed = input.submissionFiles.flatMap((f) => [
    ...scanSubmission(f.source).map((sig) => ({
      ...sig,
      locus: `${f.name}:${sig.locus.split(":")[1] ?? "?"}`,
    })),
    ...(importsGradedArtifact(f.name, f.source, shipped)
      ? [
          {
            kind: "example-harness" as const,
            source: "observed" as const,
            citation: `\`${f.name}\` imports the graded submission and runs it`,
            locus: `${f.name}:1`,
          },
        ]
      : []),
  ]);
  // Source the agent wrote and did not ship, scanned by exactly the patterns the submission gets.
  // Same evidence bar, different reach: nobody grading the artifact can see any of it.
  const checkers = input.transcript === null ? [] : extractCheckers(input.transcript, shipped);
  const ephemeral = checkers.flatMap((f) => [
    ...scanSubmission(f.source).map((sig) => ({ ...sig, source: "ephemeral" as const, locus: `transcript:${f.name}` })),
    // Same structural argument as for a shipped second file: "this source executes the thing being
    // graded" cannot be said by accident, and it is the only signal that reaches a checker built out
    // of a failure collector rather than out of `assert`.
    ...(importsGradedArtifact(f.name, f.source, shipped)
      ? [
          {
            kind: "example-harness" as const,
            source: "ephemeral" as const,
            citation: `\`${f.name}\` imports the graded submission and runs it`,
            locus: `transcript:${f.name}`,
          },
        ]
      : []),
  ]);
  const reported = input.transcript === null ? [] : scanTranscript(transcriptProse(input.transcript));
  const unused = input.submissionFiles.flatMap((f) => definedButUnused(stripNonCode(f.source)));
  const extraFiles =
    graded === null
      ? []
      : input.submissionFiles
          .map((f) => f.name)
          .filter((n) => n !== graded)
          .sort();

  // A model whose transcript describes verification and whose submission contains none of it is not
  // lying and is not verified either. It built something and did not ship it, and `narrative-only`
  // is the honest name for what is left in the artifact.
  const narrative: SelfCheckSignal[] =
    observed.length === 0 && ephemeral.length === 0 && reported.length > 0
      ? [
          {
            kind: "narrative-only",
            source: "absent",
            citation:
              "verification described in the transcript; nothing executable in the submitted artifact",
            locus: "submission:—",
          },
        ]
      : [];

  const verdict: EvidenceSource =
    input.submissionFiles.length === 0 && input.transcript === null
      ? "unobservable"
      : observed.length > 0
        ? "observed"
        : ephemeral.length > 0
          ? "ephemeral"
          : reported.length > 0
            ? "self-reported"
            : "absent";

  return {
    runId: input.runId,
    familyId: input.familyId,
    subjectId: input.subjectId,
    providerFamily: input.providerFamily,
    state: input.state,
    counted: input.state === "counted",
    scenariosFailed: input.scenariosFailed,
    observed: [...observed, ...narrative],
    ephemeral,
    selfReported: reported,
    unshipped: checkers.map((f) => f.name),
    harness: input.harness ?? null,
    definedButUnused: [...new Set(unused)].sort(),
    extraFiles,
    hasSubmission: input.submissionFiles.length > 0,
    hasTranscript: input.transcript !== null,
    strongestObserved: strongest(observed),
    strongestEphemeral: strongest(ephemeral),
    strongestReported: strongest(reported),
    verdict,
  };
}

// ---------------------------------------------------------------- correlation

export interface SelfCheckCorrelation {
  readonly withCheck: { readonly runs: number; readonly failed: number };
  readonly withoutCheck: { readonly runs: number; readonly failed: number };
  /** Whether the sample can support any statement about correlation at all. */
  readonly decidable: boolean;
  readonly reading: string;
}

/** Minimum runs on BOTH sides before a correlation is worth stating as anything but "unknown". */
export const MIN_RUNS_PER_ARM = 3;

/**
 * Does self-verification predict passing?
 *
 * Almost certainly not answerable yet, and the point of computing it is to say so with a number
 * instead of a shrug. The arms are built from `self-reported` behaviour as well as observed, because
 * with zero observed checkers the observed-only split has an empty arm and no question at all.
 */
export function correlate(profiles: readonly SelfCheckProfile[]): SelfCheckCorrelation {
  const counted = profiles.filter((p) => p.counted);
  const rigorous = (p: SelfCheckProfile): boolean => {
    const kind = p.strongestObserved ?? p.strongestEphemeral ?? p.strongestReported;
    return kind !== null && RIGOUR_ORDER.indexOf(kind) >= RIGOUR_ORDER.indexOf("example-harness");
  };
  const withCheck = counted.filter(rigorous);
  const withoutCheck = counted.filter((p) => !rigorous(p));
  const arms = {
    withCheck: { runs: withCheck.length, failed: withCheck.filter((p) => p.scenariosFailed > 0).length },
    withoutCheck: {
      runs: withoutCheck.length,
      failed: withoutCheck.filter((p) => p.scenariosFailed > 0).length,
    },
  };
  const decidable = arms.withCheck.runs >= MIN_RUNS_PER_ARM && arms.withoutCheck.runs >= MIN_RUNS_PER_ARM;
  return {
    ...arms,
    decidable,
    reading: decidable
      ? `${arms.withCheck.failed}/${arms.withCheck.runs} of the self-verifying runs failed something, against ${arms.withoutCheck.failed}/${arms.withoutCheck.runs} of the rest. With arms this small the comparison is suggestive at best and no test is applied to it.`
      : `Not decidable: one arm has fewer than ${MIN_RUNS_PER_ARM} counted runs (${arms.withCheck.runs} with, ${arms.withoutCheck.runs} without). A correlation quoted from an empty arm is an artifact of the split, not a finding.`,
  };
}
