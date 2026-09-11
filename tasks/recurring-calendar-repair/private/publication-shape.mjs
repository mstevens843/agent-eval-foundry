// Structural API validation only. Materialization correctness is graded separately.
const object = x => x !== null && typeof x === "object" && !Array.isArray(x);
const string = x => typeof x === "string";
const number = x => typeof x === "number" && Number.isFinite(x);
const nullable = (check, x) => x === null || check(x);
const array = (check, xs) => Array.isArray(xs) && xs.every(check);
const optional = (x, k, check) => !Object.hasOwn(x, k) || check(x[k]);
const attendee = x => object(x) && string(x.id) && ["accepted", "declined", "tentative"].includes(x.response);
const exception = x => object(x) && string(x.rid)
  && ["start", "zone"].every(k => optional(x, k, string))
  && optional(x, "duration", number) && optional(x, "room", v => nullable(string, v))
  && optional(x, "attendees", v => array(attendee, v)) && optional(x, "cancelled", v => typeof v === "boolean");
const change = x => object(x) && string(x.uid) && string(x.rid)
  && ["single", "future"].includes(x.scope) && ["cancel", "move"].includes(x.action)
  && optional(x, "delta", number) && optional(x, "zone", string) && optional(x, "room", v => nullable(string, v));
const sourceValue = (kind, x) => {
  if (x === null) return true;
  if (kind === "changes") return array(change, x);
  if (!object(x)) return false;
  if (kind === "window") return string(x.from) && string(x.through);
  if (kind === "zone") return string(x.id) && number(x.initialOffset)
    && array(t => object(t) && number(t.at) && number(t.offset), x.transitions);
  return ["uid", "start", "until", "zone"].every(k => string(x[k])) && number(x.duration)
    && nullable(string, x.room) && array(attendee, x.attendees) && array(string, x.excluded)
    && array(exception, x.exceptions) && object(x.rule) && ["daily", "weekly"].includes(x.rule.frequency)
    && number(x.rule.interval) && array(number, x.rule.weekdays);
};
const record = x => object(x) && ["series", "zone", "changes", "window"].includes(x.kind)
  && string(x.id) && Number.isInteger(x.revision) && sourceValue(x.kind, x.value);
const event = x => object(x)
  && Object.keys(x).sort().join(",") === "attendees,endUTC,rid,room,startLocal,startUTC,status,uid,zone"
  && ["uid", "rid", "startLocal", "zone"].every(k => string(x[k]))
  && nullable(number, x.startUTC) && nullable(number, x.endUTC)
  && ["active", "cancelled", "skipped"].includes(x.status)
  && nullable(string, x.room) && array(attendee, x.attendees);
const booking = x => object(x) && string(x.key) && string(x.room) && number(x.startUTC) && number(x.endUTC);
export const publicationShape = r => object(r) && Number.isInteger(r.baseGeneration)
  && array(record, r.records) && r.records.length <= 32
  && array(event, r.events) && r.events.length <= 200
  && array(booking, r.bookings) && r.bookings.length <= 220;
