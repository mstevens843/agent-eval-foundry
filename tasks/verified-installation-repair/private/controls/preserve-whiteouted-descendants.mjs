export const below = (p, r) => p.startsWith(r + "/");
export function erase(tree, path, childrenOnly = false) {
  if (!childrenOnly) delete tree[path];
}
export function put(tree, e) {
  const parts = e.path.split("/");
  for (let n = 1; n < parts.length; n++) {
    const p = parts.slice(0, n).join("/");
    if (tree[p]?.kind !== "dir") {
      for (const q of Object.keys(tree)) if (q === p || below(q, p)) delete tree[q];
      tree[p] = { kind: "dir", mode: 493 };
    }
  }
  if (e.kind === "file" || tree[e.path]?.kind !== "dir")
    for (const q of Object.keys(tree)) if (q === e.path || below(q, e.path)) delete tree[q];
  tree[e.path] =
    e.kind === "file" ? { kind: "file", mode: e.mode, data: e.data } : { kind: "dir", mode: e.mode };
}
