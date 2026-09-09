// Identical to the reference pattern compiler except it never emits a "memo" instruction --
// only the ordinary backtracking split/consume chain. This changes work bound, not correctness:
// the interpreter's memo op purely prunes repeated (pc, offset) exploration, never a match
// result, so this control's output is bit-identical to the reference for every input. Its only
// observable defect is on `bounded_work`: an isolated, correct-results-but-too-slow mutant,
// exercised by the existing "expansion" rule (`*a*a*a*a*a*b`, adjacent stars are the classic
// catastrophic-backtracking trigger) against its near-miss long-run-of-"a" documents, which the
// declared budget is sized to allow only with memoization.
export function pattern(b, tokens, rule) {
  let slots = tokens.filter((t) => t.kind === "star").length,
    next = b.emit({ op: "accept", ruleId: rule.id, tag: rule.tag, slots });
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (t.kind === "star") {
      const slot = --slots,
        end = b.emit({ op: "mark", slot, edge: "end", next }),
        split = b.emit({ op: "split", first: end, second: 0 });
      const consume = b.emit({ op: "any", next: split });
      b.patch(split, { second: consume });
      next = b.emit({ op: "mark", slot, edge: "start", next: split });
    } else {
      const at = b.emit(
        t.kind === "any" ? { op: "any", next } : { op: "char", value: t.value, fold: rule.fold, next },
      );
      next = at;
    }
  }
  return next;
}
