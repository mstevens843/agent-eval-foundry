export interface Customer {
  tenant: string;
  id: string;
  name: string;
  active: boolean;
}
export interface Account {
  tenant: string;
  id: string;
  customerId: string;
  price: { n: string; d: string };
}
export interface Usage {
  tenant: string;
  id: string;
  revision: number;
  accountId: string;
  at: number;
  quantity: string;
  unit: "ms" | "s" | "min";
  state: "posted" | "void";
}
export interface Credit {
  tenant: string;
  id: string;
  revision: number;
  customerId: string;
  at: number;
  microcents: string;
  state: "posted" | "void";
}
export interface Row {
  customerId: string;
  name: string;
  usageUs: string;
  chargeMicrocents: string;
  creditMicrocents: string;
  balanceMicrocents: string;
  usageIds: string[];
  creditIds: string[];
}
export interface View {
  tenant: string;
  from: number;
  to: number;
  storage: string;
}
export interface API {
  fetch(r: { table: "customers" | "accounts" | "usage" | "credits"; cursor: string | null }): Promise<
    { rows: (Customer | Account | Usage | Credit)[]; next: string | null } | { error: "cursor" }
  >;
  record(r: { row: Row }): Promise<{ stored: true } | { error: "row" }>;
}
