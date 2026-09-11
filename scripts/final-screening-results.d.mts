export function buildFinalResults(original: unknown, ledger: unknown, continuation: unknown): {
  summary: Record<string, number>;
  latestCampaign: Record<string, number>;
  packages: unknown[];
  stoppedPackages: unknown[];
};
