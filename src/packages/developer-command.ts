import { executionCommand } from "../execution/command.js";
import { initFirstTrial, planFirstTrial, runFirstTrial } from "../execution/first-trial.js";
import { learningCommand } from "../learning/command.js";
import { doctor } from "./doctor.js";
import { nativePackageCommand } from "./native-caa.js";
import { PORTFOLIO_PACKAGES, portfolioCommand } from "./portfolio.js";
import { buildTask, createTask } from "./task-authoring.js";

const HELP: Record<string, string> = {
  root: `Agent Eval Foundry — build, validate and share coding-agent tasks

Usage: pnpm foundry COMMAND (or node dist/packages/local-cli.js COMMAND)

  doctor [--package DIR]              Check local prerequisites; no downloads or model calls
  task create ID SOURCE              Create a runnable task from the teaching template
  task build SOURCE BUILD RUNTIME    Build a task.json source directory
  portfolio list                     List maintained Node tasks and the native CAA task
  portfolio runtime OUTPUT           Capture the cached shared Docker image
  portfolio build ID BUILD RUNTIME   Build a maintained Node task
  portfolio validate BUILD OUTPUT    Test correct solutions and broken controls
  portfolio grade BUILD SOURCE OUT   Grade a submitted workspace
  portfolio export BUILD OUT RECEIPT Export a validated self-contained package
  portfolio inspect BUILD            Read package identity and runtime information
  portfolio load-runtime BUILD       Load an export's verified runtime archive
  execution --help                   Bounded execution and evidence inspection
  trial --help                       Configure, inspect and explicitly run one subscription trial
  learning --help                    Inspect retained learning evidence
  produce BUILD RECIPIENT            Build/validate/export native Go CAA

Start: docs/quickstart.md   Author: docs/task-authoring.md
Historical research commands remain available through pnpm axis.
Append --help to a command group for its usage.
`,
  task: `Task authoring (trusted author source, never solver submissions)

  pnpm foundry task create my-task .local/my-task
  pnpm foundry task build .local/my-task .local/my-build .local/runtime
  pnpm foundry portfolio validate .local/my-build .local/my-validation
  pnpm foundry portfolio export .local/my-build .local/my-export .local/my-validation/assurance.json

Prepare the runtime first; see docs/quickstart.md. Outputs must be new directories.
task.json supplies id/familyId/version. New tasks need no built-in registry change.
See docs/task-authoring.md for the contract, oracle and control interfaces.
`,
  portfolio: `Maintained packages and standalone exports

  portfolio list
  portfolio runtime OUTPUT
  portfolio build ID BUILD RUNTIME
  portfolio inspect BUILD
  portfolio load-runtime BUILD
  portfolio validate BUILD OUTPUT
  portfolio grade BUILD SUBMISSION OUTPUT [SCENARIO_IDS]
  portfolio export BUILD OUTPUT ASSURANCE_JSON

SCENARIO_IDS is an optional comma-separated diagnostic subset; omit it for full grading.
Use fresh output directories. Validation makes zero provider calls and saves assurance.json.
A passing negative control means the grader rejected the intended defect.
See docs/quickstart.md. Native CAA uses build/validate/export/produce without the portfolio prefix.
`,
  execution: `Execution and immutable evidence

  execution profiles
  execution inspect STORE [JOB_ID]
  execution verify RECORD_DIRECTORY
  execution build-inert OUTPUT PINNED_GO_IMAGE
  execution demo PACKAGE RECEIPT STORE RUN_ID MODE TARGET INERT_BINARY [LOCAL_TOOL_URL]
  execution resume PACKAGE RECEIPT STORE RUN_ID INERT_BINARY
  execution reconcile STORE JOB_ID EVIDENCE_JSON
  execution regrade ORIGINAL PACKAGE OUTPUT_STORE NEW_ID

The demo is an inert simulation. A real subscription trial uses the supported recipe
in docs/first-model-trial.md. Model calls require a separate explicit execution command.
`,
  learning: `Learning and evidence inspection

  learning run DIR [--json]
  learning index TRIAL_ROOT
  learning case ID [--json]
  learning assess ID[,ID]
  learning select INPUT_JSON
  learning cohort INPUT_JSON
  learning directions

See docs/architecture.md and docs/authorized-execution.md for evidence boundaries.
`,
  trial: `One bounded subscription trial (Node task packages)

  trial init TARGET PACKAGE RECEIPT CONFIG
  trial plan CONFIG
  trial run CONFIG --execute

TARGET is codex or claude. Init uses the cached foundry-provider-agent:local image.
Init and plan make zero model calls. Run explicitly authorizes one attempt, with no
automatic retry or paid API fallback. Credentials stay outside the config.
Read docs/first-model-trial.md for setup, limits and inspecting the result.
`,
};

