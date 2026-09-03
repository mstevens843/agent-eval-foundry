// Self-check coverage: did the agent's own verification cover the rule it was graded on?
//
// WHY THIS EXISTS ALONGSIDE `src/reports/self-check.ts`, WHICH IS GOOD AND DOES SOMETHING ELSE.
//
// That module answers "did the agent verify its work, and can we tell?" -- a behaviour question, with
// an evidence ladder (observed / ephemeral / self-reported) that is exactly right for it. Run against
// the six imported outbox trials it recovers the checker FILE LISTS from `results/34` verbatim:
// claude-1's check.py, fuzz.py, scenarios.py, mutations.py; claude-2's check_invariants.py,
// check_appendonly.py, hunt.py; claude-3's verify.py. That is a real validation and it is why this
// module reuses its extractor rather than replacing it.
//
// It fails on the two things Phase 7 needs, and both failures are informative:
//
//   1. IT LOSES THE RULE SIGNAL. `results/34`'s sharpest finding is that cc267-claude-1 is the only
//      one of six whose checker could express "ACKED is terminal", and it is the only engine to pass
//      all six new schedules. claude-1's transcript does contain the table, with `(ACKED, REVOKED)`
//      absent from it. The report classifies that run `mutation-testing`, because RIGOUR_ORDER picks
//      one top kind per run and mutation-testing outranks legality-table. The signal is in the data
//      and lost in the reporting. "What is the most rigorous thing this agent did" and "did its
//      checking cover the graded rule" are different questions and only the second one predicts.
//
//   2. IT COUNTS EXPLORATION AS TOOLING. It attributes `assertions` to cc267-codex-1 on the strength
//      of 32 inline shell scripts. All 84 of that run's commands are `rg --files`, `sed -n`, `find`,
//      `git status`, or `python3 -m harness.driver` -- reading the package and running the PROVIDED
//      driver. `results/34`: "84 commands in cc267-codex-1, zero invoking a self-written checker."
//      Running the harness someone handed you is not self-verification.
//
// So this module asks the narrower, harder question, and it is deliberately conservative: a run is
// credited with covering a rule only when the rule's structure is present in source the agent wrote.

/** A rule the agent could have covered, expressed as something checkable in source. */
export interface GradedRule {
  readonly id: string;
  /** Tokens that must all appear near each other for the rule's structure to be present. */
  readonly structureTokens: readonly string[];
  /**
   * The specific transition, pair or condition the rule forbids, as it would appear in code.
   *
   * Presence of the STRUCTURE without this pair being handled is the interesting state: the agent
   * built a table and left the graded case out of it.
   */
  readonly forbiddenPair: readonly [string, string] | null;
}

/** The durable outbox's ACKED rule, which is the one `results/34` measured. */
export const ACKED_TERMINAL: GradedRule = {
  id: "acked-is-terminal",
  structureTokens: ["LEGAL", "READY", "LEASED", "EXECUTED", "ACKED", "REVOKED"],
  forbiddenPair: ["ACKED", "REVOKED"],
};

export interface CoverageInput {
  readonly runId: string;
  /** Source of every file the agent WROTE. Not the challenge, not the provided harness. */
  readonly agentWrittenSources: readonly string[];
  /** Shell commands the agent executed, verbatim. */
  readonly commands: readonly string[];
  /** Paths of files the agent wrote, for deciding whether a command invokes its own checker. */
  readonly agentWrittenPaths: readonly string[];
  /**
   * Path prefixes belonging to the GRADED ARTIFACT, which are excluded from "its own tooling".
   *
   * Load-bearing, and the first version of this metric got it wrong. Editing the deliverable and
   * then running it is the task, not self-verification. Without this exclusion all three codex runs
   * scored "ran its own tooling" because they edited `engine/worker.py` and then ran the engine --
   * which contradicts `results/34`'s "84 commands, zero invoking a self-written checker" and would
   * have made the metric agree with itself instead of with the record.
   */
  readonly gradedArtifactPrefixes: readonly string[];
  /** Whether the hidden verifier failed this submission. */
  readonly verifierFailed: boolean;
}

export interface CoverageResult {
  readonly runId: string;
  /** Did the agent write any verification tooling at all? */
  readonly wroteTooling: boolean;
  /** Did it ever RUN something it wrote, as opposed to only the provided harness? */
  readonly ranOwnTooling: boolean;
  /** Is the rule's structure present in source the agent wrote? */
  readonly expressesRuleStructure: boolean;
  /** Does that structure actually handle the graded case? */
  readonly coversGradedCase: boolean;
  /**
   * The money question. A green self-check over a submission the hidden verifier failed is the
   * failure mode this project was founded on, and it has never been measured directly.
   */
  readonly greenOverFailing: boolean;
  readonly evidence: readonly string[];
}

/**
 * Extensions that can DECIDE something. A checker is code; a scenario is data.
 *
 * This distinction is not pedantry, it is the third and final correction this metric needed, and the
 * data forced it. All three codex runs wrote files outside the graded artifact -- but every one was a
 * `/tmp/*.json` SCHEDULE, fed to the harness the task already shipped
 * (`python3 -m harness.driver --schedule /tmp/unknown-landed.json`). They generated inputs and read
 * the provided driver's output; they never wrote a line that asserts an invariant.
 *
 * `results/34` is exact about this and it is worth quoting for the word it chooses: "zero invoking a
 * self-written CHECKER". Generating more inputs is exploration. Writing something that decides
 * pass/fail is verification, and only the second one can be green over a failing submission -- an
 * agent that never wrote an assertion made no measurement that could be wrong.
 */
