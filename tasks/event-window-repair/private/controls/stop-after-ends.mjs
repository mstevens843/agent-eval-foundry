import { subject as correct } from "./service-entry.mjs";
export const subject = { async run(view, api) {
  const ended = new Set();
  return correct.run(view, { ...api, async next(x) {
    if (ended.size === view.partitions.length) return null;
    const event = await api.next(x);
    if (event?.kind === "end") ended.add(event.partition);
    return event;
  }});
} };
