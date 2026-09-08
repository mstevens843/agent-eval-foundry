import { tokens } from "./tokens.mjs";
import { Builder } from "./builder.mjs";
import { pattern } from "./pattern.mjs";
export function compile(rules) {
  const b = new Builder();
  let entry = b.emit({ op: "fail" });
  for (let i = rules.length - 1; i >= 0; i--) {
    const start = pattern(b, tokens(rules[i].pattern), rules[i]);
    entry = b.emit({ op: "split", first: start, second: entry });
  }
  const end = b.code.length;
  for (let pc = 0; pc < end; pc++)
    if (b.code[pc].op === "accept") {
      const accept = b.emit({ ...b.code[pc] }),
        consume = b.emit({ op: "any", next: pc });
      b.code[pc] = { op: "split", first: accept, second: consume };
    }
  return b.finish(entry);
}
