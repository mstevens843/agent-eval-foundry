import { utc } from "./time.mjs";
export function publication(events, zones, external) {
  const rows = events.map((e) => {
    const startUTC = utc(
      e.startLocal,
      zones.find((z) => z.id === e.zone),
    );
    return {
      uid: e.uid,
      rid: e.rid,
      startLocal: e.startLocal,
      zone: e.zone,
      startUTC,
      endUTC: startUTC === null ? null : startUTC + e.duration,
      status: e.cancelled ? "cancelled" : startUTC === null ? "skipped" : "active",
      room: e.room,
      attendees: e.attendees,
    };
  });
  const bookings = [
    ...structuredClone(external),
    ...rows
      .filter((e) => e.status === "active" && e.room !== null)
      .map((e) => ({
        key: JSON.stringify([e.uid, e.rid]),
        room: e.room,
        startUTC: e.startUTC,
        endUTC: e.endUTC,
      })),
  ];
  return { events: rows, bookings };
}
