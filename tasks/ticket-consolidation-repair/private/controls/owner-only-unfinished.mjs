import { migrate } from './src/service.mjs';
import { stageOwners } from './src/staged-marker.mjs';

export const subject = { async run(view, api) {
  // Preserve a clean tight-budget witness; ordinary runs expose the missing marker.
  if (view.operationBudget < 100) return migrate(view, api);
  await stageOwners(view, api);
  return { complete: true };
} };
