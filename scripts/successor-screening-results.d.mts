export function buildSuccessorResults(previous: unknown, campaign: unknown): {
  summary: Record<string, number>;
  packages: unknown[];
  otherSuccessorPackages: unknown[];
  campaignSummary: Record<string, number>;
};
