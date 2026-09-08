export type Match = { prefix?: string; ge?: number; le?: number; communities?: string[] };
export type Action = {
  kind: "accept" | "reject" | "continue" | "return" | "call";
  policy?: string;
  preference?: number;
  add?: string[];
  remove?: string[];
};
export type Policy = { terms: { match: Match; action: Action }[]; fallback: Action };
export type Config = { egresses: Record<string, string>; policies: Record<string, Policy> };
export type View = {
  config: Config;
  request: { egresses: string[]; match: Match; preference: number };
  storage: string;
};
export interface API {
  publish(x: { config: Config }): Promise<{ ok: boolean; error?: string }>;
}
