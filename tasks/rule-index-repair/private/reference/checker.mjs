import { equal, verdicts } from "./checker-utils.mjs";
function tokenize(pattern) {
  const result = [];
  for (let i = 0; i < pattern.length; i++) {
    const x = pattern[i];
    if (x === "\\") result.push({ literal: pattern[++i] });
    else if (x === "*" || x === "?") result.push(x);
    else result.push({ literal: x });
  }
  return result;
}
function match(rules, text) {
  for (const rule of rules) {
    const tokens = tokenize(rule.pattern), n = text.length;
    // Suffix reachability, then a separate shortest-capture reconstruction.
    const reach = Array.from({ length: tokens.length + 1 }, () => new Uint8Array(n + 1));
    reach[tokens.length][n] = 1;
    for (let i = tokens.length - 1; i >= 0; i--) for (let p = n; p >= 0; p--) {
      const token = tokens[i];
      if (token === "*") reach[i][p] = reach[i + 1][p] || (p < n && reach[i][p + 1]);
      else if (p < n) {
        const matches = token === "?" || (rule.fold ? token.literal.toLowerCase() === text[p].toLowerCase() : token.literal === text[p]);
        reach[i][p] = matches && reach[i + 1][p + 1];
      }
    }
    if (!reach[0][0]) continue;
    const captures = [];
    let p = 0;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] !== "*") { p++; continue; }
      let end = p;
      while (!reach[i + 1][end]) end++;
      captures.push(text.slice(p, end)); p = end;
    }
    return { ruleId: rule.id, tag: rule.tag, captures };
  }
  return null;
}
function valid(program) {
  if (!program || !Array.isArray(program.code) || program.code.length < 1 || program.code.length > 8192) return false;
  const pointer = p => Number.isInteger(p) && p >= 0 && p < program.code.length;
  if (!pointer(program.entry)) return false;
  const shapes = new Map([
    ["char", ["value", "fold", "next"]], ["any", ["next"]], ["split", ["first", "second"]],
    ["jump", ["next"]], ["mark", ["slot", "edge", "next"]], ["memo", ["next"]],
    ["accept", ["ruleId", "tag", "slots"]], ["fail", []],
  ]);
  for (const i of program.code) {
    if (!i || !shapes.has(i.op) || !equal(Object.keys(i).sort(), ["op", ...shapes.get(i.op)].sort())) return false;
    for (const name of ["next", "first", "second"]) if (Object.hasOwn(i, name) && !pointer(i[name])) return false;
    if (i.op === "char" && (typeof i.fold !== "boolean" || typeof i.value !== "string" || !/^[ -~]$/.test(i.value))) return false;
    if (i.op === "mark" && (!Number.isInteger(i.slot) || i.slot < 0 || i.slot > 7 || !["start", "end"].includes(i.edge))) return false;
    if (i.op === "accept" && (typeof i.ruleId !== "string" || typeof i.tag !== "string" || !Number.isInteger(i.slots) || i.slots < 0 || i.slots > 8)) return false;
  }
  return true;
}
function check(c) {
  let published = false;
  for (const o of c.observations) {
    if (o.method !== "publish" || published) return false;
    if (o.value?.ok === true) {
      if (!valid(o.request.program)) return false;
      published = true;
    }
  }
  if (!published || c.actual.length !== c.documents.length) return false;
  const size = c.rules.reduce((n, r) => n + tokenize(r.pattern).length, 0);
  return c.documents.every((text, i) => {
    const a = c.actual[i], limit = 8 * (text.length + 1) * (size + c.rules.length + 1) + 32;
    return Number.isInteger(a.steps) && a.steps >= 0 && a.steps <= limit && equal(a.value, match(c.rules, text));
  });
}
export const run = ({ cases }) => verdicts(cases, check);
