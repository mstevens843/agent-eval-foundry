export interface Resource {
  id: string;
  parents: string[];
  payload: string;
  // Present on every resource returned by api.inspect(); counts how many times this id has been
  // created (1 the first time, +1 each time it is created again after having been removed).
  // Server-assigned bookkeeping only: not part of content equality. Clients may omit it or pass
  // through an inspected resource to api.create(); any supplied generation is ignored and never
  // sets, resets, or increments the server's generation counter.
  generation?: number;
}
export interface View {
  scope: string[];
  target: Resource[];
  storage: string;
}
export type Response = { status: "DONE" } | { status: "REJECTED" } | { status: "UNKNOWN"; token: string };
export interface API {
  inspect(request: Record<string, never>): { resources: Resource[] };
  create(request: { resource: Resource }): Response;
  remove(request: { id: string }): Response;
  // `generation` is present only when status is "DONE" for a create's token: the generation that
  // specific create call produced. It is never present for a remove's token, or while PENDING.
  receipt(request: { token: string }): { status: "DONE" | "ABSENT" | "PENDING"; token?: string; generation?: number };
}
export interface Subject {
  run(view: View, api: API): unknown;
}
