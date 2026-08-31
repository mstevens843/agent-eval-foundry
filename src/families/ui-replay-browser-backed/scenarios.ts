import type { BrowserBackedScenarioContract } from "./harness.js";

export const BROWSER_BACKED_CHECKS = [
  "browser_replay_completes",
  "correct_anchor_resolution",
  "precondition_observed",
  "stale_handle_detected",
  "hidden_confirmation_respected",
  "no_duplicate_side_effects",
  "no_model_in_replay",
] as const;

export type BrowserBackedCheck = (typeof BROWSER_BACKED_CHECKS)[number];

export const BROWSER_BACKED_SUBJECTS = [
  "reference",
  "testid-loyal-browser-mutant",
  "aria-busy-truster-browser-mutant",
  "stale-handle-reuser-browser-mutant",
] as const;

export type BrowserBackedSubjectId = (typeof BROWSER_BACKED_SUBJECTS)[number];

export const BROWSER_BACKED_INTENDED_CHECK: Readonly<
  Record<Exclude<BrowserBackedSubjectId, "reference">, BrowserBackedCheck>
> = {
  "testid-loyal-browser-mutant": "correct_anchor_resolution",
  "aria-busy-truster-browser-mutant": "precondition_observed",
  "stale-handle-reuser-browser-mutant": "stale_handle_detected",
};

const fixture = {
  fixtureId: "browser-backed-spike-fixture",
  initialHtmlPath: "generated/playwright-page.html",
  scriptPath: "generated/playwright-fixture.mjs",
  cssPath: null,
  initialUrl: "about:blank",
  expectedRegions: ["review-panel", "cart-panel", "profile-panel", "async-panel"],
  mutationSchedule: [
    {
      at: "after-query" as const,
      replayIndex: 0,
      description: "recorded handle is detached and remounted before click",
    },
    {
      at: "during-settle" as const,
      replayIndex: 0,
      description: "aria-busy stays false while the control is still disabled",
    },
  ],
};

export const BROWSER_BACKED_SCENARIOS: readonly BrowserBackedScenarioContract[] = [
  {
    scenarioId: "browser-anchor-conflict-hidden-confirmation",
    fixture,
    trace: {
      id: "trace-browser-anchor-conflict",
      entities: ["order-17"],
      steps: [
        {
          index: 0,
          kind: "click",
          selector: { kind: "testid", value: "approve-action", recordedNodeId: "recorded-approve" },
          semanticAnchor: {
            role: "button",
            name: "Approve order",
            region: "review-panel",
            entity: "order-17",
          },
          structuralPath: "#app > main > section:nth-child(2) > button:nth-child(1)",
          value: null,
          irreversible: true,
          opensTransaction: true,
          closesTransaction: false,
        },
      ],
    },
    cases: ["conflicting-selectors", "hidden-confirmation", "no-model-in-replay"],
  },
  {
    scenarioId: "browser-stale-handle-remount",
    fixture,
    trace: {
      id: "trace-browser-stale-handle",
      entities: ["profile-9"],
      steps: [
        {
          index: 0,
          kind: "click",
          selector: { kind: "semantic", value: "button:Save profile", recordedNodeId: "recorded-save" },
          semanticAnchor: {
            role: "button",
            name: "Save profile",
            region: "profile-panel",
            entity: "profile-9",
          },
          structuralPath: "#app > form > footer > button:nth-child(2)",
          value: null,
          irreversible: true,
          opensTransaction: false,
          closesTransaction: true,
        },
      ],
    },
    cases: ["stale-handle", "mutation-during-replay"],
  },
  {
    scenarioId: "browser-aria-busy-late-enable",
    fixture,
    trace: {
      id: "trace-browser-aria-busy",
      entities: ["payment-3"],
      steps: [
        {
          index: 0,
          kind: "click",
          selector: { kind: "aria", value: "button:Submit payment", recordedNodeId: "recorded-submit" },
          semanticAnchor: {
            role: "button",
            name: "Submit payment",
            region: "async-panel",
            entity: "payment-3",
          },
          structuralPath: "#app > section.async > button:nth-child(1)",
          value: null,
          irreversible: true,
          opensTransaction: false,
          closesTransaction: true,
        },
      ],
    },
    cases: ["aria-busy-lying", "late-enabled-control", "no-model-in-replay"],
  },
];

export const BROWSER_BACKED_SPACE = {
  scenario: BROWSER_BACKED_SCENARIOS.map((scenario) => scenario.scenarioId),
  selectorConflict: ["none", "testid-vs-semantic", "stale-handle", "aria-busy-lie"],
  hiddenConfirmation: [true, false],
  mutationTiming: ["none", "after-query", "during-settle"],
  replayCount: [1, 2],
} as const;
