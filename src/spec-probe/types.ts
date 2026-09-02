// The spec-only probe: does the hidden grader require anything the visible package never says?
//
// THE PROBLEM IT SOLVES. A benchmark author writes a specification for the subject and, separately,
// a verifier that decides whether the subject passed. The two drift. The verifier grades a rule the
// specification never states, every frontier model fails it, and the failure rate looks like
// difficulty. It is not difficulty. It is the author's own underspecification, and the author cannot
// tell the difference from the results, because a genuinely hard task and an unstated rule produce
// the same thing: correlated frontier failure.
//
// Four flagship results in this repository were withdrawn to exactly that defect. Not one was
// detected by failure rate. Every one of them is detectable by reading the hidden decision code and
// the visible prose against each other, mechanically, before a single model runs.
//
// WHAT IT IS. A deterministic static cross-reference. No model, no network, no execution. It reads
// the hidden decision code, extracts the concrete commitments the grading depends on — a threshold,
// a set membership, a transition table, a precedence order, a required call — and asks, for each
// one, whether the visible package states it. Where the answer is no, it emits a finding with the
// hidden evidence and the visible text that came closest.
//
// WHAT IT IS NOT. It is a screen, not a judge. Measured precision is roughly one in two: half the
// output is noise, and the noise costs a read. A missed defect costs a phase. That asymmetry is the
// whole argument for running it, and it is why nothing here tries to be clever about suppressing
// borderline findings.
//
// THE BOUNDARY IT ENCODES. A requirement is fairly graded only if the visible text ADJUDICATES
// between the readings that lead to different answers. Derivability is not enough. That is why
// `unstated-mandatory-call` treats "the subject MAY observe current state" as evidence AGAINST a
// hidden rule that fails the subject for not observing it — a permissive sentence does not merely
// fail to state the requirement, it supports the competing reading.

/** Languages the lexer knows how to strip comments from. Anything else is treated as prose. */
export type Language = "ts" | "py" | "text";

export interface ProbeFile {
  /** Display path. Used in findings; need not exist on disk. */
  readonly path: string;
  readonly source: string;
  readonly language: Language;
}

/**
 * One thing to probe.
 *
 * `hidden` is the decision code: the verifier, the truth function, the scenario generator — anything
 * whose contents the subject cannot read but whose contents decide the subject's score.
 *
 * `visible` is everything the subject can read: the specification, the README, the starter, the
 * worked examples, the type declarations shipped in the package. If a subject could see it at
 * runtime, it belongs here, because the question is always "could the subject have known?".
 */
export interface ProbeTarget {
  readonly id: string;
  readonly hidden: readonly ProbeFile[];
  readonly visible: readonly ProbeFile[];
}

export type DetectorId =
  | "unstated-threshold"
  | "unstated-set-membership"
  | "unstated-transition"
  | "unstated-precedence"
  | "unstated-mandatory-call";

/**
 * How much a finding would cost if it is real.
 *
 * `high`   — the hidden code fails a subject for something the visible text never says, or says the
 *            opposite of. This is the withdrawal-grade defect.
 * `medium` — the hidden code depends on a specific value the visible text does not pin down. A
 *            careful subject might infer it; nothing guarantees it.
 * `low`    — a commitment that is probably conventional, reported so the sweep is auditable rather
 *            than because it is likely wrong.
 */
export type Severity = "high" | "medium" | "low";

export interface SourceRef {
  readonly path: string;
  readonly line: number;
  readonly text: string;
}

export interface Finding {
  readonly detector: DetectorId;
  readonly severity: Severity;
  /** The commitment the hidden code makes, in one sentence, as a requirement on the subject. */
  readonly requirement: string;
  /** Where the hidden code makes it. */
  readonly hidden: SourceRef;
  /** The literal tokens searched for in the visible package and not found. */
  readonly missing: readonly string[];
  /**
   * The closest visible text, whether or not it supports the requirement. This is the triage
   * payload: a reader dismisses a false positive by looking here, so an empty list is a worse
   * finding than a populated one, not a better one.
   */
  readonly nearest: readonly SourceRef[];
  /**
   * Visible text that ASSERTS SOMETHING INCOMPATIBLE with the hidden rule. Strictly worse than
   * silence: silence leaves the subject to guess, a contradiction actively misleads. When present
   * this is the sentence to quote in the withdrawal.
   */
  readonly contradiction?: SourceRef;
}

export interface ProbeResult {
  readonly id: string;
  readonly findings: readonly Finding[];
  /** Files actually read, so a vacuous run cannot be mistaken for a clean one. */
  readonly scanned: { readonly hidden: number; readonly visible: number };
  /**
   * Commitments the probe extracted and then found stated in the visible text. Reported because a
   * probe that extracts nothing is silent for the wrong reason, and silence is the answer that
   * matters most. `0 extracted` and `0 findings` are the same output and opposite facts.
   */
  readonly cleared: number;
}
