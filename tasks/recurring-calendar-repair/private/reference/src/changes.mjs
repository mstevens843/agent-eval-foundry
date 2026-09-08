import { minute, civil } from "./time.mjs";
export function apply(events, changes) {
  for (const c of changes)
    for (const e of events)
      if (e.uid === c.uid && (c.scope === "single" ? e.rid === c.rid : e.rid >= c.rid)) {
        if (c.action === "cancel") e.cancelled = true;
        else if (!e.cancelled) {
          e.startLocal = civil(minute(e.startLocal) + (c.delta ?? 0));
          if (c.zone !== undefined) e.zone = c.zone;
          if (Object.hasOwn(c, "room")) e.room = c.room;
        }
      }
  return events;
}
