export type Event =
  | { kind: "data"; partition: string; id: string; time: number; key: string; delta: number }
  | { kind: "watermark"; partition: string; value: number }
  | { kind: "idle" | "resume" | "end"; partition: string };
export interface View {
  partitions: string[];
  width: number;
  lateness: number;
  storage: string;
}
export interface Api {
  next(x: {}): Promise<Event | null>;
  emit(x: { row: { start: number; key: string; total: number; count: number } }): Promise<
    { stored: true } | { error: string }
  >;
  late(x: { event: Event }): Promise<{ stored: true } | { error: string }>;
}
