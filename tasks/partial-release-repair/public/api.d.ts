export interface Resource {
  id: string;
  parents: string[];
  payload: string;
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
  receipt(request: { token: string }): { status: "DONE" | "ABSENT" | "PENDING"; token?: string };
}
export interface Subject {
  run(view: View, api: API): unknown;
}
