// The self-check behaviour report.
//
// Its whole job is to keep two numbers apart that a careless reader will merge: how many models
// SHIPPED a checker, and how many models SAY they built one. The first is zero. The second is most
// of them. Reporting either alone is misleading in a different direction.

import {
  KIND_MEANING,
  MIN_RUNS_PER_ARM,
  RIGOUR_ORDER,
  type SelfCheckCorrelation,
  type SelfCheckProfile,
  correlate,
} from "./self-check.js";

export interface SelfCheckReportInput {
  readonly profiles: readonly SelfCheckProfile[];
  /**
   * The source project's strongest engine, for contrast. Not a trial in this repository and
   * labelled as such everywhere it appears — it is the only data point on record of a model that
   * DID ship its checker, and it is the reason this analysis exists.
   */
  readonly historicalContrast: {
    readonly label: string;
    readonly built: readonly string[];
    readonly outcome: string;
  };
}

export function renderSelfCheckBehavior(input: SelfCheckReportInput): string {
  const p = [...input.profiles].sort(
    (a, b) => a.familyId.localeCompare(b.familyId) || a.runId.localeCompare(b.runId),
  );
  const withArtifact = p.filter((x) => x.hasSubmission);
  const observed = p.filter((x) => x.strongestObserved !== null);
  const reported = p.filter((x) => x.strongestReported !== null);
  const silent = p.filter((x) => x.strongestObserved === null && x.strongestReported === null);
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
    "## The headline, in two numbers that must not be merged",
    "",
    "| | |",
    "|---|---:|",
    `| submissions held | ${withArtifact.length} |`,
    `| **submissions containing an executable self-check** | **${observed.length}** |`,
    `| **transcripts describing one** | **${reported.length}** |`,
    `| **submissions shipping a checker as a separate file** | **${p.filter((x) => x.extraFiles.length > 0).length}** |`,
    `| runs that neither shipped nor described one | ${silent.length} |`,
    "",
    "Checker-required trials mandate `checker.mjs`; that file is graded in the checker-required",
    "family reports and is excluded from the voluntary shipped-checker count here.",
    "",
    observed.length === 0 && reported.length > 0
      ? [
          `**Not one of ${withArtifact.length} submissions ships a checker, and ${reported.length} of them describe building one.**`,
          "",
          "That gap is the finding, and it is not the one an artifact scan alone produces. An earlier",
          "version of this analysis grepped the submissions for `assert|invariant|sanity`, found nothing,",
          "and concluded that models do not verify themselves. Reading the transcripts says something",
          "different and more specific: they build a harness, run the published examples through it,",
          "write scenarios of their own — and then ship one file, because one file is what the task",
          "asked for. **The checker was real and ephemeral.** What we measured the first time was our own",
          "submission format.",
        ].join("\n")
      : observed.length > 0
        ? `**${observed.length} of ${withArtifact.length} submissions contain an executable self-check.** The rows below name the exact construct and the line it sits on.`
        : "**No self-verification is visible in either artifacts or transcripts.** With no transcript claims either, that is a statement about the runs on record and not yet about models.",
    "",
    "## What each run did",
    "",
    "`observed` is source we hold and anyone can re-check. `self-reported` is the model's own account",
    "of what it did during the session, which is evidence about what it attempted and **not** evidence",
    "that it happened. The two columns are never added together.",
    "",
    "| run | family | subject | observed | shipped files | self-reported | evidence state | scenarios failed |",
    "|---|---|---|---|---|---|---|---:|",
    ...p.map(
      (x) =>
        `| \`${x.runId}\` | ${x.familyId.split("-").pop()} | \`${x.subjectId}\` | ${x.strongestObserved ?? "**none**"} | ${x.extraFiles.length === 0 ? "subject only" : `**+${x.extraFiles.map((f) => `\`${f}\``).join(", ")}**`} | ${x.strongestReported ?? "—"} | ${x.state === "counted" ? "counted" : `**${x.state}**`} | ${x.scenariosFailed} |`,
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
    shippedCheckerSection(p),
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
    "## The contrast that makes this worth measuring",
    "",
    `**${input.historicalContrast.label}** — not a trial in this repository, and the only run on record`,
    "that shipped its own checker. It built:",
    "",
    ...input.historicalContrast.built.map((b) => `- ${b}`),
    "",
    `And the outcome: ${input.historicalContrast.outcome}`,
    "",
    "That is the reason this report describes a behaviour rather than scoring a virtue. The most",
    "thoroughly self-verified implementation on record still failed, and it failed on a state its own",
    "generator never reached. A checker bounds what you can express; it does not bound what you",
    "explore. **Difficulty comes from coverage of the space, not from the difficulty of stating the",
    "rule** — which is the same conclusion the axis meter reaches from the other direction.",
    "",
    "The same pattern shows up here without the contrast: the run describing the most rigorous",
    "self-verification in the table above is not the run that passed.",
    "",
    "## Why the foundry should keep measuring this",
    "",
    "| reason | what it changes |",
    "|---|---|",
    "| A checker is the clearest signal of how a model APPROACHED the task | it separates 'wrote behaviour' from 'built a theory and tested it', which no pass rate distinguishes |",
    "| Ephemeral checkers are invisible to artifact grading | every benchmark that grades one file is measuring its own submission format on this axis, and does not know it |",
    "| It is the cheapest possible harder variant | a family that asks for the checker AND the implementation grades a different capability at no extra authoring cost |",
    "| Coverage, not expressiveness, is where these runs fail | the failures concentrate on states the model never generated, so a family that rewards generation is testing the binding constraint |",
    "",
    "**The concrete proposal this report exists to support:** a descendant family whose submission is",
    "`subject.mjs` **and** `checker.mjs`, where the checker is run against the reference and against a",
    "held-out set of known-bad implementations. A model whose checker passes the reference and catches",
    "none of the mutants has written a checker that cannot fail, and that is a measurable, named",
    "failure mode nothing in this repository currently grades.",
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
 * Which models left their checker in the submission directory.
 *
 * The sharpest observation this analysis produces, and the one it took two attempts to see. The task
 * asks for `submission/subject.mjs`; nothing forbids a second file, and almost every model ships one
 * file anyway. A model that ships its checker has made its verification auditable by someone else,
 * which is a different act from verifying and discarding — and it is the only self-check evidence
 * here that does not rest on the model's own account.
 */
function shippedCheckerSection(profiles: readonly SelfCheckProfile[]): string {
  const shipped = profiles.filter((x) => x.extraFiles.length > 0);
  if (shipped.length === 0) {
    return [
      "## Nobody shipped their checker",
      "",
      "Every submission on record is exactly the one file the task asked for. The task does not forbid",
      "a second file; no model wrote one.",
    ].join("\n");
  }
  const bySubject = new Map<string, string[]>();
  for (const x of shipped) bySubject.set(x.subjectId, [...(bySubject.get(x.subjectId) ?? []), x.runId]);
  const solo = bySubject.size === 1;
  return [
    "## Who shipped their checker",
    "",
    `${shipped.length} of ${profiles.length} runs left a file beside \`subject.mjs\`. The task asks for one file and`,
    "does not forbid a second; almost every model ships one anyway. A model that ships its checker has",
    "made its verification auditable by somebody else — a different act from verifying and discarding,",
    "and the only self-check evidence on this page that does not rest on the model's own account.",
    "",
    "| run | subject | files shipped beside the artifact |",
    "|---|---|---|",
    ...shipped.map(
      (x) => `| \`${x.runId}\` | \`${x.subjectId}\` | ${x.extraFiles.map((f) => `\`${f}\``).join(", ")} |`,
    ),
    "",
    solo
      ? `**Every one of them is \`${[...bySubject.keys()][0]}\`.** That is a behavioural difference between models visible in the artifacts rather than in their prose, and it is the kind of thing a pass rate cannot show. With ${shipped.length} run(s) it is an observation and not a rate; what makes it worth recording is that no other subject did it on any family.`
      : `${bySubject.size} different subjects did this, so it is not a quirk of one model.`,
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
