export function makeReplacementPlan(disposition: any): {
  schemaVersion: number;
  gradingRevision: string;
  maxConcurrent: number;
  plannedConcurrentAttempts: number;
  maxProviderCalls: number;
  automaticRetries: boolean;
  allSlotsStartTogether: boolean;
  packages: any[];
  slots: any[];
};
