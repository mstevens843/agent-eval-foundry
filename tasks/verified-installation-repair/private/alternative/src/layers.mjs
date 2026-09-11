// Array-of-nodes tree representation (instead of the reference's path-keyed object map). A
// publicly legal path can be named "__proto__" or "constructor"; storing nodes as {path,...}
// records in an array, matched by field rather than by object key, sidesteps that hazard by
// construction -- no key ever gets treated specially, since none of them ARE object keys.
function erase(nodes, path, childrenOnly) {
  return nodes.filter((n) => !((!childrenOnly && n.path === path) || n.path.startsWith(path + "/")));
}
function put(nodes, e) {
  for (let i = 1; i < e.path.split("/").length; i++) {
    const p = e.path.split("/").slice(0, i).join("/");
    if (!nodes.some((n) => n.path === p && n.kind === "dir")) {
      nodes = erase(nodes, p, false);
      nodes.push({ path: p, kind: "dir", mode: 493 });
    }
  }
  // Replacing a file, or converting a non-dir into a dir, wipes any old subtree at this path.
  // Replacing an EXISTING dir with a dir only refreshes its own metadata (mode) and must leave
  // its current children (including ones just added earlier in this very layer) untouched.
  const existingIsDir = nodes.some((n) => n.path === e.path && n.kind === "dir");
  nodes = e.kind === "file" || !existingIsDir ? erase(nodes, e.path, false) : nodes.filter((n) => n.path !== e.path);
  nodes.push(
    e.kind === "file" ? { path: e.path, kind: "file", mode: e.mode, data: e.data } : { path: e.path, kind: "dir", mode: e.mode },
  );
  return nodes;
}
export function assemble(layers) {
  let nodes = [];
  for (const layer of layers) {
    for (const e of layer.entries) if (e.kind === "remove" || e.kind === "opaque") nodes = erase(nodes, e.path, e.kind === "opaque");
    for (const e of layer.entries) if (e.kind === "dir" || e.kind === "file") nodes = put(nodes, e);
  }
  return nodes;
}
