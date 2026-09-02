// Reading source the way the probe needs to read it.
//
// Two jobs, and both are about the same trap.
//
// A comment is not a commitment. `// ACKED is terminal` inside the hidden verifier proves the AUTHOR
// knew the rule; it proves nothing about whether the SUBJECT could know it. If comments are left in
// the hidden text the detectors get confused about which side a statement lives on. So hidden code
// is stripped to executable text before anything looks at it.
//
// The mirror image is true on the visible side. A comment in a file the subject can read IS visible
// text — `db.py:34` in the outbox is a SQL comment, and it is the single most load-bearing sentence
// in that family's package, because it contradicts the hidden table. So visible files are never
// stripped, and the corpus keeps every line.
//
// The lexer is deliberately lexical rather than a real parser. The probe has to read TypeScript and
// Python with the same code path, because the cases it was validated against are half of each, and a
// tool that only reads the language its author happens to like is a tool nobody else can run.

import type { Language, ProbeFile } from "./types.js";

export interface Line {
  /** 1-indexed, matching what an editor shows. */
  readonly line: number;
  /** Comments and string bodies blanked; whitespace and length preserved. */
  readonly code: string;
  /** Exactly as written. */
  readonly raw: string;
}

export interface HiddenSource {
  readonly path: string;
  readonly language: Language;
  readonly lines: readonly Line[];
  /** The file exactly as written. Offsets index into it identically to `code`. */
  readonly raw: string;
  /** The stripped text, newline-joined. Index into it maps back through `lineAt`. */
  readonly code: string;
  /** String literals, in order, with the line they appeared on. Needed because the stripper blanks them. */
  readonly strings: readonly { readonly value: string; readonly line: number }[];
}

const BLANK = (s: string) => " ".repeat(s.length);

/**
 * Blank out comments and string bodies, preserving offsets.
 *
 * Offsets are preserved so a match index in the stripped text maps to a line without a second pass,
 * and so a regex that spans a stripped region still sees the right amount of space. String BODIES go
 * because a detector looking for `"ACKED"` as a set member must not also match the word `ACKED`
 * inside an error message; the quotes stay so the strings are still findable as literals, and the
 * bodies are recovered separately into `strings`.
 */
function strip(source: string, language: Language): { code: string; strings: { value: string; line: number }[] } {
  if (language === "text") return { code: source, strings: [] };
  const out: string[] = [];
  const strings: { value: string; line: number }[] = [];
  let i = 0;
  let line = 1;
  const n = source.length;
  const py = language === "py";

  while (i < n) {
    const ch = source.charAt(i);
    const next = source.charAt(i + 1);

    if (ch === "\n") {
      out.push("\n");
      line += 1;
      i += 1;
      continue;
    }

    // line comment
    if ((!py && ch === "/" && next === "/") || (py && ch === "#")) {
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? n : end;
      out.push(BLANK(source.slice(i, stop)));
      i = stop;
      continue;
    }

    // block comment
    if (!py && ch === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      const chunk = source.slice(i, stop);
      out.push(chunk.replace(/[^\n]/g, " "));
      line += (chunk.match(/\n/g) ?? []).length;
      i = stop;
      continue;
    }

    // python triple-quoted string / docstring
    if (py && (source.startsWith('"""', i) || source.startsWith("'''", i))) {
      const quote = source.slice(i, i + 3);
      const end = source.indexOf(quote, i + 3);
      const stop = end === -1 ? n : end + 3;
      const chunk = source.slice(i, stop);
      out.push(chunk.replace(/[^\n]/g, " "));
      line += (chunk.match(/\n/g) ?? []).length;
      i = stop;
      continue;
    }

    // single-line string literal
    if (ch === '"' || ch === "'" || (!py && ch === "`")) {
      const quote = ch;
      let j = i + 1;
      let value = "";
      while (j < n) {
        if (source[j] === "\\") {
          value += source[j + 1] ?? "";
          j += 2;
          continue;
        }
        if (source[j] === quote) break;
        if (source[j] === "\n") break; // unterminated; bail rather than swallow the file
        value += source[j];
        j += 1;
      }
      const closed = source[j] === quote;
      const stop = closed ? j + 1 : j;
      // Keep the delimiters, blank the body: `"ACKED"` becomes `"     "`. A membership detector can
      // still see that a literal was here, and a word-scan cannot mistake the body for code.
      out.push(quote + BLANK(source.slice(i + 1, stop - (closed ? 1 : 0))) + (closed ? quote : ""));
      if (closed) strings.push({ value, line });
      i = stop;
      continue;
    }

    out.push(ch);
    i += 1;
  }

  return { code: out.join(""), strings };
}

