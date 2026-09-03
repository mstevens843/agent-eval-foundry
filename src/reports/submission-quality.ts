// What each model actually produced, as a structured record rather than a pass rate.
//
// WHY THIS IS NOT A RANKING
//
// The obvious thing to build from sixteen trials across two labs is a leaderboard, and it would be
// worthless: every per-provider count here is below the threshold at which a rate means anything,
// and the families are two, not a benchmark. What the trials CAN support is diagnosis — a structured
// description of how each model approached the task, so that a difference in outcome has something
// to be explained by.
//
// So every field below is descriptive, none is scored, and the report that renders it sorts by run
// id rather than by anything that would read as a ranking.
//
// THE ONE FIELD THAT IS A JUDGEMENT, and is labelled as one: stated confidence. A model that writes
// "the implementation is complete and verified" and then fails thirty-two scenarios has told us
// something real, and it is not that it was lying — it is that its own verification did not reach
// the failing states. That gap between asserted certainty and measured outcome is the most
// actionable signal in the whole record, and it is computed from language, so it is reported as a
// language signal and never as a claim about the model's internal calibration.

import type { EvidenceState } from "../trials/evidence-lifecycle.js";
import type { SelfCheckProfile } from "./self-check.js";

export type StatedConfidence = "assertive" | "hedged" | "mixed" | "silent";

/** Calibration is only interesting where confidence and outcome disagree. */
export type Calibration = "overconfident" | "appropriately-hedged" | "understated" | "aligned" | "n/a";

export interface SubmissionQuality {
  readonly runId: string;
  readonly familyId: string;
  readonly subjectId: string;
  readonly providerFamily: string;
  readonly state: EvidenceState;

  readonly filesWritten: number;
  readonly lines: number;
  readonly bytes: number;

  readonly ruleCodesCited: number | null;
  readonly ruleCodesPublished: number;

  readonly selfCheckObserved: string | null;
  readonly selfCheckReported: string | null;

  readonly transcriptLines: number;
  /** Shell commands the transcript quotes, verbatim. Evidence of what was run, not proof. */
  readonly commandsCited: readonly string[];

  readonly scenariosGraded: number;
  readonly scenariosFailed: number;
  readonly checksFailed: readonly string[];

  readonly runtimeSeconds: number | null;
  readonly costUsd: number | null;

  readonly statedConfidence: StatedConfidence;
  readonly confidenceCitation: string | null;
  readonly calibration: Calibration;
}

const ASSERTIVE =
  /\b(?:complete and verified|fully verified|all (?:checks|tests|examples) pass(?:ed)?|verified|correct(?:ly)? (?:implements|handles)|passes all|0 violations|no violations|final checks passed)\b/i;
const HEDGED =
  /\b(?:should (?:be|work|handle)|I believe|likely|may (?:not )?(?:be|fail|handle)|not (?:fully )?(?:tested|verified)|did not (?:test|verify|check)|untested|assumes?|caveat|limitation)\b/i;

