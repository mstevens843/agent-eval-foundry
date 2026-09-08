export const checkIds = [
  "completion",
  "occurrence_identity",
  "civil_time",
  "history",
  "bookings",
  "preservation",
];
const m = (s) => Date.parse(s + "Z") / 60000;
export function scenarios() {
  const rows = [];
  for (let seed = 0; seed < 24; seed++) {
    const fold = seed % 2 === 1,
      date = fold ? "2026-11-01" : "2026-03-08",
      hour = fold ? "01:30" : "02:30";
    const zone = {
      id: "Local",
      initialOffset: fold ? -240 : -300,
      transitions: [{ at: m(date + (fold ? "T06:00" : "T07:00")), offset: fold ? -300 : -240 }],
    };
    const start = (fold ? "2026-10-30" : "2026-03-06") + "T" + hour;
    const rid2 = (fold ? "2026-10-31" : "2026-03-07") + "T" + hour,
      rid3 = date + "T" + hour;
    const s = {
      uid: "series-" + seed,
      start,
      until: fold ? "2026-11-05" : "2026-03-12",
      zone: "Local",
      duration: 90,
      room: "room-a",
      attendees: [
        { id: "a", response: "accepted" },
        { id: "b", response: "declined" },
      ],
      rule: { frequency: seed % 3 ? "daily" : "weekly", interval: 1, weekdays: [0, 1, 2, 3, 4, 5, 6] },
      excluded: [],
      exceptions: [
        {
          rid: rid2,
          start: (fold ? "2026-11-03" : "2026-03-10") + "T09:00",
          room: "room-b",
          attendees: [
            { id: "a", response: "tentative" },
            { id: "b", response: "declined" },
          ],
        },
      ],
    };
    const decoy = {
      ...structuredClone(s),
      uid: "unrelated-" + seed,
      exceptions: [],
      excluded: [rid2],
      room: null,
    };
    const changes = [
      { uid: s.uid, rid: rid2, scope: "single", action: "move", delta: 30 },
      {
        uid: s.uid,
        rid: rid3,
        scope: "future",
        action: "move",
        delta: seed % 4 === 0 ? 60 : 15,
        zone: seed % 5 === 0 ? "UTC" : "Local",
        room: "room-c",
      },
      { uid: s.uid, rid: rid2, scope: "single", action: "cancel" },
    ];
    if (seed % 4 === 1)
      changes.push({ uid: s.uid, rid: start, scope: "single", action: "move", delta: 1440 * 2 });
    rows.push({
      id: "case-" + String(seed).padStart(3, "0"),
      view: {
        series: [s, decoy],
        zones: [zone, { id: "UTC", initialOffset: 0, transitions: [] }],
        changes,
        externalBookings: [{ key: "foreign-" + seed, room: "room-x", startUTC: 1, endUTC: 2 }],
      },
    });
  }
  rows.push({
    id: "case-024",
    view: {
      series: [
        {
          uid: "clean",
          start: "2026-01-01T09:00",
          until: "2026-01-01",
          zone: "UTC",
          duration: 30,
          room: "r",
          attendees: [],
          rule: { frequency: "daily", interval: 1, weekdays: [] },
          excluded: [],
          exceptions: [],
        },
      ],
      zones: [{ id: "UTC", initialOffset: 0, transitions: [] }],
      changes: [],
      externalBookings: [],
    },
  });
  rows.push({
    id: "case-025",
    view: {
      series: [],
      zones: [],
      changes: [],
      externalBookings: [{ key: "keep", room: "r", startUTC: 1, endUTC: 2 }],
    },
  });
  // The scenarios above never vary interval away from 1 and never restrict weekdays away
  // from the full 7-day set, so a broken interval-skip or a broken/inverted weekday filter
  // would pass all of them undetected. case-026/027/028 close that gap with real,
  // observably-restrictive rule values (verified against the oracle and both correct
  // implementations to actually change which occurrences are generated).
  rows.push({
    id: "case-026",
    view: {
      series: [
        {
          uid: "weekday-subset",
          start: "2026-04-06T09:00",
          until: "2026-04-19",
          zone: "UTC",
          duration: 30,
          room: "room-w",
          attendees: [],
          rule: { frequency: "weekly", interval: 1, weekdays: [1, 4] },
          excluded: [],
          exceptions: [],
        },
      ],
      zones: [{ id: "UTC", initialOffset: 0, transitions: [] }],
      changes: [],
      externalBookings: [],
    },
  });
  rows.push({
    id: "case-027",
    view: {
      series: [
        {
          uid: "daily-interval",
          start: "2026-04-01T09:00",
          until: "2026-04-10",
          zone: "UTC",
          duration: 30,
          room: "room-i",
          attendees: [],
          rule: { frequency: "daily", interval: 3, weekdays: [0, 1, 2, 3, 4, 5, 6] },
          excluded: [],
          exceptions: [],
        },
      ],
      zones: [{ id: "UTC", initialOffset: 0, transitions: [] }],
      changes: [],
      externalBookings: [],
    },
  });
  rows.push({
    id: "case-028",
    view: {
      series: [
        {
          uid: "weekly-interval",
          start: "2026-01-05T09:00",
          until: "2026-01-25",
          zone: "UTC",
          duration: 30,
          room: "room-j",
          attendees: [],
          rule: { frequency: "weekly", interval: 2, weekdays: [0, 1, 2, 3, 4, 5, 6] },
          excluded: [],
          exceptions: [],
        },
      ],
      zones: [{ id: "UTC", initialOffset: 0, transitions: [] }],
      changes: [],
      externalBookings: [],
    },
  });
  // Every existing scenario applies "cancel" LAST for any rid that's also moved, so a
  // candidate that dropped the "moves do not revive cancelled occurrences" guard entirely
  // would still pass. case-029 orders a cancel BEFORE a move on the same original rid: the
  // move must be a no-op (verified: the correct startLocal stays 09:00, not 10:00).
  rows.push({
    id: "case-029",
    view: {
      series: [
        {
          uid: "cancel-then-move",
          start: "2026-05-04T09:00",
          until: "2026-05-04",
          zone: "UTC",
          duration: 30,
          room: "room-k",
          attendees: [{ id: "a", response: "accepted" }],
          rule: { frequency: "daily", interval: 1, weekdays: [0, 1, 2, 3, 4, 5, 6] },
          excluded: [],
          exceptions: [],
        },
      ],
      zones: [{ id: "UTC", initialOffset: 0, transitions: [] }],
      changes: [
        { uid: "cancel-then-move", rid: "2026-05-04T09:00", scope: "single", action: "cancel" },
        { uid: "cancel-then-move", rid: "2026-05-04T09:00", scope: "single", action: "move", delta: 60 },
      ],
      externalBookings: [],
    },
  });
  // Every existing DST scenario has its ORIGINAL rid land directly in the gap (entirely
  // omitted). None ever relocates an otherwise-valid occurrence INTO a gap via a move, so
  // the "omit" (original-in-gap) and "skipped row" (moved-into-gap) paths were never both
  // exercised. case-030's original local (01:00) resolves fine; a +90 minute move lands it
  // on 02:30, inside the spring-forward gap (verified null) — the row must still be emitted
  // with status "skipped" and null UTCs, not dropped.
  rows.push({
    id: "case-030",
    view: {
      series: [
        {
          uid: "moved-into-gap",
          start: "2026-03-08T01:00",
          until: "2026-03-08",
          zone: "Local",
          duration: 30,
          room: "room-g",
          attendees: [],
          rule: { frequency: "daily", interval: 1, weekdays: [0, 1, 2, 3, 4, 5, 6] },
          excluded: [],
          exceptions: [],
        },
      ],
      zones: [
        {
          id: "Local",
          initialOffset: -300,
          transitions: [{ at: m("2026-03-08T07:00"), offset: -240 }],
        },
      ],
      changes: [
        { uid: "moved-into-gap", rid: "2026-03-08T01:00", scope: "single", action: "move", delta: 90 },
      ],
      externalBookings: [],
    },
  });
  return rows;
}
