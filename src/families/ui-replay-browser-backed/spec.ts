import { BROWSER_BACKED_FAMILY_ID, BROWSER_BACKED_STATUS, BROWSER_HARNESS_REQUIREMENTS } from "./harness.js";

export const BROWSER_BACKED_SPEC_MD = `# ${BROWSER_BACKED_FAMILY_ID} design scaffold

Status: ${BROWSER_BACKED_STATUS.stage}. ${BROWSER_BACKED_STATUS.reason}

This is the browser-backed descendant path for \`ui-replay-live-dom\`. It is not a measured family
yet and no report may treat it as real-agent evidence. The existing Live-DOM family remains
\`dom-like\`: mutable tree, logical clock, sealed ledgers, no renderer.

## Contract

A browser-backed replay benchmark must run the submitted replayer against a real page in a real
browser context. The model may be used to write the replayer during the trial. Once replay starts,
the replayer must consume the recorded action trace and live browser facts only.

## Required Harness Properties

${BROWSER_HARNESS_REQUIREMENTS.map((r) => `- ${r}`).join("\n")}

## Graduation From Live-DOM

- Simulated nodes become real DOM elements reached through Playwright, WebDriver or an equivalent
  browser driver.
- The Live-DOM selector conflict rule remains visible: when test id, semantic anchor and structural
  path diverge, the selected node must be justified by live entity, effect and precondition facts.
- \`aria-busy\` is an observed attribute only. It may be honest or misleading and cannot replace
  bounded settling or concrete DOM observation.
- Hidden confirmation state must be observed as a mounted dialog and accepted through its live
  control. A stored boolean, guessed id or subject-written receipt is not evidence.
- Stale handles are expected: any mutation may detach a previously resolved handle, and the harness
  must record the stale-handle outcome rather than silently re-querying for the subject.
- The effect ledger belongs to the harness or app server, not to the subject. It is sealed before
  grading and compared against the subject audit.

## Non-Goals For This Scaffold

- No Playwright dependency is added in this phase.
- No browser scenario generator is claimed.
- No browser-backed verifier or counted trial exists.
- No existing Live-DOM trial is upgraded to browser-backed by prose.
`;
