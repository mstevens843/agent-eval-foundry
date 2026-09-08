export interface RecordValue {
  entity: string;
  version: number;
  body: string;
}
export interface Assignment {
  kind: "assignment";
  partition: string;
  generation: number;
}
export interface Callback {
  kind: "callback";
  partition: string;
  generation: number;
  offset: number;
  eventId: string;
  record: RecordValue;
}
export interface View {
  partitions: string[];
  storage: string;
}
export interface API {
  next(request: Record<string, never>): Assignment | Callback | null;
  read(request: { partition: string; entity: string }): RecordValue | null;
  put(request: RecordValue & { partition: string; generation: number }): { stored: true };
  complete(request: { partition: string; generation: number; offset: number; eventId: string }): {
    stored: true;
  };
  commit(request: { partition: string; generation: number; offset: number }): { stored: true };
}
export interface Subject {
  run(view: View, api: API): unknown;
}
