// Everything the subject could read, and the questions the detectors ask of it.
//
// The corpus is where the probe's judgement actually lives, and its bias is deliberate: it is far
// easier to conclude "stated" than "unstated". A commitment is dismissed the moment ANY visible file
// mentions the value anywhere — no proximity requirement, no section matching. That throws away real
// defects (a numeral that appears in an unrelated paragraph clears a threshold it has nothing to do
// with) and it is still the right trade, because the output is a screen a human reads. A false
// positive costs one read. A false negative costs a phase, and it costs it silently.
//
// The one place that bias reverses is `statedAsMandatory`. There, finding the token is not enough:
// the surrounding sentence has to IMPOSE the requirement rather than permit it. A specification that
// says the subject "may" do X, graded by a verifier that fails the subject for not doing X, is worse
// than silence — the visible text supports the competing reading. That is the adjudication rule, and
// it is the only asymmetry in this file.

import type { ProbeFile, SourceRef } from "./types.js";

export interface Corpus {
  readonly files: readonly ProbeFile[];
  /** Every line of every visible file, flattened, with provenance. */
  readonly lines: readonly SourceRef[];
  /** Lowercased concatenation, for cheap containment tests. */
  readonly haystack: string;
}

export function buildCorpus(files: readonly ProbeFile[]): Corpus {
  const lines: SourceRef[] = [];
  for (const file of files) {
    const split = file.source.split("\n");
    for (let i = 0; i < split.length; i += 1) {
      const text = split[i] ?? "";
      if (text.trim().length === 0) continue;
      lines.push({ path: file.path, line: i + 1, text: text.trim() });
    }
  }
  return {
    files,
    lines,
    haystack: files
      .map((f) => f.source)
      .join("\n")
      .toLowerCase(),
  };
}

const NUMBER_WORDS: Readonly<Record<string, string>> = {
  "0": "zero",
  "1": "one",
  "2": "two",
  "3": "three",
  "4": "four",
  "5": "five",
  "6": "six",
  "7": "seven",
  "8": "eight",
  "9": "nine",
  "10": "ten",
  "12": "twelve",
  "24": "twenty-four",
};

/** Word-boundary containment, so `2` does not match `1024` and `ACK` does not match `ACKED`. */
function mentions(corpus: Corpus, token: string): boolean {
  const needle = token.toLowerCase();
  if (needle.length === 0) return true;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // \b is wrong for tokens that start or end with punctuation (`api.key`, `_id`), so the boundary is
  // expressed as "not adjacent to a word character" and applied only on the sides that need it.
  const left = /^\w/.test(needle) ? "(?<![\\w-])" : "";
  const right = /\w$/.test(needle) ? "(?![\\w-])" : "";
  return new RegExp(`${left}${escaped}${right}`).test(corpus.haystack);
}

/** Is this value stated anywhere the subject can read? Numerals also count in English. */
export function isStated(corpus: Corpus, token: string): boolean {
  if (mentions(corpus, token)) return true;
  const word = NUMBER_WORDS[token];
  return word !== undefined && mentions(corpus, word);
}

