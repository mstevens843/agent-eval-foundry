import { equal, verdicts } from "./checker-utils.mjs";
import { evaluateTarget, validateTarget } from "./src/target.mjs";
import { equivalent, vocabulary } from "./src/equivalence.mjs";
function prefix(text) {
  const [address, length] = text.split("/");
  return {
    address: address.split(".").reduce((value, octet) => value * 256 + Number(octet), 0),
    length: Number(length),
  };
}
function match(filter, route) {
  const a = prefix(route.prefix),
    b = prefix(filter.prefix ?? "0.0.0.0/0");
  const end = (p) => p.address + 2 ** (32 - p.length);
  return (
    a.address >= b.address &&
    end(a) <= end(b) &&
    a.length >= (filter.ge ?? b.length) &&
    a.length <= (filter.le ?? 32) &&
    (filter.communities ?? []).every((tag) => route.communities.includes(tag))
  );
}
// Explicit interpreter stack is independent of the grading engine's recursive calls.
function interpret(config, egress, input) {
  const route = structuredClone(input),
    stack = [{ name: config.egresses[egress], next: 0 }];
  let work = 0,
    decision = "reject";
  while (stack.length) {
    const frame = stack.at(-1),
      policy = config.policies[frame.name];
    if (frame.next > policy.terms.length) {
      stack.pop();
      continue;
    }
    const fallback = frame.next === policy.terms.length;
    const term = fallback ? { action: policy.fallback } : policy.terms[frame.next];
    frame.next++;
    if (!fallback && !match(term.match, route)) continue;
    if (++work > 4096) throw Error("policy work bound");
    const action = term.action;
    if (Object.hasOwn(action, "preference")) route.preference = action.preference;
    const tags = new Set(route.communities);
    for (const tag of action.remove ?? []) tags.delete(tag);
    for (const tag of action.add ?? []) tags.add(tag);
    route.communities = [...tags];
    if (action.kind === "accept" || action.kind === "reject") {
      decision = action.kind;
      break;
    }
    if (action.kind === "call") stack.push({ name: action.policy, next: 0 });
    else if (action.kind === "return" || fallback) stack.pop();
  }
  return { decision, preference: route.preference, communities: [...new Set(route.communities)].sort() };
}
function check(cell) {
  const calls = cell.observations.filter((o) => o.method === "publish");
  const successful = calls.filter((o) => o.value?.ok === true);
  if (successful.length !== 1 || successful[0] !== calls.at(-1)) return false;
  const published = successful[0].request.config;
  if (
    !equal(Object.keys(published.egresses).sort(), Object.keys(cell.config.egresses).sort()) ||
    cell.actual.length !== cell.routes.length
  )
    return false;
  validateTarget(published, vocabulary(cell.config, cell.request));
  if (!equivalent(cell.config, cell.request, published, interpret)) return false;
  return cell.routes.every(({ egress, route }, index) => {
    const original = interpret(cell.config, egress, route);
    const expected =
      original.decision === "accept" &&
      cell.request.egresses.includes(egress) &&
      match(cell.request.match, route)
        ? { ...original, preference: cell.request.preference }
        : original;
    const result = evaluateTarget(published, egress, route);
    return equal(result, expected) && equal(cell.actual[index], result);
  });
}
export const run = ({ cases }) => verdicts(cases, check);
