// Five things a hidden grader can require that a visible specification can fail to say.
//
// The list is not arbitrary. It is the shape of every underspecification defect this project has
// actually found, generalised one step:
//
//   a NUMBER the grading turns on          -> deployment-alias ("sufficient in-window evidence")
//   a SET the grading tests membership in  -> memory-poisoning (the secret channel "api.key")
//   a TRANSITION the grading forbids       -> durable-approval-outbox (ACKED is terminal)
//   an ORDER the grading applies rules in  -> the general case of two rules that both apply
//   a CALL the grading requires            -> access-token (both facade methods, every attempt)
//
// Each detector does the same three things: pull a concrete commitment out of the hidden code, ask
// the visible corpus whether it is stated, and report the gap with both sides quoted. None of them
// executes anything, none calls a model, and all of them are pure functions of two file lists — so a
// finding is reproducible by anyone holding the same inputs, which is the property that makes this
// usable as a gate rather than as an opinion.

import {
  type Corpus,
  groupedWith,
  isStated,
  mandatedIndirectly,
  nearest,
  readMandate,
  statesPrecedence,
  statesTerminality,
  strongestPermission,
} from "./corpus.js";
import {
  type HiddenSource,
  closingBracket,
  excerpt,
  inDecisionContext,
  lineAt,
  literalsBetween,
} from "./source.js";
import type { Finding } from "./types.js";

/** Running tally of commitments checked, so silence can be distinguished from blindness. */
export interface Tally {
  extracted: number;
}

// ---------------------------------------------------------------- shared helpers

/** String literals written on a given line, recovered from the stripper. */
function stringsOn(source: HiddenSource, line: number): string[] {
  return source.strings.filter((s) => s.line === line).map((s) => s.value);
}

/** String literals written anywhere in a line range. */
function stringsIn(source: HiddenSource, from: number, to: number): string[] {
  return source.strings.filter((s) => s.line >= from && s.line <= to).map((s) => s.value);
}

/**
 * Resolve `NAME` where the hidden code says `NAME = "value"`.
 *
 * Python state machines are written with module constants (`ACKED = "ACKED"`) and then keyed by the
 * constant, so a detector that only reads string literals sees an empty transition table. Almost
 * always the constant and its value are the same word, which is why the identifier itself is the
 * primary search token and this is only a fallback.
 */
function constantValues(source: HiddenSource): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  const re = /^\s*([A-Z][A-Z0-9_]*)\s*[:=]/gm;
  for (const m of source.code.matchAll(re)) {
    const name = m[1];
    if (name === undefined) continue;
    const line = lineAt(source, m.index);
    const [value] = stringsOn(source, line);
    if (value !== undefined && !out.has(name)) out.set(name, value);
  }
  return out;
}

const RULE_CODE = /^[A-Z][A-Z0-9]*\d_[A-Z0-9_]{3,}$/;

/**
 * Is this line an entry in a lookup table rather than a step in a decision?
 *
 * `key: "VALUE",` on its own line, with no control flow, is a map entry. The distinction decides
 * whether source order means anything at all.
 */
function isLookupEntry(source: HiddenSource, line: number): boolean {
  const text = (source.lines[line - 1]?.code ?? "").trim();
  if (/\b(return|if|else|throw|push|case)\b/.test(text)) return false;
  return /^["']?[A-Za-z_][\w]*["']?\s*:\s*["']/.test(text) || /^\[[^\]]*\]\s*:/.test(text);
}

// ---------------------------------------------------------------- D1: unstated threshold

/**
 * A graded decision that turns on a number the specification never prints.
 *
 * 0 and 1 are excluded. They are overwhelmingly structural — `length > 0`, `!== -1`, `< 1` as an
 * emptiness test — and including them buried the real thresholds in noise when this was first run.
 * That is a deliberate, measured false-negative: a genuine "at least one" requirement will be missed.
 */
export function detectThresholds(source: HiddenSource, corpus: Corpus, tally: Tally): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const re = /([A-Za-z_][\w.$[\]()]*)\s*(<=|>=|<|>|===|!==|==|!=)\s*(\d+)\b/g;
  for (const m of source.code.matchAll(re)) {
    const [, expr, op, digits] = m;
    if (expr === undefined || op === undefined || digits === undefined) continue;
    if (digits === "0" || digits === "1") continue;
    const line = lineAt(source, m.index);
    if (!inDecisionContext(source, line)) continue;
    tally.extracted += 1;
    if (isStated(corpus, digits)) continue;
    const key = `${source.path}:${digits}:${expr}`;
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push({
      detector: "unstated-threshold",
      severity: "medium",
      requirement: `grading turns on the constant ${digits} (\`${expr} ${op} ${digits}\`), and no visible file prints that number`,
      hidden: { path: source.path, line, text: excerpt(source, line) },
      missing: [digits],
      nearest: nearest(corpus, [expr.split(/[.[]/)[0] ?? expr]),
    });
  }
  return findings;
}

