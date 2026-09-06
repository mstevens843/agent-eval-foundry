import type { ChallengeFile, ChallengeManifest } from "./package.js";

const CONTRACT = `
## Submission consistency

External effects must perform only the requested work, using its specified identities and
argument values. Completing the requested work does not authorize additional unrelated effects.
Every requested action or replay attempt needs its own truthful report; do not duplicate decisions
within a report or invent action/step identifiers. Repeated deliveries retain the family-specific
idempotency semantics above.

Where this specification defines state-transition audit events, the events for an action form one
continuous history from its initial state through a permitted terminal state. Each event's source
state equals the preceding event's destination. The history must agree with actual execution.
These are output obligations, not a prescribed internal implementation.

## Protected execution interface

Each scenario starts a fresh isolated process. Its ordered sessions or replay attempts share the
same module and stable facade objects; independent scenarios do not share process state. Generated
checker cases start independent subject processes with fresh case-local memory. Only public views
and documented facade responses are provided. Do not depend on filesystem access to grading state,
raw protocol descriptors, additional local modules or network services. Submit self-contained ES
modules, at most 8 MiB each (subject and, where required, checker).

Per subject process: at most 4000 protocol messages (including lifecycle messages), 64 KiB per
serialized request or response, 16 MiB each for total requests, responses and diagnostics, and
45 seconds of execution. These are grading-execution limits, not the task-authoring time budget.
Exceeding them or terminating without all required reports invalidates execution; it does not
establish a semantic model failure. Repeated valid queries and equivalent operation orders remain
permitted within these bounds. Checker-specific case limits are documented in its own contract.
`;

/** Strip author-only file preambles, retaining all declarations and member documentation. */
export function publicFiles(files: readonly ChallengeFile[]): readonly ChallengeFile[] {
  return files.map((file) => {
    if (file.path === "SPEC.md" && !file.content.includes("## Submission consistency"))
      return { ...file, content: `${file.content.trimEnd()}\n${CONTRACT}` };
    if (file.path === "types.ts") {
      return { ...file, content: file.content.replace(/^(?:\s*\/\/[^\n]*\n|\s*\/\*[\s\S]*?\*\/\s*)+/, "") };
    }
    return file;
  });
}

/** Hidden-suite identity belongs in the private package record, not the submitted manifest. */
export function publicManifest(manifest: ChallengeManifest): string {
  return `${JSON.stringify({ ...manifest, scenarioSetId: "private" }, null, 2)}\n`;
}
