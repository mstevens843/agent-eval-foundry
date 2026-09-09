export const below = (p, root) => p.startsWith(root + "/");
export function erase(tree, path, childrenOnly = false) {
  for (const p of Object.keys(tree)) if ((!childrenOnly && p === path) || below(p, path)) delete tree[p];
}
export function put(tree, e) {
  const parts = e.path.split("/");
  for (let n = 1; n < parts.length; n++) {
    const p = parts.slice(0, n).join("/");
    if (tree[p]?.kind !== "dir") {
      erase(tree, p);
      tree[p] = { kind: "dir", mode: 493 };
    }
  }
  if (e.kind === "file" || tree[e.path]?.kind !== "dir") erase(tree, e.path);
  tree[e.path] =
    e.kind === "file" ? { kind: "file", mode: e.mode, data: e.data } : { kind: "dir", mode: e.mode };
}
