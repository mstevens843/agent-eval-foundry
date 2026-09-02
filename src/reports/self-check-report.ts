// The self-check behaviour report.
//
// Its whole job is to keep three numbers apart that a careless reader will merge: how many models
// SHIPPED a checker, how many WROTE one the submission does not carry, and how many only SAY they
// built one. Reporting any of them alone is misleading in a different direction.

import {
  INLINE_SCRIPT,
  KIND_MEANING,
  MIN_RUNS_PER_ARM,
  RIGOUR_ORDER,
  type SelfCheckCorrelation,
  type SelfCheckProfile,
  correlate,
} from "./self-check.js";

export interface SelfCheckReportInput {
  readonly profiles: readonly SelfCheckProfile[];
}

export function renderSelfCheckBehavior(input: SelfCheckReportInput): string {
  const p = [...input.profiles].sort(
    (a, b) => a.familyId.localeCompare(b.familyId) || a.runId.localeCompare(b.runId),
  );
  const withArtifact = p.filter((x) => x.hasSubmission);
  const observed = p.filter((x) => x.strongestObserved !== null);
  const ephemeralRuns = p.filter((x) => x.unshipped.length > 0);
  const reported = p.filter((x) => x.strongestReported !== null);
  const silent = p.filter(
    (x) =>
      x.strongestObserved === null &&
      x.unshipped.length === 0 &&
      x.strongestReported === null,
  );
  const unusedCheckers = p.filter((x) => x.definedButUnused.length > 0);
  const corr = correlate(p);

  const kindTally = new Map<string, number>();
  for (const prof of p)
    for (const s of prof.selfReported) kindTally.set(s.kind, (kindTally.get(s.kind) ?? 0) + 1);

  return [
    "# Self-check behaviour",
    "",
    "Did the model verify its own work — and can we actually tell?",
    "",
    "## The headline, in numbers that must not be merged",
    "",
    "| | |",
    "|---|---:|",
    `| submissions held | ${withArtifact.length} |`,
    `| **submissions containing an executable self-check** | **${observed.length}** |`,
    `| **runs that wrote checker source and shipped none of it** | **${ephemeralRuns.length}** |`,
    `| **transcripts describing one** | **${reported.length}** |`,
    `| **submissions shipping a checker as a separate file** | **${p.filter((x) => x.extraFiles.length > 0).length}** |`,
    `| runs that neither shipped nor described one | ${silent.length} |`,
    "",
    "Checker-required trials mandate `checker.mjs`; that file is graded in the checker-required",
    "family reports and is excluded from the voluntary shipped-checker count here.",
    "",
    [
      `**${observed.length} of ${withArtifact.length} submissions ship an executable self-check; ${ephemeralRuns.length} wrote one and did not ship it.**`,
      "",
      "An earlier version of this analysis grepped the submissions for `assert|invariant|sanity`, found",
      "nothing, and concluded that models do not verify themselves. That conclusion was about our own",
      "submission format. The `unshipped` column is the correction, and it is no longer an inference from",
      "prose: for a trial that preserves the raw agent transcript, the checker's SOURCE is in it — the",
      "body of each file the agent wrote, and each script it piped to a shell — and can be scanned by",
      "exactly the patterns the submission gets. **The checker was real and ephemeral**, and on those",
      "runs that sentence is now a measurement rather than a reading of the transcripts.",
    ].join("\n"),
    "",
    "## What each run did",
    "",
    "`observed` is source we hold and anyone can re-check. `unshipped` is source the agent wrote or",
    "piped to a shell during the session and did not submit — also source, also re-checkable, and",
    "invisible to anyone grading the artifact. `self-reported` is the model's own account of what it",
    "did, which is evidence about what it attempted and **not** evidence that it happened. The three",
    "columns are never added together.",
    "",
    "| run | family | subject | observed | unshipped | shipped files | self-reported | evidence state | scenarios failed |",
    "|---|---|---|---|---|---|---|---|---:|",
    ...p.map(
      (x) =>
        `| \`${x.runId}\` | ${x.familyId.split("-").pop()} | \`${x.subjectId}\` | ${x.strongestObserved ?? "**none**"} | ${x.unshipped.length === 0 ? "—" : (x.strongestEphemeral ?? "written, no pattern matched")} | ${x.extraFiles.length === 0 ? "graded files only" : `**+${x.extraFiles.map((f) => `\`${f}\``).join(", ")}**`} | ${x.strongestReported ?? "—"} | ${x.state === "counted" ? "counted" : `**${x.state}**`} | ${x.scenariosFailed} |`,
    ),
    "",
    "### The strongest self-reported behaviours, quoted",
    "",
    "Quoted rather than summarised, because the classification is only as good as the text under it",
    "and a reader should be able to disagree with the label without re-reading the transcripts.",
    "",
    "**Superseded runs are included here and their failure counts are not.** A model's account of how",
    "it verified itself is evidence about that model's behaviour, and a later repair to the family does",
    "not un-write the transcript. What the repair does invalidate is the OUTCOME — the failure count is",
    "about a task that no longer exists — so those rows carry the state and omit the number.",
    "",
    ...(() => {
      const strong = p
        .filter(
          (x) =>
            x.strongestReported !== null &&
            RIGOUR_ORDER.indexOf(x.strongestReported) >= RIGOUR_ORDER.indexOf("legality-table"),
        )
        // Counted runs first, then by failure count. A superseded run's number is not comparable, so
        // it never sorts above a live one on the strength of it.
        .sort(
          (a, b) =>
            Number(b.state === "counted") - Number(a.state === "counted") ||
            b.scenariosFailed - a.scenariosFailed,
        );
      if (strong.length === 0) return ["_No run described anything above an example harness._", ""];
      return strong.flatMap((x) => {
        const sig = x.selfReported.find((s) => s.kind === x.strongestReported);
        return [
          `**\`${x.runId}\`** — ${x.strongestReported}, ${x.state === "counted" ? `${x.scenariosFailed} scenarios failed` : `**${x.state}**: outcome not quotable, behaviour still is`}`,
          "",
          `> ${sig?.citation ?? "no citation"}`,
          "",
        ];
      });
    })(),
    whereTheCheckersWent(p),
    "",
    "## What kinds of checking were described",
    "",
    "| kind | runs | what it means |",
    "|---|---:|---|",
    ...RIGOUR_ORDER.filter((k) => (kindTally.get(k) ?? 0) > 0).map(
      (k) => `| \`${k}\` | ${kindTally.get(k) ?? 0} | ${KIND_MEANING[k]} |`,
    ),
    "",
    "Ordered weakest to strongest. `syntax-only` — `node --check` — is included because several runs",
    "cite it as verification, and a file that parses has established nothing about its behaviour.",
    "",
    "## Checkers that exist and are never called",
    "",
    ...(unusedCheckers.length === 0
      ? [
          "_None._ No submission defines a checking routine it never invokes. That is worth stating because it is the most misleading artifact a scan can meet: it matches every pattern and does nothing at run time.",
          "",
        ]
      : [
          "| run | defined and never called |",
          "|---|---|",
          ...unusedCheckers.map(
            (x) => `| \`${x.runId}\` | ${x.definedButUnused.map((n) => `\`${n}\``).join(", ")} |`,
          ),
          "",
        ]),
    "## Does self-verification predict passing?",
    "",
    correlationBlock(corr),
    "",
    "## Why the foundry should keep measuring this",
    "",
    "| reason | what it changes |",
    "|---|---|",
    "| A checker is the clearest signal of how a model APPROACHED the task | it separates 'wrote behaviour' from 'built a theory and tested it', which no pass rate distinguishes |",
    "| Ephemeral checkers are invisible to artifact grading | every benchmark that grades one file is measuring its own submission format on this axis, and does not know it. The `unshipped` column above is that claim measured rather than argued |",
    "| It is the cheapest possible harder variant | `checker-required-memory-poisoning` is that variant, built: it grades `checker.mjs` against the reference and against held-out mutants, so a checker that passes the reference and catches none of them is a named, gradable failure |",
    "| Coverage, not expressiveness, is where these runs fail | the failures concentrate on states the model never generated, so a family that rewards generation is testing the binding constraint |",
    "",
    "## What this report will not claim",
    "",
    "| claim | why not |",
    "|---|---|",
    "| that the models did not verify themselves | they say they did, and the transcripts are specific enough to believe |",
    "| that they did | a transcript is the model's own account; nothing here re-ran their harnesses |",
    `| that self-verification predicts outcome | ${
      corr.decidable
        ? "the arms are large enough to compare and the comparison is reported above without a test applied to it"
        : `one arm has fewer than ${MIN_RUNS_PER_ARM} counted runs`
    } |`,
    "| that a `separate-checker` was found by name | these families are ABOUT auditing and validating, so domain vocabulary and self-check vocabulary are the same words. That pattern was removed after crediting `auditAlreadyCompleted` — ordinary implementation logic — as a self-check |",
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

/**
 * What the agent wrote and did not ship, in one cell.
 *
 * Named files are listed and shell heredocs are counted. A run that piped thirty throwaway scripts
 * at a shell did thirty separate things, and printing thirty identical placeholders would bury the
 * one fact the row is for — that none of it is in the artifact.
 */
const unshippedSummary = (paths: readonly string[]): string => {
  const named = paths.filter((n) => !n.startsWith(INLINE_SCRIPT));
  const inline = paths.length - named.length;
  return [
    ...named.map((n) => `\`${n}\``),
    ...(inline === 0 ? [] : [`${inline} inline shell script(s)`]),
  ].join(", ");
};

