// How differently model families fail — and whether a mechanism is a property of the task or of one
// lab's model.
//
// This is the report that answers the question the whole cross-provider phase exists for. A benchmark
// that only ever runs one lab's model measures that model. The interesting claim is that a failure
// mechanism transfers: that a family built to catch provenance loss catches it in Claude AND in
// GPT AND in Gemini, or that it demonstrably does not.
//
// Four outcomes are reported per provider and never merged:
//
//   counted        an artifact was produced, graded, and the challenge hash matched
//   refused        the provider declined. Not a failure; not a pass; not counted
//   infra          the provider could not authenticate, or the harness broke
//   not run        nobody asked
//
// The first cross-provider campaign produced three of the four inside twenty minutes, which is the
// best argument this repository has for keeping them apart: one provider counted, one hit an account
// tier error in three seconds, and a pass rate over "what happened to run" would have reported the
// second as a model scoring zero.

import type { EvidenceState } from "../trials/evidence-lifecycle.js";
import type { ProviderAvailability } from "../trials/provider-registry.js";
import type { TrialRecord } from "../trials/types.js";
import type { DifficultyCurve, ProviderCurve } from "./difficulty.js";
import { MIN_TRIALS_FOR_RATE, underpoweredCaveat } from "./difficulty.js";

const pct = (n: number | null): string => (n === null ? "—" : `${(n * 100).toFixed(0)}%`);
const esc = (s: string): string => s.replace(/\|/g, "\\|");

export interface ArtifactQuality {
  readonly runId: string;
  readonly providerFamily: string;
  readonly lines: number;
  readonly bytes: number;
  /** Did the submission contain its own checks — a sign of local verification? */
  readonly selfVerifying: boolean;
  /**
   * How many of the spec's published rule codes the source names — `null` when the family
   * publishes none, because zero-of-zero is not a low score.
   */
  readonly citesRules: number | null;
  /** How many codes were available to cite; the denominator that makes the number readable. */
  readonly ruleCodesPublished: number;
  /** Where this run sits in the evidence lifecycle — not merely whether its own record says counted. */
  readonly state: EvidenceState;
  readonly failedScenarios: number;
}

export interface ProviderVarianceInput {
  readonly families: readonly {
    readonly familyId: string;
    readonly curve: DifficultyCurve;
    readonly records: readonly TrialRecord[];
  }[];
  readonly availability: readonly ProviderAvailability[];
  readonly artifacts: readonly ArtifactQuality[];
}

/**
 * What the self-verification column adds up to, stated rather than left for the reader to tally.
 *
 * The source project's strongest engine wrote a legality table, a fuzzer, and mutation tests against
 * its own checker — and still failed, on a state its generator never reached. So this signal has
 * never yet predicted success. It is reported because its ABSENCE across every submission is the
 * more surprising fact, and because a column of "no" that nobody reads is worse than no column.
 */
/**
 * The rows where a model quoted the spec back and still lost the property.
 *
 * Named rather than left implicit because it is the pattern that makes a family worth keeping: a
 * failure that survives the model having read and understood the rules is a capability finding, not
 * a comprehension one, and it is the opposite of the `already-solved` death that killed four of the
 * source project's nine gated mechanisms.
 */
function confidentFalsePositives(artifacts: readonly ArtifactQuality[]): string {
  const confident = artifacts.filter(
    (a) =>
      a.state === "counted" &&
      a.failedScenarios > 0 &&
      a.citesRules !== null &&
      a.ruleCodesPublished > 0 &&
      a.citesRules / a.ruleCodesPublished >= 0.75,
  );
  if (confident.length === 0) {
    return "**Confident false positives.** None yet: no counted failure came from a submission that cited most of the published rule codes. Until one does, the failures on this page are as consistent with a model not having read the spec as with the task being hard.";
  }
  return [
    `**Confident false positives: ${confident.length} of ${artifacts.filter((a) => a.state === "counted" && a.failedScenarios > 0).length} failing runs.** These submissions name most or all of the`,
    "published rule codes and still lose the property:",
    "",
    ...confident.map(
      (a) =>
        `- \`${a.runId}\` (${a.providerFamily}) — cites ${a.citesRules}/${a.ruleCodesPublished} rule codes, ${a.lines} lines, fails ${a.failedScenarios} scenarios`,
    ),
    "",
    "That is the pattern worth keeping a family for. The model read the rules well enough to quote",
    "them and still lost the property under a condition it did not think to test — a capability",
    "finding rather than a comprehension one, and the opposite of the `already-solved` death that",
    "killed four of nine gated mechanisms in the source project.",
  ].join("\n");
}

