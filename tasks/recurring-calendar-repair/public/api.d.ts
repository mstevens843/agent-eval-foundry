export interface Zone {
  id: string;
  initialOffset: number;
  transitions: { at: number; offset: number }[];
}
export interface Attendee {
  id: string;
  response: "accepted" | "declined" | "tentative";
}
export interface Exception {
  rid: string;
  start?: string;
  zone?: string;
  duration?: number;
  room?: string | null;
  attendees?: Attendee[];
  cancelled?: boolean;
}
export interface Series {
  uid: string;
  start: string;
  until: string;
  zone: string;
  duration: number;
  room: string | null;
  attendees: Attendee[];
  rule: { frequency: "daily" | "weekly"; interval: number; weekdays: number[] };
  excluded: string[];
  exceptions: Exception[];
}
export interface Change {
  uid: string;
  rid: string;
  scope: "single" | "future";
  action: "cancel" | "move";
  delta?: number;
  zone?: string;
  room?: string | null;
}
export interface Event {
  uid: string;
  rid: string;
  startLocal: string;
  zone: string;
  startUTC: number | null;
  endUTC: number | null;
  status: "active" | "cancelled" | "skipped";
  room: string | null;
  attendees: Attendee[];
}
export interface Booking {
  key: string;
  room: string;
  startUTC: number;
  endUTC: number;
}
export interface View {
  series: Series[];
  zones: Zone[];
  changes: Change[];
  externalBookings: Booking[];
  storage: string;
}
export interface API {
  commit(r: { events: Event[]; bookings: Booking[] }): Promise<{ stored: true } | { error: "shape" }>;
}
