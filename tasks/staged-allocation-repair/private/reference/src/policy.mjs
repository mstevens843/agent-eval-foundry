import { options, consume } from "./options.mjs";
export function choose(node, resources, used, past) {
  const memo = new Map();
  function winning(n, u, p) {
    const key = JSON.stringify([n.id, u, p]);
    if (memo.has(key)) return memo.get(key);
    const ok = options(n, resources, u, p).some((c) =>
      n.children.every((ch) => winning(ch, consume(u, c), { ...p, [n.id]: c })),
    );
    memo.set(key, ok);
    return ok;
  }
  return (
    options(node, resources, used, past).find((c) =>
      node.children.every((ch) => winning(ch, consume(used, c), { ...past, [node.id]: c })),
    ) ?? []
  );
}