const CODE_EXTENSIONS = [".py", ".mjs", ".js", ".ts", ".sh", ".rb", ".go", ".rs"];

export const isCheckerPath = (path: string): boolean =>
  CODE_EXTENSIONS.some((e) => path.toLowerCase().endsWith(e));

/** A command that invokes a file the agent wrote, rather than a provided module or a shell builtin. */
export const invokesOwnTooling = (command: string, writtenPaths: readonly string[]): boolean =>
  writtenPaths.some((p) => {
    const base = p.split("/").pop();
    // `python3 -m harness.driver` must not match: it is the harness the task shipped. Requiring the
    // agent's own basename to appear is the whole discrimination.
    return base !== undefined && base.length > 3 && command.includes(base);
  });

/** Does source the agent wrote contain the rule's structure? */
export const expressesStructure = (sources: readonly string[], rule: GradedRule): boolean =>
  sources.some((s) => rule.structureTokens.every((t) => s.includes(t)));

/**
 * Does the structure handle the graded case?
 *
 * For a legality table the graded case is a pair that must be ABSENT from the legal set. So the test
 * is: the structure is present, and the forbidden pair does not appear inside it. A table that lists
 * `(ACKED, REVOKED)` as legal has expressed the rule and got it backwards, which is a different and
 * much rarer failure than never having expressed it.
 */
export const coversGradedCase = (sources: readonly string[], rule: GradedRule): boolean => {
  if (rule.forbiddenPair === null) return expressesStructure(sources, rule);
  const [from, to] = rule.forbiddenPair;
  return sources.some((s) => {
    if (!rule.structureTokens.every((t) => s.includes(t))) return false;
    // The pair as it would be written in a tuple set, tolerant of spacing and quoting.
    const pair = new RegExp(`\\(\\s*["']?${from}["']?\\s*,\\s*["']?${to}["']?\\s*\\)`);
    return !pair.test(s);
  });
};

export const selfCheckCoverage = (input: CoverageInput, rule: GradedRule): CoverageResult => {
  // Only files OUTSIDE the graded artifact count as tooling. See `gradedArtifactPrefixes`.
  const toolingPaths = input.agentWrittenPaths.filter(
    (p) => !input.gradedArtifactPrefixes.some((prefix) => p.includes(prefix)) && isCheckerPath(p),
  );
  const wroteTooling = toolingPaths.length > 0 || input.agentWrittenSources.length > 0;
  const ranOwnTooling = input.commands.some((c) => invokesOwnTooling(c, toolingPaths));
  const structure = expressesStructure(input.agentWrittenSources, rule);
  const covers = coversGradedCase(input.agentWrittenSources, rule);

  // Green over failing: the agent ran its own checks, they did not stop it submitting, and the
  // hidden verifier failed the submission. Conservative on purpose -- a run that never ran its own
  // tooling is not credited with a green self-check, because it made no measurement to be wrong.
  const greenOverFailing = ranOwnTooling && input.verifierFailed;

  const evidence: string[] = [];
  evidence.push(
    wroteTooling
      ? `wrote ${toolingPaths.length} file(s) outside the graded artifact`
      : "wrote no tooling outside the graded artifact",
  );
  evidence.push(ranOwnTooling ? "ran its own tooling" : "never invoked anything it wrote");
  evidence.push(
    structure ? `expressed the ${rule.id} structure` : `no ${rule.id} structure in its own source`,
  );
  if (structure) evidence.push(covers ? "and covered the graded case" : "but left the graded case out of it");
  if (greenOverFailing) {
    evidence.push("ITS OWN CHECKS RAN GREEN OVER A SUBMISSION THE HIDDEN VERIFIER FAILED");
  }

  return {
    runId: input.runId,
    wroteTooling,
    ranOwnTooling,
    expressesRuleStructure: structure,
    coversGradedCase: covers,
    greenOverFailing,
    evidence,
  };
};

// --- B3: the row-5 probe -------------------------------------------------------------------------

/**
 * Would this agent's own verification have caught a recomputed-key double execution?
 *
 * Phase 6's finding, made into a yes/no per trial. The trap: `idem_key` folds in `epoch`, `epoch`
 * moves across a crash, so recomputing the key produces a second side effect while every local check
 * passes. An agent's tooling catches it only if the tooling counts EXTERNAL EFFECTS PER ACTION --
 * not per key, because per key the two calls look like two legitimately distinct calls.
 *
 * That distinction is the entire probe, and it is why this is not simply a grep for "idem".
 */
export const detectsRecomputedKeyDoubleExecution = (sources: readonly string[]): boolean =>
  sources.some((s) => {
    const countsEffects = /exactly[_ ]?once|duplicate|dedup|Counter\(|count.*call|calls?_by/i.test(s);
    const keyedOnAction = /action_id|per[_ ]action|by[_ ]action/i.test(s);
    // Reasoning about the key's stability across the boundary is the other route to the same catch.
    const reasonsAboutEpoch = /epoch/.test(s) && /idem/i.test(s);
    return (countsEffects && keyedOnAction) || reasonsAboutEpoch;
  });
