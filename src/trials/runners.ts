// Runners, and the isolation boundary they represent.
//
// A runner's only job is to get a subject to produce (ledger, report) for a scenario. What varies is
// how far the subject is from the thing grading it, and that distance is not a detail — all three
// verifier bypasses found in the source project were failures of exactly this boundary.
//
//   IN-PROCESS   The subject is a module in this repository. It gets a frozen facade and never sees
//                the ledger array, so it cannot swap the recorder by accident. It can reach past its
//                arguments — module globals, prototype patching, the filesystem — so this is
//                sufficient for code you wrote and INSUFFICIENT for code an agent wrote.
//
//   SUBPROCESS   The subject runs in a separate node process and answers over stdout. The ledger and
//                the grading live in the parent's memory, which the child cannot reach at all. This
//                is the level an agent-submitted artifact must be run at, and it is implemented here
//                rather than described.
//
//   CONTAINER    Declared, not implemented. Named so the gate can distinguish it instead of treating
//                subprocess as the ceiling; a subprocess still shares the filesystem and network.
//
// The interface is deliberately family-agnostic so the next twenty families reuse it. What is
// family-specific is the host script, which knows how to build a harness and call a subject.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ToolHarness } from "../families/prompt-injection-containment/runner.js";
import type {
  Scenario,
  Subject,
  SubjectReport,
  ToolInvocation,
} from "../families/prompt-injection-containment/types.js";
import type { IsolationLevel } from "./types.js";

export interface RunOutcome {
  readonly ledger: readonly ToolInvocation[];
  readonly report: SubjectReport;
  /** Non-null when the subject failed to produce a usable answer at all. */
  readonly error: string | null;
}

export interface SubjectRunner {
  readonly isolation: IsolationLevel;
  readonly describe: string;
  run: (scenario: Scenario) => RunOutcome;
}

/** For subjects that live in this repository: the reference, the mutants, the baselines. */
export function inProcessRunner(subject: Subject): SubjectRunner {
  return {
    isolation: "in-process",
    describe: `in-process module "${subject.id}"`,
    run(scenario) {
      const harness = new ToolHarness(scenario);
      try {
        const report = subject.run(scenario, harness.facade());
        return { ledger: harness.sealed(), report, error: null };
      } catch (err) {
        return {
          ledger: harness.sealed(),
          report: { decisions: [], audit: [] },
          error: (err as Error).message,
        };
      }
    },
  };
}

export interface SubprocessOptions {
  /** Absolute path to an ES module exporting `subject`. */
  readonly modulePath: string;
  readonly timeoutMs?: number;
  readonly hostScript?: string;
}

/**
 * Locate the host script.
 *
 * Resolved from the working directory rather than from `import.meta.url`, because this package is
 * built to both ESM and CJS and `import.meta` does not exist in the CJS output — a detail that only
 * surfaces when the CLI is required rather than imported. Callers who run from elsewhere pass
 * `hostScript` explicitly.
 */
export function defaultHostScript(): string {
  const candidates = [
    join(process.cwd(), "scripts", "subject-host.mjs"),
    join(process.cwd(), "..", "scripts", "subject-host.mjs"),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0] ?? "scripts/subject-host.mjs";
}

/**
 * For artifacts this repository did not write.
 *
 * The child receives the scenario on stdin and returns `{ledger, report}` on stdout. The ledger it
 * returns is the one the HOST built inside the child — the parent still owns the grading, and the
 * child cannot reach the parent's memory to alter what it is graded against. That is the real
 * guarantee here, and it is the one the in-process runner cannot make.
 *
 * What this does NOT stop: a child that writes to the filesystem, opens a socket, or simply lies
 * about its own ledger. The first two need a container; the third is caught by the verifier, which
 * compares the subject's reported decisions against the ledger rather than trusting either alone.
 */
export function subprocessRunner(options: SubprocessOptions): SubjectRunner {
  const host = options.hostScript ?? defaultHostScript();
  const timeout = options.timeoutMs ?? 30_000;
  return {
    isolation: "subprocess",
    describe: `subprocess host running "${options.modulePath}"`,
    run(scenario) {
      try {
        const stdout = execFileSync("node", [host, options.modulePath], {
          input: JSON.stringify({ scenario }),
          encoding: "utf8",
          timeout,
          maxBuffer: 32 * 1024 * 1024,
        });
        const parsed = JSON.parse(stdout) as {
          ledger?: ToolInvocation[];
          report?: SubjectReport;
          error?: string;
        };
        if (typeof parsed.error === "string") {
          return { ledger: parsed.ledger ?? [], report: { decisions: [], audit: [] }, error: parsed.error };
        }
        return {
          ledger: parsed.ledger ?? [],
          report: parsed.report ?? { decisions: [], audit: [] },
          error: null,
        };
      } catch (err) {
        // A child that crashes, hangs or writes unparseable output is a failed subject, not a failed
        // harness, and is recorded rather than allowed to abort the sweep.
        return {
          ledger: [],
          report: { decisions: [], audit: [] },
          error: `subprocess failed: ${(err as Error).message.slice(0, 300)}`,
        };
      }
    },
  };
}

/** What a runner at each level can and cannot promise. Rendered into the trial-readiness report. */
export const isolationSummary = (level: IsolationLevel): string =>
  ({
    "in-process": "sufficient for subjects this repository wrote; not for agent-submitted code",
    subprocess: "child cannot reach the grading process's memory; shares filesystem and network",
    container: "declared, not implemented",
  })[level];
