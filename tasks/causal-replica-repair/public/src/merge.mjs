import { identity, contextUnion } from "./identity.mjs";
export function merge(states) {
  const values = new Map();
  for (const s of states) for (const v of s.values) values.set(identity(v), v);
  return { context: contextUnion(states), values: [...values.values()] };
}