// ---------------------------------------------------------------- D2: unstated set membership

const MEMBERSHIP = [
  /new Set\(\s*\[/g,
  /\]\s*\)?\s*\.includes\(/g,
  /\.includes\(/g,
  /\bin\s*\(/g, // python tuple membership: `if x in ("A", "B")`
  /\bfrozenset\(/g,
  /\bset\(\s*\[/g,
];

/**
 * A graded decision that tests membership in a literal set the specification never enumerates.
 *
 * The distinction that matters is between publishing a RULE and publishing the SET the rule ranges
 * over. "Do not write a record marked as carrying a secret" is a rule; the eight channel names that
 * count as secret-carrying are a set; and a subject that has the rule without the set is guessing.
 */
export function detectSetMembership(source: HiddenSource, corpus: Corpus, tally: Tally): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  for (const pattern of MEMBERSHIP) {
    pattern.lastIndex = 0;
    for (const m of source.code.matchAll(pattern)) {
      const line = lineAt(source, m.index);
      if (!inDecisionContext(source, line)) continue;
      // The members are the literals inside THIS collection's brackets. A line window is not a
      // delimiter: it swallowed the arguments of the `fail(...)` call two lines below, so a set of
      // three secret channels reported five members and two of them were the failure message.
      const end = closingBracket(source, m.index);
      if (end < 0) continue;
      const members = literalsBetween(source, m.index, end).filter((s) => s.length > 1);
      if (members.length === 0) continue;
      const unstated = members.filter((value) => !isStated(corpus, value));
      tally.extracted += members.length;
      if (unstated.length === 0) continue;
      const key = `${source.path}:${line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        detector: "unstated-set-membership",
        severity: unstated.length === members.length ? "high" : "medium",
        requirement:
          `grading tests membership in a literal set whose member${unstated.length === 1 ? "" : "s"} ` +
          `${unstated.map((u) => `\`${u}\``).join(", ")} appear${unstated.length === 1 ? "s" : ""} nowhere visible ` +
          `(${members.length - unstated.length} of ${members.length} member(s) are stated)`,
        hidden: { path: source.path, line, text: excerpt(source, line, 2) },
        missing: unstated,
        nearest: nearest(corpus, members),
      });
    }
  }
  return findings;
}

// ---------------------------------------------------------------- D3: unstated transition / terminal set

interface Entry {
  readonly state: string;
  /**
   * `empty` only when the source literally writes an empty collection — `set()`, `{}`, `[]`. A body
   * the parser could not read is `unparsed`, and it is NOT terminality. Conflating the two was the
   * bug that made this detector useless: `mutationDepth: [0, 2, 4]` has no identifier members, so a
   * numeric knob space read as a state machine in which every state was an undeclared terminal.
   */
  readonly kind: "empty" | "members" | "unparsed";
  readonly members: readonly string[];
  readonly line: number;
}

/**
 * Pull a state-transition table out of hidden code — and, much more importantly, refuse to.
 *
 * The first version of this accepted any mapping of three or more keys to collections. It produced
 * 129 findings across eight families, every one of them a scenario knob space, and a screen that
 * flags everything blocks nothing. The structural test below is what makes it a detector rather than
 * a generator of work.
 *
 * A transition relation has a property no configuration object has: ITS VALUES ARE ITS KEYS. The
 * successors of a state are themselves states. That single closure property separates
 * `{EXECUTED: {ACKED, REVOKED}, ACKED: set()}` from `{seed: [11, 23, 41], confirmation: [...]}`
 * without knowing anything about either domain.
 */
const ENTRY =
  /^[ \t]*(?:"([A-Za-z_][\w]*)"|([A-Za-z_][\w]*))\s*:\s*(set\(\)|frozenset\(\)|new Set\(\s*\)|\{\s*\}|\[\s*\]|new Set\(\s*\[([^\]]*)\]\s*\)|\{([^}]*)\}|\[([^\]]*)\])\s*,?\s*$/gm;

const EMPTY_LITERAL = /^(set\(\)|frozenset\(\)|new Set\(\s*\)|\{\s*\}|\[\s*\]|new Set\(\s*\[\s*\]\s*\))$/;

/** Every object/dict literal in the file, as [start, end) offsets into the stripped source. */
function objectLiterals(source: HiddenSource): (readonly [number, number])[] {
  const out: (readonly [number, number])[] = [];
  const opener = /[=:(]\s*\{/g;
  for (const m of source.code.matchAll(opener)) {
    const brace = source.code.indexOf("{", m.index);
    if (brace < 0) continue;
    const end = closingBracket(source, brace);
    if (end > brace) out.push([brace, end]);
  }
  return out;
}

function parseEntries(source: HiddenSource, from: number, to: number): Entry[] {
  const entries: Entry[] = [];
  const region = source.code.slice(from, to);
  ENTRY.lastIndex = 0;
  for (const m of region.matchAll(ENTRY)) {
    const state = m[1] ?? m[2];
    if (state === undefined) continue;
    const literal = (m[3] ?? "").trim();
    const line = lineAt(source, from + m.index);
    if (EMPTY_LITERAL.test(literal)) {
      entries.push({ state, kind: "empty", members: [], line });
      continue;
    }
    const body = m[4] ?? m[5] ?? m[6] ?? "";
    // Members arrive in two shapes and both have to be read.
    //
    // Python state machines key on module constants — `{LEASED, REVOKED}` — which survive stripping
    // as bare identifiers. TypeScript ones use string literals — `new Set(["LEASED"])` — whose
    // BODIES the stripper blanks to preserve offsets. Reading only the stripped text therefore saw
    // an empty member list for every TypeScript table, classified it `unparsed`, and rejected the
    // whole literal. The strings are recovered from the original source over this entry's own span.
    const identifiers = body
      .split(",")
      .map((x) => x.trim().replace(/^["']|["']$/g, ""))
      .filter((x) => /^[A-Za-z_][\w]*$/.test(x));
    const quoted = literalsBetween(source, from + m.index, from + m.index + m[0].length).filter((x) =>
      /^[A-Za-z_][\w]*$/.test(x),
    );
    const members = [...new Set([...identifiers, ...quoted])];
    const segments = body.split(",").filter((x) => x.trim().length > 0);
    entries.push({
      state,
      kind: members.length > 0 && members.length === segments.length ? "members" : "unparsed",
      members,
      line,
    });
  }
  return entries;
}

/**
 * Pull state-transition tables out of hidden code — and, much more importantly, refuse to.
 *
 * The first version accepted any mapping of three or more keys to collections. It produced 129
 * findings across eight families, every one a scenario knob space, and a screen that flags everything
 * blocks nothing. The structural test is what makes this a detector rather than a generator of work.
 *
 * A transition relation has a property no configuration object has: ITS VALUES ARE ITS KEYS. The
 * successors of a state are themselves states. That closure property separates
 * `{EXECUTED: {ACKED, REVOKED}, ACKED: set()}` from `{seed: [11, 23, 41]}` without knowing anything
 * about either domain.
 *
 * Entries are collected PER OBJECT LITERAL rather than per file. Sweeping the whole file meant an
 * unrelated `{attempt1: [1, 2, 4]}` sitting above a real state machine classified as `unparsed` and
 * vetoed extraction for everything below it — and a numeric config array beside a state machine is
 * an ordinary shape, not a contrived one.
 */
function transitionTables(source: HiddenSource): Entry[][] {
  const out: Entry[][] = [];
  for (const [from, to] of objectLiterals(source)) {
    const entries = parseEntries(source, from, to);
    if (entries.some((e) => e.kind === "unparsed")) continue;
    const populated = entries.filter((e) => e.kind === "members");
    const terminals = entries.filter((e) => e.kind === "empty");
    if (populated.length < 2 || terminals.length === 0) continue;
    const keys = new Set(entries.map((e) => e.state));
    const successors = new Set(populated.flatMap((e) => e.members));
    if (successors.size === 0) continue;
    const closed = [...successors].filter((x) => keys.has(x)).length / successors.size;
    // Closure, with slack for a sentinel like `None` on the left and an alias on the right. Below
    // this the mapping is a configuration object that happens to look like a graph.
    if (closed >= 0.75) out.push(entries);
  }
  return out;
}

export function detectTransitions(source: HiddenSource, corpus: Corpus, tally: Tally): Finding[] {
  const findings: Finding[] = [];
  const constants = constantValues(source);
  for (const table of transitionTables(source)) {
    const nonTerminal = table.filter((t) => t.kind === "members").map((t) => t.state);
    for (const entry of table) {
      if (entry.kind !== "empty") continue;
      if (entry.state === "None" || entry.state === "null" || entry.state === "undefined") continue;
      const name = constants.get(entry.state) ?? entry.state;
      tally.extracted += 1;

      if (statesTerminality(corpus, name) !== undefined) continue;
      const contradiction = groupedWith(corpus, name, nonTerminal);
      findings.push({
        detector: "unstated-transition",
        severity: "high",
        requirement: `grading treats \`${name}\` as TERMINAL — the hidden table gives it no successor, so any outgoing transition the subject records is a violation — and no visible file says so`,
        hidden: { path: source.path, line: entry.line, text: excerpt(source, entry.line) },
        missing: [`${name} is terminal`],
        nearest: nearest(corpus, [name]),
        ...(contradiction ? { contradiction } : {}),
      });
    }
  }
  return findings;
}

// ---------------------------------------------------------------- D4: unstated precedence

/**
 * A graded decision that applies rules in an order the specification does not fix.
 *
 * When two rules both apply to a case, which one the grader reports is a commitment. It is usually
 * invisible, because the author wrote the checks in the order that felt natural and never noticed
 * the order was load-bearing.
 *
 * The clearing test is deliberately generous: if the visible package MENTIONS the same codes in the
 * same relative order — a numbered table counts — the order is taken as published. Only a hidden
 * order that the visible text either contradicts or never fixes is reported.
 */
export function detectPrecedence(source: HiddenSource, corpus: Corpus, tally: Tally): Finding[] {
  const codes: { code: string; line: number }[] = [];
  for (const literal of source.strings) {
    if (!RULE_CODE.test(literal.value)) continue;
    if (codes.some((c) => c.code === literal.value)) continue;
    // A rule code inside a KEYED LOOKUP TABLE carries no order. `{checker_present: "C0_...",
    // provenance_loss: "C3_..."}` is read by key, so its source order is semantically inert, and
    // reciting that order as a precedence chain was six of this probe's false positives in one
    // sweep. Only a code reached by a CONTROL-FLOW decision — a return, a branch, a push — is
    // evidence that the grader got there first.
    if (isLookupEntry(source, literal.line)) continue;
    codes.push({ code: literal.value, line: literal.line });
  }
  if (codes.length < 2) return [];
  tally.extracted += 1;

  const visibleOrder = codes
    .map((c) => ({ code: c.code, at: corpus.haystack.indexOf(c.code.toLowerCase()) }))
    .filter((c) => c.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((c) => c.code);

  const hiddenOrder = codes.map((c) => c.code).filter((c) => visibleOrder.includes(c));
  if (hiddenOrder.length < 2) return [];
  const sameOrder = hiddenOrder.every((code, i) => visibleOrder[i] === code);
  if (sameOrder) return [];

  // The visible text lists them in a different order than the grader applies them. That is only a
  // defect if nothing visible states the precedence explicitly.
  const first = hiddenOrder[0];
  const second = hiddenOrder[1];
  if (first === undefined || second === undefined) return [];
  if (statesPrecedence(corpus, first, second) !== undefined) return [];

  const line = codes[0]?.line ?? 1;
  return [
    {
      detector: "unstated-precedence",
      severity: "low",
      requirement: `grading applies rules first-match-wins in the order ${hiddenOrder.join(" > ")}, while the visible package presents them as ${visibleOrder.join(" > ")} and states no precedence. A case matching two rules is reported under whichever the grader reached first.`,
      hidden: { path: source.path, line, text: excerpt(source, line) },
      missing: [`precedence of ${first} over ${second}`],
      nearest: nearest(corpus, [first, second]),
    },
  ];
}

// ---------------------------------------------------------------- D5: unstated mandatory call

const CALL_PREDICATE = /\.\s*(?:method|name|call|fn|op)\s*(?:===|==|!==|!=)\s*["']/g;
const CALL_IN_TUPLE = /\.\s*(?:method|name|call|fn|op)\s+in\s*[([{]/g;

/** Visible language that PROHIBITS rather than obliges. */
const PROHIBITED =
  /\b(must not|may not|cannot|never|forbidden|illegal|prohibited|do not|don't|is not permitted|are not permitted)\b/i;

/**
 * Does the grader punish the ABSENCE of this call, or its PRESENCE?
 *
 * The first version assumed absence and was wrong about a third of the time. `ui-action-record-replay`
 * fails a subject that DOES call `askModel` — asking the model is the cheat the family exists to
 * catch — and the probe reported it as "grading fails the subject unless it calls askModel". Exactly
 * backwards, in a report meant to be trusted enough to block a build.
 *
 * Both polarities are real defects when unstated. A required call the specification only permits is
 * one; a forbidden call the specification never prohibits is the other. They just need opposite
 * sentences, and opposite questions asked of the visible text.
 *
 * Four strategies, tried in order of confidence, and an explicit refusal at the end.
 */
function enclosingFunction(source: HiddenSource, line: number): string | null {
  for (let i = line; i >= 1 && i > line - 40; i -= 1) {
    const text = source.lines[i - 1]?.raw ?? "";
    const m =
      /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_]\w*)/.exec(text) ??
      /^\s*(?:export\s+)?(?:const|let)\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?\(/.exec(text) ??
      /^\s*def\s+([A-Za-z_]\w*)\s*\(/.exec(text);
    if (m?.[1] !== undefined) return m[1];
  }
  return null;
}

interface Polarity {
  readonly polarity: "required" | "forbidden";
  /** The line holding the guard that turns the observation into a verdict. */
  readonly guardLine: number;
}

/** First line matching `re`, or `fallback`. */
function findLine(source: HiddenSource, re: RegExp, fallback: number): number {
  for (let i = 1; i <= source.lines.length; i += 1) {
    if (re.test(source.lines[i - 1]?.raw ?? "")) return i;
  }
  return fallback;
}

function callPolarity(source: HiddenSource, line: number): Polarity | null {
  const statement = (source.lines[line - 1]?.raw ?? "").trim();

  // 1. Inline guard: `if (!calls.some(c => c.method === "x"))` versus `if (calls.some(...))`.
  if (/\bif\s*\(\s*!/.test(statement) || /\bif\s+not\b/.test(statement))
    return { polarity: "required", guardLine: line };

  // 2. The observation is stored, then tested a few lines later.
  const assigned = /(?:const|let|var)\s+([A-Za-z_]\w*)\s*=/.exec(statement)?.[1];
  const window: string[] = [];
  for (let i = line; i <= Math.min(source.lines.length, line + 12); i += 1) {
    window.push((source.lines[i - 1]?.raw ?? "").trim());
  }
  const text = window.join("\n");
  const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (assigned !== undefined) {
    const v = esc(assigned);
    if (
      new RegExp(
        `(!\\s*${v}\\b)|(\\b${v}(?:\\.length)?\\s*(?:===|==)\\s*0)|(\\b${v}(?:\\.length)?\\s*<\\s*1)|(\\bnot\\s+${v}\\b)`,
      ).test(text)
    ) {
      return { polarity: "required", guardLine: line };
    }
    if (
      new RegExp(`\\b${v}(?:\\.length)?\\s*(?:>\\s*0|>=\\s*1|!==?\\s*0)`).test(text) ||
      new RegExp(`\\bif\\s*\\(\\s*${v}\\s*\\)`).test(text)
    ) {
      return { polarity: "forbidden", guardLine: line };
    }
  }

  // 3. The observation is the RETURN VALUE of a named predicate, and the negation lives at the call
  //    site — often in another function entirely. This is the shape of the access-token defect:
  //    `attemptedCurrentObservation` returns `some(...) && some(...)`, and the only `!` in the family
  //    is fifteen lines away in the verify loop. A window never reaches it, so the polarity has to be
  //    resolved through the function's own name.
  if (/^\s*return\b/.test(statement) || /^\s*[A-Za-z_]/.test(statement)) {
    const fn = enclosingFunction(source, line);
    if (fn !== null) {
      const v = esc(fn);
      const negated = new RegExp(`(!\\s*${v}\\s*\\()|(\\bnot\\s+${v}\\s*\\()`);
      if (negated.test(source.code)) {
        return { polarity: "required", guardLine: findLine(source, negated, line) };
      }
      const positive = new RegExp(`\\bif\\s*\\(\\s*${v}\\s*\\(`);
      if (positive.test(source.code)) {
        return { polarity: "forbidden", guardLine: findLine(source, positive, line) };
      }
    }
  }

  // 4. Last resort, and only in the unambiguous direction.
  if (/\bif\s*\(\s*[^)]*\.some\(/.test(text) && !/\bif\s*\(\s*!/.test(text))
    return { polarity: "forbidden", guardLine: line };

  // Unclassifiable. Reporting an unknown polarity as "required" is how the inverted findings got
  // written in the first place, so it is dropped instead — a silent miss beats a confident lie in a
  // report that is meant to be trusted enough to block a build.
  return null;
}

/**
 * A graded decision that turns on whether the subject CALLED something.
 *
 * This is the sharpest instance of the adjudication boundary, so it is the one detector whose
 * clearing test is strict. Finding the method name in the visible text is not enough. The sentence
 * has to impose the obligation, or state the prohibition. If the visible text says the subject MAY
 * call something the grader requires, the specification has not merely omitted the rule — it has
 * licensed the behaviour that loses, and the subject that followed the specification is the one the
 * grader punishes.
 */
export function detectMandatoryCalls(source: HiddenSource, corpus: Corpus, tally: Tally): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  for (const pattern of [CALL_PREDICATE, CALL_IN_TUPLE]) {
    pattern.lastIndex = 0;
    for (const m of source.code.matchAll(pattern)) {
      const line = lineAt(source, m.index);
      // Decision context is tested at the GUARD, not at the observation. A predicate helper that
      // returns `some(method === "currentApproval") && some(method === "currentToken")` sits a
      // hundred lines from the `if (!...)` that turns it into a failure, so testing the observation
      // line dropped the access-token defect entirely and reported that family clean.
      const found = callPolarity(source, line);
      if (found === null) continue;
      if (!inDecisionContext(source, found.guardLine)) continue;
      const polarity = found.polarity;

      // `c.method === "query" || c.method === "queryAnchor"` is ONE obligation with two acceptable
      // ways to satisfy it. Reporting it as two separate mandatory calls says the subject must make
      // both, which is the opposite of what the code requires, and it double-counts the finding.
      const alternatives = stringsIn(source, line, line + 2).filter((m) => /^[a-z][A-Za-z0-9_]{2,}$/.test(m));
      if (alternatives.length === 0) continue;
      const disjunctive = /\|\||\bor\b/.test(
        (source.lines[line - 1]?.code ?? "") + (source.lines[line]?.code ?? ""),
      );
      const groups = disjunctive ? [alternatives] : alternatives.map((m) => [m]);

      for (const group of groups) {
        const method = group.join(" or ");
        if (seen.has(method)) continue;
        seen.add(method);
        tally.extracted += 1;

        const primary = group[0] ?? method;
        const mandate = readMandate(corpus, primary);
        // A disjunction is satisfied if ANY alternative is stated, so mentions pool across the group.
        const hits = group.flatMap((m) => readMandate(corpus, m).mentions);
        const anyMandatory = group.some((m) => readMandate(corpus, m).mandatory !== undefined);

        if (polarity === "forbidden") {
          // A prohibition is satisfied by any visible sentence that forbids the call. The families
          // here publish an "Illegal Outcomes" section, which is exactly the right place for it.
          if (hits.some((ref) => PROHIBITED.test(ref.text))) continue;
          findings.push({
            detector: "unstated-mandatory-call",
            severity: hits.length === 0 ? "high" : "medium",
            requirement:
              `grading fails the subject BECAUSE it calls \`${method}\`, and no visible file prohibits it` +
              `${hits.length === 0 ? " — the method is not mentioned in the package at all" : ""}`,
            hidden: { path: source.path, line, text: excerpt(source, line, 3) },
            missing: [`${method} is prohibited`],
            nearest: hits.length > 0 ? hits.slice(0, 4) : nearest(corpus, [method]),
          });
          continue;
        }

        if (anyMandatory) continue;
        // An obligation the subject cannot discharge without making the call is a mandate, even
        // when the specification never writes the method's name.
        if (group.some((m) => mandatedIndirectly(corpus, m) !== undefined)) continue;
        // The permissive sentence rarely names the method; it names the capability. Look for a
        // visible line that permits something built from the method's own words.
        const words = primary
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length >= 5);
        const permissive = strongestPermission(corpus, words) ?? mandate.permissive;

        findings.push({
          detector: "unstated-mandatory-call",
          severity: "high",
          requirement:
            `grading fails the subject unless it calls \`${method}\`, and no visible file states that ` +
            `as an obligation${permissive ? " — the visible text permits it instead of requiring it" : ""}`,
          hidden: { path: source.path, line, text: excerpt(source, line, 3) },
          missing: [`${method} is mandatory`],
          nearest: hits.length > 0 ? hits.slice(0, 4) : nearest(corpus, words),
          ...(permissive ? { contradiction: permissive } : {}),
        });
      }
    }
  }
  return findings;
}
