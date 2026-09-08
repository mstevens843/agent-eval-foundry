import { session, checks, equal } from "./adapter.mjs";
export function parse(pattern) {
  const tokens = [];
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "\\") {
      tokens.push({ kind: "literal", value: pattern[++i] });
      continue;
    }
    tokens.push({ kind: c === "*" ? "star" : c === "?" ? "any" : "literal", value: c });
  }
  return tokens;
}
export function expected(rules, text) {
  for (const rule of rules) {
    const tokens = parse(rule.pattern),
      memo = new Map(),
      eq = (a, b) => (rule.fold ? a.toLowerCase() === b.toLowerCase() : a === b);
    function suffix(t, p) {
      const key = t + ":" + p;
      if (memo.has(key)) return memo.get(key);
      let result = null;
      if (t === tokens.length) result = p === text.length ? [] : null;
      else if (tokens[t].kind === "star") {
        for (let end = p; end <= text.length; end++) {
          const tail = suffix(t + 1, end);
          if (tail !== null) {
            result = [text.slice(p, end), ...tail];
            break;
          }
        }
      } else if (p < text.length && (tokens[t].kind === "any" || eq(tokens[t].value, text[p])))
        result = suffix(t + 1, p + 1);
      memo.set(key, result);
      return result;
    }
    const captures = suffix(0, 0);
    if (captures !== null) return { ruleId: rule.id, tag: rule.tag, captures };
  }
  return null;
}
function validate(program) {
  if (!program || !Array.isArray(program.code) || !program.code.length || program.code.length > 8192)
    throw Error("program size");
  const pointer = (p) => {
    if (!Number.isInteger(p) || p < 0 || p >= program.code.length) throw Error("pointer");
  };
  pointer(program.entry);
  const fields = {
    char: ["op", "value", "fold", "next"],
    any: ["op", "next"],
    jump: ["op", "next"],
    memo: ["op", "next"],
    split: ["op", "first", "second"],
    mark: ["op", "slot", "edge", "next"],
    accept: ["op", "ruleId", "tag", "slots"],
    fail: ["op"],
  };
  for (const i of program.code) {
    if (!i || !Object.hasOwn(fields, i.op) || !equal(Object.keys(i).sort(), [...fields[i.op]].sort()))
      throw Error("instruction schema");
    if ("next" in i) pointer(i.next);
    if (i.op === "split") {
      pointer(i.first);
      pointer(i.second);
    }
    if (
      i.op === "char" &&
      (typeof i.value !== "string" ||
        i.value.length !== 1 ||
        i.value.charCodeAt(0) < 32 ||
        i.value.charCodeAt(0) > 126 ||
        typeof i.fold !== "boolean")
    )
      throw Error("char");
    if (
      i.op === "mark" &&
      (!Number.isInteger(i.slot) || i.slot < 0 || i.slot > 7 || !["start", "end"].includes(i.edge))
    )
      throw Error("mark");
    if (
      i.op === "accept" &&
      (!Number.isInteger(i.slots) ||
        i.slots < 0 ||
        i.slots > 8 ||
        typeof i.ruleId !== "string" ||
        typeof i.tag !== "string")
    )
      throw Error("accept");
  }
}
export function interpret(program, text, budget) {
  const stack = [],
    visited = new Set(),
    counts = {};
  let frame = { pc: program.entry, offset: 0, marks: [] },
    steps = 0;
  while (frame) {
    if (++steps > budget) return { value: null, steps, budget, withinBudget: false, counts };
    const { pc, offset, marks } = frame,
      i = program.code[pc];
    counts[i.op] = (counts[i.op] ?? 0) + 1;
    const next = (p) => {
        frame.pc = p;
      },
      fail = () => {
        frame = stack.pop();
      };
    switch (i.op) {
      case "char":
        if (
          offset < text.length &&
          (i.fold ? text[offset].toLowerCase() === i.value.toLowerCase() : text[offset] === i.value)
        ) {
          frame.offset++;
          next(i.next);
        } else fail();
        break;
      case "any":
        if (offset < text.length) {
          frame.offset++;
          next(i.next);
        } else fail();
        break;
      case "jump":
        next(i.next);
        break;
      case "split":
        stack.push({ pc: i.second, offset, marks: marks.map((x) => (x ? { ...x } : x)) });
        next(i.first);
        break;
      case "mark":
        marks[i.slot] = { ...(marks[i.slot] ?? {}), [i.edge]: offset };
        next(i.next);
        break;
      case "memo": {
        const key = pc + ":" + offset;
        if (visited.has(key)) fail();
        else {
          visited.add(key);
          next(i.next);
        }
        break;
      }
      case "accept": {
        const selected = Array.from({ length: i.slots }, (_, j) => marks[j]);
        if (
          offset === text.length &&
          selected.every(
            (x) =>
              x &&
              Number.isInteger(x.start) &&
              Number.isInteger(x.end) &&
              x.start >= 0 &&
              x.end >= x.start &&
              x.end <= text.length,
          )
        )
          return {
            value: {
              ruleId: i.ruleId,
              tag: i.tag,
              captures: selected.map((x) => text.slice(x.start, x.end)),
            },
            steps,
            budget,
            withinBudget: true,
            counts,
          };
        fail();
        break;
      }
      case "fail":
        fail();
        break;
    }
  }
  return { value: null, steps, budget, withinBudget: true, counts };
}
export async function runScenario(s, execute, storage) {
  const observations = [],
    reports = [];
  let program = null,
    legal = true;
  await execute(
    session(
      { rules: s.rules, storage },
      {
        publish: ({ program: next }) => {
          try {
            if (program) throw Error("published");
            validate(next);
            program = next;
            return { ok: true };
          } catch (e) {
            if (program) legal = false;
            return { ok: false, error: String(e.message) };
          }
        },
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  const tokens = s.rules.reduce((n, r) => n + parse(r.pattern).length, 0);
  const truth = s.documents.map((t) => expected(s.rules, t));
  const actual = s.documents.map((t) =>
    program
      ? interpret(program, t, 8 * (t.length + 1) * (tokens + s.rules.length + 1) + 32)
      : { value: null, steps: 0, withinBudget: true },
  );
  return {
    ...checks({
      completion: program !== null,
      semantics: actual.every((a, i) => equal(a.value, truth[i])),
      bounded_work: actual.every((a) => a.withinBudget),
      positive_work:
        !truth.some(Boolean) || actual.some((a, i) => truth[i] !== null && equal(a.value, truth[i])),
      legal_program: legal,
    }),
    actual,
    expected: truth,
    observations,
    reports,
    // Legitimate PROBLEM data, not answer data: view.rules is handed directly to every
    // candidate's own run(view, api) as its input (see runScenario's session() call above and
    // SEMANTICS.md's `view.rules` description) — every solver already sees this. It was
    // previously reconstructible only by a checker that also received the (now-stripped)
    // `expected` field, so a checker independently reimplementing the matching semantics from
    // SEMANTICS.md (to compute its own reference verdict and to construct probe documents to
    // run the candidate's own published program against) had no way to know which rules a given
    // scenario actually used. Echoing it back here leaks no computed answer — s.documents and
    // the correct match results remain entirely private.
    rules: s.rules,
  };
}
