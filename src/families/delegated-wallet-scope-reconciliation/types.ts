import type { DecisionReason } from "./spec.js";

export const WALLET_OWNERS = ["owner-alice", "owner-ravi"] as const;
export type WalletOwner = (typeof WALLET_OWNERS)[number];

export const WALLET_IDS = ["wallet-alpha", "wallet-beta"] as const;
export type WalletId = (typeof WALLET_IDS)[number];

export const DELEGATES = ["wallet-agent", "ops-agent"] as const;
export type DelegateId = (typeof DELEGATES)[number];

export const SPEND_SCOPES = ["spend", "read", "admin"] as const;
export type SpendScope = (typeof SPEND_SCOPES)[number];

export const REQUEST_SURFACES = ["wallet_api", "scheduled_worker", "delegated_tool"] as const;
export type RequestSurface = (typeof REQUEST_SURFACES)[number];

export const AUTHORITY_STATUSES = ["active", "revoked", "expired"] as const;
export type AuthorityStatus = (typeof AUTHORITY_STATUSES)[number];

export interface WalletPolicy {
  readonly id: string;
  readonly generation: number;
  readonly owner: WalletOwner;
  readonly walletId: WalletId;
  readonly maxPerSpend: number;
  readonly dailyLimit: number;
  readonly status: AuthorityStatus;
}

export interface DelegationRecord {
  readonly id: string;
  readonly generation: number;
  readonly owner: WalletOwner;
  readonly delegate: DelegateId;
  readonly walletId: WalletId;
  readonly scope: SpendScope;
  readonly maxPerSpend: number;
  readonly expiresAt: number;
  readonly status: AuthorityStatus;
}

export interface WalletToken {
  readonly id: string;
  readonly generation: number;
  readonly delegate: DelegateId;
  readonly walletId: WalletId;
  readonly scope: SpendScope;
  readonly maxPerSpend: number;
  readonly issuedFromDelegationId: string;
  readonly status: AuthorityStatus;
}

export interface SpendRequest {
  readonly id: string;
  readonly policyId: string;
  readonly delegationId: string;
  readonly tokenId: string;
  readonly delegationGeneration: number;
  readonly tokenGeneration: number;
  readonly owner: WalletOwner;
  readonly delegate: DelegateId;
  readonly walletId: WalletId;
  readonly requestedScope: SpendScope;
  readonly amount: number;
  readonly observedAt: number;
  readonly idempotencyKey: string;
  readonly surface: RequestSurface;
}

export interface SubjectAuthorityClaim {
  readonly source: "subject-cache" | "subject-receipt";
  readonly policyGeneration: number;
  readonly delegationGeneration: number;
  readonly tokenGeneration: number;
  readonly maxPerSpend: number;
  readonly remainingBudget: number;
  readonly status: "claims-authorized";
}

export interface ScenarioView {
  readonly id: string;
  readonly attempt: number;
  readonly request: SpendRequest;
  readonly cachedPolicy: WalletPolicy | null;
  readonly cachedDelegation: DelegationRecord | null;
  readonly cachedToken: WalletToken | null;
  readonly subjectAuthorityClaim: SubjectAuthorityClaim | null;
}

export interface SpendEffectRequest {
  readonly policyId: string;
  readonly delegationId: string;
  readonly tokenId: string;
  readonly owner: WalletOwner;
  readonly delegate: DelegateId;
  readonly walletId: WalletId;
  readonly amount: number;
  readonly idempotencyKey: string;
}

export interface SpendEffect {
  readonly actionId: string;
  readonly policyId: string;
  readonly delegationId: string;
  readonly tokenId: string;
  readonly owner: WalletOwner;
  readonly delegate: DelegateId;
  readonly walletId: WalletId;
  readonly amount: number;
  readonly idempotencyKey: string;
}

export interface Decision {
  readonly actionId: string;
  readonly allowed: boolean;
  readonly reason: DecisionReason;
}

export interface AuditEvent {
  readonly seq: number;
  readonly actionId: string;
  readonly reason: DecisionReason | "OBSERVED";
  readonly observedPolicyId: string | null;
  readonly observedPolicyGeneration: number | null;
  readonly observedPolicyStatus: AuthorityStatus | null;
  readonly observedPolicyMaxPerSpend: number | null;
  readonly observedPolicyDailyLimit: number | null;
  readonly observedDelegationId: string | null;
  readonly observedDelegationGeneration: number | null;
  readonly observedDelegationStatus: AuthorityStatus | null;
  readonly observedDelegationScope: SpendScope | null;
  readonly observedDelegationMaxPerSpend: number | null;
  readonly observedDelegationExpiresAt: number | null;
  readonly observedTokenId: string | null;
  readonly observedTokenGeneration: number | null;
  readonly observedTokenStatus: AuthorityStatus | null;
  readonly observedTokenScope: SpendScope | null;
  readonly observedTokenMaxPerSpend: number | null;
  readonly observedRemainingBudget: number | null;
  readonly usedSubjectAuthorityClaim: boolean;
  readonly detail: string;
}

export interface SubjectReport {
  readonly decisions: readonly Decision[];
  readonly audit: readonly AuditEvent[];
}

export interface AuthorityFacade {
  currentPolicy: (id: string) => WalletPolicy | null;
  currentDelegation: (id: string) => DelegationRecord | null;
  currentToken: (id: string) => WalletToken | null;
  remainingBudget: (walletId: WalletId, owner: WalletOwner) => number | null;
  executeSpend: (actionId: string, effect: SpendEffectRequest) => { ok: boolean; effectId: string };
}

export interface Subject {
  readonly id: string;
  readonly label: string;
  run: (view: ScenarioView, authority: AuthorityFacade) => SubjectReport;
}
