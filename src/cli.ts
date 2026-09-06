// Compatibility entry point; command services live under commands/.
import { USAGE, flag, positional } from "./commands/arguments.js";
import { withCommandContext } from "./commands/context.js";
import {
  adversarialDispatch,
  allDispatch,
  browserBackedDispatch,
  budgetDispatch,
  challengeDispatch,
  checkDispatch,
  crossFamilyDispatch,
  deploymentAliasDispatch,
  discoveryDispatch,
  evolveDispatch,
  externalDispatch,
  familiesBuiltDispatch,
  familiesDispatch,
  funnelDispatch,
  historyDispatch,
  humanDispatch,
  killDispatch,
  ledgerDispatch,
  lineageDispatch,
  mechanismsDispatch,
  mutantsDispatch,
  packageDispatch,
  probesDispatch,
  promotionDispatch,
  providerDeltaDispatch,
  reportDispatch,
  reportsDispatch,
  scaffoldDispatch,
  sharedBankDispatch,
  shipDispatch,
  snapshotDispatch,
  sourcesDispatch,
  trialsDispatch,
  uiDispatch,
} from "./commands/dispatch.js";
import { familyDispatch } from "./commands/family-dispatch.js";
import {
  phase13Dispatch,
  phase14Dispatch,
  phase15Dispatch,
  phase16Dispatch,
  phase17Dispatch,
  phase19Dispatch,
} from "./commands/phases-dispatch.js";
const COMMANDS: Readonly<Record<string, (argv: readonly string[], root: string, command: string) => number>> =
  {
    report: reportDispatch,
    json: reportDispatch,
    package: packageDispatch,
    check: checkDispatch,
    family: familyDispatch,
    "cross-family": crossFamilyDispatch,
    "shared-bank": sharedBankDispatch,
    history: historyDispatch,
    human: humanDispatch,
    external: externalDispatch,
    "browser-backed": browserBackedDispatch,
    adversarial: adversarialDispatch,
    challenge: challengeDispatch,
    trials: trialsDispatch,
    mechanisms: mechanismsDispatch,
    mutants: mutantsDispatch,
    ledger: ledgerDispatch,
    families: familiesDispatch,
    ship: shipDispatch,
    snapshot: snapshotDispatch,
    funnel: funnelDispatch,
    discovery: discoveryDispatch,
    probes: probesDispatch,
    promotion: promotionDispatch,
    lineage: lineageDispatch,
    "provider-delta": providerDeltaDispatch,
    "deployment-alias": deploymentAliasDispatch,
    kill: killDispatch,
    evolve: evolveDispatch,
    "families-built": familiesBuiltDispatch,
    sources: sourcesDispatch,
    scaffold: scaffoldDispatch,
    budget: budgetDispatch,
    phase13: phase13Dispatch,
    phase14: phase14Dispatch,
    phase15: phase15Dispatch,
    phase16: phase16Dispatch,
    phase17: phase17Dispatch,
    phase19: phase19Dispatch,
    reports: reportsDispatch,
    ui: uiDispatch,
    all: allDispatch,
  };
export function main(argv: readonly string[]): number {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(USAGE);
    return 0;
  }
  const command = positional(argv, 0);
  if (command === undefined) {
    process.stdout.write(USAGE);
    return 2;
  }
  const handler = COMMANDS[command];
  if (!handler) {
    process.stderr.write(`unknown command "${command}"\n\n${USAGE}`);
    return 2;
  }
  try {
    return withCommandContext(() => handler(argv, flag(argv, "--root") ?? process.cwd(), command));
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    return 1;
  }
}
// Importing the CLI for a test must not dispatch a command.
if (process.argv[1] && /(?:^|[/\\])cli\.(?:js|cjs|ts)$/.test(process.argv[1]))
  process.exitCode = main(process.argv.slice(2));
