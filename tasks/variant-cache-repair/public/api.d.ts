export interface Response {
  status: 200 | 304;
  etag: string;
  body?: string;
  vary: string[];
  maxAge: number;
  age: number;
  noStore: boolean;
}
export interface Entry {
  path: string;
  headers: Record<string, string>;
  vary: string[];
  etag: string;
  body: string;
  maxAge: number;
  age: number;
  storedAt: number;
  noStore: boolean;
}
export type Event =
  | {
      kind: "get";
      id: string;
      tier: "edge-a" | "edge-b";
      path: string;
      headers: Record<string, string>;
      now: number;
    }
  | { kind: "purge"; id: string; path: string; tiers: string[]; now: number };
export interface View {
  limits: { maxOriginRequests: number; maxOriginBytes: number };
  storage: string;
}
export interface API {
  next(r: {}): Promise<{ event: Event } | { done: true } | { error: "unfinished" }>;
  read(r: { tier: string }): Promise<{ entries: Entry[] } | { error: "shape" }>;
  write(r: { tier: string; entries: Entry[] }): Promise<{ stored: true } | { error: "shape" }>;
  origin(r: { ifNoneMatch?: string }): Promise<Response | { error: "event" }>;
  deliver(r: { response: { body: string; etag: string } }): Promise<{ stored: true } | { error: "event" }>;
  acknowledge(r: {}): Promise<{ stored: true } | { error: "event" }>;
}
