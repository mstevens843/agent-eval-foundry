import { identity, contextUnion } from "./identity.mjs";
export function merge(states) {
  const all = new Map();
  for (const s of states) for (const v of s.values) all.set(identity(v), v);
  return { context: contextUnion(states), values: [...all.values()] };
}
