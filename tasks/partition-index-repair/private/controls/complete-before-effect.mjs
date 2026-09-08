import { owners } from "./ownership.mjs";
import { progress } from "./progress.mjs";
import { update } from "./index.mjs";
export function consume(v, a) {
  const o = owners(v.partitions),
    p = progress();
  for (let e; (e = a.next({})) !== null; ) {
    if (e.kind === "assignment") {
      o.assign(e);
      continue;
    }
    if (!o.accept(e)) continue;
    a.complete({ partition: e.partition, generation: e.generation, offset: e.offset, eventId: e.eventId });
    p.finish(e, a);
    update(e, a);
  }
  return {};
}
