import { options, consume } from "./options.mjs";
export function choose(n, r, u, p) {
  function win(n, u, p) {
    return options(n, r, u, p).some(
      (c) => !n.children.length || n.children.some((ch) => win(ch, consume(u, c), { ...p, [n.id]: c })),
    );
  }
  return (
    options(n, r, u, p).find(
      (c) => !n.children.length || n.children.some((ch) => win(ch, consume(u, c), { ...p, [n.id]: c })),
    ) ?? []
  );
}
