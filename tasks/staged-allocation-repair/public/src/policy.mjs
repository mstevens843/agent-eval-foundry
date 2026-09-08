import { options } from "./options.mjs";
export function choose(node, resources, used, past) {
  return options(node, resources, used, past)[0] ?? [];
}
