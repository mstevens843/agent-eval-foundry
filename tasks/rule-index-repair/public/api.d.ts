export type Rule = { id: string; pattern: string; tag: string; fold: boolean };
export type Instruction =
  | { op: "char"; value: string; fold: boolean; next: number }
  | { op: "any" | "jump" | "memo"; next: number }
  | { op: "split"; first: number; second: number }
  | { op: "mark"; slot: number; edge: "start" | "end"; next: number }
  | { op: "accept"; ruleId: string; tag: string; slots: number }
  | { op: "fail" };
export type Program = { entry: number; code: Instruction[] };
export interface API {
  publish(x: { program: Program }): Promise<{ ok: boolean; error?: string }>;
}
