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
  operationBudget: number;
  storage: string;
  // 0 on the first delivery of this run; 1 on the redelivery that follows the
  // single possible interruption described in SEMANTICS.md. Informational only —
  // correctness must not depend on any particular attempt count.
  attempt: number;
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
