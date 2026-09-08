export function verifyPublication(root?: string): {
  screenedPackages: number;
  manifestListedFilesVerifiedAtPublication: number;
  documents: number;
  promotedPaths: number;
  providerCallsMade: number;
};
export const SCREENING_BATCHES: readonly (readonly [string, string])[];