function selfVerifyingLine(artifacts: readonly ArtifactQuality[]): string {
  const n = artifacts.filter((a) => a.selfVerifying).length;
  if (n === artifacts.length) {
    return `**Every one of ${artifacts.length} submissions built some form of self-check.** The column is not discriminating here and should be read as background rather than signal.`;
  }
  if (n > 0) {
    return `**${n} of ${artifacts.length} submissions built some form of self-check.** Whether that separates the passing runs from the failing ones is worth reading off the table directly; with counts this small it is an observation, not a rate.`;
  }
  return [
    `**Not one of the ${artifacts.length} submissions built a self-check.** No assertion, no invariant`,
    "function, no local sanity pass — every model wrote behaviour and stopped. That is a sharper",
    "finding than any per-provider rate on this page, because the source project's strongest engine",
    "did the opposite (a legality table, a fuzzer, and mutation tests against its own checker) and",
    "still failed, on a state its own generator never reached. Self-verification did not save that",
    "engine and its absence here has not yet been shown to cost anything, so the column is evidence",
    "about how models approach the task rather than about whether they succeed at it.",
  ].join("\n");
}

const providerRow = (p: ProviderCurve): string =>
  `| \`${p.providerFamily}\` | ${p.counted} | ${p.failed} | ${p.refused} | ${p.infra} | ${p.notRun} | ${pct(p.failRate)} | ${p.interval === null ? "—" : `${pct(p.interval[0])}–${pct(p.interval[1])}`} |`;

export type SetRelation = "identical" | "nested" | "overlapping" | "disjoint";

export interface FailurePair {
  readonly familyId: string;
  readonly a: string;
  readonly b: string;
  readonly providerA: string;
  readonly providerB: string;
  readonly crossProvider: boolean;
  readonly sizeA: number;
  readonly sizeB: number;
  readonly shared: number;
  readonly relation: SetRelation;
}

const RELATION_MEANING: Readonly<Record<SetRelation, string>> = {
  identical: "the same scenarios, exactly — the strongest transfer evidence available",
  nested: "one run's failures are a strict subset of the other's — one axis at two sensitivities",
  overlapping: "partly the same scenarios and partly not — a shared mechanism plus a private one",
  disjoint: "no scenario in common — two different failure modes",
};

/**
 * Which scenarios each failing run got wrong, compared run against run.
 *
 * The per-provider rate tables answer "did both labs fail?" and stop there. That is the weaker
 * question. Two labs failing 32 scenarios each is consistent with two unrelated defects; two labs
 * failing THE SAME 32 is a property of the task. This section computes the set relation directly,
 * because the difference decides whether a family is measuring one mechanism or several — and
 * because nesting is exactly what the axis meter collapses, so a family whose runs form a chain has
 * shown one axis however many trials it has.
 */
export function failurePairs(familyId: string, records: readonly TrialRecord[]): readonly FailurePair[] {
  const failing = records
    // Agent subjects only. A mutant is a hand-written implementation this repository wrote to grade
    // its own verifier; comparing one against a model's submission would answer a different question
    // in the same table, and the whole point of the kinded banks is that the two never merge.
    .filter((r) => r.subjectType === "agent" && r.counts && r.cells.some((c) => c.failed.length > 0))
    .map((r) => ({
      runId: r.runId,
      provider: (r.model ?? "unknown").split("/")[0] ?? "unknown",
      scenarios: new Set(r.cells.filter((c) => c.failed.length > 0).map((c) => c.scenarioId)),
    }))
    .sort((x, y) => x.runId.localeCompare(y.runId));

  const pairs: FailurePair[] = [];
  for (let i = 0; i < failing.length; i += 1) {
    for (let j = i + 1; j < failing.length; j += 1) {
      const a = failing[i];
      const b = failing[j];
      if (a === undefined || b === undefined) continue;
      let shared = 0;
      for (const id of a.scenarios) if (b.scenarios.has(id)) shared += 1;
      const relation: SetRelation =
        shared === 0
          ? "disjoint"
          : shared === a.scenarios.size && shared === b.scenarios.size
            ? "identical"
            : shared === a.scenarios.size || shared === b.scenarios.size
              ? "nested"
              : "overlapping";
      pairs.push({
        familyId,
        a: a.runId,
        b: b.runId,
        providerA: a.provider,
        providerB: b.provider,
        crossProvider: a.provider !== b.provider,
        sizeA: a.scenarios.size,
        sizeB: b.scenarios.size,
        shared,
        relation,
      });
    }
  }
  return pairs;
}

