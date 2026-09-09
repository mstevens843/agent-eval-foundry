export function normalize(view) {
  if (!Array.isArray(view.events)) throw Error("events required");
  return view.events.map((event) => ({ ...event, value: String(event.value) }));
}
