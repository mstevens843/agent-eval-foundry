import { advance } from "./frontier.mjs";
import { identity } from "./identity.mjs";
import { add, close } from "./windows.mjs";
export async function run(view, api) {
  const states = new Map(view.partitions.map((p) => [p, { active: true, ended: false, watermark: -1000 }]));
  const seen = new Set(),
    windows = new Map();
  let frontier = -1000;
  for (let e; (e = await api.next({})) !== null; ) {
    if (e.kind === "data") {
      const id = identity(e);
      if (seen.has(id)) continue;
      seen.add(id);
      const end = (Math.floor(e.time / view.width) + 1) * view.width;
      if (end + view.lateness <= frontier) await api.late({ event: e });
      else add(windows, e, view.width);
    } else {
      const p = states.get(e.partition);
      if (e.kind === "watermark") p.watermark = e.value;
      if (e.kind === "idle") p.active = false;
      if (e.kind === "resume") p.active = true;
      if (e.kind === "end") p.ended = true;
      frontier = advance(states, frontier);
      await close(windows, frontier, view, api);
    }
  }
  return { completed: true };
}
