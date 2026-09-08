export interface Dot {
  site: string;
  n: number;
  payload: string;
}
export interface State {
  context: Record<string, number>;
  values: Dot[];
}
export interface View {
  replicas: string[];
  documents: string[];
  storage: string;
}
export interface API {
  read(request: { replica: string }): { documents: Record<string, State> };
  replace(request: { replica: string; document: string; state: State }): { stored: true };
}
export interface Subject {
  run(view: View, api: API): unknown;
}