export function readHidden(file: ProbeFile): HiddenSource {
  const { code, strings } = strip(file.source, file.language);
  const rawLines = file.source.split("\n");
  const codeLines = code.split("\n");
  const lines: Line[] = rawLines.map((raw, idx) => ({
    line: idx + 1,
    raw,
    code: codeLines[idx] ?? "",
  }));
  return { path: file.path, language: file.language, lines, code, strings, raw: file.source };
}

/** Line number for a character offset into `HiddenSource.code`. */
export function lineAt(source: HiddenSource, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < source.code.length; i += 1) {
    if (source.code[i] === "\n") line += 1;
  }
  return line;
}

/**
 * String literals written between two offsets of the ORIGINAL source.
 *
 * This exists because a line window is not a delimiter. Reading "the strings near this line" pulled
 * the failure message in beside the set members — `fail("secret_leak", "wrote a record carrying a
 * secret")` sits two lines below the set it guards, and its arguments are string literals too. The
 * members of a set are the literals inside ITS brackets, and nothing else, so the span has to be the
 * bracket span. The stripper preserves offsets precisely so this slice is possible.
 */
export function literalsBetween(source: HiddenSource, start: number, end: number): string[] {
  const text = source.raw.slice(start, Math.min(end, source.raw.length));
  const out: string[] = [];
  const re = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const value = m[1] ?? m[2];
    if (value !== undefined && value.length > 0) out.push(value);
  }
  return out;
}

/**
 * The offset just past the collection opened at or after `from`, or -1 if it does not close.
 *
 * Bracket-aware rather than regex-based, so a nested collection does not truncate the span.
 */
export function closingBracket(source: HiddenSource, from: number): number {
  const open = /[[({]/.exec(source.code.slice(from, from + 200));
  if (open === null) return -1;
  const start = from + open.index;
  const pairs: Readonly<Record<string, string>> = { "[": "]", "(": ")", "{": "}" };
  const want = pairs[source.code.charAt(start)];
  if (want === undefined) return -1;
  let depth = 0;
  for (let i = start; i < source.code.length && i < start + 4000; i += 1) {
    const ch = source.code.charAt(i);
    if (ch === "[" || ch === "(" || ch === "{") depth += 1;
    else if (ch === "]" || ch === ")" || ch === "}") {
      depth -= 1;
      // The closing bracket must MATCH the opening one. Both arms of this used to return the same
      // value, so `want` was computed and thrown away and any closer was accepted. `strip()` blanks
      // string bodies but not regex literals, so a bracket inside a character class — `/[)]/` in a
      // `.filter()` chained onto the literal being scanned — could drive depth to zero at the wrong
      // place. That returned a WRONG span rather than no span, and a wrong span silently feeds the
      // wrong members into a set-membership finding.
      if (depth === 0) return ch === want ? i + 1 : -1;
    }
  }
  return -1;
}

/** The raw text of a line, trimmed, for quoting in a finding. */
export function excerpt(source: HiddenSource, line: number, span = 1): string {
  const start = Math.max(1, line);
  const parts: string[] = [];
  for (let i = start; i < start + span && i <= source.lines.length; i += 1) {
    parts.push((source.lines[i - 1]?.raw ?? "").trim());
  }
  return parts.filter(Boolean).join(" ").slice(0, 220);
}

/**
 * Tokens that mean "the subject failed", in either language.
 *
 * This is the precision lever for the whole probe. A numeric literal in hidden code is almost never
 * interesting; a numeric literal in a function that raises a violation is a graded threshold. Every
 * detector narrows to decision context before it reports, and this is how context is recognised.
 */
const FAILURE_TOKENS = [
  "fail(",
  "failures.push",
  "raise Violation",
  "raise AssertionError",
  "raise ValueError",
  "assert ",
  "violation",
  "reject",
  "not allowed",
  "must ",
  "illegal",
  "expect(",
  "return false",
];

/**
 * Is this line close enough to a failure to be part of a graded decision?
 *
 * The window is asymmetric on purpose. A guard PRECEDES the failure it guards, often by several
 * lines of message construction, so the interesting direction from a threshold is forward. Looking
 * back a little still catches a threshold written inside the failure message itself.
 */
export function inDecisionContext(source: HiddenSource, line: number, after = 12, before = 3): boolean {
  const lo = Math.max(1, line - before);
  const hi = Math.min(source.lines.length, line + after);
  for (let i = lo; i <= hi; i += 1) {
    const text = (source.lines[i - 1]?.raw ?? "").toLowerCase();
    if (FAILURE_TOKENS.some((t) => text.includes(t.toLowerCase()))) return true;
  }
  return false;
}
