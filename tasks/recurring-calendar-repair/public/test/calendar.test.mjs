import { test } from "node:test";
import assert from "node:assert/strict";
import { subject } from "../entry.mjs";
test("exports two daily meetings while retaining an unrelated booking", async () => {
  const series = {
    uid: "s",
    start: "2026-01-01T09:00",
    until: "2026-01-02",
    zone: "UTC",
    duration: 30,
    room: "r",
    attendees: [{ id: "a", response: "accepted" }],
    rule: { frequency: "daily", interval: 1, weekdays: [] },
    excluded: [],
    exceptions: [],
  };
  let result;
  await subject.run(
    {
      series: [series],
      zones: [{ id: "UTC", initialOffset: 0, transitions: [] }],
      changes: [],
      externalBookings: [{ key: "external", room: "x", startUTC: 1, endUTC: 2 }],
      storage: "/tmp",
    },
    {
      commit: async (r) => {
        result = r;
        return { stored: true };
      },
    },
  );
  assert.equal(result.events.length, 2);
  assert.equal(result.bookings.length, 3);
  assert.ok(result.events.every((e) => e.endUTC - e.startUTC === 30));
  assert.ok(result.bookings.some((b) => b.key === "external"));
});
