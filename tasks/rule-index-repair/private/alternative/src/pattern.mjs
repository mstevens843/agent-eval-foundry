export function pattern(builder, tokens, rule) {
  let slots = tokens.filter((t) => t.kind === "star").length,
    next = builder.emit({ op: "accept", ruleId: rule.id, tag: rule.tag, slots });
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (t.kind === "star") {
      const slot = --slots,
        end = builder.emit({ op: "mark", slot, edge: "end", next });
      const split = builder.emit({ op: "split", first: end, second: 0 }),
        consume = builder.emit({ op: "any", next: split });
      builder.patch(split, { first: consume, second: end });
      next = builder.emit({ op: "mark", slot, edge: "start", next: split });
    } else
      next = builder.emit(
        t.kind === "any" ? { op: "any", next } : { op: "char", value: t.value, fold: rule.fold, next },
      );
  }
  return next;
}