/** The section that says whether two labs failed the same task or two different ones. */
function overlapSection(input: ProviderVarianceInput): string {
  const pairs = input.families.flatMap((f) => failurePairs(f.familyId, f.records));
  if (pairs.length === 0) {
    return [
      "## Do the providers fail the same scenarios?",
      "",
      "_Not answerable yet: fewer than two counted runs have failed anything._",
    ].join("\n");
  }
  const cross = pairs.filter((p) => p.crossProvider);
  const sameTask = cross.filter((p) => p.relation === "identical" || p.relation === "nested");
  const chains = input.families
    .map((f) => ({ familyId: f.familyId, ps: failurePairs(f.familyId, f.records) }))
    .filter(
      ({ ps }) => ps.length > 0 && ps.every((p) => p.relation === "identical" || p.relation === "nested"),
    );

  return [
    "## Do the providers fail the same scenarios?",
    "",
    "The rate tables above answer the weaker question. Two labs each failing 32 scenarios is",
    "consistent with two unrelated defects; two labs failing **the same** 32 is a property of the",
    "task. Every pair of counted failing runs, compared as sets of scenario ids:",
    "",
    "| family | run A | run B | cross-lab | A | B | shared | relation |",
    "|---|---|---|---|---:|---:|---:|---|",
    ...pairs.map(
      (p) =>
        `| \`${p.familyId.split("-").pop()}\` | \`${p.a}\` | \`${p.b}\` | ${p.crossProvider ? `**yes** (${p.providerA}/${p.providerB})` : "no"} | ${p.sizeA} | ${p.sizeB} | ${p.shared} | **${p.relation}** |`,
    ),
    "",
    "| relation | what it means |",
    "|---|---|",
    ...(["identical", "nested", "overlapping", "disjoint"] as const)
      .filter((r) => pairs.some((p) => p.relation === r))
      .map((r) => `| \`${r}\` | ${RELATION_MEANING[r]} |`),
    "",
    cross.length === 0
      ? "**No cross-lab pair exists yet.** Every failing run above came from the same provider family, so nothing here separates a task property from a model property."
      : sameTask.length === 0
        ? `**${cross.length} cross-lab pair(s), none of them identical or nested.** The two labs fail this family in different places, which is evidence that the family is broad and NOT evidence that any single mechanism transfers.`
        : [
            `**${sameTask.length} of ${cross.length} cross-lab pair(s) are identical or nested.** That is the transfer claim`,
            "stated in the strongest form the data supports: not 'both labs failed', but 'both labs failed",
            "the same scenarios'. A defect two independently-trained models share on the same inputs is a",
            "property of the task.",
          ].join("\n"),
    "",
    chains.length === 0
      ? "No family's runs form a chain: in every family with more than one failing run, at least one pair is disjoint or overlapping, so the trials are not collapsing to a single axis."
      : [
          "### Where the trials form a chain",
          "",
          ...chains.map(
            ({ familyId }) =>
              `- \`${familyId}\`: every pair is identical or nested, so the runs form a chain under subset inclusion. In the axis meter's own terms that is **one axis observed at several sensitivities**, not several failure modes. The family separates subjects; it has not yet been shown to measure more than one thing.`,
          ),
          "",
          "This is the same collapse the axis meter applies to instances, turned on trials. Naming it here",
          "keeps a family from reading as richer than it is just because it has more runs.",
        ].join("\n"),
  ].join("\n");
}

