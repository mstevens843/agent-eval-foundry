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