export async function developerCommand(root: string, args: readonly string[]): Promise<unknown> {
  const [group, command, a, b, c] = args;
  if (!group || args.includes("--help") || args.includes("-h") || group === "help")
    return HELP[(group === "help" ? command : group) ?? "root"] ?? HELP.root;
  if (group === "doctor") {
    if (args.length !== 1 && !(args.length === 3 && command === "--package" && a))
      throw Error("Usage: doctor [--package PACKAGE_DIRECTORY]");
    return doctor(root, a);
  }
  if (group === "task") {
    if (command === "create" && a && b && args.length === 4) return createTask(root, a, b);
    if (command === "build" && a && b && c && args.length === 5) return buildTask(root, a, b, c);
    throw Error(HELP.task);
  }
  if (group === "trial") {
    if (command === "init" && a && b && c && args[5] && args.length === 6)
      return initFirstTrial(a, b, c, args[5]);
    if (command === "plan" && a && args.length === 3) return planFirstTrial(a);
    if (command === "run" && a && args.length === 4 && b === "--execute") return runFirstTrial(a, true);
    throw Error(HELP.trial);
  }
  if (group === "portfolio") {
    if (command === "list" && args.length === 2)
      return {
        tasks: [
          {
            id: "caa-revalidation-repair",
            runtime: "native-go",
            build: "pnpm foundry produce BUILD RECIPIENT",
          },
          ...Object.entries(PORTFOLIO_PACKAGES).map(([id, familyId]) => ({
            id,
            familyId,
            runtime: "portfolio-node",
          })),
        ],
        note: "The teaching template and user-created tasks are separate from the screened portfolio.",
        providerCallsMade: 0,
      };
    if (command === "build" && a && !Object.hasOwn(PORTFOLIO_PACKAGES, a))
      throw Error(
        `Unknown Node task '${a}'. Run pnpm foundry portfolio list, or use task build SOURCE BUILD RUNTIME for your own task.`,
      );
    return portfolioCommand(root, args.slice(1));
  }
  if (group === "execution") return executionCommand(root, args.slice(1));
  if (group === "learning") return learningCommand(root, args.slice(1));
  if (["build", "inspect", "validate", "export", "produce"].includes(group))
    return nativePackageCommand(root, args);
  throw Error(`Unknown command '${group}'. Run pnpm foundry --help.`);
}

export function explainError(error: unknown): string {
  const text = String(error);
  const hint = text.includes("OUTPUT_EXISTS")
    ? "Choose a new output directory; saved evidence is never overwritten."
    : text.includes("ENOENT")
      ? "Check the input paths and run pnpm build from the source checkout. See docs/quickstart.md."
      : text.includes("PORTFOLIO_LOCAL_ASSURANCE_FAILED")
        ? "Open the named assurance.json and inspect each failed result's detail; an infrastructure error is not an agent failure."
        : text.includes("LOCAL_PROCESS docker")
          ? "Check Docker access with pnpm foundry doctor. Runtime setup is documented in docs/quickstart.md."
          : "";
  return `${text}${hint ? `\n${hint}` : ""}\n`;
}
