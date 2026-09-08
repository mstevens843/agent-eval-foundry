export function verifyPublication(root?: string): {
  screenedPackages: number;
  manifestListedFilesVerifiedAtPublication: number;
  documents: number;
  promotedPaths: number;
  providerCallsMade: number;
};
