export type Account = { id: number; name: string };
export type Entry = { id: number; account: number; amount: number };
export type State = { accounts: Account[]; entries: Entry[]; nextId: number };
export type Checkpoint = {
  id: string;
  tenant: string;
  branch: string;
  at: number;
  lsn: number;
  digest: string;
  size: number;
};
export type Transaction = {
  tenant: string;
  branch: string;
  lsn: number;
  at: number;
  changes: { table: "accounts" | "entries"; op: "put" | "delete"; row: Account | Entry | { id: number } }[];
  nextId: number;
};
export type View = {
  tenant: string;
  branch: string;
  cutoff: number;
  catalog: Checkpoint[];
  logs: Transaction[];
  storage: string;
};
export type Ack = { ok: true } | { ok: false; error: string };
export interface API {
  fetch(x: { digest: string }): Promise<{ bytes: string }>;
  cache(x: { digest: string }): Promise<{ bytes: string } | null>;
  archive(x: { bytes: string }): Promise<Ack>;
  begin(x: {}): Promise<Ack>;
  put(x: { table: "accounts" | "entries"; row: Account | Entry }): Promise<Ack>;
  allocate(x: { nextId: number }): Promise<Ack>;
  commit(x: {}): Promise<Ack>;
  publish(x: {}): Promise<Ack>;
  inspect(x: {}): Promise<State>;
}
