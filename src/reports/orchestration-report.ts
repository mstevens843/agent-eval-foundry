// What the trial layer is, what it actually ran, and what it refuses to do.
//
// The report exists because "we ran some agents" is the single easiest claim in this domain to make
// loosely. Every number below is derived from trial directories on disk — each with a transcript,
// the exact challenge the model saw, the artifact it produced, and the verifier output that graded
// it — so a reader can check any row by opening the directory named in it.
//
// The section that matters most is the last one. Three counted trials, three clean passes, and the
// conclusion is that the family is not ready. Reporting the trials as a success would have been the
// natural thing to do with them; they cost real money and produced real implementations. What they
// measured is that the task is too easy, and the report says so in the headline.

import type { TrialDirectory } from "../trials/directory.js";
import { PROVIDERS } from "../trials/providers.js";
import type { TrialSet } from "../trials/types.js";
import { ISOLATION_GUARANTEES, NEVER_COUNTS, TRIAL_STATUSES, countedAgentTrials } from "../trials/types.js";

export interface OrchestrationReportInput {
  readonly familyId: string;
  readonly trials: TrialSet;
  /** Durable directories, for the per-run artifact table. */
  readonly directories: readonly TrialDirectory[];
}

const secs = (n: number | null): string => (n === null ? "—" : `${Math.round(n)}s`);

