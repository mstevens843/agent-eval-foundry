// Original/target topology: unphased -- describes what must exist (and be active) at the end.
export type Placement = { host: string; service: string }[];
// Live topology: every row carries its lifecycle phase.
export type PhasedPlacement = { host: string; service: string; phase: "provisioning" | "active" }[];
export type View = {
  hosts: { id: string; zone: string; capacity: number }[];
  services: { id: string; size: number; min: number; max: number; perZone: number; eligible: string[] }[];
  placement: Placement;
  requests: string[];
  dependencies: { before: string; after: string }[];
  storage: string;
};
export type State = { placement: PhasedPlacement; done: string[] };
export type Action =
  | { kind: "add" | "remove" | "activate"; host: string; service: string }
  | { kind: "maintain"; host: string };
export interface API {
  state(x: {}): Promise<State>;
  add(x: { host: string; service: string }): Promise<{ ok: boolean; error?: string }>;
  remove(x: { host: string; service: string }): Promise<{ ok: boolean; error?: string }>;
  activate(x: { host: string; service: string }): Promise<{ ok: boolean; error?: string }>;
  maintain(x: { host: string }): Promise<{ ok: boolean; error?: string }>;
  finish(x: {}): Promise<{ ok: boolean; error?: string }>;
}
