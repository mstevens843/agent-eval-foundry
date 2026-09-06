import { buildPortfolioPackage } from "../../packages/portfolio.js";
import { BROWSER_BACKED_FAMILY_ID, BROWSER_HARNESS_REQUIREMENTS } from "./harness.js";

/** Production successor of the preserved Playwright spike; not a relabelled historical measurement. */
export const browserProduction = {
  familyId: BROWSER_BACKED_FAMILY_ID,
  packageId: "browser-replay-repair",
  requirements: BROWSER_HARNESS_REQUIREMENTS,
  build: (root: string, output: string, runtime: string) =>
    buildPortfolioPackage(root, "browser-replay-repair", output, runtime),
  boundary:
    "arbitrary multi-file submission; protected browser/authority process; all-attempt effects and values",
} as const;
