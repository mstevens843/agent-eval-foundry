export function makePostFinalPlan(audit: any, original: any): {
  schemaVersion: number;
  gradingRevision: string;
  maxConcurrent: number;
  plannedConcurrentAttempts: number;
  maxProviderCalls: number;
  automaticRetries: boolean;
  allSlotsStartTogether: boolean;
  snapshotTrialsIndependentAndUnconditional: boolean;
  packages: any[];
  slots: any[];
};
