export type Provider = "claude" | "codex";
export type TrialOutcome = "pass" | "clean-fail" | "unscored";
export type SuccessorTask = {
  id: string;
  version: string;
  analysisDocument: string;
};
export type TrialSlot = {
  trial: number;
  provider: Provider;
};
export type TaskState = {
  id: string;
  nextTrial: number;
  counted: number;
  cleanFailures: number;
  providers: Record<Provider, number>;
  stopReason: string | null;
  attempts: Array<TrialSlot & { outcome: TrialOutcome }>;
};
export const SUCCESSOR_TASKS: SuccessorTask[];
export function providerForTrial(trial: number): Provider;
export function initialTaskState(id: string): TaskState;
export function nextTrial(state: TaskState): TrialSlot | null;
export function applyTrialOutcome(state: TaskState, outcome: TrialOutcome): TaskState;
export function campaignPlan(): {
  schemaVersion: number;
  tasks: SuccessorTask[];
  initialCountedTrialsPerTask: number;
  maxCountedTrialsPerTask: number;
  maxProviderCalls: number;
  maxConcurrent: number;
  automaticRetries: boolean;
  schedule: Array<{
    trial: number;
    provider: Provider;
    condition: string;
  }>;
};
