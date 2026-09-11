import { erase, put } from "./tree.mjs";
export function assemble(layers) {
  // A publicly legal path can be named "__proto__" (SEMANTICS.md's path rule only restricts
  // characters). put(tree, e) below does a plain tree[e.path] = {...} assignment; on a plain
  // object literal, assigning to the "__proto__" key reassigns the object's OWN PROTOTYPE
  // instead of storing an entry, silently losing that file rather than tracking it. Building on
  // a prototype-less object during construction makes every string, "__proto__" included, an
  // ordinary data key. The external return value still needs a normal prototype (a strict
  // structural-equality comparison against an ordinary object literal, e.g. in a visible test,
  // is otherwise never equal regardless of the entries' actual content) -- spreading into a
  // fresh `{}` on the way out gives that back while still preserving "__proto__" as an ordinary
  // own key (unlike Object.assign, which reassigns the prototype here exactly as plain
  // assignment would).
  const tree = Object.create(null);
  for (const layer of layers) {
    for (const e of layer.entries)
      if (e.kind === "remove" || e.kind === "opaque") erase(tree, e.path, e.kind === "opaque");
    for (const e of layer.entries) if (e.kind === "dir" || e.kind === "file") put(tree, e);
  }
  return { ...tree };
}
