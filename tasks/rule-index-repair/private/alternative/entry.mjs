export const subject = {
  async run(v, api) {
    const code = [{ op: "fail" }],
      emit = (x) => (code.push(x), code.length - 1);
    let entry = 0;
    for (let ri = v.rules.length - 1; ri >= 0; ri--) {
      const r = v.rules[ri],
        ts = [];
      let count = 0;
      for (let i = 0; i < r.pattern.length; i++) {
        let c = r.pattern[i];
        if (c === "\\") {
          ts.push({ kind: "char", value: r.pattern[++i] });
          continue;
        }
        ts.push(
          c === "*"
            ? { kind: "star", slot: count++ }
            : c === "?"
              ? { kind: "any" }
              : { kind: "char", value: c },
        );
      }
      const start = code.length,
        links = [];
      for (const t of ts) {
        const at = code.length;
        if (links.length) for (const [pc, k] of links.splice(0)) code[pc][k] = at;
        if (t.kind === "star") {
          emit({ op: "mark", slot: t.slot, edge: "start", next: at + 1 });
          emit({ op: "memo", next: at + 2 });
          emit({ op: "split", first: at + 3, second: at + 5 });
          emit({ op: "mark", slot: t.slot, edge: "end", next: at + 4 });
          links.push([emit({ op: "jump", next: 0 }), "next"]);
          emit({ op: "any", next: at + 1 });
        } else {
          emit({ op: "memo", next: at + 1 });
          links.push([
            emit(
              t.kind === "any"
                ? { op: "any", next: 0 }
                : { op: "char", value: t.value, fold: r.fold, next: 0 },
            ),
            "next",
          ]);
        }
      }
      const terminal = emit({ op: "accept", ruleId: r.id, tag: r.tag, slots: count });
      for (const [pc, k] of links) code[pc][k] = terminal;
      entry = emit({ op: "split", first: start, second: entry });
    }
    return api.publish({ program: { entry, code } });
  },
};