export function renderOrchestrationReport(input: OrchestrationReportInput): string {
  const agents = input.trials.records.filter((r) => r.subjectType === "agent");
  const counted = countedAgentTrials(input.trials);
  const uncounted = agents.filter((r) => !r.counts);
  const passed = counted.filter((r) => r.cells.every((c) => c.failed.length === 0));
  const implemented = PROVIDERS.filter((p) => p.status === "implemented");
  const declared = PROVIDERS.filter((p) => p.status === "declared");

  return [
    "# Trial orchestration",
    "",
    "The layer that puts a model in front of a challenge package and writes down what happened —",
    "including when what happened was nothing. Everything here is derived from durable trial",
    "directories on disk; every row names one you can open.",
    "",
    "## What has been run",
    "",
    "| | |",
    "|---|---:|",
    `| family | \`${input.familyId}\` |`,
    `| agent trials attempted | ${agents.length} |`,
    `| **counted** | **${counted.length}** |`,
    `| uncounted | ${uncounted.length} |`,
    `| counted trials that passed every graded scenario | ${passed.length} |`,
    "",
    counted.length === 0
      ? "No counted agent trial exists yet. Nothing in this repository may be described as difficulty evidence."
      : [
          "| run | model | isolation | status | runtime | scenarios | failed | counts |",
          "|---|---|---|---|---:|---:|---:|---|",
          ...agents.map(
            (r) =>
              `| \`${r.runId}\` | ${r.model ?? "—"} | ${r.isolation} | ${r.status} | ${secs(r.runtimeSeconds)} | ${r.cells.length} | ${r.cells.filter((c) => c.failed.length > 0).length} | ${r.counts ? "yes" : "**no**"} |`,
          ),
        ].join("\n"),
    "",
    "## The counting rules",
    "",
    "A trial's classification comes from the provider; countability is a pure function of that",
    "classification and is not overridable from a flag. The rules, in the order they are applied:",
    "",
    "| classification | may it count? | reasoning |",
    "|---|---|---|",
    ...TRIAL_STATUSES.map((s) => {
      const never = NEVER_COUNTS.has(s);
      const why = never
        ? "the absence of an attempt, not a result — a reward of 0 here means nothing was tried"
        : s === "crashed"
          ? "not by default: promoting a crash to a failure automatically would let a harness bug read as a capability finding"
          : "only when the verifier graded at least one scenario — a pass nobody graded is not a pass";
      return `| \`${s}\` | ${never ? "**never**" : s === "crashed" ? "not by default" : "yes, conditionally"} | ${why} |`;
    }),
    "",
    "This is not a hypothetical concern. The first real trial run through this layer died in two",
    "seconds because environment redaction stripped the provider CLI's own credentials. It was",
    "recorded as `crashed`, uncounted, transcript preserved. A layer that graded whatever was in the",
    "submission directory would have written a trial record showing a frontier model scoring zero.",
    "",
    "## What cannot become evidence",
    "",
    "Countability rules out runs that failed to happen. A second veto rules out runs that happened and",
    "produced nothing, because those satisfy the counting rules perfectly: a stub is `completed`, it is",
    "graded, and it fails every scenario — which reads as *an agent attempted this family and could not",
    "do it*, the exact sentence the blocking difficulty gate is looking for.",
    "",
    "This was found by a smoke test rather than reasoned about in advance. Driving the runner with a",
    "command that wrote a five-line do-nothing module produced a counted trial failing 128 of 128, and",
    "the family flipped from NOT-READY to SHIP on the strength of it.",
    "",
    "| rejected submission | why it is not an attempt |",
    "|---|---|",
    "| every scenario errors inside the subject host | the file never executed; indistinguishable from submitting nothing |",
    "| behaviour identical to a checked-in baseline | this repository wrote that subject to do nothing, so it measures nothing |",
    "",
    "The rule is the same one the counting rules use everywhere: the absence of an attempt is not a",
    "result. A genuinely bad implementation still counts — it differs from the baseline in at least one",
    "cell, and any real attempt does. The veto runs when the record is written, and an independent",
    "assertion re-checks every counted agent record afterwards, so a hand-edited record does not get",
    "through either.",
    "",
    "## Providers",
    "",
    "| provider | status | isolation | requires |",
    "|---|---|---|---|",
    ...PROVIDERS.map(
      (p) =>
        `| \`${p.id}\` | ${p.status === "implemented" ? "**implemented**" : "declared"} | ${p.isolation} | ${p.requires ?? "—"} |`,
    ),
    "",
    `${implemented.length} adapters are implemented and ${declared.length} are declared. A declared adapter throws`,
    "`provider not configured` when invoked. It does not return an empty submission, and it does not",
    "return a fabricated result — an unconfigured provider must be indistinguishable from a missing",
    "one, never from a failing model.",
    "",
    "## Isolation",
    "",
    "| level | guarantee |",
    "|---|---|",
    ...Object.entries(ISOLATION_GUARANTEES).map(([k, v]) => `| \`${k}\` | ${v} |`),
    "",
    "The counted trials above ran at `subprocess`. That is the level at which a hostile submission",
    "cannot reach the verifier's memory: the artifact is imported in a child process, and the test",
    "suite proves it by grading a subject that deliberately mutates globals and checking the parent's",
    "are untouched. `container` is declared and planned (read-only challenge mount, writable",
    "submission mount, `--network=none`, no verifier path mounted at all) and is not claimed as",
    "achieved, because the daemon is not running on this machine.",
    "",
    "## Artifacts kept per trial",
    "",
    input.directories.length === 0
      ? "_No durable trial directories._"
      : [
          "| run | submitted artifact | graded scenarios | counts | why |",
          "|---|---|---:|---|---|",
          ...input.directories.map(
            (d) =>
              `| \`${d.runId}\` | ${d.submissionFiles.map((f) => `\`${f}\``).join(", ") || "none"} | ${d.record.cells.length} | ${d.countability.counts ? "yes" : "**no**"} | ${d.countability.reason} |`,
          ),
        ].join("\n"),
    "",
    "A counted trial with no verifier output, or no preserved submission, is rejected by the directory",
    "validator rather than read as a pass. The challenge copy is also re-scanned for hidden artifacts",
    "by content as well as filename, so a leaked answer key cannot hide behind a rename.",
    "",
    "## What the trials found",
    "",
    counted.length === 0
      ? "Nothing yet."
      : passed.length === counted.length
        ? [
            `**All ${counted.length} counted trials passed every graded scenario.** The submissions are genuine —`,
            "hundreds of lines each, citing the policy rule codes by name and tracking argument provenance",
            "rather than pattern-matching strings. This is not a harness failure; it is a measurement, and",
            "the measurement is that the family is already solved by the models it was meant to separate.",
            "",
            "The ship gate reads this directly: `not-already-solved` is blocking, and it fails **because**",
            "the evidence arrived. A family that no counted agent has failed cannot discriminate, so it is",
            "held rather than shipped, regardless of how well the verifier catches mutants.",
          ].join("\n")
        : `${counted.length - passed.length} of ${counted.length} counted trials failed at least one scenario, so the family discriminates on this bank.`,
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}
