export const checkIds = [
  "completion",
  "occurrence_identity",
  "civil_time",
  "history",
  "bookings",
  "preservation",
  "source_revisions",
];
const m = (s) => Date.parse(s + "Z") / 60000;
function baseScenarios() {
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

function versioned(s) {
  const { series, zones, changes, externalBookings } = s.view;
  const record = (kind, id, value, revision = 1) => ({ kind, id, revision, value });
  const updates = [
    ...zones.map((z) => record("zone", z.id, z)),
    ...series.map((x) => record("series", x.uid, x)),
    ...series.map((x) =>
      record(
        "changes",
        x.uid,
        changes.filter((c) => c.uid === x.uid),
      ),
    ),
    record("window", "publication", { from: "2026-01-01T00:00", through: "2026-12-31T23:59" }),
  ];
  const deliveries = [{ id: "initial", updates }];
  if (s.id !== "case-024" && series.length) {
    const first = series[0],
      replacement = {
        ...structuredClone(first),
        room: "amended-room",
        exceptions: [
          ...first.exceptions.filter((e) => e.rid !== first.start),
          { rid: first.start, start: first.start, attendees: [{ id: "amended", response: "tentative" }] },
        ],
      };
    const amendment = [
      record("series", first.uid, replacement, 3),
      record(
        "changes",
        first.uid,
        [
          {
            uid: first.uid,
            rid: first.start,
            scope: "future",
            action: "move",
            delta: 1440,
            room: "future-room",
          },
          { uid: first.uid, rid: first.start, scope: "single", action: "cancel" },
        ],
        2,
      ),
    ];
    deliveries.push(
      {
        id: "amend",
        updates: amendment,
        concurrentBooking: { key: "concurrent", room: "external", startUTC: 4, endUTC: 5 },
        interrupt: { method: "api.publish", count: 2 },
      },
      { id: "old", updates: [record("series", first.uid, { ...first, room: "obsolete" }, 2)] },
      { id: "duplicate", updates: amendment },
      {
        id: "window",
        updates: [record("window", "publication", { from: first.start, through: first.start }, 2)],
      },
      {
        id: "remove",
        updates: [
          record("series", first.uid, null, 4),
          record("changes", first.uid, null, 3),
          record("window", "publication", { from: "2026-01-01T00:00", through: "2026-12-31T23:59" }, 3),
        ],
      },
    );
  }
  return { id: s.id, externalBookings, deliveries };
}
export function scenarios() {
  const rows = baseScenarios();
  for (let n = 0; n < 4; n++) {
    const view = structuredClone(rows[n].view),
      first = view.series[0];
    view.series = Array.from({ length: 6 }, (_, i) => ({
      ...structuredClone(first),
      uid: "series-" + i,
      rule: { frequency: i % 2 ? "daily" : "weekly", interval: (i % 4) + 1, weekdays: [0, 2, 4] },
      room: i % 3 ? "room-" + i : null,
    }));
    view.changes = view.series.flatMap((s) => [
      { uid: s.uid, rid: s.start, scope: "future", action: "move", delta: 30 },
      { uid: s.uid, rid: s.start, scope: "single", action: "move", delta: 60, zone: "UTC" },
    ]);
    const z = view.zones[0],
      at = z.transitions[0].at;
    z.transitions.push(
      { at: at + 1440, offset: z.initialOffset },
      { at: at + 2880, offset: z.transitions[0].offset },
      { at: at + 4320, offset: z.initialOffset },
    );
    rows.push({ id: "combined-" + n, view });
  }
  const output=rows.map(versioned);
  const ack=structuredClone(output[0]);ack.id='ack-response-loss';ack.deliveries=ack.deliveries.slice(0,1);ack.deliveries[0].interrupt={method:'api.ack',count:1};output.push(ack);
  const reborn=structuredClone(output[0]);reborn.id='tombstone-resurrection';reborn.deliveries.push({id:'reborn',updates:reborn.deliveries[0].updates.map(r=>({...r,revision:10}))});output.push(reborn);
  return output;
}
