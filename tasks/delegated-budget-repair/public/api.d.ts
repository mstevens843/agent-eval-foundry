export interface Request {
  id: string;
  kind: "reserve" | "capture" | "release";
  reservation: string;
  owner: string;
  delegate: string;
  wallet: string;
  grant: string;
  grantVersion: number;
  credits: number;
}
export interface Grant {
  id: string;
  delegate: string;
  version: number;
  allowed: boolean;
  limit: number;
}
export interface Reservation {
  id: string;
  requestId: string;
  wallet: string;
  grant: string;
  grantVersion: number;
  owner: string;
  delegate: string;
  credits: number;
}
export interface Settlement {
  id: string;
  wallet: string;
  grant: string;
  reservation: string;
  kind: "capture" | "release";
  credits: number;
}
export interface Snapshot {
  revision: number;
  wallets: { id: string; owner: string; grants: Grant[] }[];
  reservations: Reservation[];
  settlements: Settlement[];
}
export interface Decision {
  id: string;
  status: "accepted" | "rejected";
  receipt: Request | null;
}
export interface API {
  snapshot(r: {}): Promise<Snapshot>;
  lookup(r: { id: string }): Promise<
    { status: "ABSENT" | "PENDING" } | { status: "TERMINAL"; decision: Decision }
  >;
  resolve(r: { request: Request; revision: number; outcome: "accepted" | "rejected" }): Promise<
    { status: "UNKNOWN" } | { stale: true } | { error: "request" }
  >;
}