/** Lines mentioning the token, for triage. Capped, because a finding is meant to be read. */
export function nearest(corpus: Corpus, tokens: readonly string[], limit = 4): SourceRef[] {
  const wanted = tokens.map((t) => t.toLowerCase()).filter((t) => t.length > 1);
  if (wanted.length === 0) return [];
  const hits: { ref: SourceRef; score: number }[] = [];
  for (const ref of corpus.lines) {
    const lower = ref.text.toLowerCase();
    const score = wanted.filter((t) => lower.includes(t)).length;
    if (score > 0) hits.push({ ref, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit).map((h) => ({ ...h.ref, text: h.ref.text.slice(0, 200) }));
}

const MANDATORY = /\b(must|shall|is required|are required|required to|always|never|has to|have to)\b/i;
const PERMISSIVE =
  /\b(may|can|optional|optionally|is allowed to|are allowed to|convenience|if it wishes|need not)\b/i;

export interface MandateReading {
  /** A visible sentence imposing the requirement, if one exists. */
  readonly mandatory?: SourceRef | undefined;
  /** A visible sentence PERMITTING what the hidden code requires. Actively misleading. */
  readonly permissive?: SourceRef | undefined;
  /** Every visible line mentioning the token at all. */
  readonly mentions: readonly SourceRef[];
}

/**
 * How does the visible text treat this token — as an obligation, as an option, or not at all?
 *
 * This is the adjudication test in code. The hidden grader fails a subject that did not do X. For
 * that to be fair, the visible text must say the subject MUST do X. If it says the subject MAY do X,
 * the specification does not merely omit the rule, it licenses the behaviour that loses. That case
 * gets the highest severity the probe emits, and the permissive sentence gets quoted back as the
 * contradiction, because it is the sentence the subject was entitled to rely on.
 */
export function readMandate(corpus: Corpus, token: string): MandateReading {
  const needle = token.toLowerCase();
  const hits = corpus.lines.filter((ref) => ref.text.toLowerCase().includes(needle));
  let mandatory: SourceRef | undefined;
  let permissive: SourceRef | undefined;
  for (const ref of hits) {
    // A sentence can carry both ("the subject may observe X but must cite Y"). Obligation wins the
    // classification, because it makes the grading fair; the probe should not flag a rule the
    // specification does impose somewhere.
    if (MANDATORY.test(ref.text)) {
      mandatory ??= ref;
    } else if (PERMISSIVE.test(ref.text)) {
      permissive ??= ref;
    }
  }
  return { mandatory, permissive, mentions: hits.slice(0, 6) };
}

/**
 * Is the call mandated INDIRECTLY, by an obligation that cannot be met without making it?
 *
 * This is the single largest source of false positives the probe had, and the specifications were
 * right and the probe was wrong. A grader requires `currentApproval` to be called; the specification
 * never writes that identifier anywhere. What it writes is:
 *
 *   "Every decision must have an audit event with: observed approval id, generation and status
 *    FROM THE CURRENT AUTHORITY, or null when missing."
 *
 * You cannot carry a fact observed from the current authority without asking the current authority.
 * The obligation to report entails the obligation to observe, and the visible text adjudicates —
 * which is exactly the standard, so the finding must clear.
 *
 * The test is deliberately narrow: a mandatory sentence that names the SUBJECT of the call and an
 * OBSERVATION of live state. A method's own words are what tie it to the sentence, so `currentAlias`
 * clears on a sentence about observing the current alias and not on one about anything else.
 */
export function mandatedIndirectly(corpus: Corpus, method: string): SourceRef | undefined {
  const words = method
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 4);
  if (words.length === 0) return undefined;
  const observation =
    /\b(observ\w*|read|reads|query\w*|fetch\w*|from the (current|live) \w+|current authority|live authority|source of truth)\b/i;
  return corpus.lines.find((ref) => {
    if (!MANDATORY.test(ref.text)) return false;
    if (!observation.test(ref.text)) return false;
    const lower = ref.text.toLowerCase();
    // Every word of the method must appear, so `currentToken` does not clear on a sentence about
    // the current approval.
    return words.every((w) => lower.includes(w));
  });
}

const TERMINAL_LANGUAGE =
  /\b(terminal|final state|no outgoing|has no successor|cannot be followed|end state|absorbing|is final|no further transition|neither has an outgoing)\b/i;

/**
 * Does the visible text say this state is an end of the road?
 *
 * The outbox is the reason this is its own question rather than a token search. `ACKED` appears in
 * the visible package five times: in a happy-path arrow chain, in a prose sentence about
 * exactly-once, in three imports. A token search finds all five and concludes the state is
 * documented. It is documented. Its TERMINALITY is not, and terminality is the graded rule.
 */
export function statesTerminality(corpus: Corpus, state: string): SourceRef | undefined {
  const needle = state.toLowerCase();
  return corpus.lines.find((ref) => {
    const lower = ref.text.toLowerCase();
    return lower.includes(needle) && TERMINAL_LANGUAGE.test(ref.text);
  });
}

/**
 * Visible text that groups this state WITH other states in a way the hidden table contradicts.
 *
 * `db.py:34` in the outbox reads "(EXECUTED, ACKED, REVOKED) are history and do not block a
 * successor". The hidden table gives EXECUTED two successors. A subject reading that comment learns
 * that the three states behave alike; the grader knows they do not. Silence would have been kinder.
 */
export function groupedWith(corpus: Corpus, state: string, others: readonly string[]): SourceRef | undefined {
  if (others.length === 0) return undefined;
  const needle = state.toLowerCase();
  return corpus.lines.find((ref) => {
    const lower = ref.text.toLowerCase();
    if (!lower.includes(needle)) return false;
    // A transition arrow is a claim about a PATH, not about equivalence. `READY -> LEASED ->
    // EXECUTED -> ACKED` names two states in one line and says nothing about whether they behave
    // alike; treating it as a contradiction reported the happy-path diagram as misleading text,
    // which it is not. Only a sentence that predicates something of the states together counts.
    if (/->|-->|→|=>/.test(ref.text)) return false;
    return others.some((o) => lower.includes(o.toLowerCase()));
  });
}

/**
 * The visible sentence that most strongly PERMITS what the hidden code requires.
 *
 * Ranked rather than first-match, because the first line mentioning a word is usually the wrong one.
 * Searching for `currentApproval`'s words found a README aside — "the token and approval can drift"
 * — when the sentence that actually licenses the losing behaviour was in the SPEC: "the subject may
 * observe current ledgers through the authority facade". Both matched; only one is the sentence a
 * subject would have relied on. Specification text outranks a README, and a line covering more of
 * the requirement outranks one covering less.
 */
export function strongestPermission(corpus: Corpus, words: readonly string[]): SourceRef | undefined {
  const wanted = words.filter((w) => w.length >= 5).map((w) => w.toLowerCase());
  if (wanted.length === 0) return undefined;
  let best: { ref: SourceRef; score: number } | undefined;
  for (const ref of corpus.lines) {
    if (!PERMISSIVE.test(ref.text)) continue;
    const lower = ref.text.toLowerCase();
    const hits = wanted.filter((w) => lower.includes(w)).length;
    if (hits === 0) continue;
    // A normative document is where a subject looks for permission; a README is where it looks for
    // orientation. Weight accordingly rather than taking whichever file the walker reached first.
    const authority = /spec/i.test(ref.path) ? 2 : /readme/i.test(ref.path) ? 0 : 1;
    const score = hits * 10 + authority;
    if (best === undefined || score > best.score) best = { ref, score };
  }
  return best?.ref;
}

/** Does the visible text state an order between these two rule codes? */
export function statesPrecedence(corpus: Corpus, first: string, second: string): SourceRef | undefined {
  const order =
    /\b(precedence|priority|takes priority|before|first|in order|earlier|outranks|overrides|wins)\b/i;
  const a = first.toLowerCase();
  const b = second.toLowerCase();
  return corpus.lines.find((ref) => {
    const lower = ref.text.toLowerCase();
    return lower.includes(a) && lower.includes(b) && order.test(ref.text);
  });
}
