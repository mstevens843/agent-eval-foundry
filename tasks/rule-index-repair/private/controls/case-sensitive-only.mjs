export function pattern(b, tokens, rule) {
  let slots = tokens.filter((t) => t.kind === "star").length,
    next = b.emit({ op: "accept", ruleId: rule.id, tag: rule.tag, slots });
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (t.kind === "star") {
      const slot = --slots,
        end = b.emit({ op: "mark", slot, edge: "end", next }),
        split = b.emit({ op: "split", first: end, second: 0 });
      const memo = b.emit({ op: "memo", next: split }),
        consume = b.emit({ op: "any", next: memo });
      b.patch(split, { second: consume });
      next = b.emit({ op: "mark", slot, edge: "start", next: memo });
    } else {
      const at = b.emit(
        t.kind === "any" ? { op: "any", next } : { op: "char", value: t.value, fold: false, next },
      );
      next = b.emit({ op: "memo", next: at });
    }
  }
  return next;
}
