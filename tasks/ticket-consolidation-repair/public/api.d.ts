export interface Ticket {
  tenant: string;
  id: string;
  status: "open" | "closed";
  revision: number;
  owner: string;
  labels: string[];
  note: string;
}
export interface View {
  tenants: string[];
  team: string;
  marker: string;
  storage: string;
}
export interface Update {
  tenant: string;
  id: string;
  revision: number;
  patch: { owner: string; labels: string[] };
}
export interface API {
  page(request: { cursor: string | null }):
    | { status: "OK"; rows: Ticket[]; next: string | null }
    | { status: "EXPIRED"; resume: string };
  resolve(request: { tenant: string; team: string }): { owner: string };
  read(request: { tenant: string; id: string }): Ticket | null;
  batch(request: { updates: Update[] }): {
    results: { tenant: string; id: string; status: "APPLIED" | "CONFLICT" | "MISSING" }[];
  };
}
export interface Subject {
  run(view: View, api: API): unknown;
}