/**
 * Where each checker ended up: in the submission, or only in the session.
 *
 * One section for both, because they are two answers to one question and the old pair said the same
 * sentence twice. Shipping a checker makes verification auditable by somebody else — a different act
 * from verifying and discarding — and both tables below are that distinction, from either side.
 *
 * Deliberately flat: what the agent wrote, what the patterns found in it, and what the run then
 * failed. No row claims the checker was good or that it caused the outcome. The honest statement is
 * that a checker existed, ran, and did not prevent the failure, with both halves side by side.
 *
 * The confound is printed inside the section rather than left to the reader, because the split that
 * leaps out of the unshipped table is a LAB split and lab and scaffolding are the same variable here.
 */
function whereTheCheckersWent(profiles: readonly SelfCheckProfile[]): string {
  const shipped = profiles.filter((x) => x.extraFiles.length > 0);
  const wrote = profiles.filter((x) => x.unshipped.length > 0);
  if (shipped.length === 0 && wrote.length === 0)
    return [
      "## Nobody shipped a checker, and no transcript holds one",
      "",
      "Every submission on record is exactly the graded file set and nothing else, and no transcript",
      "carries the body of a file the agent wrote. Read the second half as a fact about the transcripts",
      "held rather than about the models: a transcript kept as a prose summary cannot carry a file body,",
      "and only a raw agent log can answer this question.",
    ].join("\n");

  const byHarness = new Map<string, Set<string>>();
  for (const x of wrote) byHarness.set(x.harness ?? "unrecorded", (byHarness.get(x.harness ?? "unrecorded") ?? new Set()).add(x.providerFamily));
  const confounded = byHarness.size > 1 && [...byHarness.values()].every((labs) => labs.size === 1);
  return [
    "## Where the checkers went",
    "",
    `${shipped.length} of ${profiles.length} runs left a checker in the submission, where anyone grading the artifact can`,
    `re-run it. ${wrote.length} wrote verification source during the session and submitted none of it. The second`,
    "number is the one an artifact scanner cannot produce, and the difference between them is a",
    "behavioural difference between runs rather than a claim about any model's ability.",
    "",
    ...(shipped.length === 0
      ? ["_No run shipped a checker beside the graded files._", ""]
      : [
          "| run | subject | shipped beside the graded files |",
          "|---|---|---|",
          ...shipped.map(
            (x) => `| \`${x.runId}\` | \`${x.subjectId}\` | ${x.extraFiles.map((f) => `\`${f}\``).join(", ")} |`,
          ),
          "",
        ]),
    ...(wrote.length === 0
      ? []
      : [
          "Written, run, and not submitted — paths quoted from the transcript, `found` scanned by exactly",
          "the patterns the submissions get:",
          "",
          "| run | lab | scaffolding | wrote, did not ship | found | failed |",
          "|---|---|---|---|---|---:|",
          ...wrote.map(
            (x) =>
              `| \`${x.runId}\` | ${x.providerFamily} | ${x.harness ?? "unrecorded"} | ${unshippedSummary(x.unshipped)} | ${x.strongestEphemeral ?? "no pattern matched"} | ${x.scenariosFailed} |`,
          ),
          "",
          "A run in that table built something, ran it, and still failed. That is why this is reported as a",
          "behaviour and not scored as a virtue: a checker bounds what you can EXPRESS, not what you",
          "EXPLORE. **Difficulty comes from coverage of the space, not from the difficulty of stating the",
          "rule** — the conclusion the axis meter reaches from the other direction.",
          "",
          confounded
            ? [
                "**The lab split there is confounded and must not be read as a model-level finding.** Each lab",
                `ran under its own scaffolding (${[...byHarness].map(([h, labs]) => `${h} for ${[...labs].join(", ")}`).join("; ")}), so provider and agent harness are the`,
                "same variable. A harness decides whether writing a file is cheaper than piping a script to a",
                "shell, how much context a session holds, and what the transcript records at all — any of which",
                "alone could produce that column. Separating them needs the same model under both scaffoldings,",
                "which no run on record provides.",
              ].join("\n")
            : "Labs there are not aligned one-to-one with scaffolding, so the split is at least not a pure harness artifact. It is still a handful of runs.",
        ]),
  ].join("\n");
}

function correlationBlock(corr: SelfCheckCorrelation): string {
  return [
    "| arm | counted runs | failed something |",
    "|---|---:|---:|",
    `| described verification at or above an example harness | ${corr.withCheck.runs} | ${corr.withCheck.failed} |`,
    `| did not | ${corr.withoutCheck.runs} | ${corr.withoutCheck.failed} |`,
    "",
    `**${corr.decidable ? "Decidable, barely" : "Not decidable"}.** ${corr.reading}`,
    "",
    corr.decidable
      ? ""
      : "The split is reported anyway, because an undecidable comparison stated with its sample sizes is more useful than a silence a reader fills in themselves.",
  ]
    .filter((l) => l !== "")
    .join("\n");
}
