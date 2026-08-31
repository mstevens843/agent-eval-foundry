export const BROWSER_BACKED_FAMILY_ID = "ui-replay-browser-backed";

export const BROWSER_BACKED_STATUS = {
  stage: "HOLD",
  reason:
    "Measured Playwright-backed mutant-detection spike exists only when the preserved artifact validates; no counted real-agent browser-backed trials.",
} as const;

export const BROWSER_HARNESS_REQUIREMENTS = [
  "real DOM queried through a browser driver, not a reducer-owned simulated tree",
  "effect ledger owned by the harness/server process and sealed before grading",
  "no model calls after replay starts; replay consumes only the recorded trace and live page facts",
  "bounded async settling that records every wait, timeout and mutation observed",
  "aria-busy recorded as one observed attribute, never as an oracle for settledness",
  "conflicting selector candidates exposed as live node snapshots with entity/effect/precondition facts",
  "stale handles detected by the browser driver after DOM mutation",
  "focus, visibility, disabled state and confirmation dialogs observed from the browser context",
  "mutation during replay preserved in a call ledger that the subject cannot edit",
  "transcript, submission, preserved browser trace and verifier output stored under the challenge hash",
] as const;

export type BrowserReplayOutcome = "completed" | "halted" | "unreplayable";

export interface BrowserRecordedSelector {
  readonly kind: "testid" | "semantic" | "css_path" | "aria" | "text";
  readonly value: string;
  readonly recordedNodeId: string | null;
}

export interface BrowserNodeSnapshot {
  readonly handleId: string;
  readonly role: string | null;
  readonly accessibleName: string | null;
  readonly testId: string | null;
  readonly cssPath: string;
  readonly visible: boolean;
  readonly enabled: boolean;
  readonly ariaBusy: string | null;
  readonly entity: string | null;
  readonly expectedEffect: string | null;
  readonly preconditionAttr: string;
  readonly preconditionValue: string | null;
}

export interface BrowserRecordedStep {
  readonly index: number;
  readonly kind: "click" | "type" | "submit";
  readonly selector: BrowserRecordedSelector;
  readonly semanticAnchor: {
    readonly role: string;
    readonly name: string;
    readonly region: string;
    readonly entity: string;
  };
  readonly structuralPath: string;
  readonly value: string | null;
  readonly irreversible: boolean;
  readonly opensTransaction: boolean;
  readonly closesTransaction: boolean;
}

export interface BrowserActionTrace {
  readonly id: string;
  readonly steps: readonly BrowserRecordedStep[];
  readonly entities: readonly string[];
}

export interface BrowserPageFixture {
  readonly fixtureId: string;
  readonly initialHtmlPath: string;
  readonly scriptPath: string;
  readonly cssPath: string | null;
  readonly initialUrl: string;
  readonly expectedRegions: readonly string[];
  readonly mutationSchedule: readonly {
    readonly at: "before-replay" | "after-query" | "after-act" | "during-settle";
    readonly replayIndex: number;
    readonly description: string;
  }[];
}

export interface BrowserTraceArtifact {
  readonly traceId: string;
  readonly challengeHash: string;
  readonly fixtureId: string;
  readonly pageSnapshotPath: string;
  readonly browserTracePath: string;
  readonly harnessCallLedgerPath: string;
  readonly effectLedgerPath: string;
  readonly verifierOutputPath: string;
}

export interface BrowserHarnessCall {
  readonly seq: number;
  readonly replayIndex: number;
  readonly method:
    | "query"
    | "queryAnchor"
    | "readAttribute"
    | "click"
    | "type"
    | "submit"
    | "settle"
    | "acceptConfirmation"
    | "askModel";
  readonly target: string | null;
  readonly detail: string;
}

export interface BrowserEffectRecord {
  readonly seq: number;
  readonly replayIndex: number;
  readonly effect: string;
  readonly entity: string;
  readonly browserTraceEventId: string;
}

export interface BrowserReplayAuditStep {
  readonly index: number;
  readonly selectorCandidates: readonly BrowserNodeSnapshot[];
  readonly selectedHandleId: string | null;
  readonly selectedBy: "testid" | "semantic" | "css_path" | "entity_effect_precondition" | "none";
  readonly preconditionObserved: string | null;
  readonly confirmationObserved: string | null;
  readonly ran: boolean;
  readonly haltReason: string | null;
}

export interface BrowserReplayReport {
  readonly traceId: string;
  readonly replayIndex: number;
  readonly outcome: BrowserReplayOutcome;
  readonly unreplayableReason: string | null;
  readonly pendingEffects: readonly string[];
  readonly steps: readonly BrowserReplayAuditStep[];
}

export interface BrowserReplayHarness {
  /** Open a fresh browser context for one replay pass and install the harness-owned ledgers. */
  readonly open: (scenarioId: string) => Promise<void>;
  /** Return live candidates. The subject never receives a persistent Playwright handle. */
  readonly query: (step: BrowserRecordedStep) => Promise<readonly BrowserNodeSnapshot[]>;
  /** Read the precondition from the selected live node immediately before acting. */
  readonly readPrecondition: (handleId: string, attr: string) => Promise<string | null>;
  /** Advance the browser/event loop within the finite settle budget. */
  readonly settle: () => Promise<{ readonly advanced: boolean; readonly remainingBudget: number }>;
  /** Apply one recorded action through the browser driver. */
  readonly act: (step: BrowserRecordedStep, handleId: string) => Promise<void>;
  /** Observe and accept a mounted confirmation dialog through the browser context. */
  readonly acceptConfirmation: (step: BrowserRecordedStep) => Promise<boolean>;
  /** Seal and return ledgers after the subject can no longer execute page code. */
  readonly closeAndSeal: () => Promise<{
    readonly reports: readonly BrowserReplayReport[];
    readonly calls: readonly BrowserHarnessCall[];
    readonly effects: readonly BrowserEffectRecord[];
  }>;
}

export interface BrowserHarnessPlan {
  readonly driver: "playwright" | "webdriver" | "other";
  readonly ownsEffectLedger: boolean;
  readonly exposesPersistentHandlesToSubject: boolean;
  readonly recordsModelCalls: boolean;
  readonly finiteSettleBudget: boolean;
  readonly sealsBeforeGrading: boolean;
  readonly preservesBrowserTrace: boolean;
}

export interface BrowserBackedScenarioContract {
  readonly scenarioId: string;
  readonly fixture: BrowserPageFixture;
  readonly trace: BrowserActionTrace;
  readonly cases: readonly (
    | "aria-busy-lying"
    | "conflicting-selectors"
    | "stale-handle"
    | "mutation-during-replay"
    | "hidden-confirmation"
    | "late-enabled-control"
    | "no-model-in-replay"
  )[];
}

export interface BrowserBackedReadinessCheck {
  readonly id: string;
  readonly verdict: "pass" | "fail";
  readonly detail: string;
}

export function browserHarnessPlanFailures(plan: BrowserHarnessPlan): readonly string[] {
  const failures: string[] = [];
  if (!plan.ownsEffectLedger) failures.push("effect ledger is not harness-owned");
  if (plan.exposesPersistentHandlesToSubject) failures.push("persistent browser handles leak to subject");
  if (!plan.recordsModelCalls) failures.push("model calls are not recorded during replay");
  if (!plan.finiteSettleBudget) failures.push("settle budget is not finite");
  if (!plan.sealsBeforeGrading) failures.push("ledgers are not sealed before grading");
  if (!plan.preservesBrowserTrace) failures.push("browser trace is not preserved with the trial");
  return failures;
}
