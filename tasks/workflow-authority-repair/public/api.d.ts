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
export interface Decision {
  id: string;
  jobId: string;
  revision: number;
  principal: string;
  resource: string;
  action: string;
  payload: unknown;
  outcome: "executed" | "denied";
  path: string[];
}
export interface View {
  jobs: Job[];
  storage: string;
}
export interface API {
  take(r: {}): Promise<
    { delivery: { id: string; jobId: string; worker: string } } | { done: true } | { error: "unfinished" }
  >;
  policy(r: {}): Promise<Policy | { error: "request" }>;
  receipt(r: { jobId: string }): Promise<{ decision: Decision | null }>;
  decide(r: Omit<Decision, "id">): Promise<{ decision: Decision } | { stale: true } | { error: "request" }>;
  finish(r: { deliveryId: string; decisionId: string }): Promise<{ stored: true } | { error: "request" }>;
}
