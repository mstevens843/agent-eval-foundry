import { tokens } from "./tokens.mjs";
import { Builder } from "./builder.mjs";
import { pattern } from "./pattern.mjs";
export function compile(rules) {
  rules = [...rules].sort((a, b) => b.pattern.length - a.pattern.length);
  const b = new Builder();
  let entry = b.emit({ op: "fail" });
  for (let i = rules.length - 1; i >= 0; i--) {
    const start = pattern(b, tokens(rules[i].pattern), rules[i]);
    entry = b.emit({ op: "split", first: start, second: entry });
  }
  return b.finish(entry);
}
