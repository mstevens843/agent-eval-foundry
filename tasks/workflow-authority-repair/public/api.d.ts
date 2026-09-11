export interface Job {
  id: string;
  parent: string | null;
  principal: string;
  resource: string;
  action: "read" | "write" | "publish";
  payload: unknown;
  route: "direct" | "scheduled" | "retry" | "fanout";
}
export interface Grant {
  id: string;
  from: string;
  to: string;
  resources: string[];
  actions: string[];
  active: boolean;
}
export interface Policy {
  revision: number;
  owners: Record<string, string>;
  grants: Grant[];
}
export interface Admission {
  jobId: string;
  revision: number;
  principal: string;
  resource: string;
  action: string;
  payload: unknown;
  outcome: "authorized" | "denied";
  path: string[];
}
export interface Authorization extends Admission {
  id: string;
}
export interface Decision extends Omit<Authorization, "outcome"> {
  authorizationId: string;
  outcome: "executed" | "denied";
}
export interface View {
  jobs: Job[];
  storage: string;
}
export interface API {
  take(r: {}): Promise<{ delivery: { id: string; jobId: string; worker: string } } | { done: true }>;
  policy(r: {}): Promise<Policy | { error: "request" }>;
  outcome(r: { jobId: string }): Promise<
    | { status: "NONE"; authorization: Authorization | null }
    | { status: "PENDING" }
    | { status: "TERMINAL"; decision: Decision }
  >;
  admit(
    r: Admission,
  ): Promise<
    | { authorization: Authorization }
    | { decision: Decision }
    | { stale: true }
    | { error: "request" | "terminal" }
  >;
  dispatch(r: { authorizationId: string; revision: number }): Promise<
    { status: "PENDING" } | { stale: true } | { error: "request" }
  >;
  finish(r: { deliveryId: string; decisionId: string }): Promise<{ stored: true } | { error: "request" }>;
}
