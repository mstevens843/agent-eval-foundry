export interface Payload {
  status: "available" | "unavailable";
  value: number | null;
  sources: { kind: "reading" | "report"; id: string; version: number }[];
}
export interface Publication {
  report: string;
  version: number;
  supersedes: number | null;
  payload: Payload;
}
export interface Api {
  next(x: {}): Promise<{
    id: string;
    requests: { report: string; recipient: string }[];
    queries: { id: string; report: string; version: number }[];
  } | null>;
  snapshot(x: {}): Promise<{
    readings: { id: string; version: number; value: number | null }[];
    definitions: {
      id: string;
      op: "sum" | "difference";
      inputs: { kind: "reading" | "report"; id: string }[];
    }[];
    history: Publication[];
    receipts: { report: string; version: number; recipient: string; kind: string; payload: Payload }[];
  }>;
  publish(x: { record: Publication }): Promise<{ stored: true } | { error: string }>;
  deliver(x: { report: string; version: number; recipient: string; kind: "initial" | "correction" }): Promise<
    { stored: true } | { error: string }
  >;
  answer(x: { id: string; payload: Payload }): Promise<{ stored: true } | { error: string }>;
}