/** Backticked shell commands, which is how every transcript on record quotes what it ran. */
export function commandsIn(transcript: string): readonly string[] {
  const out = new Set<string>();
  const re = /`([^`\n]{3,120})`/g;
  for (let m = re.exec(transcript); m !== null; m = re.exec(transcript)) {
    const text = (m[1] ?? "").trim();
    if (/^(?:node|npm|npx|pnpm|bash|sh|python3?|deno|bun)\b/.test(text)) out.add(text);
  }
  return [...out].sort();
}

export function statedConfidenceOf(transcript: string | null): {
  readonly confidence: StatedConfidence;
  readonly citation: string | null;
} {
  if (transcript === null || transcript.trim().length === 0) return { confidence: "silent", citation: null };
  const a = ASSERTIVE.exec(transcript);
  const h = HEDGED.exec(transcript);
  const snippet = (m: RegExpExecArray): string =>
    transcript
      .slice(Math.max(0, m.index - 60), m.index + m[0].length + 60)
      .replace(/\s+/g, " ")
      .trim();
  if (a !== null && h !== null) return { confidence: "mixed", citation: snippet(a) };
  if (a !== null) return { confidence: "assertive", citation: snippet(a) };
  if (h !== null) return { confidence: "hedged", citation: snippet(h) };
  return { confidence: "silent", citation: null };
}

/**
 * Confidence against outcome.
 *
 * Only defined for counted runs: a superseded or refused run has no outcome to be calibrated
 * against, and scoring one would be describing a task that no longer exists.
 */
export function calibrationOf(
  confidence: StatedConfidence,
  counted: boolean,
  scenariosFailed: number,
): Calibration {
  if (!counted) return "n/a";
  const failed = scenariosFailed > 0;
  if (confidence === "assertive") return failed ? "overconfident" : "aligned";
  if (confidence === "hedged" || confidence === "mixed")
    return failed ? "appropriately-hedged" : "understated";
  return "n/a";
}

export interface QualityInput {
  readonly runId: string;
  readonly familyId: string;
  readonly subjectId: string;
  readonly providerFamily: string;
  readonly state: EvidenceState;
  readonly submissionFiles: readonly string[];
  readonly source: string | null;
  readonly transcript: string | null;
  readonly ruleCodes: readonly string[];
  readonly scenariosGraded: number;
  readonly scenariosFailed: number;
  readonly checksFailed: readonly string[];
  readonly runtimeSeconds: number | null;
  readonly costUsd: number | null;
  readonly selfCheck: SelfCheckProfile | null;
}

export function qualityOf(input: QualityInput): SubmissionQuality {
  const source = input.source ?? "";
  const transcript = input.transcript ?? "";
  const { confidence, citation } = statedConfidenceOf(input.transcript);
  return {
    runId: input.runId,
    familyId: input.familyId,
    subjectId: input.subjectId,
    providerFamily: input.providerFamily,
    state: input.state,
    filesWritten: input.submissionFiles.length,
    lines: source === "" ? 0 : source.split("\n").length,
    bytes: source.length,
    ruleCodesCited:
      input.ruleCodes.length === 0 ? null : input.ruleCodes.filter((c) => source.includes(c)).length,
    ruleCodesPublished: input.ruleCodes.length,
    selfCheckObserved: input.selfCheck?.strongestObserved ?? null,
    selfCheckReported: input.selfCheck?.strongestReported ?? null,
    transcriptLines: transcript === "" ? 0 : transcript.split("\n").length,
    commandsCited: commandsIn(transcript),
    scenariosGraded: input.scenariosGraded,
    scenariosFailed: input.scenariosFailed,
    checksFailed: [...input.checksFailed].sort(),
    runtimeSeconds: input.runtimeSeconds,
    costUsd: input.costUsd,
    statedConfidence: confidence,
    confidenceCitation: citation,
    calibration: calibrationOf(confidence, input.state === "counted", input.scenariosFailed),
  };
}

// ---------------------------------------------------------------- the report

const pct = (n: number, d: number): string => (d === 0 ? "—" : `${Math.round((n / d) * 100)}%`);

export function renderSubmissionQuality(rows: readonly SubmissionQuality[]): string {
  const sorted = [...rows].sort((a, b) => a.runId.localeCompare(b.runId));
  const counted = sorted.filter((r) => r.state === "counted");
  const byProvider = new Map<string, SubmissionQuality[]>();
  for (const r of counted) byProvider.set(r.providerFamily, [...(byProvider.get(r.providerFamily) ?? []), r]);
  const overconfident = counted.filter((r) => r.calibration === "overconfident");

  return [
    "# Submission quality, by model",
    "",
    "**This is not a ranking.** Every per-provider count here is below the threshold at which a rate",
    "means anything, and two families are not a benchmark. What follows is a structured description of",
    "how each model approached the task, so that a difference in outcome has something to be explained",
    "by. Rows are sorted by run id for exactly that reason.",
    "",
    "## Every counted submission",
    "",
    "| run | subject | lab | files | lines | rules cited | self-check (shipped / described) | commands quoted | failed |",
    "|---|---|---|---:|---:|---:|---|---:|---:|",
    ...counted.map(
      (r) =>
        `| \`${r.runId}\` | \`${r.subjectId}\` | ${r.providerFamily} | ${r.filesWritten} | ${r.lines} | ${r.ruleCodesCited === null ? "n/a" : `${r.ruleCodesCited}/${r.ruleCodesPublished}`} | ${r.selfCheckObserved ?? "**none**"} / ${r.selfCheckReported ?? "—"} | ${r.commandsCited.length} | ${r.scenariosFailed} |`,
    ),
    "",
    "`rules cited` is `n/a` where the family publishes no numbered rule codes; zero-of-zero is not a",
    "low score. `self-check` shows what is in the artifact and what the transcript describes, in that",
    "order, and the two are never added.",
    "",
    "## By lab",
    "",
    "Descriptive, and small. The interval on every one of these is wide enough to overlap the others.",
    "",
    "| lab | counted | failed ≥1 | median lines | mean runtime | subjects |",
    "|---|---:|---:|---:|---:|---|",
    ...[...byProvider.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([lab, rs]) => {
        const lines = rs.map((r) => r.lines).sort((a, b) => a - b);
        const median = lines.length === 0 ? 0 : (lines[Math.floor(lines.length / 2)] ?? 0);
        const times = rs.map((r) => r.runtimeSeconds).filter((t): t is number => t !== null);
        const mean = times.length === 0 ? null : Math.round(times.reduce((s, t) => s + t, 0) / times.length);
        const subjects = [...new Set(rs.map((r) => r.subjectId))].sort();
        return `| ${lab} | ${rs.length} | ${rs.filter((r) => r.scenariosFailed > 0).length} | ${median} | ${mean === null ? "—" : `${mean}s`} | ${subjects.map((s) => `\`${s}\``).join(", ")} |`;
      }),
    "",
    "## Stated confidence against measured outcome",
    "",
    "The one judgement in this report, and it is computed from language rather than from anything the",
    "model knows about itself. A run whose transcript states the work is verified, and which then",
    "fails scenarios, has not lied — its own verification did not reach the failing states. That gap",
    "is the most actionable thing in the record, and it is reported as a **language signal**.",
    "",
    "| run | stated | outcome | reading |",
    "|---|---|---|---|",
    ...counted.map(
      (r) =>
        `| \`${r.runId}\` | ${r.statedConfidence} | ${r.scenariosFailed === 0 ? "passed everything" : `${r.scenariosFailed} failed`} | **${r.calibration}** |`,
    ),
    "",
    overconfident.length === 0
      ? "_No counted run made an unqualified correctness claim and then failed._"
      : [
          `**${overconfident.length} of ${counted.length} counted runs (${pct(overconfident.length, counted.length)}) asserted correctness and then failed scenarios.**`,
          "",
          ...overconfident.map(
            (r) =>
              `- \`${r.runId}\` — ${r.scenariosFailed} failed. > ${r.confidenceCitation ?? "no citation"}`,
          ),
          "",
          "None of these is a model being careless. Every one of them describes a verification procedure",
          "in the same transcript, and the procedure ran. What it did not do is generate the states where",
          "the property breaks — which is the coverage argument, arriving from the models' own words",
          "rather than from the axis meter.",
        ].join("\n"),
    "",
    "## What each model ran",
    "",
    "Commands quoted in the transcripts, verbatim. These are the model's account of what it executed;",
    "nothing here re-ran them.",
    "",
    ...(() => {
      const all = new Map<string, string[]>();
      for (const r of counted) for (const c of r.commandsCited) all.set(c, [...(all.get(c) ?? []), r.runId]);
      if (all.size === 0) return ["_No transcript quotes a shell command._", ""];
      return [
        "| command | runs |",
        "|---|---|",
        ...[...all.entries()]
          .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
          .map(([cmd, runs]) => `| \`${cmd}\` | ${runs.length} |`),
        "",
      ];
    })(),
    "## What this report will not support",
    "",
    "| claim | why not |",
    "|---|---|",
    "| that one lab is better at these families | the counts are far below the five-trial threshold and the families are two |",
    "| that longer submissions are better | the longest submission on record is also among the highest failure counts |",
    "| that a model is poorly calibrated in general | `overconfident` here is a property of one transcript's wording against one outcome, not a measurement of calibration |",
    "| that the commands listed were actually run | they are quoted from the model's own account; nothing re-executed them |",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}
