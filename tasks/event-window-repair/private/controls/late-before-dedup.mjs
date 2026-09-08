import { advance } from "./src/frontier.mjs";
import { identity } from "./src/identity.mjs";
import { add, close } from "./src/windows.mjs";
// A plausible wrong repair: dedup correctly makes a duplicate of an event that was itself
// classified late permanently inert (matching correct behavior), but for a duplicate of an event
// that was ACCEPTED into an accumulator, it re-classifies lateness against the CURRENT frontier
// instead of treating the duplicate as unconditionally inert -- reasoning (incorrectly) that a
// repeat delivery for a window that has since closed should still be surfaced via late() rather
// than silently dropped. SEMANTICS.md requires the opposite: "A duplicate ... has no further
// effect", full stop, regardless of what the frontier has done since the original arrived.
// This produces output identical to the correct algorithm on every duplicate pair in the seeded
// scenario bank (each one either duplicates an event that was itself already late -- correctly
// suppressed here too -- or duplicates an accepted event with no frontier movement before the
// repeat arrives, so the current-frontier recheck agrees with the original's own classification).
// It only diverges when an accepted event's window closes *between* the original and the repeat.
export async function run(view, api) {
  const states = new Map(view.partitions.map((p) => [p, { active: true, ended: false, watermark: -1000 }]));
  const seenLate = new Set(),
    seenAccepted = new Set(),
    windows = new Map();
  let frontier = -1000;
  for (let e; (e = await api.next({})) !== null; ) {
    if (e.kind === "data") {
      const id = identity(e);
      if (seenLate.has(id)) continue;
      const end = (Math.floor(e.time / view.width) + 1) * view.width;
      const isLate = end + view.lateness <= frontier;
      if (seenAccepted.has(id)) {
        if (isLate) await api.late({ event: e });
        continue;
      }
      if (isLate) {
        seenLate.add(id);
        await api.late({ event: e });
      } else {
        seenAccepted.add(id);
        add(windows, e, view.width);
      }
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
export const subject = { run };
