import { migrate } from './src/service.mjs';
import { stageOwners } from './src/staged-marker.mjs';

export const subject = { async run(view, api) {
  // This optional extra phase is skipped under the small public operation cap.
  if (view.operationBudget >= 100) await stageOwners(view, api);
  return migrate(view, api);
} };
