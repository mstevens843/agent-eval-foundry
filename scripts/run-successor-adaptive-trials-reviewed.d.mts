import type { Campaign, Scored, Slot, Task } from "./successor-campaign-control.mjs";
export type PreparedCampaign = Omit<Campaign, "slots"> & {
  outputRoot: string;
  runtime: { directory: string };
  slots: Array<Slot & { runRoot: string }>;
};
export function inspectCampaign(
  preparation: PreparedCampaign,
  options?: {
    workspace?: string;
    scoreEvidence?: (api: unknown, preparation: PreparedCampaign, task: Task, slot: Slot) => Scored;
  },
): Promise<{
  verified: boolean;
  tasks: number;
  slots: number;
  maxConcurrent: number;
  dispatched: boolean;
  complete: boolean;
  status: string;
  attemptsLaunched: number;
  providerCallsMade: number;
  peakConcurrent: number;
  activeUnadjudicated: number;
  finishedTasks: number;
}>;
