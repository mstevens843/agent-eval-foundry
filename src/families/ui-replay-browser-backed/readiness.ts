import type {
  BrowserBackedReadinessCheck,
  BrowserBackedScenarioContract,
  BrowserHarnessPlan,
  BrowserPageFixture,
} from "./harness.js";
import { BROWSER_BACKED_FAMILY_ID, browserHarnessPlanFailures } from "./harness.js";

const check = (id: string, verdict: "pass" | "fail", detail: string): BrowserBackedReadinessCheck => ({
  id,
  verdict,
  detail,
});

export const BROWSER_BACKED_PAGE_FIXTURE_MODEL: BrowserPageFixture = {
  fixtureId: "live-dom-anchor-conflict-fixture",
  initialHtmlPath: "fixtures/live-dom-anchor-conflict.html",
  scriptPath: "fixtures/live-dom-anchor-conflict.mjs",
  cssPath: "fixtures/live-dom-anchor-conflict.css",
  initialUrl: "http://127.0.0.1:<ephemeral>/live-dom-anchor-conflict",
  expectedRegions: ["primary-cart", "review-panel", "confirmation-dialog"],
  mutationSchedule: [
    {
      at: "during-settle",
      replayIndex: 1,
      description: "late-mounted region flips aria-busy to false after the target is queryable",
    },
    {
      at: "after-act",
      replayIndex: 2,
      description: "successful click remounts the next control and makes previously resolved handles stale",
    },
  ],
};

export const BROWSER_BACKED_SCENARIO_CONTRACTS: readonly BrowserBackedScenarioContract[] = [
  {
    scenarioId: "browser-spike-anchor-conflict",
    fixture: BROWSER_BACKED_PAGE_FIXTURE_MODEL,
    trace: {
      id: "browser-trace-anchor-conflict",
      entities: ["cart-17", "order-17"],
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
    cases: ["conflicting-selectors", "aria-busy-lying", "hidden-confirmation", "no-model-in-replay"],
  },
  {
    scenarioId: "browser-spike-stale-handle",
    fixture: BROWSER_BACKED_PAGE_FIXTURE_MODEL,
    trace: {
      id: "browser-trace-stale-handle",
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
    cases: ["stale-handle", "mutation-during-replay", "late-enabled-control"],
  },
];

export interface BrowserBackedReadiness {
  readonly familyId: string;
  readonly architectureReady: boolean;
  readonly browserBackedReady: boolean;
  readonly browserBackedMeasured: boolean;
  readonly checks: readonly BrowserBackedReadinessCheck[];
}

export function browserBackedReadiness(plan: BrowserHarnessPlan): BrowserBackedReadiness {
  const planFailures = browserHarnessPlanFailures(plan);
  const contracts = BROWSER_BACKED_SCENARIO_CONTRACTS;
  const allCases = new Set(contracts.flatMap((scenario) => scenario.cases));
  const checks: BrowserBackedReadinessCheck[] = [
    check(
      "browser-family-types-declared",
      "pass",
      "browser harness, fixture, trace and scenario contracts are typed",
    ),
    check(
      "page-fixture-model-declared",
      "pass",
      `${BROWSER_BACKED_PAGE_FIXTURE_MODEL.fixtureId} fixture model declared`,
    ),
    check(
      "effect-ledger-owned-by-harness",
      plan.ownsEffectLedger ? "pass" : "fail",
      "effect ledger boundary is a harness property",
    ),
    check(
      "browser-trace-preservation-format",
      plan.preservesBrowserTrace ? "pass" : "fail",
      "trace artifact paths include page snapshot, browser trace, call ledger, effects and verifier output",
    ),
    check(
      "selector-conflict-cases-declared",
      allCases.has("conflicting-selectors") && allCases.has("stale-handle") ? "pass" : "fail",
      "real DOM terms cover conflicting selectors and stale handles",
    ),
    check(
      "async-confirmation-cases-declared",
      allCases.has("aria-busy-lying") && allCases.has("hidden-confirmation") ? "pass" : "fail",
      "async settling, lying aria-busy and mounted confirmation cases are declared",
    ),
    check(
      "no-model-in-replay-loop",
      plan.recordsModelCalls ? "pass" : "fail",
      "model calls are recorded and forbidden after replay starts",
    ),
    check(
      "finite-settle-budget",
      plan.finiteSettleBudget ? "pass" : "fail",
      "settle budget must be finite and recorded",
    ),
    check(
      "playwright-driver-implemented",
      "fail",
      "no Playwright/WebDriver executable harness is implemented in this repository yet",
    ),
    check("browser-scenario-sweep-measured", "fail", "zero browser-backed scenarios have been run"),
  ];
  return {
    familyId: BROWSER_BACKED_FAMILY_ID,
    architectureReady: checks.slice(0, 8).every((c) => c.verdict === "pass") && planFailures.length === 0,
    browserBackedReady: checks.every((c) => c.verdict === "pass"),
    browserBackedMeasured: false,
    checks,
  };
}
