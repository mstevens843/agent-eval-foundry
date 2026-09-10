// Private authority coverage for SEMANTICS.md: use the latest metadata after a 304.
// This consumes genuine host observations, never candidate diagnostic reports.
import { isDeepStrictEqual as equal } from "node:util";
const matches = (entry, event) =>
  entry.path === event.path &&
  !entry.vary.includes("*") &&
  entry.vary.every((name) => (entry.headers[name] ?? "") === (event.headers[name] ?? ""));

export function validationMetadataCurrent(cell) {
  const cache = structuredClone(cell.input.initial);
  let active = null,
    validations = [];
  for (const o of cell.observations) {
    if (o.method === "next" && o.value?.event) {
      active = o.value.event;
      validations = [];
    } else if (o.method === "write" && o.value?.stored === true) {
      cache[o.request.tier] = structuredClone(o.request.entries);
    } else if (o.method === "origin" && o.value?.status === 304 && active?.kind === "get") {
      const bases = [...cache[active.tier], ...cache.shield].filter(
        (e) => matches(e, active) && e.etag === o.request.ifNoneMatch,
      );
      if (bases.length) validations.push({ response: o.value, bases });
    } else if (o.method === "deliver" && o.value?.stored === true && active?.kind === "get") {
      for (const { response, bases } of validations) {
        for (const e of [...cache[active.tier], ...cache.shield]) {
          if (!bases.some((base) => equal(base, e))) continue;
          const current =
            e.etag === response.etag &&
            equal(e.vary, response.vary) &&
            e.maxAge === response.maxAge &&
            e.age === response.age &&
            e.noStore === response.noStore &&
            e.storedAt === active.now &&
            e.vary.every((name) => (e.headers[name] ?? "") === (active.headers[name] ?? ""));
          if (!current) return false;
        }
      }
      active = null;
    } else if (o.method === "acknowledge" && o.value?.stored === true) active = null;
  }
  return true;
}
