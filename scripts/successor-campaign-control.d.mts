import type { Provider, TaskState } from "./successor-adaptive-policy.mjs";
export type Task = { id: string };
export type Slot = { id: string; trial: number; target: Provider };
export type Scored = Slot & { countedReward: number };
export type Campaign = {
  packages: Task[];
  slots: Slot[];
  maxConcurrent: number;
  maxProviderCalls: number;
};
export type Event = Record<string, unknown> & { stage: string };
export function executeCampaign(
  preparation: Campaign,
  io: {
    launch(task: Task, slot: Slot): Promise<void>;
    score(task: Task, slot: Slot): Promise<Scored> | Scored;
    save(path: string, value: unknown): Promise<void> | void;
    emit(event: Event): void;
  },
): Promise<{
  attemptsLaunched: number;
  peakConcurrent: number;
  maxConcurrent: number;
  maxProviderCalls: number;
  automaticRetries: number;
  outcomes: Array<TaskState & { evidence: Scored[] }>;
}>;
export function replayCampaignEvents(
  preparation: Campaign,
  events: Event[],
): {
  attemptsLaunched: number;
  peakConcurrent: number;
  active: number;
  finished: number;
  ended: boolean;
  states: TaskState[];
};
