export interface Revision {
  series: string;
  key: string;
  revision: number;
  knownAt: number;
  from: number;
  to: number;
  value: string | null;
}
export interface Query {
  id: string;
  series: string;
  knownAt: number;
  from: number;
  to: number;
}
export interface View {
  queries: Query[];
  storage: string;
}
export interface API {
  fetch(request: { cursor: string | null }): { rows: Revision[]; next: string | null };
  record(request: { id: string; total: string }): { stored: true };
}
export interface Subject {
  run(view: View, api: API): unknown;
}
