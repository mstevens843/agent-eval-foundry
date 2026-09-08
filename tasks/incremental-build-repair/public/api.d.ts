export interface Recipe {
  action: string;
  entry: string;
  tool: string;
  flags: "identity" | "upper";
  files: { path: string; text: string }[];
  dependencies: { alias: string; handle: string }[];
}
export interface Api {
  next(x: {}): Promise<{
    id: string;
    files: Record<string, string>;
    actions: {
      id: string;
      entry: string;
      tool: string;
      flags: "identity" | "upper";
      deps: { alias: string; action: string }[];
    }[];
    targets: string[];
    callBudget: number;
  } | null>;
  artifacts(x: {}): Promise<string[]>;
  inspect(x: { handle: string }): Promise<{ recipe: Recipe; bytes: string } | null>;
  compile(x: Recipe): Promise<{ handle: string } | { error: string }>;
  publish(x: { round: string; outputs: { target: string; handle: string }[] }): Promise<
    { stored: true } | { error: string }
  >;
}
