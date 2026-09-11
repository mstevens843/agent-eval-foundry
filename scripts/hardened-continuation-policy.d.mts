export type Provider = "codex" | "claude";
export type Slot = { id: string; target: Provider; historicalTrial: number; versionRound: number; adoptExisting: boolean };
export type PackagePlan = { id: string; analysis: string; history: unknown[]; failures: number; scored: number; providers: Record<Provider, number>; packageDigest: string; gradingRevision: string; slots: Slot[] };
export type State = { id: string; failures: number; scored: number; providers: Record<Provider, number>; cursor: number; stopReason: string | null; attempts: (Slot & { countedReward: 0 | 1 | null })[] };
export function makeContinuationPlan(ledger: unknown, preparation: unknown): { schemaVersion: number; maxConcurrent: number; maxNewProviderCalls: number; adoptExistingAttempts: number; automaticRetries: boolean; stopOnNextPass: boolean; maxCountedPerTask: number; providersPerCompletedTask: Record<Provider, number>; packages: PackagePlan[] };
export function initialState(p: PackagePlan): State;
export function nextSlot(p: PackagePlan, state: State): Slot | null;
export function applyOutcome(p: PackagePlan, state: State, slot: Slot, reward: 0 | 1 | null): State;
export function classify(state: State): State & { completeSix: boolean; meetsFiveOfSix: boolean; canStillReachFive: boolean };
