import { owners } from "./ownership.mjs";
import { progress } from "./progress.mjs";
import { update } from "./index.mjs";
export function consume(v, a) {
  const owner = owners(v.partitions);
  let checkpoint = progress();
  for (let e; (e = a.next({})) !== null; ) {
    if (e.kind === "assignment") {
      owner.assign(e);
      checkpoint = progress();
      continue;
    }
    if (!owner.accept(e)) continue;
    update(e, a);
    a.complete({ partition: e.partition, generation: e.generation, offset: e.offset, eventId: e.eventId });
    checkpoint.finish(e, a);
  }
  return { drained: true };
}
