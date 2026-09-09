import { owners } from "./ownership.mjs";
import { progress } from "./progress.mjs";
import { update } from "./index.mjs";
export function consume(view, api) {
  const owner = owners(view.partitions),
    checkpoint = progress();
  let e;
  while ((e = api.next({})) !== null) {
    if (e.kind === "assignment") {
      owner.assign(e);
      continue;
    }
    if (!owner.accept(e)) continue;
    update(e, api);
    api.complete({ partition: e.partition, generation: e.generation, offset: e.offset, eventId: e.eventId });
    checkpoint.finish(e, api);
  }
  return { drained: true };
}
