export const subject = {
  async run(v, api) {
    function build(node, remaining, past) {
      const q = node.request,
        rs = v.resources,
        choices = [];
      for (let mask = (1 << rs.length) - 1; mask >= 0; mask--) {
        const indices = rs.map((_, i) => i).filter((i) => mask & (1 << i));
        if (indices.length !== q.units) continue;
        if (indices.some((i) => remaining[i] < 1 || !q.tags.every((t) => rs[i].tags.includes(t)))) continue;
        if (new Set(indices.map((i) => rs[i].zone)).size < q.minZones) continue;
        if (q.antiWith.some((a) => indices.some((i) => past[a].includes(rs[i].id)))) continue;
        if (
          q.shareZoneWith &&
          indices.some(
            (i) => !past[q.shareZoneWith].some((id) => rs.find((r) => r.id === id).zone === rs[i].zone),
          )
        )
          continue;
        choices.push(indices);
      }
      for (const choice of choices) {
        const ids = choice.map((i) => rs[i].id),
          rest = remaining.map((n, i) => n - (choice.includes(i) ? 1 : 0)),
          history = { ...past, [node.id]: ids },
          children = {};
        let good = true;
        for (const child of node.children) {
          const policy = build(child, rest, history);
          if (!policy) {
            good = false;
            break;
          }
          children[child.id] = policy;
        }
        if (good) return { resources: ids, children };
      }
      return null;
    }
    let policy = build(
        v.tree,
        v.resources.map((r) => r.capacity - r.used),
        {},
      ),
      first = true;
    for (let node; (node = await api.next({})) !== null; ) {
      if (!first) policy = policy.children[node];
      first = false;
      await api.place({ node, resources: policy.resources });
    }
    return { complete: true };
  },
};
