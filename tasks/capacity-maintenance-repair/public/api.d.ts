export type Placement = { host: string; service: string }[];
export type View = {
  hosts: { id: string; zone: string; capacity: number }[];
  services: { id: string; size: number; min: number; max: number; perZone: number; eligible: string[] }[];
  placement: Placement;
  requests: string[];
  dependencies: { before: string; after: string }[];
  storage: string;
};
export type State = { placement: Placement; done: string[] };
export type Action =
  | { kind: "add" | "remove"; host: string; service: string }
  | { kind: "maintain"; host: string };
export interface API {
  state(x: {}): Promise<State>;
  add(x: { host: string; service: string }): Promise<{ ok: boolean; error?: string }>;
  remove(x: { host: string; service: string }): Promise<{ ok: boolean; error?: string }>;
  maintain(x: { host: string }): Promise<{ ok: boolean; error?: string }>;
  finish(x: {}): Promise<{ ok: boolean; error?: string }>;
}