export function renderProviderVariance(input: ProviderVarianceInput): string {
  const allProviders = new Set<string>();
  for (const f of input.families) for (const p of f.curve.providers) allProviders.add(p.providerFamily);

  const anyCrossProvider = input.families.some((f) => f.curve.familiesWithFailures.length > 1);
  const totalCounted = input.families.reduce((n, f) => n + f.curve.totalCounted, 0);

  return [
    "# Provider variance",
    "",
    "Whether the failure mechanisms this foundry builds are properties of the TASK or of one lab's",
    "model. A benchmark run against a single provider measures that provider.",
    "",
    anyCrossProvider
      ? "**At least one family has counted failures from more than one model family.**"
      : `**No family yet has counted failures from more than one model family.** ${totalCounted} counted trials exist and the mechanism claims are, so far, claims about the labs that produced them.`,
    "",
    "## Provider availability on this machine",
    "",
    "Checked by executing the binary, not assumed. A provider that is not available produces NOT_RUN",
    "slots and a prepared bundle — never a zero.",
    "",
    "| provider | family | available | detail |",
    "|---|---|---|---|",
    ...input.availability.map(
      (a) =>
        `| \`${a.provider.id}\` | ${a.provider.family} | ${a.available ? "yes" : "**no**"} | ${esc(a.detail)} |`,
    ),
    "",
    "## Per family, per provider",
    "",
    ...input.families.flatMap((f) => [
      `### \`${f.familyId}\``,
      "",
      `**Claim strength: ${f.curve.strength}.** ${f.curve.claim}`,
      "",
      "| provider | counted | failed | refused | infra | not run | fail rate | 95% interval |",
      "|---|---:|---:|---:|---:|---:|---:|---|",
      ...f.curve.providers.map(providerRow),
      "",
      // The caveat disappears once a family crosses the threshold, so it is spread rather than
      // emitted as an empty string — an empty entry leaves a stray blank line behind it.
      ...(f.curve.underpowered && f.curve.totalCounted > 0
        ? [`_${underpoweredCaveat(f.curve.totalCounted)}_`, ""]
        : []),
      ...(f.curve.providers.filter((p) => p.checks.length > 0).length === 0
        ? []
        : [
            "**Which checks each provider failed** — the part that says whether they fail the same way:",
            "",
            "| provider | checks failed (scenarios) |",
            "|---|---|",
            ...f.curve.providers
              .filter((p) => p.checks.length > 0)
              .map(
                (p) =>
                  `| \`${p.providerFamily}\` | ${p.checks.map((c) => `\`${c.check}\` (${c.scenarios})`).join(", ")} |`,
              ),
            "",
          ]),
      "**To strengthen:**",
      "",
      ...f.curve.toStrengthen.map((t) => `- ${t}`),
      "",
    ]),
    "## Refusals and infrastructure failures, in full",
    "",
    "Neither is a model result and both are recorded rather than dropped. A provider that cannot be",
    "run here is a fact about this machine; a provider that declines is a fact about the provider.",
    "",
    "| family | provider | outcome | what happened |",
    "|---|---|---|---|",
    ...input.families.flatMap((f) =>
      f.records
        .filter((r) => r.subjectType === "agent" && !r.counts)
        .map(
          (r) =>
            `| \`${f.familyId}\` | ${r.model ?? "—"} | ${r.status} | ${esc(r.countsReason.slice(0, 160))} |`,
        ),
    ),
    "",
    overlapSection(input),
    "",
    "## Artifact quality",
    "",
    input.artifacts.length === 0
      ? "_No submissions preserved yet._"
      : [
          "What each model actually wrote. Size is not quality, but a 40-line submission and a 300-line",
          "one are different kinds of attempt, and whether a model built its own checks is the clearest",
          "signal of how it approached the task.",
          "",
          "| run | provider | lines | rule codes cited | self-verifying | evidence state | scenarios failed |",
          "|---|---|---:|---:|---|---|---:|",
          ...input.artifacts.map(
            (a) =>
              `| \`${a.runId}\` | ${a.providerFamily} | ${a.lines} | ${a.citesRules === null ? "n/a" : `${a.citesRules}/${a.ruleCodesPublished}`} | ${a.selfVerifying ? "yes" : "no"} | ${a.state === "counted" ? "counted" : `**${a.state}**`} | ${a.failedScenarios} |`,
          ),
          "",
          "`n/a` means the family publishes no numbered rule codes, which is not a low score. The UI",
          "family states its contract as invariants rather than a policy table, so there is nothing to cite.",
        ].join("\n"),
    "",
    selfVerifyingLine(input.artifacts),
    "",
    confidentFalsePositives(input.artifacts),
    "",
    "## What this does and does not support",
    "",
    "| claim | supported? |",
    "|---|---|",
    `| the foundry can run multiple providers | ${input.availability.filter((a) => a.available).length >= 2 ? "**yes** — more than one CLI is runnable here and trials exist" : "no"} |`,
    "| refusals and infra failures are kept out of the counted set | **yes** — enforced in code, not convention |",
    `| a mechanism transfers across labs | ${anyCrossProvider ? "**yes, for at least one family**" : "**not yet** — see the per-family tables"} |`,
    `| rates are precise | **no** — every count here is below the ${MIN_TRIALS_FOR_RATE}-trial threshold and the intervals show it |`,
    "",
    "---",
    "",
    "Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.",
    "",
  ].join("\n");
}

/** Read a preserved submission and describe what kind of attempt it was. */
export function describeArtifact(
  runId: string,
  providerFamily: string,
  source: string,
  ruleCodes: readonly string[],
  state: EvidenceState,
  failedScenarios: number,
): ArtifactQuality {
  const cites = ruleCodes.length === 0 ? null : ruleCodes.filter((code) => source.includes(code)).length;
  // A submission that defines its own assertions or invariant checks was verifying itself rather
  // than only producing behaviour. The source project's one non-defective engine did exactly this.
  const selfVerifying = /\b(assert|invariant|selfCheck|validate[A-Z]|sanity)\b/.test(source);
  return {
    runId,
    providerFamily,
    lines: source.split("\n").length,
    bytes: source.length,
    selfVerifying,
    citesRules: cites,
    ruleCodesPublished: ruleCodes.length,
    state,
    failedScenarios,
  };
}
